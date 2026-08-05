/** Customer identity types — provider-agnostic session contract. */

export type CustomerType = "anonymous" | "guest" | "member";

export type SavedAddressLabel = "Home" | "Office" | "Other";

export type SavedAddress = {
  id: string;
  label: SavedAddressLabel;
  recipient: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  building?: string;
  unitFloor?: string;
  notes?: string;
};

/**
 * Reusable customer session state exposed to the storefront.
 * Designed so mock providers can later be replaced with real auth.
 */
export type CustomerSession = {
  customerType: CustomerType;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  isAuthenticated: boolean;
};

export type MockOrderHistoryEntry = {
  orderId: string;
  orderNumber: string;
  date: string;
  status: "completed" | "preparing" | "ready" | "cancelled" | "out_for_delivery";
  serviceType: "PICKUP" | "DELIVERY";
  totalThb: number;
  boutiqueName: string;
  detailPath: string;
};

export const ANONYMOUS_SESSION: CustomerSession = {
  customerType: "anonymous",
  customerName: null,
  email: null,
  phone: null,
  firstName: null,
  lastName: null,
  isAuthenticated: false,
};

export const GUEST_SESSION: CustomerSession = {
  customerType: "guest",
  customerName: null,
  email: null,
  phone: null,
  firstName: null,
  lastName: null,
  isAuthenticated: false,
};
