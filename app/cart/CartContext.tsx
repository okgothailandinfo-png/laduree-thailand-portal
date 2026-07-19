"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCartItem,
  clearCart as clearCartApi,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart";
import { ApiClientError } from "@/lib/api/client";
import type { CartItem as ApiCartItem } from "@/lib/api/types";

export type CartModifier = {
  label: string;
  quantity?: number;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  imageSrc: string;
  quantity: number;
  modifiers: CartModifier[];
  note?: string;
  exactSelectionQuantity?: number | null;
  unitPriceThb: number | null;
  unitPriceMinor: number | null;
  lineTotalThb: number | null;
  priceAvailable: boolean;
  productAvailable: boolean;
};

type AddCartItemInput = {
  productId: string;
  name: string;
  imageSrc?: string;
  quantity: number;
  modifiers?: CartModifier[];
  note?: string;
};

export type CartStatus = "loading" | "success" | "error" | "empty";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalThb: number | null;
  pricesAvailable: boolean;
  status: CartStatus;
  errorMessage: string | null;
  reloadCart: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (input: AddCartItemInput) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearItems: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function clampQty(value: number) {
  if (Number.isNaN(value) || value < 1) return 1;
  if (value > 999) return 999;
  return value;
}

function toCartItems(items: ApiCartItem[]): CartItem[] {
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.name,
    imageSrc: item.imageSrc,
    quantity: item.quantity,
    modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
    note: item.note,
    exactSelectionQuantity: item.exactSelectionQuantity ?? null,
    unitPriceThb: item.unitPriceThb ?? null,
    unitPriceMinor: item.unitPriceMinor ?? null,
    lineTotalThb: item.lineTotalThb ?? null,
    priceAvailable: item.priceAvailable === true,
    productAvailable: item.productAvailable !== false,
  }));
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotalThb, setSubtotalThb] = useState<number | null>(null);
  const [pricesAvailable, setPricesAvailable] = useState(false);
  const [status, setStatus] = useState<CartStatus>("loading");
  const [errorMessageState, setErrorMessageState] = useState<string | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const applyCart = useCallback(
    (nextItems: CartItem[], nextSubtotal: number | null, nextPrices: boolean) => {
      setItems(nextItems);
      setSubtotalThb(nextSubtotal);
      setPricesAvailable(nextPrices);
      setStatus(nextItems.length === 0 ? "empty" : "success");
      setErrorMessageState(null);
    },
    [],
  );

  const applyFromApi = useCallback(
    (cart: {
      items: ApiCartItem[];
      subtotalThb: number | null;
      pricesAvailable: boolean;
    }) => {
      applyCart(
        toCartItems(cart.items),
        cart.subtotalThb,
        cart.pricesAvailable === true,
      );
    },
    [applyCart],
  );

  const reloadCart = useCallback(() => {
    setStatus("loading");
    setErrorMessageState(null);
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchCart({ signal: controller.signal })
      .then((cart) => {
        if (controller.signal.aborted) return;
        applyFromApi(cart);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setItems([]);
        setSubtotalThb(null);
        setPricesAvailable(false);
        setErrorMessageState(errorMessage(error, "Unable to load cart."));
        setStatus("error");
      });

    return () => controller.abort();
  }, [reloadToken, applyFromApi]);

  const addItem = useCallback(
    async (input: AddCartItemInput) => {
      const previous = items;
      const previousSubtotal = subtotalThb;
      const previousPrices = pricesAvailable;
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticItem: CartItem = {
        id: optimisticId,
        productId: input.productId,
        name: input.name,
        imageSrc: input.imageSrc ?? "/product-placeholder.svg",
        quantity: clampQty(input.quantity),
        modifiers: input.modifiers ?? [],
        note: input.note,
        unitPriceThb: null,
        unitPriceMinor: null,
        lineTotalThb: null,
        priceAvailable: false,
        productAvailable: true,
      };

      applyCart([...previous, optimisticItem], null, false);
      if (typeof window !== "undefined" && window.innerWidth < 992) {
        setIsDrawerOpen(true);
      }

      try {
        const cart = await addCartItem({
          productId: input.productId,
          quantity: clampQty(input.quantity),
          modifiers: input.modifiers,
          note: input.note,
        });
        applyFromApi(cart);
      } catch (error: unknown) {
        applyCart(previous, previousSubtotal, previousPrices);
        setErrorMessageState(
          errorMessage(
            error,
            "The item you've selected was not added to your cart. Please try again.",
          ),
        );
        setStatus(previous.length === 0 ? "empty" : "success");
        throw error;
      }
    },
    [applyCart, applyFromApi, items, pricesAvailable, subtotalThb],
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      const nextQty = clampQty(quantity);
      const previous = items;
      const previousSubtotal = subtotalThb;
      const previousPrices = pricesAvailable;
      const optimistic = previous.map((item) =>
        item.id === id ? { ...item, quantity: nextQty } : item,
      );
      applyCart(optimistic, null, previousPrices);

      try {
        const cart = await updateCartItem(id, { quantity: nextQty });
        applyFromApi(cart);
      } catch (error: unknown) {
        applyCart(previous, previousSubtotal, previousPrices);
        setErrorMessageState(
          errorMessage(error, "Unable to update cart item."),
        );
        setStatus(previous.length === 0 ? "empty" : "success");
      }
    },
    [applyCart, applyFromApi, items, pricesAvailable, subtotalThb],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const previous = items;
      const previousSubtotal = subtotalThb;
      const previousPrices = pricesAvailable;
      const optimistic = previous.filter((item) => item.id !== id);
      applyCart(
        optimistic,
        optimistic.length === 0 ? null : previousSubtotal,
        optimistic.length === 0 ? false : previousPrices,
      );

      try {
        const cart = await removeCartItem(id);
        applyFromApi(cart);
      } catch (error: unknown) {
        applyCart(previous, previousSubtotal, previousPrices);
        setErrorMessageState(
          errorMessage(error, "Unable to remove cart item."),
        );
        setStatus(previous.length === 0 ? "empty" : "success");
      }
    },
    [applyCart, applyFromApi, items, pricesAvailable, subtotalThb],
  );

  const clearItems = useCallback(async () => {
    const previous = items;
    const previousSubtotal = subtotalThb;
    const previousPrices = pricesAvailable;
    applyCart([], null, false);

    try {
      const cart = await clearCartApi();
      applyFromApi(cart);
    } catch (error: unknown) {
      applyCart(previous, previousSubtotal, previousPrices);
      setErrorMessageState(errorMessage(error, "Unable to clear cart."));
      setStatus(previous.length === 0 ? "empty" : "success");
    }
  }, [applyCart, applyFromApi, items, pricesAvailable, subtotalThb]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      itemCount,
      subtotalThb,
      pricesAvailable,
      status,
      errorMessage: errorMessageState,
      reloadCart,
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      toggleDrawer: () => setIsDrawerOpen((open) => !open),
      addItem,
      updateQuantity,
      removeItem,
      clearItems,
    };
  }, [
    items,
    subtotalThb,
    pricesAvailable,
    status,
    errorMessageState,
    reloadCart,
    isDrawerOpen,
    addItem,
    updateQuantity,
    removeItem,
    clearItems,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
