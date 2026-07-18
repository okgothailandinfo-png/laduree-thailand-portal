export type AdminNavItem = {
  href: string;
  label: string;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/boutiques", label: "Boutiques" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/settings", label: "Settings" },
] as const;
