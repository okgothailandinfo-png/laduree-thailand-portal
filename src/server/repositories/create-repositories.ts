import { isPublicPreview } from "@/lib/preview/public-preview";
import { getDataSource } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";
import type { RepositoryBundle } from "@/src/server/repositories/interfaces";
import { MockBoutiqueRepository } from "@/src/server/repositories/mock/boutique.repository";
import { MockCartRepository } from "@/src/server/repositories/mock/cart.repository";
import { PreviewCookieCartRepository } from "@/src/server/preview/preview-cart-repository";
import { PreviewCookieOrderRepository } from "@/src/server/preview/preview-order-repository";
import { PreviewCookiePaymentRepository } from "@/src/server/preview/preview-payment-repository";
import { MockCategoryRepository } from "@/src/server/repositories/mock/category.repository";
import { MockHomepageBannerRepository } from "@/src/server/repositories/mock/homepage-banner.repository";
import { MockHomepageContentRepository } from "@/src/server/repositories/mock/homepage-content.repository";
import { MockHomepageSectionRepository } from "@/src/server/repositories/mock/homepage-section.repository";
import { MockMediaRepository } from "@/src/server/repositories/mock/media.repository";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPaymentRepository } from "@/src/server/repositories/mock/payment.repository";
import { MockPickupRepository } from "@/src/server/repositories/mock/pickup.repository";
import { MockPickupVerificationRepository } from "@/src/server/repositories/mock/pickup-verification.repository";
import { MockProductRepository } from "@/src/server/repositories/mock/product.repository";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";
import { PrismaWebhookEventRepository } from "@/src/server/repositories/prisma/webhook-event.repository";
import {
  MockNotificationQueueRepository,
  MockNotificationSettingRepository,
} from "@/src/server/repositories/mock/notification.repository";
import { PrismaBoutiqueRepository } from "@/src/server/repositories/prisma/boutique.repository";
import { PrismaCartRepository } from "@/src/server/repositories/prisma/cart.repository";
import { PrismaCategoryRepository } from "@/src/server/repositories/prisma/category.repository";
import { PrismaHomepageBannerRepository } from "@/src/server/repositories/prisma/homepage-banner.repository";
import { PrismaHomepageContentRepository } from "@/src/server/repositories/prisma/homepage-content.repository";
import { PrismaHomepageSectionRepository } from "@/src/server/repositories/prisma/homepage-section.repository";
import { PrismaMediaRepository } from "@/src/server/repositories/prisma/media.repository";
import { PrismaOrderRepository } from "@/src/server/repositories/prisma/order.repository";
import { PrismaPaymentRepository } from "@/src/server/repositories/prisma/payment.repository";
import { PrismaPickupRepository } from "@/src/server/repositories/prisma/pickup.repository";
import { PrismaPickupVerificationRepository } from "@/src/server/repositories/prisma/pickup-verification.repository";
import { PrismaProductRepository } from "@/src/server/repositories/prisma/product.repository";
import {
  PrismaNotificationQueueRepository,
  PrismaNotificationSettingRepository,
} from "@/src/server/repositories/prisma/notification.repository";
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
    orders: new PreviewCookieOrderRepository(new MockOrderRepository()),
    pickupVerifications: new MockPickupVerificationRepository(),
    // Cart / gateway payments / webhook idempotency — in-memory until persistent models exist.
    carts: new PreviewCookieCartRepository(new MockCartRepository()),
    payments: new PreviewCookiePaymentRepository(new MockPaymentRepository()),
    webhookEvents: new MockWebhookEventRepository(),
    notificationQueue: new MockNotificationQueueRepository(),
    notificationSettings: new MockNotificationSettingRepository(),
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
    pickupVerifications: new PrismaPickupVerificationRepository(),
    notificationQueue: new PrismaNotificationQueueRepository(),
    notificationSettings: new PrismaNotificationSettingRepository(),
    // Sprint 26: durable cart + gateway payments under prisma.
    carts: new PrismaCartRepository(),
    payments: new PrismaPaymentRepository(),
    webhookEvents: new PrismaWebhookEventRepository(),
  };
}

/**
 * Selects mock or Prisma repository implementations from DATA_SOURCE.
 * Admin Product/Category CRUD requires DATA_SOURCE=prisma.
 * Sprint 21 Delivery Foundation: use DATA_SOURCE=mock while DATABASE_URL is empty
 * (delivery Prisma migration is Pending Infrastructure).
 * See docs/backend-repositories.md for selection rules.
 */
export function createRepositories(): RepositoryBundle {
  const source = getDataSource();
  if (isPublicPreview() && source === "prisma") {
    throw new AppError(
      "CONFIG_ERROR",
      "DATA_SOURCE=prisma is not allowed in public preview. Preview commerce uses DATA_SOURCE=mock only.",
      { status: 500 },
    );
  }
  logger.info("Creating repository bundle", { dataSource: source });

  if (source === "prisma") {
    return createPrismaRepositories();
  }

  return createMockRepositories();
}
