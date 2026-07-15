"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
};

type AddCartItemInput = {
  productId: string;
  name: string;
  imageSrc?: string;
  quantity: number;
  modifiers?: CartModifier[];
  note?: string;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (input: AddCartItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function clampQty(value: number) {
  if (Number.isNaN(value) || value < 1) return 1;
  if (value > 999) return 999;
  return value;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      itemCount,
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      toggleDrawer: () => setIsDrawerOpen((open) => !open),
      addItem: (input) => {
        const id = `${input.productId}-${Date.now()}`;
        setItems((current) => [
          ...current,
          {
            id,
            productId: input.productId,
            name: input.name,
            imageSrc: input.imageSrc ?? "/product-placeholder.svg",
            quantity: clampQty(input.quantity),
            modifiers: input.modifiers ?? [],
            note: input.note,
          },
        ]);
        if (typeof window !== "undefined" && window.innerWidth < 992) {
          setIsDrawerOpen(true);
        }
      },
      updateQuantity: (id, quantity) => {
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, quantity: clampQty(quantity) } : item,
          ),
        );
      },
      removeItem: (id) => {
        setItems((current) => current.filter((item) => item.id !== id));
      },
      clearItems: () => setItems([]),
    };
  }, [items, isDrawerOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
