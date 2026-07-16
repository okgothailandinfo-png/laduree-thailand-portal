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
    sortOrder: 1,
  },
  {
    id: "cat-all-items",
    name: "All Items",
    slug: "all-items",
    sortOrder: 2,
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-napoleon-iii-macaron-8pcs",
    slug: "napoleon-iii-macaron-8pcs",
    title: "« Napoléon III » Macaron - 8pcs",
    categoryId: "cat-macaron-gift-boxes",
    description: [
      "Discover an assortment of 8 iconic Ladurée macarons, offering a delightful journey through timeless flavors. A delicate and sophisticated gift, perfect for sharing or indulging in a moment of pure sweetness.",
      "Kindly refer to the Allergens page (located at the bottom of the site) for more product information.",
    ],
    storageLabel: "Storage Information:",
    storageText: "Macarons can be stored for up to 4 days in the Chiller.",
    priceThb: null,
    priceMinor: null,
    imagePlaceholder: "/product-placeholder.svg",
    available: true,
    modifierGroups: [
      {
        id: "choice-of-macarons",
        title: "Choice of Macarons:",
        requiredText: "Please select 8",
        type: "quantity",
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
        id: "incidental-damage",
        title: "Incidental damage might occur during delivery",
        requiredText: "Please select 1",
        type: "radio",
        options: [
          "[Incidental damage might occur during delivery] I acknowledge & agree to proceed with my order.",
        ],
      },
      {
        id: "gifting-ribbon",
        title: "Add a Gifting Ribbon Bow:",
        requiredText: null,
        type: "radio",
        options: ["1 x Gifting Ribbon Bow (M)"],
      },
      {
        id: "packing-options",
        title: "Upgrade Packing Options:",
        requiredText: null,
        type: "quantity",
        options: ["+2 Ice Packs (+2 hrs)", "+5 Ice Packs (+4 hrs)"],
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
