"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCustomerSession } from "../customer/CustomerSessionContext";
import "./account.css";

export default function AccountPageClient() {
  const router = useRouter();
  const {
    isAuthenticated,
    customerName,
    email,
    phone,
    ready,
    signOut,
  } = useCustomerSession();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/sign-in?next=/account");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return (
      <main className="account-page" id="main-content" tabIndex={-1}>
        <div className="account-page__inner">
          <h1 className="account-page__title">My Account</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="account-page" id="main-content" tabIndex={-1}>
      <div className="account-page__inner">
        <Link href="/" className="account-page__back">
          ← Back
        </Link>
        <h1 className="account-page__title">My Account</h1>
        <div className="account-card">
          <p className="account-card__meta">
            Name: {customerName}
            <br />
            Email: {email}
            <br />
            Phone: {phone}
          </p>
          <div className="account-card__actions">
            <Link href="/order-history" className="account-card__link">
              Order History
            </Link>
            <Link href="/account/addresses" className="account-card__link">
              Saved Addresses
            </Link>
            <button
              type="button"
              className="account-card__button"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
