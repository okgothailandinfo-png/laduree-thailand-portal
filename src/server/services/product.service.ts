import type { ProductRepository } from "@/src/server/repositories/interfaces";
import type { ProductService } from "@/src/server/services/interfaces";
import {
  toProductDetailDto,
  toProductSummaryDto,
} from "@/src/server/services/mappers";
import type {
  ProductDetailDto,
  ProductSummaryDto,
} from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";
import { requireString } from "@/src/server/utils/validation";

export class DefaultProductService implements ProductService {
  constructor(private readonly products: ProductRepository) {}

  async listProducts(): Promise<ProductSummaryDto[]> {
    const items = await this.products.list();
    return items.map(toProductSummaryDto);
  }

  async getProductBySlug(slug: string): Promise<ProductDetailDto> {
    const normalized = requireString(slug, "slug");
    const product = await this.products.findBySlug(normalized);
    if (!product) {
      throw new AppError("NOT_FOUND", `Product not found: ${normalized}`);
    }
    return toProductDetailDto(product);
  }
}
