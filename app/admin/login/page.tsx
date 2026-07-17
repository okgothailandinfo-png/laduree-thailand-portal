"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const next = searchParams.get("next");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          next:
            next && next.startsWith("/admin") ? next : "/admin/dashboard",
        }),
      });
      if (!response.ok) {
        throw new Error("Unable to sign in.");
      }
      const payload = (await response.json()) as {
        data?: { redirectTo?: string };
      };
      const redirectTo = payload.data?.redirectTo ?? "/admin/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <p className="admin-login__brand">Ladurée</p>
        <p className="admin-login__subtitle">Admin CMS</p>
        <form className="admin-form" onSubmit={onSubmit} noValidate>
          <div className="admin-form__field">
            <label className="admin-form__label" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              className="admin-form__input"
              type="email"
              name="email"
              autoComplete="username"
              defaultValue="admin@laduree.th"
              disabled={busy}
            />
          </div>
          <div className="admin-form__field">
            <label className="admin-form__label" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              className="admin-form__input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={busy}
            />
          </div>
          {error ? (
            <p style={{ margin: 0, color: "#a94442", fontSize: "0.9rem" }}>
              {error}
            </p>
          ) : null}
          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={busy}
              style={{ width: "100%" }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
        <p className="admin-login__note">
          Mock session only. No authentication provider is connected.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-login">
          <div className="admin-login__card">
            <p className="admin-login__brand">Ladurée</p>
            <p className="admin-login__subtitle">Admin CMS</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
