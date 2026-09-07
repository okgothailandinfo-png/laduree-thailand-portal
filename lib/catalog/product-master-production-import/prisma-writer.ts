/**
 * Prisma CatalogWriter for Production Product Master execute.
 * Instantiated only after write guards and commercial preflight pass.
 * Never logs DATABASE_URL. Not imported by seed, Next.js runtime, or dry-run.
 */

import type {
  CatalogTx,
  CatalogWriter,
  PlannedCategory,
  PlannedProduct,
} from "@/lib/catalog/product-master-production-import/core";
import { Prisma, PrismaClient } from "@prisma/client";

function adaptTx(tx: Prisma.TransactionClient): CatalogTx {
  return {
    async findCategoryBySlug(slug: string) {
      const row = await tx.category.findUnique({ where: { slug } });
      return row ? { id: row.id, name: row.name, slug: row.slug } : null;
    },
    async createCategory(input: PlannedCategory) {
      const row = await tx.category.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
      });
      return { id: row.id, name: row.name, slug: row.slug };
    },
    async findExistingSkus(skus: string[]) {
      const rows = await tx.product.findMany({
        where: { sku: { in: skus } },
        select: { sku: true },
      });
      return rows.map((row) => row.sku);
    },
    async createProduct(input: PlannedProduct, categoryId: string) {
      const row = await tx.product.create({
        data: {
          categoryId,
          slug: input.slug,
          sku: input.sku,
          title: input.title,
          description: input.description,
          allergenLabel: input.allergenLabel,
          allergenText: input.allergenText,
          storageLabel: input.storageLabel,
          storageText: input.storageText,
          priceMinor: input.priceMinor,
          currency: input.currency,
          isActive: input.isActive,
          available: input.available,
          deliveryEligible: input.deliveryEligible,
          productBehavior: input.productBehavior,
          packSize: input.packSize,
          sortOrder: input.sortOrder,
          modifierGroupsJson: input.modifierGroups,
        },
      });
      return { id: row.id, sku: row.sku };
    },
  };
}

export type PrismaCatalogWriter = CatalogWriter & {
  disconnect(): Promise<void>;
};

/** Prisma interactive $transaction defaults to 5000 ms; too short for 8+38 Neon inserts. */
export const PRODUCT_MASTER_IMPORT_TX_MAX_WAIT_MS = 10_000;
export const PRODUCT_MASTER_IMPORT_TX_TIMEOUT_MS = 30_000;

export function createPrismaCatalogWriter(): PrismaCatalogWriter {
  const prisma = new PrismaClient({ log: ["error"] });
  return {
    transaction(fn) {
      return prisma.$transaction((tx) => fn(adaptTx(tx)), {
        maxWait: PRODUCT_MASTER_IMPORT_TX_MAX_WAIT_MS,
        timeout: PRODUCT_MASTER_IMPORT_TX_TIMEOUT_MS,
      });
    },
    async disconnect() {
      await prisma.$disconnect();
    },
  };
}
