import type {
  AdminCategoryListQuery,
  AdminCreateCategoryInput,
  AdminCreateMediaInput,
  AdminCreateProductInput,
  AdminMediaListQuery,
  AdminProductListQuery,
  AdminUpdateCategoryInput,
  AdminUpdateMediaInput,
  AdminUpdateProductInput,
} from "@/src/server/admin/dto";
import type { Boutique } from "@/src/server/models/boutique";
import type { Cart } from "@/src/server/models/cart";
import type { Category } from "@/src/server/models/category";
import type { Media } from "@/src/server/models/media";
import type { Order, OrderStatus } from "@/src/server/models/order";
import type {
  PickupAvailability,
  PickupSlotRecord,
} from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import type { WebhookEventRepository } from "@/src/server/repositories/webhook-event.repository";

export type AdminProductListRow = {
  product: Product;
  categoryName: string;
};

export type AdminProductListPage = {
  items: AdminProductListRow[];
  total: number;
};

export type AdminCategoryListRow = {
  category: Category;
  productCount: number;
};

export type AdminCategoryListPage = {
  items: AdminCategoryListRow[];
  total: number;
};

export type AdminMediaListPage = {
  items: Media[];
  total: number;
};

export interface ProductRepository {
  /** Storefront: active + available products only. */
  list(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  adminList(query: AdminProductListQuery): Promise<AdminProductListPage>;
  create(input: AdminCreateProductInput): Promise<Product>;
  update(id: string, input: AdminUpdateProductInput): Promise<Product>;
  /** Soft-deactivate when order history exists; otherwise hard-delete. */
  remove(id: string): Promise<{ mode: "deleted" | "deactivated"; product: Product | null }>;
  countByCategoryId(categoryId: string): Promise<number>;
}

export interface CategoryRepository {
  /** Storefront: active categories only. */
  list(): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
  findById(id: string): Promise<Category | null>;
  adminList(query: AdminCategoryListQuery): Promise<AdminCategoryListPage>;
  create(input: AdminCreateCategoryInput): Promise<Category>;
  update(id: string, input: AdminUpdateCategoryInput): Promise<Category>;
  remove(id: string): Promise<void>;
}

export interface MediaRepository {
  findById(id: string): Promise<Media | null>;
  findByIds(ids: string[]): Promise<Media[]>;
  adminList(query: AdminMediaListQuery): Promise<AdminMediaListPage>;
  create(input: AdminCreateMediaInput): Promise<Media>;
  update(id: string, input: AdminUpdateMediaInput): Promise<Media>;
  remove(id: string): Promise<void>;
  countProductLinks(mediaId: string): Promise<number>;
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
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
}

export interface CartRepository {
  findById(id: string): Promise<Cart | null>;
  save(cart: Cart): Promise<Cart>;
  delete(id: string): Promise<void>;
}

export type RepositoryBundle = {
  products: ProductRepository;
  categories: CategoryRepository;
  media: MediaRepository;
  boutiques: BoutiqueRepository;
  pickup: PickupRepository;
  orders: OrderRepository;
  carts: CartRepository;
  payments: PaymentRepository;
  webhookEvents: WebhookEventRepository;
};
