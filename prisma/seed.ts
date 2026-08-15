/**
 * Development seed — Thailand Product Master Safe-Draft (Sprint 33C).
 * Not production pricing, live availability, or approved delivery eligibility.
 * Rerunnable via upsert on unique keys.
 *
 * Run: npm run db:seed
 * Refused when APP_ENV=production (Sprint 31 fail-closed).
 */

import { PrismaClient, type ProductBehavior } from "@prisma/client";
import { assertThailandCatalogReady } from "../lib/catalog/thailand-product-import";
import { assertDatabaseSeedAllowed } from "../src/server/hardening/deploy-readiness";

assertDatabaseSeedAllowed();

const prisma = new PrismaClient();
const catalog = assertThailandCatalogReady();

/** Deterministic UUID v5-like for rerunnable seed keys (not cryptographic). */
function stableUuid(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hex = seed
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0).toString(16).padStart(2, "0"), "")
    .padEnd(32, "0")
    .slice(0, 32)
    .replace(/[^0-9a-f]/gi, "a")
    .toLowerCase();
  // Mix hash into first segment for uniqueness across short seeds.
  const mixed = (hash.toString(16).padStart(8, "0") + hex).slice(0, 32);
  return `${mixed.slice(0, 8)}-${mixed.slice(8, 12)}-4${mixed.slice(13, 16)}-a${mixed.slice(17, 20)}-${mixed.slice(20, 32)}`;
}

const IDS = {
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
  const bySlug = new Map<string, string>();

  for (const category of catalog.categories) {
    if (category.slug === "all-items") {
      // Browse aggregate is storefront-only; skip Prisma category row.
      continue;
    }
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      },
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
  for (const product of catalog.products) {
    const categorySlug = catalog.categories.find(
      (c) => c.id === product.categoryId,
    )?.slug;
    if (!categorySlug) {
      throw new Error(`Missing category for product ${product.sku}`);
    }
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) {
      throw new Error(`Missing seeded category: ${categorySlug}`);
    }

    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        categoryId,
        slug: product.slug,
        sku: product.sku,
        title: product.title,
        description: [...product.description],
        allergenLabel: product.allergenLabel,
        allergenText: product.allergenText,
        storageLabel: product.storageLabel,
        storageText: product.storageText || null,
        priceMinor: product.priceMinor,
        currency: "THB",
        isActive: product.isActive,
        available: product.available,
        deliveryEligible: product.deliveryEligible,
        productBehavior: product.productBehavior as ProductBehavior,
        packSize: product.packSize,
        sortOrder: product.sortOrder,
        modifierGroupsJson: product.modifierGroups,
      },
      update: {
        categoryId,
        sku: product.sku,
        title: product.title,
        description: [...product.description],
        allergenLabel: product.allergenLabel,
        allergenText: product.allergenText,
        storageLabel: product.storageLabel,
        storageText: product.storageText || null,
        priceMinor: product.priceMinor,
        currency: "THB",
        isActive: product.isActive,
        available: product.available,
        deliveryEligible: product.deliveryEligible,
        productBehavior: product.productBehavior as ProductBehavior,
        packSize: product.packSize,
        sortOrder: product.sortOrder,
        modifierGroupsJson: product.modifierGroups,
      },
    });

    const mediaId = stableUuid(`media:${product.sku}`);
    const imageId = stableUuid(`image:${product.sku}`);
    const altText = product.images[0]?.altText ?? product.title;

    await prisma.media.upsert({
      where: { id: mediaId },
      create: {
        id: mediaId,
        url: "/product-placeholder.svg",
        altText: `${altText} (placeholder)`,
        title: product.title,
        isActive: true,
      },
      update: {
        url: "/product-placeholder.svg",
        altText: `${altText} (placeholder)`,
        title: product.title,
        isActive: true,
      },
    });

    await prisma.productImage.upsert({
      where: { id: imageId },
      create: {
        id: imageId,
        productId: row.id,
        mediaId,
        url: "/product-placeholder.svg",
        altText: `${altText} (placeholder)`,
        sortOrder: 0,
        isPrimary: true,
      },
      update: {
        productId: row.id,
        mediaId,
        url: "/product-placeholder.svg",
        altText: `${altText} (placeholder)`,
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
  const dateKeys = bangkokDateKeys(7);

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

async function seedHomepageCms() {
  const sections = [
    {
      id: "66666666-6666-4666-8666-666666666601",
      key: "announcement",
      title: "Announcement",
      subtitle: null as string | null,
      description: null as string | null,
      sortOrder: 1,
      isActive: true,
    },
    {
      id: "66666666-6666-4666-8666-666666666602",
      key: "chef_recommendation",
      title: "Recommended",
      subtitle: null as string | null,
      description: null as string | null,
      sortOrder: 2,
      isActive: true,
    },
    {
      id: "66666666-6666-4666-8666-666666666603",
      key: "catalog",
      title: "Menu",
      subtitle: null as string | null,
      description: null as string | null,
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const section of sections) {
    await prisma.homepageSection.upsert({
      where: { key: section.key },
      create: section,
      update: {
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        sortOrder: section.sortOrder,
        isActive: section.isActive,
      },
    });
  }

  const contentRows = [
    {
      id: "77777777-7777-4777-8777-777777777701",
      key: "brand.display_name",
      value: "[CONTENT PENDING APPROVAL]",
      contentType: "plain_text" as const,
      isActive: true,
    },
    {
      id: "77777777-7777-4777-8777-777777777702",
      key: "announcement.greeting",
      value: "Dear Valued Ladurée Customers",
      contentType: "plain_text" as const,
      isActive: true,
    },
    {
      id: "77777777-7777-4777-8777-777777777703",
      key: "announcement.body",
      value: "[CONTENT PENDING APPROVAL]",
      contentType: "multiline_text" as const,
      isActive: true,
    },
    {
      id: "77777777-7777-4777-8777-777777777704",
      key: "announcement.summary_title",
      value: "[CONTENT PENDING APPROVAL]",
      contentType: "plain_text" as const,
      isActive: true,
    },
    {
      id: "77777777-7777-4777-8777-777777777705",
      key: "announcement.closing",
      value: "Thank you for your support and understanding!",
      contentType: "plain_text" as const,
      isActive: true,
    },
    {
      id: "77777777-7777-4777-8777-777777777706",
      key: "catalog.default_section_description",
      value: "[CONTENT PENDING APPROVAL]",
      contentType: "plain_text" as const,
      isActive: true,
    },
  ];

  for (const row of contentRows) {
    await prisma.homepageContent.upsert({
      where: { key: row.key },
      create: row,
      update: {
        value: row.value,
        contentType: row.contentType,
        isActive: row.isActive,
      },
    });
  }
}

async function main() {
  console.log("Seeding Thailand Product Master Safe-Draft (Sprint 33C)…");
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  const boutiqueIds = await seedBoutiques();
  await seedPickupSlots(boutiqueIds);
  await seedHomepageCms();
  console.log(
    `Seed complete: ${catalog.products.length} LDR products, Thailand categories, boutiques, slots, homepage CMS.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
