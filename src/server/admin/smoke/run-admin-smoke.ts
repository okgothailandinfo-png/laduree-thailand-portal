/**
 * Admin Product/Category runtime smoke.
 *
 * Always:
 * - Admin services refuse mock DATA_SOURCE (CONFIG_ERROR)
 * - Storefront catalog APIs remain readable
 *
 * When DATA_SOURCE=prisma + DATABASE_URL (after migrate/seed):
 * - Full category + product CRUD via admin services
 * - Duplicate slug/SKU conflict
 * - Category-with-products delete conflict
 *
 * Run: npm run smoke:admin
 */

import { GET as getCategories } from "@/app/api/categories/route";
import { GET as getProductBySlug } from "@/app/api/products/[slug]/route";
import { GET as getProducts } from "@/app/api/products/route";
import { AdminCategoryService } from "@/src/server/admin/category.service";
import { AdminMediaService } from "@/src/server/admin/media.service";
import { AdminProductService } from "@/src/server/admin/product.service";
import { getDataSource } from "@/src/server/config/env";
import { createRepositories } from "@/src/server/repositories/create-repositories";
import { createStorageProvider } from "@/src/server/storage/factory";
import { StorageService } from "@/src/server/storage/storage-service";
import { AppError } from "@/src/server/utils/errors";

type CheckResult = { name: string; ok: boolean; detail?: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function runStorefrontChecks(results: CheckResult[]): Promise<void> {
  const categoriesRes = await getCategories();
  const categoriesJson: unknown = await categoriesRes.json();
  results.push({
    name: "storefront GET /api/categories",
    ok:
      categoriesRes.status === 200 &&
      isPlainObject(categoriesJson) &&
      categoriesJson.success === true,
    detail: `status=${categoriesRes.status}`,
  });

  const productsRes = await getProducts();
  const productsJson: unknown = await productsRes.json();
  const productsOk =
    productsRes.status === 200 &&
    isPlainObject(productsJson) &&
    productsJson.success === true &&
    Array.isArray(productsJson.data);
  results.push({
    name: "storefront GET /api/products",
    ok: productsOk,
    detail: productsOk
      ? `count=${(productsJson as { data: unknown[] }).data.length}`
      : `status=${productsRes.status}`,
  });

  if (
    productsOk &&
    (productsJson as { data: Array<{ slug?: string }> }).data[0]?.slug
  ) {
    const slug = (productsJson as { data: Array<{ slug: string }> }).data[0]
      .slug;
    const detailRes = await getProductBySlug(new Request("http://local/api"), {
      params: Promise.resolve({ slug }),
    });
    const detailJson: unknown = await detailRes.json();
    results.push({
      name: "storefront GET /api/products/[slug]",
      ok:
        detailRes.status === 200 &&
        isPlainObject(detailJson) &&
        detailJson.success === true,
      detail: `slug=${slug}`,
    });
  } else {
    results.push({
      name: "storefront GET /api/products/[slug]",
      ok: true,
      detail: "skipped (no products in catalog)",
    });
  }
}

async function runMockConfigGuard(results: CheckResult[]): Promise<void> {
  const repos = createRepositories();
  const adminProducts = new AdminProductService(
    repos.products,
    repos.categories,
  );
  const adminCategories = new AdminCategoryService(
    repos.categories,
    repos.products,
  );

  try {
    await adminProducts.list({ page: 1, pageSize: 10 });
    results.push({
      name: "admin products require prisma (mock mode)",
      ok: false,
      detail: "expected CONFIG_ERROR",
    });
  } catch (err) {
    results.push({
      name: "admin products require prisma (mock mode)",
      ok: err instanceof AppError && err.code === "CONFIG_ERROR",
      detail: err instanceof AppError ? err.message : String(err),
    });
  }

  try {
    await adminCategories.list({ page: 1, pageSize: 10 });
    results.push({
      name: "admin categories require prisma (mock mode)",
      ok: false,
      detail: "expected CONFIG_ERROR",
    });
  } catch (err) {
    results.push({
      name: "admin categories require prisma (mock mode)",
      ok: err instanceof AppError && err.code === "CONFIG_ERROR",
      detail: err instanceof AppError ? err.message : String(err),
    });
  }
}

async function runPrismaCrud(results: CheckResult[]): Promise<void> {
  const repos = createRepositories();
  const adminCategories = new AdminCategoryService(
    repos.categories,
    repos.products,
  );
  const adminProducts = new AdminProductService(
    repos.products,
    repos.categories,
  );
  const adminMedia = new AdminMediaService(
    repos.media,
    new StorageService(createStorageProvider()),
  );

  const stamp = Date.now().toString(36);

  const media = await adminMedia.create({
    url: `/smoke-media-${stamp}.svg`,
    altText: "Smoke media",
    title: `Smoke media ${stamp}`,
    isActive: true,
  });
  results.push({
    name: "create media",
    ok: Boolean(media.id),
    detail: media.id,
  });

  const mediaList = await adminMedia.list({
    search: stamp,
    page: 1,
    pageSize: 10,
  });
  results.push({
    name: "list/search media",
    ok: mediaList.items.some((item) => item.id === media.id),
    detail: `total=${mediaList.total}`,
  });

  const category = await adminCategories.create({
    name: `[SMOKE] Category ${stamp}`,
    slug: `smoke-category-${stamp}`,
    description: "Admin runtime smoke category",
    sortOrder: 999,
    isActive: true,
  });
  results.push({
    name: "create category",
    ok: Boolean(category.id),
    detail: category.id,
  });

  try {
    await adminCategories.create({
      name: "Dup",
      slug: category.slug,
      sortOrder: 1,
      isActive: true,
    });
    results.push({
      name: "duplicate category slug rejected",
      ok: false,
      detail: "expected CONFLICT",
    });
  } catch (error) {
    results.push({
      name: "duplicate category slug rejected",
      ok: error instanceof AppError && error.code === "CONFLICT",
      detail: error instanceof AppError ? error.code : String(error),
    });
  }

  const updatedCategory = await adminCategories.update(category.id, {
    name: `[SMOKE] Category updated ${stamp}`,
    sortOrder: 1000,
  });
  results.push({
    name: "update category (PUT contract)",
    ok: updatedCategory.name.includes("updated"),
    detail: updatedCategory.name,
  });

  const categoryList = await adminCategories.list({
    search: category.slug,
    page: 1,
    pageSize: 10,
  });
  results.push({
    name: "list/search categories",
    ok: categoryList.items.some((item) => item.id === category.id),
    detail: `total=${categoryList.total}`,
  });

  const product = await adminProducts.create({
    name: `[SMOKE] Product ${stamp}`,
    slug: `smoke-product-${stamp}`,
    sku: `SMOKE-SKU-${stamp}`.toUpperCase(),
    description: ["Smoke product description"],
    priceThb: 1290,
    currency: "THB",
    categoryId: category.id,
    isActive: true,
    available: true,
    sortOrder: 1,
    images: [
      {
        mediaId: media.id,
        altText: "Smoke image",
        sortOrder: 0,
        isPrimary: true,
      },
    ],
  });
  results.push({
    name: "create product",
    ok:
      product.priceMinor === 129000 &&
      product.images.length === 1 &&
      product.images[0]?.mediaId === media.id,
    detail: `priceMinor=${product.priceMinor}; mediaId=${product.images[0]?.mediaId}`,
  });

  try {
    await adminProducts.create({
      name: "Dup product",
      slug: product.slug,
      sku: `OTHER-SKU-${stamp}`,
      description: [],
      priceThb: 100,
      currency: "THB",
      categoryId: category.id,
      isActive: true,
      available: true,
      sortOrder: 2,
      images: [{ mediaId: media.id, sortOrder: 0, isPrimary: true }],
    });
    results.push({
      name: "duplicate product slug rejected",
      ok: false,
      detail: "expected CONFLICT",
    });
  } catch (error) {
    results.push({
      name: "duplicate product slug rejected",
      ok: error instanceof AppError && error.code === "CONFLICT",
      detail: error instanceof AppError ? error.code : String(error),
    });
  }

  try {
    await adminProducts.create({
      name: "Dup sku",
      slug: `other-slug-${stamp}`,
      sku: product.sku,
      description: [],
      priceThb: 100,
      currency: "THB",
      categoryId: category.id,
      isActive: true,
      available: true,
      sortOrder: 2,
      images: [{ mediaId: media.id, sortOrder: 0, isPrimary: true }],
    });
    results.push({
      name: "duplicate product SKU rejected",
      ok: false,
      detail: "expected CONFLICT",
    });
  } catch (error) {
    results.push({
      name: "duplicate product SKU rejected",
      ok: error instanceof AppError && error.code === "CONFLICT",
      detail: error instanceof AppError ? error.code : String(error),
    });
  }

  const updatedProduct = await adminProducts.update(product.id, {
    name: `[SMOKE] Product updated ${stamp}`,
    priceThb: 1500,
    isActive: true,
    available: true,
  });
  results.push({
    name: "update product (PUT contract)",
    ok:
      updatedProduct.name.includes("updated") &&
      updatedProduct.priceMinor === 150000,
    detail: `priceMinor=${updatedProduct.priceMinor}`,
  });

  const productList = await adminProducts.list({
    search: product.sku,
    page: 1,
    pageSize: 10,
  });
  results.push({
    name: "list/search/filter products",
    ok: productList.items.some((item) => item.id === product.id),
    detail: `total=${productList.total}`,
  });

  const page2 = await adminProducts.list({ page: 1, pageSize: 1 });
  results.push({
    name: "product pagination",
    ok: page2.pageSize === 1 && page2.totalPages >= 1,
    detail: `totalPages=${page2.totalPages}`,
  });

  try {
    await adminCategories.remove(category.id);
    results.push({
      name: "category with products cannot be deleted",
      ok: false,
      detail: "expected CONFLICT",
    });
  } catch (error) {
    results.push({
      name: "category with products cannot be deleted",
      ok: error instanceof AppError && error.code === "CONFLICT",
      detail: error instanceof AppError ? error.message : String(error),
    });
  }

  const removed = await adminProducts.remove(product.id);
  results.push({
    name: "delete product",
    ok: removed.mode === "deleted" || removed.mode === "deactivated",
    detail: removed.mode,
  });

  await adminCategories.remove(category.id);
  results.push({
    name: "delete empty category",
    ok: true,
    detail: category.id,
  });

  await adminMedia.remove(media.id);
  results.push({
    name: "delete unused media",
    ok: true,
    detail: media.id,
  });
}

async function run(): Promise<void> {
  const dataSource = getDataSource();
  const results: CheckResult[] = [];

  await runStorefrontChecks(results);

  if (dataSource === "prisma") {
    await runPrismaCrud(results);
  } else {
    await runMockConfigGuard(results);
  }

  let failed = 0;
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    if (!result.ok) failed += 1;
    console.log(`[${mark}] ${result.name} — ${result.detail ?? ""}`);
  }

  console.log("");
  console.log(
    `DATA_SOURCE=${dataSource}. ${results.length - failed}/${results.length} admin checks passed.`,
  );
  if (dataSource !== "prisma") {
    console.log(
      "Prisma CRUD smoke skipped (set DATA_SOURCE=prisma + DATABASE_URL, migrate, and seed).",
    );
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
