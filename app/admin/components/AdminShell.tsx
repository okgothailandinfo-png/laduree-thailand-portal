"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav";
import AdminSidebar from "./AdminSidebar";
import AdminTopNav from "./AdminTopNav";

function titleForPath(pathname: string): string {
  const match = ADMIN_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "Admin";
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <AdminSidebar
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      {sidebarOpen ? (
        <button
          type="button"
          className="admin-sidebar__backdrop admin-sidebar__backdrop--visible"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="admin-main">
        <AdminTopNav
          title={titleForPath(pathname)}
          onMenuClick={() => setSidebarOpen((value) => !value)}
        />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
