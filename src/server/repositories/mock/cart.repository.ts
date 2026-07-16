import type { Cart } from "@/src/server/models/cart";
import type { CartRepository } from "@/src/server/repositories/interfaces";

const cartsById = new Map<string, Cart>();

export class MockCartRepository implements CartRepository {
  async findById(id: string): Promise<Cart | null> {
    return cartsById.get(id) ?? null;
  }

  async save(cart: Cart): Promise<Cart> {
    const next: Cart = {
      ...cart,
      items: cart.items.map((item) => ({
        ...item,
        modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
      })),
      updatedAt: new Date().toISOString(),
    };
    cartsById.set(next.id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    cartsById.delete(id);
  }
}
