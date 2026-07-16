import type {
  BoutiqueDto,
  CategoryDto,
  CreateOrderRequestDto,
  OrderDto,
  PickupAvailabilityDto,
  ProductDetailDto,
  ProductSummaryDto,
} from "@/src/server/types/dto";

export interface ProductService {
  listProducts(): Promise<ProductSummaryDto[]>;
  getProductBySlug(slug: string): Promise<ProductDetailDto>;
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
}
