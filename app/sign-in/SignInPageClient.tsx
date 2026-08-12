"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { validateLoginFields } from "@/lib/customer/login-validation";
import type { LoginFieldErrors } from "@/lib/customer/login-validation";
import { useCustomerSession } from "../customer/CustomerSessionContext";
import "./sign-in.css";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.startsWith("/admin")) return "/";
  return raw;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { continueAsGuest, signInWithEmail, isAuthenticated } =
    useCustomerSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const nextPath = safeNextPath(searchParams.get("next"));

  if (isAuthenticated) {
    return (
      <main className="sign-in-page" id="main-content" tabIndex={-1}>
        <div className="sign-in-page__inner">
          <Link href="/" className="sign-in-page__back">
            ← Back
          </Link>
          <h1 className="sign-in-page__title">Sign In</h1>
          <div className="sign-in-card">
            <p className="sign-in-page__note" style={{ marginBottom: 16 }}>
              You are already signed in.
            </p>
            <button
              type="button"
              className="sign-in-form__submit"
              onClick={() => router.push(nextPath)}
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const nextErrors = validateLoginFields({ email, password });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      await signInWithEmail({ email, password });
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : "Unable to sign in.",
      });
      setBusy(false);
    }
  }

  return (
    <main className="sign-in-page" id="main-content" tabIndex={-1}>
      <div className="sign-in-page__inner">
        <Link href="/" className="sign-in-page__back">
          ← Back
        </Link>
        <h1 className="sign-in-page__title">Sign In</h1>
        <p className="sign-in-page__note">
          Mock authentication only. No real login provider is connected.
        </p>

        <div className="sign-in-card">
          <div className="sign-in-actions">
            <button
              type="button"
              className="sign-in-actions__primary"
              onClick={() => {
                continueAsGuest();
                router.push(nextPath === "/" ? "/checkout" : nextPath);
              }}
            >
              Continue as Guest
            </button>
            <button
              type="button"
              className="sign-in-actions__secondary"
              disabled
              aria-disabled="true"
            >
              Continue with LINE
            </button>
          </div>

          <div className="sign-in-divider" aria-hidden="true">
            Sign in
          </div>

          <form className="sign-in-form" onSubmit={onSubmit} noValidate>
            <div className="sign-in-field">
              <label htmlFor="sign-in-email">Email</label>
              <input
                id="sign-in-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                disabled={busy}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "sign-in-email-error" : undefined}
                className={errors.email ? "input-validation-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.email;
                    delete next.form;
                    return next;
                  });
                }}
              />
              {errors.email ? (
                <p
                  id="sign-in-email-error"
                  className="field-validation-error"
                  role="alert"
                >
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="sign-in-field">
              <label htmlFor="sign-in-password">Password</label>
              <input
                id="sign-in-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={busy}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "sign-in-password-error" : undefined
                }
                className={
                  errors.password ? "input-validation-error" : undefined
                }
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.password;
                    delete next.form;
                    return next;
                  });
                }}
              />
              {errors.password ? (
                <p
                  id="sign-in-password-error"
                  className="field-validation-error"
                  role="alert"
                >
                  {errors.password}
                </p>
              ) : null}
            </div>

            {errors.form ? (
              <p className="sign-in-form__error" role="alert">
                {errors.form}
              </p>
            ) : null}

            <button
              type="submit"
              className="sign-in-form__submit"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function SignInPageClient() {
  return (
    <Suspense
      fallback={
        <main className="sign-in-page" id="main-content" tabIndex={-1}>
          <div className="sign-in-page__inner">
            <h1 className="sign-in-page__title">Sign In</h1>
          </div>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
