import type { Boutique } from "@/src/server/models/boutique";
import type { Category } from "@/src/server/models/category";
import type { PickupTimeSlot } from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";

/**
 * Mock catalog / ops seed data.
 * Structure mirrors the frontend MVP; Thailand retail/ops values remain placeholders.
 */

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "cat-macaron-gift-boxes",
    name: "Macaron Gift Boxes",
    slug: "macaron-gift-boxes",
    description: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "cat-all-items",
    name: "All Items",
    slug: "all-items",
    description: null,
    sortOrder: 2,
    isActive: true,
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-napoleon-iii-macaron-8pcs",
    slug: "napoleon-iii-macaron-8pcs",
    sku: "SKU-NAPOLEON-8",
    title: "« Napoléon III » Macaron - 8pcs",
    categoryId: "cat-macaron-gift-boxes",
    description: [
      "Discover an assortment of 8 iconic Ladurée macarons, offering a delightful journey through timeless flavors. A delicate and sophisticated gift, perfect for sharing or indulging in a moment of pure sweetness.",
    ],
    allergenLabel: "Allergen Information:",
    allergenText:
      "Kindly refer to the Allergens page (located at the bottom of the site) for more product information.",
    storageLabel: "Storage Information:",
    storageText: "Macarons can be stored for up to 4 days in the Chiller.",
    // Owner-approved Thailand retail price (docs/thailand-content.md).
    priceThb: 990,
    priceMinor: 99000,
    currency: "THB",
    imagePlaceholder: "/product-placeholder.svg",
    images: [
      {
        id: "img-napoleon",
        mediaId: "media-napoleon-placeholder",
        url: "/product-placeholder.svg",
        altText: "« Napoléon III » Macaron - 8pcs",
        sortOrder: 0,
        isPrimary: true,
      },
    ],
    isActive: true,
    available: true,
    sortOrder: 1,
    modifierGroups: [
      {
        id: "choice-of-macarons",
        title: "Choice of Macarons:",
        requiredText: "Please select 8",
        type: "quantity",
        exactSelectionQuantity: 8,
        required: true,
        minSelection: 8,
        maxSelection: 8,
        sortOrder: 1,
        isActive: true,
        options: [
          "Almond",
          "Chocolate",
          "Coffee",
          "« Seasonal » Dubai Chocolate",
          "Lemon",
          "« Asia Exclusive » Matcha",
          "Marie-Antoinette Tea",
          "« Seasonal » Milk Chocolate Coated Coconut",
          "« Seasonal » Milk Chocolate Coated Caramel Peanuts",
          "Orange Blossom",
          "Passion Fruit",
          "Pistachio",
          "Raspberry",
          "Rose",
          "Salted Caramel",
          "Vanilla",
        ],
      },
      {
        id: "pickup-acknowledgement",
        title:
          "[CONTENT PENDING APPROVAL] Product handling acknowledgement (Pickup)",
        requiredText: "Please select 1",
        type: "radio",
        required: true,
        minSelection: 1,
        maxSelection: 1,
        isAcknowledgement: true,
        sortOrder: 2,
        isActive: true,
        options: [
          "[CONTENT PENDING APPROVAL] I acknowledge & agree to proceed with my pickup order.",
        ],
      },
      {
        id: "gifting-ribbon",
        title: "Add a Gifting Ribbon Bow:",
        requiredText: null,
        type: "radio",
        required: false,
        maxSelection: 1,
        sortOrder: 3,
        isActive: true,
        // No approved Thailand add-on price — UI shows ฿ — and does not affect subtotal.
        options: ["1 x Gifting Ribbon Bow (M)"],
        optionDetails: [
          {
            label: "1 x Gifting Ribbon Bow (M)",
            priceMinor: null,
            sortOrder: 1,
            isActive: true,
          },
        ],
      },
      {
        id: "packing-options",
        title: "Upgrade Packing Options:",
        requiredText: null,
        type: "quantity",
        required: false,
        maxSelection: 1,
        sortOrder: 4,
        isActive: true,
        options: ["+2 Ice Packs (+2 hrs)", "+5 Ice Packs (+4 hrs)"],
        optionDetails: [
          {
            label: "+2 Ice Packs (+2 hrs)",
            priceMinor: null,
            sortOrder: 1,
            isActive: true,
          },
          {
            label: "+5 Ice Packs (+4 hrs)",
            priceMinor: null,
            sortOrder: 2,
            isActive: true,
          },
        ],
      },
    ],
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
