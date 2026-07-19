import type {
  AdminBannerListQuery,
  AdminCategoryListQuery,
  AdminCreateBannerInput,
  AdminCreateCategoryInput,
  AdminCreateHomepageContentInput,
  AdminCreateHomepageSectionInput,
  AdminCreateMediaInput,
  AdminCreateProductInput,
  AdminMediaListQuery,
  AdminKitchenOrderListQuery,
  AdminOrderListQuery,
  AdminProductListQuery,
  AdminUpdateBannerInput,
  AdminUpdateCategoryInput,
  AdminUpdateHomepageContentInput,
  AdminUpdateHomepageSectionInput,
  AdminUpdateMediaInput,
  AdminUpdateProductInput,
} from "@/src/server/admin/dto";
import type { Boutique } from "@/src/server/models/boutique";
import type { Cart } from "@/src/server/models/cart";
import type { Category } from "@/src/server/models/category";
import type {
  HomepageBannerWithMedia,
  HomepageContent,
  HomepageSection,
} from "@/src/server/models/homepage";
import type { Media } from "@/src/server/models/media";
import type {
  Order,
  OrderHistoryEntry,
  OrderStatus,
} from "@/src/server/models/order";
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

export type AdminBannerListPage = {
  items: HomepageBannerWithMedia[];
  total: number;
};

export type AdminOrderListRow = {
  order: Order;
  boutiqueCode: string;
  pickupStartTime: string;
  paymentStatus: "pending" | "mock_accepted" | "failed" | "none";
  paymentId: string | null;
  itemCount: number;
  updatedAt: string;
};

export type AdminOrderListPage = {
  items: AdminOrderListRow[];
  total: number;
};

/** Kitchen board row — same order payload as list, scoped by pickup date. */
export type AdminKitchenOrderRow = AdminOrderListRow;

export type AdminKitchenOrderPage = {
  items: AdminKitchenOrderRow[];
};

export type AdminOrderDetailRecord = {
  order: Order;
  boutiqueCode: string;
  pickupStartTime: string;
  paymentStatus: "pending" | "mock_accepted" | "failed" | "none";
  paymentId: string | null;
  updatedAt: string;
  history: OrderHistoryEntry[];
};

export type OrderStatusUpdateOptions = {
  note?: string | null;
  changedBy?: string | null;
};

export type OrderPaymentUpdateOptions = {
  note?: string | null;
  changedBy?: string | null;
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
  countBannerLinks(mediaId: string): Promise<number>;
}

export interface HomepageBannerRepository {
  adminList(query: AdminBannerListQuery): Promise<AdminBannerListPage>;
  findById(id: string): Promise<HomepageBannerWithMedia | null>;
  create(input: AdminCreateBannerInput): Promise<HomepageBannerWithMedia>;
  update(
    id: string,
    input: AdminUpdateBannerInput,
  ): Promise<HomepageBannerWithMedia>;
  remove(id: string): Promise<void>;
  /** Storefront: active banners within schedule window, ordered by sortOrder. */
  listActiveForStorefront(now: Date): Promise<HomepageBannerWithMedia[]>;
}

export interface HomepageSectionRepository {
  adminList(): Promise<HomepageSection[]>;
  findById(id: string): Promise<HomepageSection | null>;
  findByKey(key: string): Promise<HomepageSection | null>;
  create(input: AdminCreateHomepageSectionInput): Promise<HomepageSection>;
  update(
    id: string,
    input: AdminUpdateHomepageSectionInput,
  ): Promise<HomepageSection>;
  remove(id: string): Promise<void>;
  listActiveForStorefront(): Promise<HomepageSection[]>;
}

export interface HomepageContentRepository {
  adminList(): Promise<HomepageContent[]>;
  findById(id: string): Promise<HomepageContent | null>;
  findByKey(key: string): Promise<HomepageContent | null>;
  create(input: AdminCreateHomepageContentInput): Promise<HomepageContent>;
  update(
    id: string,
    input: AdminUpdateHomepageContentInput,
  ): Promise<HomepageContent>;
  remove(id: string): Promise<void>;
  listActiveForStorefront(): Promise<HomepageContent[]>;
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
  updateStatus(
    id: string,
    status: OrderStatus,
    options?: OrderStatusUpdateOptions,
  ): Promise<Order>;
  updatePaymentStatus(
    orderId: string,
    status: "pending" | "mock_accepted" | "failed",
    options?: OrderPaymentUpdateOptions,
  ): Promise<AdminOrderDetailRecord>;
  adminList(query: AdminOrderListQuery): Promise<AdminOrderListPage>;
  adminKitchenList(
    query: AdminKitchenOrderListQuery,
  ): Promise<AdminKitchenOrderPage>;
  adminFindById(id: string): Promise<AdminOrderDetailRecord | null>;
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
  homepageBanners: HomepageBannerRepository;
  homepageSections: HomepageSectionRepository;
  homepageContent: HomepageContentRepository;
  boutiques: BoutiqueRepository;
  pickup: PickupRepository;
  orders: OrderRepository;
  carts: CartRepository;
  payments: PaymentRepository;
  webhookEvents: WebhookEventRepository;
};
