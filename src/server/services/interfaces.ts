import type {
  AddCartItemRequestDto,
  BoutiqueDto,
  CartDto,
  CategoryDto,
  CheckoutRequestDto,
  CheckoutResponseDto,
  CreateOrderRequestDto,
  OrderCompletionDto,
  OrderDto,
  OrderHistoryItemDto,
  PickupAvailabilityDto,
  ProductDetailDto,
  ProductSummaryDto,
  UpdateCartItemRequestDto,
} from "@/src/server/types/dto";

export interface ProductService {
  listProducts(): Promise<ProductSummaryDto[]>;
  getProductBySlug(slug: string): Promise<ProductDetailDto>;
  /** Active + available + purchasable products only — sitemap / public SEO. */
  listIndexableProducts(): Promise<Array<{ slug: string }>>;
}

export interface CategoryService {
  listCategories(): Promise<CategoryDto[]>;
}

export interface BoutiqueService {
  listBoutiques(): Promise<BoutiqueDto[]>;
}

export interface PickupService {
  getAvailability(params: {
    boutiqueId: string;
    dateKey: string;
  }): Promise<PickupAvailabilityDto>;
}

export interface OrderService {
  createOrder(input: CreateOrderRequestDto): Promise<OrderDto>;
  getOrderById(id: string): Promise<OrderDto>;
  getOrderByOrderNumber(orderNumber: string): Promise<OrderDto>;
  /** Promote DRAFT-* → final customer number after durable payment success. */
  promoteDraftOrderNumber(
    id: string,
  ): Promise<import("@/src/server/models/order").Order>;
  getOrderCompletion(id: string): Promise<OrderCompletionDto>;
  listOrderHistory(ids: string[]): Promise<OrderHistoryItemDto[]>;
}

export interface CartService {
  getCart(cartId?: string): Promise<CartDto>;
  addItem(
    cartId: string | undefined,
    input: AddCartItemRequestDto,
  ): Promise<CartDto>;
  updateItem(
    cartId: string | undefined,
    itemId: string,
    input: UpdateCartItemRequestDto,
  ): Promise<CartDto>;
  removeItem(cartId: string | undefined, itemId: string): Promise<CartDto>;
  clearCart(cartId: string | undefined): Promise<CartDto>;
}

export interface CheckoutService {
  createDraftCheckout(
    cartId: string | undefined,
    input: CheckoutRequestDto,
  ): Promise<CheckoutResponseDto>;
}
