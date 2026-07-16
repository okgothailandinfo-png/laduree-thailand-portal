import { apiGet, apiMutate } from "@/lib/api/client";
import type {
  AddCartItemRequest,
  Cart,
  UpdateCartItemRequest,
} from "@/lib/api/types";

export function fetchCart(init?: RequestInit) {
  return apiGet<Cart>("/api/cart", init);
}

export function addCartItem(input: AddCartItemRequest, init?: RequestInit) {
  return apiMutate<Cart>("/api/cart/items", "POST", input, init);
}

export function updateCartItem(
  id: string,
  input: UpdateCartItemRequest,
  init?: RequestInit,
) {
  return apiMutate<Cart>(
    `/api/cart/items/${encodeURIComponent(id)}`,
    "PATCH",
    input,
    init,
  );
}

export function removeCartItem(id: string, init?: RequestInit) {
  return apiMutate<Cart>(
    `/api/cart/items/${encodeURIComponent(id)}`,
    "DELETE",
    undefined,
    init,
  );
}

export function clearCart(init?: RequestInit) {
  return apiMutate<Cart>("/api/cart", "DELETE", undefined, init);
}
