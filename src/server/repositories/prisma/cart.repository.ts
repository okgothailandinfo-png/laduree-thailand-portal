import type { Prisma } from "@prisma/client";
import type { Cart, CartItem } from "@/src/server/models/cart";
import type { CartRepository } from "@/src/server/repositories/interfaces";
import { prisma } from "@/src/server/database/prisma";

function parseItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const modifiersRaw = Array.isArray(row.modifiers) ? row.modifiers : [];
    return {
      id: typeof row.id === "string" ? row.id : "",
      productId: typeof row.productId === "string" ? row.productId : "",
      name: typeof row.name === "string" ? row.name : "",
      imageSrc: typeof row.imageSrc === "string" ? row.imageSrc : "",
      quantity: typeof row.quantity === "number" ? row.quantity : 0,
      modifiers: modifiersRaw
        .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
        .map((m) => ({
          label: typeof m.label === "string" ? m.label : "",
          ...(typeof m.quantity === "number" ? { quantity: m.quantity } : {}),
        })),
      ...(typeof row.note === "string" ? { note: row.note } : {}),
      ...(row.exactSelectionQuantity === null ||
      typeof row.exactSelectionQuantity === "number"
        ? { exactSelectionQuantity: row.exactSelectionQuantity as number | null }
        : {}),
      ...(row.unitPriceMinor === null || typeof row.unitPriceMinor === "number"
        ? { unitPriceMinor: row.unitPriceMinor as number | null }
        : {}),
      ...(typeof row.productAvailable === "boolean"
        ? { productAvailable: row.productAvailable }
        : {}),
    } satisfies CartItem;
  });
}

export class PrismaCartRepository implements CartRepository {
  async findById(id: string): Promise<Cart | null> {
    const row = await prisma.cart.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      currency: "THB",
      items: parseItems(row.itemsJson),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async save(cart: Cart): Promise<Cart> {
    const items = cart.items.map((item) => ({
      ...item,
      modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
    }));
    const itemsJson = items as unknown as Prisma.InputJsonValue;
    const row = await prisma.cart.upsert({
      where: { id: cart.id },
      create: {
        id: cart.id,
        currency: "THB",
        itemsJson,
      },
      update: {
        currency: "THB",
        itemsJson,
      },
    });
    return {
      id: row.id,
      currency: "THB",
      items: parseItems(row.itemsJson),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.cart.delete({ where: { id } });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        return;
      }
      throw error;
    }
  }
}
