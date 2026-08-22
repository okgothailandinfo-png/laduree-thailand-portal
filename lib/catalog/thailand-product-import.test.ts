import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  THAILAND_CATEGORY_HIERARCHY,
  THAILAND_PRODUCT_MASTER,
} from "@/data/thailand-product-master";
import {
  evaluateProductPurchasability,
  isProductPurchasable,
} from "@/lib/catalog/product-purchasability";
import {
  assertThailandCatalogReady,
  buildThailandCatalog,
  resolveAvailable,
  resolveDeliveryEligible,
  resolveIsActive,
  resolvePriceMinor,
  validateThailandProductMaster,
} from "@/lib/catalog/thailand-product-import";
import {
  DEV_BEHAVIOR_FIXTURES,
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
} from "@/src/server/repositories/mock/data";
import { DefaultCartService } from "@/src/server/services/cart.service";
import type { Cart } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
import type {
  CartRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

describe("Sprint 33C — Thailand Product Master Safe-Draft", () => {
  it("imports LDR001–LDR038 with unique SKUs", () => {
    const validation = validateThailandProductMaster();
    assert.equal(validation.ok, true, JSON.stringify(validation.issues));
    assert.equal(validation.skuCount, 38);
    const skus = THAILAND_PRODUCT_MASTER.map((r) => r.sku);
    assert.equal(new Set(skus).size, 38);
    for (let i = 1; i <= 38; i += 1) {
      assert.ok(skus.includes(`LDR${String(i).padStart(3, "0")}`));
    }
  });

  it("maps ProductBehavior without FIXED_PRODUCT", () => {
    const catalog = assertThailandCatalogReady();
    const dist = { CONFIGURABLE_BOX: 0, FIXED_PACK: 0, SIMPLE_PRODUCT: 0 };
    for (const product of catalog.products) {
      assert.notEqual(String(product.productBehavior), "FIXED_PRODUCT");
      dist[product.productBehavior as keyof typeof dist] += 1;
    }
    assert.equal(dist.CONFIGURABLE_BOX, 11);
    assert.equal(dist.FIXED_PACK, 14);
    assert.equal(dist.SIMPLE_PRODUCT, 13);
  });

  it("preserves Eugénie as CONFIGURABLE_BOX with exact selection", () => {
    const eugenie = assertThailandCatalogReady().products.filter((p) =>
      ["LDR013", "LDR014", "LDR015"].includes(p.sku),
    );
    assert.equal(eugenie.length, 3);
    for (const product of eugenie) {
      assert.equal(product.productBehavior, "CONFIGURABLE_BOX");
      assert.equal(
        product.modifierGroups[0]?.exactSelectionQuantity,
        product.packSize,
      );
      assert.equal(product.modifierGroups[0]?.id, "eugenie-flavors");
      assert.deepEqual(product.modifierGroups[0]?.options, []);
    }
  });

  it("maps FIXED_PACK with packSize and no exact-selection UI groups", () => {
    const fixed = assertThailandCatalogReady().products.filter(
      (p) => p.productBehavior === "FIXED_PACK",
    );
    assert.ok(fixed.length > 0);
    for (const product of fixed) {
      assert.ok(typeof product.packSize === "number" && product.packSize > 0);
      assert.equal(product.modifierGroups.length, 0);
    }
  });

  it("maps SIMPLE_PRODUCT with null packSize and purchase-qty only", () => {
    const simple = assertThailandCatalogReady().products.filter(
      (p) => p.productBehavior === "SIMPLE_PRODUCT",
    );
    assert.ok(simple.length > 0);
    for (const product of simple) {
      assert.equal(product.packSize, null);
      assert.equal(product.modifierGroups.length, 0);
    }
  });

  it("keeps macaron CONFIGURABLE_BOX exactSelectionQuantity by box size", () => {
    const napoleon = assertThailandCatalogReady().products.find(
      (p) => p.sku === "LDR003",
    )!;
    assert.equal(napoleon.productBehavior, "CONFIGURABLE_BOX");
    assert.equal(napoleon.packSize, 8);
    assert.equal(napoleon.modifierGroups[0]?.exactSelectionQuantity, 8);
    assert.equal(napoleon.modifierGroups[0]?.id, "macaron-flavors");
  });

  it("null / n/a price never becomes 0 and is non-purchasable", () => {
    assert.equal(resolvePriceMinor(null), null);
    for (const product of assertThailandCatalogReady().products) {
      assert.equal(product.priceMinor, null);
      assert.equal(product.priceThb, null);
      assert.notEqual(product.priceMinor, 0);
      assert.equal(isProductPurchasable(product), false);
      assert.ok(
        evaluateProductPurchasability(product).reasons.includes(
          "PRICE_UNAVAILABLE",
        ),
      );
    }
  });

  it("never carries SGD into Thailand catalog rows", () => {
    for (const row of THAILAND_PRODUCT_MASTER) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(row, "priceSgd"),
        false,
      );
      assert.equal(row.priceThb, null);
    }
  });

  it("Draft / unresolved availability fail closed to inactive + unavailable", () => {
    for (const row of THAILAND_PRODUCT_MASTER) {
      assert.equal(row.status, "Draft");
      assert.equal(resolveIsActive(row), false);
      assert.equal(resolveAvailable(row), false);
    }
    for (const product of assertThailandCatalogReady().products) {
      assert.equal(product.isActive, false);
      assert.equal(product.available, false);
    }
  });

  it("unresolved delivery eligibility imports as ineligible", () => {
    assert.equal(resolveDeliveryEligible(null), false);
    assert.equal(resolveDeliveryEligible(undefined), false);
    assert.equal(resolveDeliveryEligible(false), false);
    assert.equal(resolveDeliveryEligible(true), true);
    for (const row of THAILAND_PRODUCT_MASTER) {
      assert.equal(row.deliveryEligible, null);
    }
    for (const product of assertThailandCatalogReady().products) {
      assert.equal(product.deliveryEligible, false);
    }
  });

  it("configurable SKU without approved options is non-purchasable", () => {
    const configurable = assertThailandCatalogReady().products.filter(
      (p) => p.productBehavior === "CONFIGURABLE_BOX",
    );
    for (const product of configurable) {
      assert.deepEqual(product.modifierGroups[0]?.options, []);
      assert.ok(
        evaluateProductPurchasability(product).reasons.includes(
          "CONFIG_OPTIONS_UNAVAILABLE",
        ),
      );
    }
  });

  it("normalizes Thailand category hierarchy (not Singapore)", () => {
    const names = THAILAND_CATEGORY_HIERARCHY.map((c) => c.name);
    assert.deepEqual(names, [
      "Napoléon Gold Series",
      "Macaron Gift Boxes",
      "Eugénie Chocolates Gift Boxes",
      "Chocolates",
      "Sablé Cookies",
      "Langue de Chat",
      "Tea Boxes",
      "Lifestyle",
    ]);
    assert.equal(names.includes("Merchandise"), false);
    assert.equal(names.includes("Biscuits"), false);
    const mockNames = MOCK_CATEGORIES.map((c) => c.name);
    for (const name of names) assert.ok(mockNames.includes(name));
    assert.ok(mockNames.includes("All Items"));
  });

  it("storefront mock catalog is Thailand master (no SG Napoleon III / DEV sellables)", () => {
    assert.equal(MOCK_PRODUCTS.length, 38);
    assert.ok(MOCK_PRODUCTS.every((p) => /^LDR\d{3}$/.test(p.sku)));
    assert.equal(
      MOCK_PRODUCTS.some((p) => p.title.includes("Napoléon III")),
      false,
    );
    assert.equal(
      MOCK_PRODUCTS.some((p) => p.sku.startsWith("DEV-")),
      false,
    );
    assert.equal(
      MOCK_PRODUCTS.some((p) => p.priceThb === 990),
      false,
    );
    // DEV fixtures remain isolated
    assert.ok(DEV_BEHAVIOR_FIXTURES.every((p) => p.sku.startsWith("DEV-")));
  });

  it("rejects invalid legacy FIXED_PRODUCT in validation", () => {
    const rows = structuredClone(THAILAND_PRODUCT_MASTER);
    (rows[0] as { productBehavior: string }).productBehavior = "FIXED_PRODUCT";
    const validation = validateThailandProductMaster(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((i) => i.code === "BEHAVIOR_LEGACY"));
  });

  it("cart rejects non-purchasable Thailand Draft products", async () => {
    const product = MOCK_PRODUCTS.find((p) => p.sku === "LDR016")!;
    const carts = new Map<string, Cart>();
    const cartRepo: CartRepository = {
      async findById(id) {
        return carts.get(id) ?? null;
      },
      async save(cart) {
        carts.set(cart.id, cart);
        return cart;
      },
      async delete(id) {
        carts.delete(id);
      },
    };
    const productRepo: ProductRepository = {
      async list() {
        return [product];
      },
      async findById(id) {
        return id === product.id ? product : null;
      },
      async findBySlug() {
        return null;
      },
      async findBySku() {
        return null;
      },
      async adminList() {
        throw new Error("unused");
      },
      async create() {
        throw new Error("unused");
      },
      async update() {
        throw new Error("unused");
      },
      async remove() {
        throw new Error("unused");
      },
      async countByCategoryId() {
        return 0;
      },
    };
    const service = new DefaultCartService(cartRepo, productRepo);
    await assert.rejects(
      () =>
        service.addItem(undefined, {
          productId: product.id,
          quantity: 1,
          modifiers: [],
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.details?.code, "PRICE_UNAVAILABLE");
        return true;
      },
    );
  });

  it("buildThailandCatalog is deterministic for Safe-Draft", () => {
    const a = buildThailandCatalog();
    const b = buildThailandCatalog();
    assert.equal(a.products.length, b.products.length);
    assert.equal(a.products[0]?.sku, "LDR001");
    assert.equal(a.products[37]?.sku, "LDR038");
  });
});

describe("Sprint 33C — purchasability helper", () => {
  it("allows fully ready fixture products", () => {
    const fixture = DEV_BEHAVIOR_FIXTURES[0] as Product;
    assert.equal(isProductPurchasable(fixture), true);
  });
});
