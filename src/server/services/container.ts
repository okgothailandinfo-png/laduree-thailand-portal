import { MockBoutiqueRepository } from "@/src/server/repositories/mock/boutique.repository";
import { MockCategoryRepository } from "@/src/server/repositories/mock/category.repository";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPickupRepository } from "@/src/server/repositories/mock/pickup.repository";
import { MockProductRepository } from "@/src/server/repositories/mock/product.repository";
import { DefaultBoutiqueService } from "@/src/server/services/boutique.service";
import { DefaultCategoryService } from "@/src/server/services/category.service";
import { DefaultOrderService } from "@/src/server/services/order.service";
import { DefaultPickupService } from "@/src/server/services/pickup.service";
import { DefaultProductService } from "@/src/server/services/product.service";

const productRepository = new MockProductRepository();
const categoryRepository = new MockCategoryRepository();
const boutiqueRepository = new MockBoutiqueRepository();
const pickupRepository = new MockPickupRepository();
const orderRepository = new MockOrderRepository();

export const productService = new DefaultProductService(productRepository);
export const categoryService = new DefaultCategoryService(categoryRepository);
export const boutiqueService = new DefaultBoutiqueService(boutiqueRepository);
export const pickupService = new DefaultPickupService(
  pickupRepository,
  boutiqueRepository,
);
export const orderService = new DefaultOrderService(
  orderRepository,
  productRepository,
  boutiqueRepository,
  pickupRepository,
);
