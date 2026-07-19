import { env } from "@/src/server/config/env";
import { createRepositories } from "@/src/server/repositories/create-repositories";
import { AdminBannerService } from "@/src/server/admin/banner.service";
import { AdminCategoryService } from "@/src/server/admin/category.service";
import { AdminHomepageService } from "@/src/server/admin/homepage.service";
import { AdminMediaService } from "@/src/server/admin/media.service";
import { AdminOrderService } from "@/src/server/admin/order.service";
import { AdminProductService } from "@/src/server/admin/product.service";
import { PaymentService } from "@/src/server/payment/payment-service";
import { PickupVerificationService } from "@/src/server/pickup/pickup-verification.service";
import { DefaultBoutiqueService } from "@/src/server/services/boutique.service";
import { DefaultCartService } from "@/src/server/services/cart.service";
import { DefaultCategoryService } from "@/src/server/services/category.service";
import { DefaultCheckoutService } from "@/src/server/services/checkout.service";
import { DefaultHomepageService } from "@/src/server/services/homepage.service";
import { DefaultOrderService } from "@/src/server/services/order.service";
import { DefaultPickupService } from "@/src/server/services/pickup.service";
import { DefaultProductService } from "@/src/server/services/product.service";
import { createStorageProvider } from "@/src/server/storage/factory";
import { StorageService } from "@/src/server/storage/storage-service";

const repositories = createRepositories();
const storageService = new StorageService(createStorageProvider());

export const productService = new DefaultProductService(repositories.products);
export const categoryService = new DefaultCategoryService(
  repositories.categories,
);
export const boutiqueService = new DefaultBoutiqueService(
  repositories.boutiques,
);
export const pickupService = new DefaultPickupService(
  repositories.pickup,
  repositories.boutiques,
);
export const orderService = new DefaultOrderService(
  repositories.orders,
  repositories.products,
  repositories.boutiques,
  repositories.pickup,
);
export const cartService = new DefaultCartService(
  repositories.carts,
  repositories.products,
);
export const checkoutService = new DefaultCheckoutService(
  repositories.carts,
  repositories.products,
  repositories.boutiques,
  repositories.pickup,
  repositories.orders,
);
export const pickupVerificationService = new PickupVerificationService(
  repositories.pickupVerifications,
  repositories.orders,
);
export const paymentService = new PaymentService(
  repositories.orders,
  repositories.payments,
  repositories.webhookEvents,
  env.mockPaymentWebhookSecret,
  env.mockPaymentWebhookToleranceSeconds,
  undefined,
  pickupVerificationService,
);
export const adminProductService = new AdminProductService(
  repositories.products,
  repositories.categories,
);
export const adminCategoryService = new AdminCategoryService(
  repositories.categories,
  repositories.products,
);
export const adminMediaService = new AdminMediaService(
  repositories.media,
  storageService,
);
export const adminBannerService = new AdminBannerService(
  repositories.homepageBanners,
  repositories.media,
);
export const adminHomepageService = new AdminHomepageService(
  repositories.homepageSections,
  repositories.homepageContent,
);
export const adminOrderService = new AdminOrderService(
  repositories.orders,
  repositories.boutiques,
  pickupVerificationService,
);
export const homepageService = new DefaultHomepageService(
  repositories.homepageBanners,
  repositories.homepageSections,
  repositories.homepageContent,
);
