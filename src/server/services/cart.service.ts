import { randomUUID } from "crypto";
import { cartLineConfigKey } from "@/lib/cart/cart-line";
import {
  getExactSelectionGroups,
  validateExactSelectionModifiers,
} from "@/lib/product/exact-selection";
import { computeConfiguredUnitPriceMinor } from "@/lib/product/modifier-pricing";
import { validateRequiredModifierGroups } from "@/lib/product/modifier-requirements";
import type { Cart, CartItem } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
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

function catalogPriceFields(
  product: Product | null,
  modifiers: CartItem["modifiers"],
): {
  unitPriceMinor: number | null;
  productAvailable: boolean;
} {
  if (!product) {
    return { unitPriceMinor: null, productAvailable: false };
  }
  return {
    unitPriceMinor: computeConfiguredUnitPriceMinor(
      product.priceMinor,
      product.modifierGroups,
      modifiers,
    ),
    productAvailable: product.available && product.isActive,
  };
}

function assertProductConfiguration(
  product: Product,
  modifiers: CartItem["modifiers"],
  quantity: number,
) {
  const exactSelection = validateExactSelectionModifiers(
    product.modifierGroups,
    modifiers,
    quantity,
  );
  if (!exactSelection.ok) {
    throw new AppError("VALIDATION_ERROR", exactSelection.message, {
      details: {
        field: "modifiers",
        code: exactSelection.code,
        productId: product.id,
      },
    });
  }

  const required = validateRequiredModifierGroups(
    product.modifierGroups,
    modifiers,
  );
  if (!required.ok) {
    throw new AppError("VALIDATION_ERROR", required.message, {
      details: {
        field: "modifiers",
        code: required.code,
        groupId: required.groupId,
        productId: product.id,
      },
    });
  }
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
    const cart = cloneCart(await this.resolveCart(cartId));
    const refreshed = await this.refreshCatalogFields(cart);
    if (refreshed.changed) {
      await this.carts.save(refreshed.cart);
    }
    return toCartDto(refreshed.cart);
  }

  async addItem(
    cartId: string | undefined,
    input: AddCartItemRequestDto,
  ): Promise<CartDto> {
    const cart = cloneCart(await this.resolveCart(cartId));
    const product = await this.products.findById(input.productId);
    if (!product || !product.available || !product.isActive) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Product unavailable: ${input.productId}`,
        { details: { field: "productId", productId: input.productId } },
      );
    }

    const modifiers = input.modifiers ?? [];
    assertProductConfiguration(product, modifiers, input.quantity);

    const exactGroups = getExactSelectionGroups(product.modifierGroups);
    const exactSelectionQuantity =
      exactGroups[0]?.exactSelectionQuantity ?? null;
    const incomingKey = cartLineConfigKey({
      productId: product.id,
      modifiers,
      note: input.note,
    });

    const existingIndex = cart.items.findIndex(
      (item) =>
        cartLineConfigKey({
          productId: item.productId,
          modifiers: item.modifiers,
          note: item.note,
        }) === incomingKey,
    );

    if (existingIndex >= 0) {
      // Identical product + identical modifiers merge (including fixed-size boxes).
      // Outer quantity is independent of flavour total (e.g. qty 2 = two identical boxes).
      const existing = cart.items[existingIndex];
      cart.items[existingIndex] = {
        ...existing,
        quantity: existing.quantity + input.quantity,
        ...catalogPriceFields(product, modifiers),
        exactSelectionQuantity,
      };
    } else {
      const item: CartItem = {
        id: randomUUID(),
        productId: product.id,
        name: product.title,
        imageSrc: product.imagePlaceholder || "/product-placeholder.svg",
        quantity: input.quantity,
        modifiers,
        note: input.note,
        exactSelectionQuantity,
        ...catalogPriceFields(product, modifiers),
      };
      cart.items.push(item);
    }

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

    const current = cart.items[index];
    const product = await this.products.findById(current.productId);
    if (product) {
      assertProductConfiguration(product, current.modifiers, input.quantity);
    } else if (
      typeof current.exactSelectionQuantity === "number" &&
      (!Number.isInteger(input.quantity) || input.quantity < 1)
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Product quantity must be between 1 and 999.",
        { details: { field: "quantity", productId: current.productId } },
      );
    }

    cart.items[index] = {
      ...current,
      quantity: input.quantity,
      ...catalogPriceFields(product, current.modifiers),
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

  /** Refresh trusted catalog price/availability onto cart lines. */
  private async refreshCatalogFields(
    cart: Cart,
  ): Promise<{ cart: Cart; changed: boolean }> {
    let changed = false;
    const items: CartItem[] = [];

    for (const item of cart.items) {
      const product = await this.products.findById(item.productId);
      const catalog = catalogPriceFields(product, item.modifiers);
      const exactSelectionQuantity = product
        ? (getExactSelectionGroups(product.modifierGroups)[0]
            ?.exactSelectionQuantity ??
          item.exactSelectionQuantity ??
          null)
        : (item.exactSelectionQuantity ?? null);

      const next: CartItem = {
        ...item,
        name: product?.title ?? item.name,
        imageSrc:
          product?.imagePlaceholder ||
          item.imageSrc ||
          "/product-placeholder.svg",
        unitPriceMinor: catalog.unitPriceMinor,
        productAvailable: catalog.productAvailable,
        exactSelectionQuantity,
      };

      if (
        next.unitPriceMinor !== item.unitPriceMinor ||
        next.productAvailable !== item.productAvailable ||
        next.exactSelectionQuantity !== item.exactSelectionQuantity ||
        next.name !== item.name
      ) {
        changed = true;
      }
      items.push(next);
    }

    return { cart: { ...cart, items }, changed };
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
