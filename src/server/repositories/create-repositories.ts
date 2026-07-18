import { getDataSource } from "@/src/server/config/env";
import type { RepositoryBundle } from "@/src/server/repositories/interfaces";
import { MockBoutiqueRepository } from "@/src/server/repositories/mock/boutique.repository";
import { MockCartRepository } from "@/src/server/repositories/mock/cart.repository";
import { MockCategoryRepository } from "@/src/server/repositories/mock/category.repository";
import { MockHomepageBannerRepository } from "@/src/server/repositories/mock/homepage-banner.repository";
import { MockHomepageContentRepository } from "@/src/server/repositories/mock/homepage-content.repository";
import { MockHomepageSectionRepository } from "@/src/server/repositories/mock/homepage-section.repository";
import { MockMediaRepository } from "@/src/server/repositories/mock/media.repository";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPaymentRepository } from "@/src/server/repositories/mock/payment.repository";
import { MockPickupRepository } from "@/src/server/repositories/mock/pickup.repository";
import { MockProductRepository } from "@/src/server/repositories/mock/product.repository";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";
import { PrismaBoutiqueRepository } from "@/src/server/repositories/prisma/boutique.repository";
import { PrismaCategoryRepository } from "@/src/server/repositories/prisma/category.repository";
import { PrismaHomepageBannerRepository } from "@/src/server/repositories/prisma/homepage-banner.repository";
import { PrismaHomepageContentRepository } from "@/src/server/repositories/prisma/homepage-content.repository";
import { PrismaHomepageSectionRepository } from "@/src/server/repositories/prisma/homepage-section.repository";
import { PrismaMediaRepository } from "@/src/server/repositories/prisma/media.repository";
import { PrismaOrderRepository } from "@/src/server/repositories/prisma/order.repository";
import { PrismaPickupRepository } from "@/src/server/repositories/prisma/pickup.repository";
import { PrismaProductRepository } from "@/src/server/repositories/prisma/product.repository";
import { logger } from "@/src/server/utils/logger";

function createMockRepositories(): RepositoryBundle {
  return {
    products: new MockProductRepository(),
    categories: new MockCategoryRepository(),
    media: new MockMediaRepository(),
    homepageBanners: new MockHomepageBannerRepository(),
    homepageSections: new MockHomepageSectionRepository(),
    homepageContent: new MockHomepageContentRepository(),
    boutiques: new MockBoutiqueRepository(),
    pickup: new MockPickupRepository(),
    orders: new MockOrderRepository(),
    // Cart / gateway payments / webhook idempotency — in-memory until persistent models exist.
    carts: new MockCartRepository(),
    payments: new MockPaymentRepository(),
    webhookEvents: new MockWebhookEventRepository(),
  };
}

function createPrismaRepositories(): RepositoryBundle {
  return {
    // Catalog + ops persistence (Admin CMS + storefront reads).
    products: new PrismaProductRepository(),
    categories: new PrismaCategoryRepository(),
    media: new PrismaMediaRepository(),
    homepageBanners: new PrismaHomepageBannerRepository(),
    homepageSections: new PrismaHomepageSectionRepository(),
    homepageContent: new PrismaHomepageContentRepository(),
    boutiques: new PrismaBoutiqueRepository(),
    pickup: new PrismaPickupRepository(),
    orders: new PrismaOrderRepository(),
    // Intentionally in-memory until dedicated Prisma models exist:
    // - Cart has no Prisma model yet
    // - Gateway PaymentRepository is separate from checkout PaymentRecord
    // - Webhook event store is replaceable later
    carts: new MockCartRepository(),
    payments: new MockPaymentRepository(),
    webhookEvents: new MockWebhookEventRepository(),
  };
}

/**
 * Selects mock or Prisma repository implementations from DATA_SOURCE.
 * Admin Product/Category CRUD requires DATA_SOURCE=prisma.
 * See docs/backend-repositories.md for selection rules.
 */
export function createRepositories(): RepositoryBundle {
  const source = getDataSource();
  logger.info("Creating repository bundle", { dataSource: source });

  if (source === "prisma") {
    return createPrismaRepositories();
  }

  return createMockRepositories();
}
