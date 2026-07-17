import { env } from "@/src/server/config/env";
import { createRepositories } from "@/src/server/repositories/create-repositories";
import { AdminCategoryService } from "@/src/server/admin/category.service";
import { AdminProductService } from "@/src/server/admin/product.service";
import { PaymentService } from "@/src/server/payment/payment-service";
import { DefaultBoutiqueService } from "@/src/server/services/boutique.service";
import { DefaultCartService } from "@/src/server/services/cart.service";
import { DefaultCategoryService } from "@/src/server/services/category.service";
import { DefaultCheckoutService } from "@/src/server/services/checkout.service";
import { DefaultOrderService } from "@/src/server/services/order.service";
import { DefaultPickupService } from "@/src/server/services/pickup.service";
import { DefaultProductService } from "@/src/server/services/product.service";

const repositories = createRepositories();

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
export const paymentService = new PaymentService(
  repositories.orders,
  repositories.payments,
  repositories.webhookEvents,
  env.mockPaymentWebhookSecret,
  env.mockPaymentWebhookToleranceSeconds,
);
export const adminProductService = new AdminProductService(
  repositories.products,
  repositories.categories,
);
export const adminCategoryService = new AdminCategoryService(
  repositories.categories,
  repositories.products,
);
