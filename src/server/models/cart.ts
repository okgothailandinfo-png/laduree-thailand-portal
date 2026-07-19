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
