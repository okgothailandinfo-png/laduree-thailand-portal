"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav";

export default function AdminSidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}
      aria-label="Admin navigation"
    >
      <Link
        href="/admin/dashboard"
        className="admin-sidebar__brand"
        onClick={onNavigate}
      >
        Ladurée Admin
      </Link>
      <nav className="admin-sidebar__nav">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-sidebar__link${active ? " admin-sidebar__link--active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
