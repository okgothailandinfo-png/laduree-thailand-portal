import { randomUUID } from "crypto";
import type { Cart, CartItem } from "@/src/server/models/cart";
import type {
  CartRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import type { CartService } from "@/src/server/services/interfaces";
import { toCartDto } from "@/src/server/services/mappers";
import type {
  AddCartItemRequestDto,
  CartDto,
  UpdateCartItemRequestDto,
} from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";
import {
  optionalString,
  requireObject,
  requirePositiveInt,
  requireString,
} from "@/src/server/utils/validation";

function emptyCart(id: string): Cart {
  return {
    id,
    currency: "THB",
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

function cloneCart(cart: Cart): Cart {
  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
    })),
  };
}

function parseModifiers(
  raw: unknown,
  fieldPrefix: string,
): CartItem["modifiers"] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new AppError("VALIDATION_ERROR", `${fieldPrefix} must be an array.`, {
      details: { field: fieldPrefix },
    });
  }

  return raw.map((entry, index) => {
    const row = requireObject(entry, `${fieldPrefix}[${index}]`);
    const label = requireString(row.label, `${fieldPrefix}[${index}].label`);
    const quantity =
      row.quantity === undefined
        ? undefined
        : requirePositiveInt(row.quantity, `${fieldPrefix}[${index}].quantity`);
    return { label, quantity };
  });
}

export class DefaultCartService implements CartService {
  constructor(
    private readonly carts: CartRepository,
    private readonly products: ProductRepository,
  ) {}

  parseAddItemBody(raw: unknown): AddCartItemRequestDto {
    const body = requireObject(raw, "body");
    return {
      productId: requireString(body.productId, "productId"),
      quantity: requirePositiveInt(body.quantity, "quantity"),
      modifiers: parseModifiers(body.modifiers, "modifiers"),
      note: optionalString(body.note, "note"),
    };
  }

  parseUpdateItemBody(raw: unknown): UpdateCartItemRequestDto {
    const body = requireObject(raw, "body");
    return {
      quantity: requirePositiveInt(body.quantity, "quantity"),
    };
  }

  async getCart(cartId?: string): Promise<CartDto> {
    const cart = await this.resolveCart(cartId);
    return toCartDto(cart);
  }

  async addItem(
    cartId: string | undefined,
    input: AddCartItemRequestDto,
  ): Promise<CartDto> {
    const cart = cloneCart(await this.resolveCart(cartId));
    const product = await this.products.findById(input.productId);
    if (!product || !product.available) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Product unavailable: ${input.productId}`,
        { details: { field: "productId", productId: input.productId } },
      );
    }

    const item: CartItem = {
      id: randomUUID(),
      productId: product.id,
      name: product.title,
      imageSrc: product.imagePlaceholder || "/product-placeholder.svg",
      quantity: input.quantity,
      modifiers: input.modifiers ?? [],
      note: input.note,
    };

    cart.items.push(item);
    const saved = await this.carts.save(cart);
    return toCartDto(saved);
  }

  async updateItem(
    cartId: string | undefined,
    itemId: string,
    input: UpdateCartItemRequestDto,
  ): Promise<CartDto> {
    const id = requireString(itemId, "id");
    const cart = cloneCart(await this.requireCart(cartId));
    const index = cart.items.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new AppError("NOT_FOUND", `Cart item not found: ${id}`);
    }

    cart.items[index] = {
      ...cart.items[index],
      quantity: input.quantity,
    };
    const saved = await this.carts.save(cart);
    return toCartDto(saved);
  }

  async removeItem(
    cartId: string | undefined,
    itemId: string,
  ): Promise<CartDto> {
    const id = requireString(itemId, "id");
    const cart = cloneCart(await this.requireCart(cartId));
    const nextItems = cart.items.filter((item) => item.id !== id);
    if (nextItems.length === cart.items.length) {
      throw new AppError("NOT_FOUND", `Cart item not found: ${id}`);
    }

    cart.items = nextItems;
    const saved = await this.carts.save(cart);
    return toCartDto(saved);
  }

  async clearCart(cartId: string | undefined): Promise<CartDto> {
    const cart = cloneCart(await this.resolveCart(cartId));
    cart.items = [];
    const saved = await this.carts.save(cart);
    return toCartDto(saved);
  }

  private async resolveCart(cartId?: string): Promise<Cart> {
    if (cartId) {
      const existing = await this.carts.findById(cartId);
      if (existing) return existing;
    }

    const created = emptyCart(randomUUID());
    return this.carts.save(created);
  }

  private async requireCart(cartId?: string): Promise<Cart> {
    if (!cartId) {
      throw new AppError("NOT_FOUND", "Cart not found.");
    }
    const existing = await this.carts.findById(cartId);
    if (!existing) {
      throw new AppError("NOT_FOUND", `Cart not found: ${cartId}`);
    }
    return existing;
  }
}
