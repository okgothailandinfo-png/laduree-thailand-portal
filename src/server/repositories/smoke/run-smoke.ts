/**
 * Executable repository/service smoke checks.
 *
 * Default: DATA_SOURCE=mock (no database required).
 * Prisma path: set DATA_SOURCE=prisma and DATABASE_URL, migrate + seed first.
 *
 * Run: npm run smoke:repos
 */

import { createRepositories } from "@/src/server/repositories/create-repositories";
import { DefaultBoutiqueService } from "@/src/server/services/boutique.service";
import { DefaultCategoryService } from "@/src/server/services/category.service";
import { DefaultOrderService } from "@/src/server/services/order.service";
import { DefaultPickupService } from "@/src/server/services/pickup.service";
import { DefaultProductService } from "@/src/server/services/product.service";
import { AppError } from "@/src/server/utils/errors";
import { getDataSource } from "@/src/server/config/env";

type CheckResult = { name: string; ok: boolean; detail?: string };

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

  try {
    const product = await productService.getProductBySlug(
      "napoleon-iii-macaron-8pcs",
    );
    results.push({
      name: "product lookup by slug",
      ok: product.slug === "napoleon-iii-macaron-8pcs",
      detail: product.title,
    });
  } catch (error) {
    results.push({
      name: "product lookup by slug",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
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
  let availabilityOk = false;
  let availabilityDetail = "skipped";
  let slotId: string | null = null;
  let dateKey = "2099-01-01";

  if (boutique) {
    if (dataSource === "mock") {
      dateKey = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
      });
    }
    try {
      const availability = await pickupService.getAvailability({
        boutiqueId: boutique.id,
        dateKey,
      });
      availabilityOk = availability.slots.length > 0;
      availabilityDetail = `slots=${availability.slots.length}`;
      slotId = availability.slots[0]?.id ?? null;
    } catch (error) {
      availabilityDetail = error instanceof Error ? error.message : String(error);
    }
  }

  results.push({
    name: "pickup availability filtering",
    ok: availabilityOk,
    detail: availabilityDetail,
  });

  // Invalid order payload
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

  // Valid order creation + retrieval (mock always; prisma only if seeded)
  if (boutique && slotId && products[0]) {
    try {
      const created = await orderService.createOrder({
        items: [
          {
            productId: products[0].id,
            quantity: 1,
            modifiers: [{ label: "Vanilla", quantity: 1 }],
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
        name: "valid order creation",
        ok: Boolean(created.id && created.orderNumber),
        detail: created.orderNumber,
      });

      const byId = await orderService.getOrderById(created.id);
      const byNumber = await orderService.getOrderByOrderNumber(
        created.orderNumber,
      );
      results.push({
        name: "order retrieval",
        ok: byId.id === created.id && byNumber.orderNumber === created.orderNumber,
        detail: byId.id,
      });
    } catch (error) {
      results.push({
        name: "valid order creation",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
      results.push({
        name: "order retrieval",
        ok: false,
        detail: "skipped after create failure",
      });
    }
  } else {
    results.push({
      name: "valid order creation",
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
    console.log(`[${mark}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
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
