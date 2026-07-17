"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MOCK_ADMIN_USER } from "@/lib/admin/session";

export default function AdminTopNav({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="admin-topnav">
      <button
        type="button"
        className="admin-topnav__menu"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        Menu
      </button>
      <h1 className="admin-topnav__title">{title}</h1>
      <span className="admin-topnav__user">{MOCK_ADMIN_USER.name}</span>
      <button
        type="button"
        className="admin-topnav__logout"
        disabled={busy}
        onClick={() => void logout()}
      >
        Sign out
      </button>
    </header>
  );
}
