/**
 * Singapore product-detail shell data (laduree.sg ProductDetail).
 * Structure/wording from Singapore; prices ignored in the UI.
 */
export const SAMPLE_PRODUCT = {
  slug: "napoleon-iii-macaron-8pcs",
  title: "« Napoléon III » Macaron - 8pcs",
  description: [
    "Discover an assortment of 8 iconic Ladurée macarons, offering a delightful journey through timeless flavors. A delicate and sophisticated gift, perfect for sharing or indulging in a moment of pure sweetness.",
    "Kindly refer to the Allergens page (located at the bottom of the site) for more product information.",
  ],
  storageLabel: "Storage Information:",
  storageText: "Macarons can be stored for up to 4 days in the Chiller.",
  imageCount: 4,
  modifierGroups: [
    {
      id: "choice-of-macarons",
      title: "Choice of Macarons:",
      requiredText: "Please select 8",
      type: "quantity" as const,
      exactSelectionQuantity: 8,
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
      type: "radio" as const,
      options: [
        "[Incidental damage might occur during delivery] I acknowledge & agree to proceed with my order.",
      ],
    },
    {
      id: "gifting-ribbon",
      title: "Add a Gifting Ribbon Bow:",
      requiredText: null,
      type: "radio" as const,
      options: ["1 x Gifting Ribbon Bow (M)"],
    },
    {
      id: "packing-options",
      title: "Upgrade Packing Options:",
      requiredText: null,
      type: "quantity" as const,
      options: ["+2 Ice Packs (+2 hrs)", "+5 Ice Packs (+4 hrs)"],
    },
  ],
} as const;
