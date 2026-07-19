export type ProductImage = {
  id: string;
  mediaId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

/** CMS-ready option metadata. Labels must match `ProductModifierGroup.options`. */
export type ProductModifierOptionDetail = {
  label: string;
  /** Approved Thailand add-on price in satang. Null/omitted = no price (UI shows ฿ —). */
  priceMinor?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type ProductModifierGroup = {
  id: string;
  title: string;
  requiredText: string | null;
  type: "quantity" | "radio";
  options: string[];
  optionDetails?: ProductModifierOptionDetail[];
  /**
   * For quantity groups on fixed-size boxes (e.g. 6/8/12/18 pcs).
   * Selected option quantities must total exactly this value.
   */
  exactSelectionQuantity?: number | null;
  /** Explicit required flag for CMS. */
  required?: boolean;
  minSelection?: number | null;
  maxSelection?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  /** Required acknowledgement (e.g. pickup handling notice). */
  isAcknowledgement?: boolean;
};

export type Product = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  categoryId: string;
  description: string[];
  allergenLabel: string;
  allergenText: string;
  storageLabel: string;
  storageText: string;
  /** Thailand retail price pending owner approval when null. Major units (THB). */
  priceThb: number | null;
  /** Thailand retail price in satang (minor units). Null until owner-approved. */
  priceMinor: number | null;
  currency: "THB";
  imagePlaceholder: string;
  images: ProductImage[];
  /** Catalog visibility. */
  isActive: boolean;
  /** Pickup availability. */
  available: boolean;
  sortOrder: number;
  modifierGroups: ProductModifierGroup[];
};
