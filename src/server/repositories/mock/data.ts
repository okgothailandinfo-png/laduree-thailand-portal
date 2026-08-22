/**
 * Sprint 33C — Thailand Safe-Draft catalog replaces SG/mock product catalogue.
 * DEV behavior fixtures are isolated and must not override Thailand master data.
 */

import { assertThailandCatalogReady } from "@/lib/catalog/thailand-product-import";
import type { Boutique } from "@/src/server/models/boutique";
import type { Category } from "@/src/server/models/category";
import type { PickupTimeSlot } from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";

const thailandCatalog = assertThailandCatalogReady();

/** Owner-approved Thailand category hierarchy (+ All Items). */
export const MOCK_CATEGORIES: Category[] = thailandCatalog.categories;

/**
 * Thailand Product Master LDR001–LDR038 (Safe-Draft).
 * All current rows are Draft → inactive, unavailable, null price, delivery ineligible.
 */
export const MOCK_PRODUCTS: Product[] = thailandCatalog.products;

/**
 * Isolated DEV fixtures for architecture/unit tests only.
 * Never merge into storefront catalog lists.
 */
export const DEV_BEHAVIOR_FIXTURES: Product[] = [
  {
    id: "dev-fixture-configurable-box",
    slug: "dev-fixture-configurable-box",
    sku: "DEV-CFG-BOX",
    title: "[DEV] Configurable Box Fixture",
    categoryId: "cat-macaron-gift-boxes",
    description: ["Architecture test fixture — not Thailand catalog."],
    allergenLabel: "Allergen Information:",
    allergenText:
      "Kindly refer to the Allergens page (located at the bottom of the site) for more product information.",
    storageLabel: "Storage Information:",
    storageText: "",
    priceThb: 990,
    priceMinor: 99000,
    currency: "THB",
    imagePlaceholder: "/product-placeholder.svg",
    images: [
      {
        id: "img-dev-cfg",
        mediaId: "media-dev-cfg",
        url: "/product-placeholder.svg",
        altText: "[DEV] Configurable Box Fixture",
        sortOrder: 0,
        isPrimary: true,
      },
    ],
    isActive: true,
    available: true,
    deliveryEligible: true,
    productBehavior: "CONFIGURABLE_BOX",
    packSize: 8,
    sortOrder: 9001,
    modifierGroups: [
      {
        id: "choice-of-items",
        title: "Choice of items:",
        requiredText: "Please select 8",
        type: "quantity",
        exactSelectionQuantity: 8,
        required: true,
        minSelection: 8,
        maxSelection: 8,
        sortOrder: 1,
        isActive: true,
        options: ["Rose", "Chocolate", "Pistachio", "Vanilla"],
      },
    ],
  },
  {
    id: "dev-fixture-fixed-pack",
    slug: "dev-fixture-fixed-pack",
    sku: "DEV-FIXED-PACK",
    title: "[DEV] Fixed Pack Fixture",
    categoryId: "cat-tea-boxes",
    description: ["Architecture test fixture — not Thailand catalog."],
    allergenLabel: "Allergen Information:",
    allergenText:
      "Kindly refer to the Allergens page (located at the bottom of the site) for more product information.",
    storageLabel: "Storage Information:",
    storageText: "",
    priceThb: 890,
    priceMinor: 89000,
    currency: "THB",
    imagePlaceholder: "/product-placeholder.svg",
    images: [],
    isActive: true,
    available: true,
    deliveryEligible: true,
    productBehavior: "FIXED_PACK",
    packSize: 12,
    sortOrder: 9002,
    modifierGroups: [],
  },
  {
    id: "dev-fixture-simple-product",
    slug: "dev-fixture-simple-product",
    sku: "DEV-SIMPLE",
    title: "[DEV] Simple Product Fixture",
    categoryId: "cat-lifestyle",
    description: ["Architecture test fixture — not Thailand catalog."],
    allergenLabel: "Allergen Information:",
    allergenText:
      "Kindly refer to the Allergens page (located at the bottom of the site) for more product information.",
    storageLabel: "Storage Information:",
    storageText: "",
    priceThb: 490,
    priceMinor: 49000,
    currency: "THB",
    imagePlaceholder: "/product-placeholder.svg",
    images: [],
    isActive: true,
    available: true,
    deliveryEligible: true,
    productBehavior: "SIMPLE_PRODUCT",
    packSize: null,
    sortOrder: 9003,
    modifierGroups: [],
  },
];

export const MOCK_BOUTIQUES: Boutique[] = [
  {
    id: "boutique-pending",
    name: "[BOUTIQUE PENDING APPROVAL]",
    code: "[OUTLET CODE PENDING APPROVAL]",
    address: "[ADDRESS PENDING APPROVAL]",
    openingHours: "[CONTENT PENDING APPROVAL]",
    lastOrderTime: "[CONTENT PENDING APPROVAL]",
  },
];

/** Example slots only — not real Thailand availability. */
export const MOCK_PICKUP_SLOTS: PickupTimeSlot[] = [
  { id: "1000-1030", label: "10:00–10:30", start: "10:00", end: "10:30" },
  { id: "1030-1100", label: "10:30–11:00", start: "10:30", end: "11:00" },
  { id: "1100-1130", label: "11:00–11:30", start: "11:00", end: "11:30" },
];
