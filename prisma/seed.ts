/**
 * Development seed only — placeholder catalog/ops data.
 * Not production Thailand pricing, legal copy, or real customer data.
 * Rerunnable via upsert on unique keys.
 *
 * Run: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Stable UUIDs so seed upserts remain idempotent. */
const IDS = {
  categories: {
    macarons: "11111111-1111-4111-8111-111111111101",
    chocolates: "11111111-1111-4111-8111-111111111102",
    tea: "11111111-1111-4111-8111-111111111103",
    giftBoxes: "11111111-1111-4111-8111-111111111104",
  },
  products: {
    placeholderMacaron: "22222222-2222-4222-8222-222222222201",
    placeholderChocolate: "22222222-2222-4222-8222-222222222202",
    placeholderTea: "22222222-2222-4222-8222-222222222203",
    placeholderGift: "22222222-2222-4222-8222-222222222204",
  },
  images: {
    macaron: "33333333-3333-4333-8333-333333333301",
    chocolate: "33333333-3333-4333-8333-333333333302",
    tea: "33333333-3333-4333-8333-333333333303",
    gift: "33333333-3333-4333-8333-333333333304",
  },
  boutiques: {
    flagship: "44444444-4444-4444-8444-444444444401",
    embassy: "44444444-4444-4444-8444-444444444402",
    iconsiam: "44444444-4444-4444-8444-444444444403",
  },
} as const;

function bangkokDateKeys(count = 3): string[] {
  const bangkokToday = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
  );
  const start = new Date(
    bangkokToday.getFullYear(),
    bangkokToday.getMonth(),
    bangkokToday.getDate(),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getTime() + index * dayMs);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
}

async function seedCategories() {
  const definitions = [
    {
      id: IDS.categories.macarons,
      name: "Macarons",
      slug: "macarons",
      description: null as string | null,
      sortOrder: 1,
      isActive: true,
    },
    {
      id: IDS.categories.chocolates,
      name: "Chocolates",
      slug: "chocolates",
      description: null as string | null,
      sortOrder: 2,
      isActive: true,
    },
    {
      id: IDS.categories.tea,
      name: "Tea",
      slug: "tea",
      description: null as string | null,
      sortOrder: 3,
      isActive: true,
    },
    {
      id: IDS.categories.giftBoxes,
      name: "Gift Boxes",
      slug: "gift-boxes",
      description: null as string | null,
      sortOrder: 4,
      isActive: true,
    },
  ] as const;

  const bySlug = new Map<string, string>();

  for (const category of definitions) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      },
    });
    bySlug.set(category.slug, row.id);
  }

  return bySlug;
}

async function seedProducts(categoryIds: Map<string, string>) {
  const definitions = [
    {
      id: IDS.products.placeholderMacaron,
      categorySlug: "macarons",
      slug: "dev-placeholder-macaron-box",
      sku: "DEV-MACARON-BOX",
      title: "[DEV] Placeholder Macaron Box",
      description: [
        "[CONTENT PENDING APPROVAL] Development placeholder product description.",
      ],
      storageLabel: "Storage Information:",
      storageText: "[CONTENT PENDING APPROVAL]",
      priceMinor: 129000,
      sortOrder: 1,
      imageId: IDS.images.macaron,
    },
    {
      id: IDS.products.placeholderChocolate,
      categorySlug: "chocolates",
      slug: "dev-placeholder-chocolate-selection",
      sku: "DEV-CHOCOLATE-SEL",
      title: "[DEV] Placeholder Chocolate Selection",
      description: [
        "[CONTENT PENDING APPROVAL] Development placeholder product description.",
      ],
      storageLabel: "Storage Information:",
      storageText: "[CONTENT PENDING APPROVAL]",
      priceMinor: 159000,
      sortOrder: 2,
      imageId: IDS.images.chocolate,
    },
    {
      id: IDS.products.placeholderTea,
      categorySlug: "tea",
      slug: "dev-placeholder-tea-tin",
      sku: "DEV-TEA-TIN",
      title: "[DEV] Placeholder Tea Tin",
      description: [
        "[CONTENT PENDING APPROVAL] Development placeholder product description.",
      ],
      storageLabel: "Storage Information:",
      storageText: "[CONTENT PENDING APPROVAL]",
      priceMinor: 89000,
      sortOrder: 3,
      imageId: IDS.images.tea,
    },
    {
      id: IDS.products.placeholderGift,
      categorySlug: "gift-boxes",
      slug: "dev-placeholder-gift-box",
      sku: "DEV-GIFT-BOX",
      title: "[DEV] Placeholder Gift Box",
      description: [
        "[CONTENT PENDING APPROVAL] Development placeholder product description.",
      ],
      storageLabel: "Storage Information:",
      storageText: "[CONTENT PENDING APPROVAL]",
      priceMinor: 199000,
      sortOrder: 4,
      imageId: IDS.images.gift,
    },
  ] as const;

  for (const product of definitions) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing seeded category: ${product.categorySlug}`);
    }

    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        id: product.id,
        categoryId,
        slug: product.slug,
        sku: product.sku,
        title: product.title,
        description: [...product.description],
        storageLabel: product.storageLabel,
        storageText: product.storageText,
        priceMinor: product.priceMinor,
        currency: "THB",
        isActive: true,
        available: true,
        sortOrder: product.sortOrder,
      },
      update: {
        categoryId,
        sku: product.sku,
        title: product.title,
        description: [...product.description],
        storageLabel: product.storageLabel,
        storageText: product.storageText,
        priceMinor: product.priceMinor,
        currency: "THB",
        isActive: true,
        available: true,
        sortOrder: product.sortOrder,
      },
    });

    await prisma.productImage.upsert({
      where: { id: product.imageId },
      create: {
        id: product.imageId,
        productId: row.id,
        url: "/product-placeholder.svg",
        altText: `${product.title} placeholder image`,
        sortOrder: 0,
        isPrimary: true,
      },
      update: {
        productId: row.id,
        url: "/product-placeholder.svg",
        altText: `${product.title} placeholder image`,
        sortOrder: 0,
        isPrimary: true,
      },
    });
  }
}

async function seedBoutiques() {
  const definitions = [
    {
      id: IDS.boutiques.flagship,
      name: "Bangkok Flagship",
      code: "BKK-FLAGSHIP-DEV",
      address: "[ADDRESS PENDING APPROVAL]",
      openingHours: "[CONTENT PENDING APPROVAL]",
      lastOrderTime: "[CONTENT PENDING APPROVAL]",
    },
    {
      id: IDS.boutiques.embassy,
      name: "Central Embassy",
      code: "BKK-EMBASSY-DEV",
      address: "[ADDRESS PENDING APPROVAL]",
      openingHours: "[CONTENT PENDING APPROVAL]",
      lastOrderTime: "[CONTENT PENDING APPROVAL]",
    },
    {
      id: IDS.boutiques.iconsiam,
      name: "ICONSIAM",
      code: "BKK-ICONSIAM-DEV",
      address: "[ADDRESS PENDING APPROVAL]",
      openingHours: "[CONTENT PENDING APPROVAL]",
      lastOrderTime: "[CONTENT PENDING APPROVAL]",
    },
  ] as const;

  const boutiqueIds: string[] = [];

  for (const boutique of definitions) {
    const row = await prisma.boutique.upsert({
      where: { code: boutique.code },
      create: boutique,
      update: {
        name: boutique.name,
        address: boutique.address,
        openingHours: boutique.openingHours,
        lastOrderTime: boutique.lastOrderTime,
      },
    });
    boutiqueIds.push(row.id);
  }

  return boutiqueIds;
}

async function seedPickupSlots(boutiqueIds: string[]) {
  const dateKeys = bangkokDateKeys(3);

  const templates = [
    {
      startTime: "10:00",
      endTime: "10:30",
      label: "10:00–10:30",
      capacity: 10,
    },
    {
      startTime: "10:30",
      endTime: "11:00",
      label: "10:30–11:00",
      /** Fully reserved / unavailable for smoke filtering */
      capacity: 0,
    },
    {
      startTime: "11:00",
      endTime: "11:30",
      label: "11:00–11:30",
      capacity: 5,
    },
  ] as const;

  for (const boutiqueId of boutiqueIds) {
    for (const dateKey of dateKeys) {
      for (const template of templates) {
        await prisma.pickupSlot.upsert({
          where: {
            boutiqueId_dateKey_startTime_endTime: {
              boutiqueId,
              dateKey,
              startTime: template.startTime,
              endTime: template.endTime,
            },
          },
          create: {
            boutiqueId,
            dateKey,
            startTime: template.startTime,
            endTime: template.endTime,
            label: template.label,
            capacity: template.capacity,
          },
          update: {
            label: template.label,
            capacity: template.capacity,
          },
        });
      }
    }
  }
}

async function main() {
  console.log("Seeding development placeholder data…");
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  const boutiqueIds = await seedBoutiques();
  await seedPickupSlots(boutiqueIds);
  console.log("Seed complete (categories, products, images, boutiques, slots).");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
