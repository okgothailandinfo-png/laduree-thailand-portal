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

export type Cart = {
  id: string;
  currency: "THB";
  items: CartItem[];
  updatedAt: string;
};
