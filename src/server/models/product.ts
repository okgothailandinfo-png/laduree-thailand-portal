export type ProductModifierGroup = {
  id: string;
  title: string;
  requiredText: string | null;
  type: "quantity" | "radio";
  options: string[];
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  description: string[];
  storageLabel: string;
  storageText: string;
  /** Thailand retail price pending owner approval when null. */
  priceThb: number | null;
  imagePlaceholder: string;
  available: boolean;
  modifierGroups: ProductModifierGroup[];
};
