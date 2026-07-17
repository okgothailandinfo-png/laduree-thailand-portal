import type { Boutique } from "@/src/server/models/boutique";
import type { Cart } from "@/src/server/models/cart";
import type { Category } from "@/src/server/models/category";
import type { Order } from "@/src/server/models/order";
import type {
  PickupAvailability,
  PickupSlotRecord,
} from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";

export interface ProductRepository {
  /** Active/available products only. */
  list(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
}

export interface CategoryRepository {
  /** Active categories (all rows until an isActive column exists). */
  list(): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
}

export interface BoutiqueRepository {
  /** Active boutiques (all rows until an isActive column exists). */
  list(): Promise<Boutique[]>;
  findById(id: string): Promise<Boutique | null>;
  findByCode(code: string): Promise<Boutique | null>;
}

export interface PickupRepository {
  getAvailability(params: {
    boutiqueId: string;
    dateKey: string;
  }): Promise<PickupAvailability | null>;
  listSlots(): Promise<PickupAvailability["slots"]>;
  findSlotById(id: string): Promise<PickupSlotRecord | null>;
}

export interface OrderRepository {
  create(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByOrderNumber(orderNumber: string): Promise<Order | null>;
}

export interface CartRepository {
  findById(id: string): Promise<Cart | null>;
  save(cart: Cart): Promise<Cart>;
  delete(id: string): Promise<void>;
}

export type RepositoryBundle = {
  products: ProductRepository;
  categories: CategoryRepository;
  boutiques: BoutiqueRepository;
  pickup: PickupRepository;
  orders: OrderRepository;
  carts: CartRepository;
};
