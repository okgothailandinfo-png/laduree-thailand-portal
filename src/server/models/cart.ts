import type { ProductBehavior } from "@/lib/product/product-behavior";

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
  /** Present when the product uses fixed-size exact flavour selection. */
  exactSelectionQuantity?: number | null;
  /** Sprint 33B — explicit product ordering behavior snapshot from catalog. */
  productBehavior?: ProductBehavior;
  /** Sprint 33B — pack/box size metadata (not a selection force for FIXED_PACK). */
  packSize?: number | null;
  /** Sprint 33B — delivery eligibility from catalog (Thailand values in 33C). */
  deliveryEligible?: boolean;
  /** Trusted catalog unit price in satang. Null until owner-approved. */
  unitPriceMinor?: number | null;
  /** True when the catalog product is currently available for pickup. */
  productAvailable?: boolean;
};

export type Cart = {
  id: string;
  currency: "THB";
  items: CartItem[];
  updatedAt: string;
};
