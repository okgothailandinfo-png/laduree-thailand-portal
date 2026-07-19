/**
 * API route-handler smoke checks (no HTTP server required).
 * Invokes Next.js route handlers directly and asserts envelopes/DTOs.
 *
 * Default: DATA_SOURCE=mock
 * Prisma: set DATA_SOURCE=prisma + DATABASE_URL after migrate/seed.
 *
 * Run: npm run smoke:api
 */

import { GET as getBoutiques } from "@/app/api/boutiques/route";
import { GET as getCategories } from "@/app/api/categories/route";
import { GET as getOrderById } from "@/app/api/orders/[id]/route";
import { POST as postOrder } from "@/app/api/orders/route";
import { GET as getPickupAvailability } from "@/app/api/pickup/availability/route";
import { GET as getProductBySlug } from "@/app/api/products/[slug]/route";
import { GET as getProducts } from "@/app/api/products/route";
import { getDataSource } from "@/src/server/config/env";

type CheckResult = { name: string; ok: boolean; detail?: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSuccessEnvelope(json: unknown): {
  ok: boolean;
  detail: string;
  data?: unknown;
} {
  if (!isPlainObject(json) || json.success !== true || !("data" in json)) {
    return { ok: false, detail: "missing success/data envelope" };
  }
  if ("error" in json) {
    return { ok: false, detail: "error key present on success response" };
  }
  // Guard against accidental raw Prisma metadata leakage
  const serialized = JSON.stringify(json);
  if (
    serialized.includes("PrismaClient") ||
    serialized.includes("_count") ||
    serialized.includes("updatedAt")
  ) {
    // updatedAt is OK if it sneaks in — only fail on PrismaClient marker
    if (serialized.includes("PrismaClient")) {
      return { ok: false, detail: "raw Prisma client marker detected" };
    }
  }
  return { ok: true, detail: "success envelope", data: json.data };
}

function assertErrorEnvelope(
  json: unknown,
  expectedCode?: string,
): { ok: boolean; detail: string } {
  if (!isPlainObject(json) || json.success !== false || !isPlainObject(json.error)) {
    return { ok: false, detail: "missing success:false/error envelope" };
  }
  const code = json.error.code;
  const message = json.error.message;
  if (typeof code !== "string" || typeof message !== "string") {
    return { ok: false, detail: "error.code/message missing" };
  }
  if (expectedCode && code !== expectedCode) {
    return { ok: false, detail: `expected ${expectedCode}, got ${code}` };
  }
  return { ok: true, detail: `${code}: ${message}` };
}

function bangkokTodayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

async function run(): Promise<void> {
  const dataSource = getDataSource();
  const results: CheckResult[] = [];

  const categoriesRes = await getCategories(new Request("http://localhost:3000/api/categories"));
  const categoriesJson: unknown = await categoriesRes.json();
  const categoriesEnvelope = assertSuccessEnvelope(categoriesJson);
  results.push({
    name: "GET /api/categories",
    ok: categoriesRes.status === 200 && categoriesEnvelope.ok,
    detail: `status=${categoriesRes.status}; ${categoriesEnvelope.detail}`,
  });

  const productsRes = await getProducts(new Request("http://localhost:3000/api/products"));
  const productsJson: unknown = await productsRes.json();
  const productsEnvelope = assertSuccessEnvelope(productsJson);
  const products = Array.isArray(productsEnvelope.data)
    ? productsEnvelope.data
    : [];
  results.push({
    name: "GET /api/products",
    ok: productsRes.status === 200 && productsEnvelope.ok && products.length > 0,
    detail: `status=${productsRes.status}; count=${products.length}`,
  });

  const firstProduct = isPlainObject(products[0]) ? products[0] : null;
  const slug =
    firstProduct && typeof firstProduct.slug === "string"
      ? firstProduct.slug
      : null;

  if (slug) {
    const productRes = await getProductBySlug(new Request("http://local/api"), {
      params: Promise.resolve({ slug }),
    });
    const productJson: unknown = await productRes.json();
    const productEnvelope = assertSuccessEnvelope(productJson);
    const productData = productEnvelope.data;
    const hasDtoShape =
      isPlainObject(productData) &&
      typeof productData.slug === "string" &&
      typeof productData.title === "string" &&
      "priceThb" in productData &&
      "imagePlaceholder" in productData &&
      !("priceMinor" in productData);
    results.push({
      name: "GET /api/products/[slug]",
      ok: productRes.status === 200 && productEnvelope.ok && hasDtoShape,
      detail: `status=${productRes.status}; dtoCompatible=${hasDtoShape}`,
    });
  } else {
    results.push({
      name: "GET /api/products/[slug]",
      ok: false,
      detail: "no product slug available",
    });
  }

  const missingProductRes = await getProductBySlug(
    new Request("http://local/api"),
    { params: Promise.resolve({ slug: "does-not-exist-slug" }) },
  );
  const missingProductJson: unknown = await missingProductRes.json();
  const missingEnvelope = assertErrorEnvelope(missingProductJson, "NOT_FOUND");
  results.push({
    name: "GET /api/products/[slug] missing",
    ok: missingProductRes.status === 404 && missingEnvelope.ok,
    detail: `status=${missingProductRes.status}; ${missingEnvelope.detail}`,
  });

  const boutiquesRes = await getBoutiques(new Request("http://localhost:3000/api/boutiques"));
  const boutiquesJson: unknown = await boutiquesRes.json();
  const boutiquesEnvelope = assertSuccessEnvelope(boutiquesJson);
  const boutiques = Array.isArray(boutiquesEnvelope.data)
    ? boutiquesEnvelope.data
    : [];
  results.push({
    name: "GET /api/boutiques",
    ok: boutiquesRes.status === 200 && boutiquesEnvelope.ok && boutiques.length > 0,
    detail: `status=${boutiquesRes.status}; count=${boutiques.length}`,
  });

  const boutique = isPlainObject(boutiques[0]) ? boutiques[0] : null;
  const boutiqueId =
    boutique && typeof boutique.id === "string" ? boutique.id : null;
  const dateKey = bangkokTodayKey();

  let slotId: string | null = null;
  if (boutiqueId) {
    const pickupUrl = new URL("http://local/api/pickup/availability");
    pickupUrl.searchParams.set("boutiqueId", boutiqueId);
    pickupUrl.searchParams.set("dateKey", dateKey);
    const pickupRes = await getPickupAvailability(new Request(pickupUrl));
    const pickupJson: unknown = await pickupRes.json();
    const pickupEnvelope = assertSuccessEnvelope(pickupJson);
    const pickupData = pickupEnvelope.data;
    const slots =
      isPlainObject(pickupData) && Array.isArray(pickupData.slots)
        ? pickupData.slots
        : [];
    const firstSlot = isPlainObject(slots[0]) ? slots[0] : null;
    slotId = firstSlot && typeof firstSlot.id === "string" ? firstSlot.id : null;
    results.push({
      name: "GET /api/pickup/availability",
      ok: pickupRes.status === 200 && pickupEnvelope.ok && slots.length > 0,
      detail: `status=${pickupRes.status}; slots=${slots.length}`,
    });
  } else {
    results.push({
      name: "GET /api/pickup/availability",
      ok: false,
      detail: "no boutique id",
    });
  }

  const invalidOrderRes = await postOrder(
    new Request("http://local/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [] }),
    }),
  );
  const invalidOrderJson: unknown = await invalidOrderRes.json();
  const invalidEnvelope = assertErrorEnvelope(
    invalidOrderJson,
    "VALIDATION_ERROR",
  );
  results.push({
    name: "POST /api/orders invalid",
    ok: invalidOrderRes.status === 400 && invalidEnvelope.ok,
    detail: `status=${invalidOrderRes.status}; ${invalidEnvelope.detail}`,
  });

  const productId =
    firstProduct && typeof firstProduct.id === "string" ? firstProduct.id : null;

  if (boutiqueId && slotId && productId) {
    const createRes = await postOrder(
      new Request("http://local/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              productId,
              quantity: 1,
              // Fixed-size box exact selection: flavour quantities must total 8.
              modifiers: [
                { label: "Almond", quantity: 2 },
                { label: "Chocolate", quantity: 2 },
                { label: "Coffee", quantity: 2 },
                { label: "Lemon", quantity: 2 },
              ],
            },
          ],
          customer: {
            customerName: "API Smoke Test",
            mobileNumber: "+66812345678",
            email: "api-smoke@example.com",
          },
          pickup: {
            boutiqueId,
            dateKey,
            timeSlotId: slotId,
          },
          payment: { method: "promptpay-qr" },
          termsAccepted: true,
        }),
      }),
    );
    const createJson: unknown = await createRes.json();
    const createEnvelope = assertSuccessEnvelope(createJson);
    const created = isPlainObject(createEnvelope.data) ? createEnvelope.data : null;
    const orderId =
      created && typeof created.id === "string" ? created.id : null;
    const hasOrderDto =
      created &&
      typeof created.orderNumber === "string" &&
      created.status === "mock_placed" &&
      isPlainObject(created.payment) &&
      typeof created.totalThb === "number" &&
      !("totalMinor" in created);

    results.push({
      name: "POST /api/orders",
      ok: createRes.status === 201 && createEnvelope.ok && Boolean(orderId) && !!hasOrderDto,
      detail: `status=${createRes.status}; dtoCompatible=${Boolean(hasOrderDto)}`,
    });

    if (orderId) {
      const getRes = await getOrderById(new Request("http://local/api"), {
        params: Promise.resolve({ id: orderId }),
      });
      const getJson: unknown = await getRes.json();
      const getEnvelope = assertSuccessEnvelope(getJson);
      results.push({
        name: "GET /api/orders/[id]",
        ok: getRes.status === 200 && getEnvelope.ok,
        detail: `status=${getRes.status}; ${getEnvelope.detail}`,
      });
    } else {
      results.push({
        name: "GET /api/orders/[id]",
        ok: false,
        detail: "skipped — create failed",
      });
    }
  } else {
    results.push({
      name: "POST /api/orders",
      ok: false,
      detail: "missing boutique/slot/product",
    });
    results.push({
      name: "GET /api/orders/[id]",
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
    `\nDATA_SOURCE=${dataSource}. ${results.length - failed.length}/${results.length} API checks passed.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
