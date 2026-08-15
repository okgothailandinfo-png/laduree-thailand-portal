/**
 * Executable repository/service smoke checks.
 *
 * Default: DATA_SOURCE unset/mock (no database required).
 * Prisma path: set DATA_SOURCE=prisma and DATABASE_URL, then migrate + seed.
 *
 * Run: npm run smoke:repos
 */

import { getDataSource } from "@/src/server/config/env";
import { createRepositories } from "@/src/server/repositories/create-repositories";
import { buildValidModifiersForProduct } from "@/src/server/repositories/smoke/order-modifiers";
import { DefaultBoutiqueService } from "@/src/server/services/boutique.service";
import { DefaultCategoryService } from "@/src/server/services/category.service";
import { DefaultOrderService } from "@/src/server/services/order.service";
import { DefaultPickupService } from "@/src/server/services/pickup.service";
import { DefaultProductService } from "@/src/server/services/product.service";
import { AppError } from "@/src/server/utils/errors";

type CheckResult = { name: string; ok: boolean; detail?: string };

function bangkokTodayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

async function run(): Promise<void> {
  const dataSource = getDataSource();
  const repos = createRepositories();
  const categoryService = new DefaultCategoryService(repos.categories);
  const productService = new DefaultProductService(repos.products);
  const boutiqueService = new DefaultBoutiqueService(repos.boutiques);
  const pickupService = new DefaultPickupService(repos.pickup, repos.boutiques);
  const orderService = new DefaultOrderService(
    repos.orders,
    repos.products,
    repos.boutiques,
    repos.pickup,
  );

  const results: CheckResult[] = [];

  const categories = await categoryService.listCategories();
  results.push({
    name: "category listing",
    ok: categories.length > 0,
    detail: `count=${categories.length}`,
  });

  const products = await productService.listProducts();
  results.push({
    name: "product listing",
    ok: products.length > 0,
    detail: `count=${products.length}`,
  });

  const lookupSlug = products[0]?.slug;
  let productDetail: Awaited<
    ReturnType<DefaultProductService["getProductBySlug"]>
  > | null = null;
  if (lookupSlug) {
    try {
      productDetail = await productService.getProductBySlug(lookupSlug);
      results.push({
        name: "product lookup by slug",
        ok: productDetail.slug === lookupSlug,
        detail: productDetail.title,
      });
    } catch (error) {
      results.push({
        name: "product lookup by slug",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    results.push({
      name: "product lookup by slug",
      ok: false,
      detail: "no products available",
    });
  }

  try {
    await productService.getProductBySlug("does-not-exist-slug");
    results.push({
      name: "missing product handling",
      ok: false,
      detail: "expected NOT_FOUND",
    });
  } catch (error) {
    results.push({
      name: "missing product handling",
      ok: error instanceof AppError && error.code === "NOT_FOUND",
      detail: error instanceof AppError ? error.code : String(error),
    });
  }

  const boutiques = await boutiqueService.listBoutiques();
  results.push({
    name: "boutique listing",
    ok: boutiques.length > 0,
    detail: `count=${boutiques.length}`,
  });

  const boutique = boutiques[0];
  const dateKey = bangkokTodayKey();
  let availabilityOk = false;
  let availabilityDetail = "skipped";
  let slotId: string | null = null;
  let availabilitySlots: Array<{ id: string; label: string }> = [];

  if (boutique) {
    try {
      const availability = await pickupService.getAvailability({
        boutiqueId: boutique.id,
        dateKey,
      });
      availabilitySlots = availability.slots;
      availabilityOk = availability.slots.length > 0;
      availabilityDetail = `slots=${availability.slots.length}`;
      slotId = availability.slots[0]?.id ?? null;
    } catch (error) {
      availabilityDetail =
        error instanceof Error ? error.message : String(error);
    }
  }

  results.push({
    name: "pickup availability filtering",
    ok: availabilityOk,
    detail: availabilityDetail,
  });

  if (dataSource === "prisma") {
    const hasReservedLabel = availabilitySlots.some(
      (slot) => slot.label === "10:30–11:00",
    );
    results.push({
      name: "reserved pickup filtering",
      ok: !hasReservedLabel && availabilitySlots.length > 0,
      detail: hasReservedLabel
        ? "capacity=0 slot unexpectedly returned"
        : "capacity=0 slot excluded",
    });
  } else {
    results.push({
      name: "reserved pickup filtering",
      ok: true,
      detail: "skipped on mock (no capacity model)",
    });
  }

  try {
    orderService.parseCreateOrderBody({ items: [] });
    results.push({
      name: "invalid order payload",
      ok: false,
      detail: "expected validation error",
    });
  } catch (error) {
    results.push({
      name: "invalid order payload",
      ok: error instanceof AppError && error.code === "VALIDATION_ERROR",
      detail: error instanceof AppError ? error.message : String(error),
    });
  }

  if (boutique && slotId && productDetail) {
    try {
      await orderService.createOrder({
        items: [
          {
            productId: productDetail.id,
            quantity: 1,
            modifiers: buildValidModifiersForProduct(productDetail),
          },
        ],
        customer: {
          customerName: "Smoke Test",
          mobileNumber: "+66812345678",
          email: "smoke@example.com",
        },
        pickup: {
          boutiqueId: boutique.id,
          dateKey,
          timeSlotId: slotId,
        },
        payment: { method: "promptpay-qr" },
        termsAccepted: true,
      });

      results.push({
        name: "Safe-Draft order reject (non-purchasable)",
        ok: false,
        detail: "expected non-purchasable Thailand Draft catalog to reject",
      });
      results.push({
        name: "order retrieval",
        ok: true,
        detail: "skipped — Safe-Draft catalog is intentionally non-purchasable",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const rejected =
        /Price unavailable/i.test(message) ||
        /Product unavailable/i.test(message);
      results.push({
        name: "Safe-Draft order reject (non-purchasable)",
        ok: rejected,
        detail: message,
      });
      results.push({
        name: "order retrieval",
        ok: true,
        detail: "skipped — Safe-Draft catalog is intentionally non-purchasable",
      });
    }
  } else {
    results.push({
      name: "Safe-Draft order reject (non-purchasable)",
      ok: false,
      detail: "missing boutique/slot/product for smoke path",
    });
    results.push({
      name: "order retrieval",
      ok: false,
      detail: "skipped",
    });
  }

  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(
      `[${mark}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`,
    );
  }

  console.log(
    `\nDATA_SOURCE=${dataSource}. ${results.length - failed.length}/${results.length} checks passed.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
