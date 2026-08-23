import type { Cart } from "@/src/server/models/cart";
import type { CartRepository } from "@/src/server/repositories/interfaces";
import {
  clearPreviewCartCookie,
  readPreviewCartCookie,
  writePreviewCartCookie,
} from "@/src/server/preview/preview-cart-cookie";

/**
 * Restores the preview cart snapshot when the in-memory mock isolate is empty.
 */
export class PreviewCookieCartRepository implements CartRepository {
  constructor(private readonly inner: CartRepository) {}

  async findById(id: string): Promise<Cart | null> {
    const existing = await this.inner.findById(id);
    if (existing) return existing;
    const snapshot = await readPreviewCartCookie();
    if (!snapshot || snapshot.id !== id) return null;
    return this.inner.save(snapshot);
  }

  async save(cart: Cart): Promise<Cart> {
    const saved = await this.inner.save(cart);
    await writePreviewCartCookie(saved);
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.inner.delete(id);
    const snapshot = await readPreviewCartCookie();
    if (snapshot?.id === id) {
      await clearPreviewCartCookie();
    }
  }
}
