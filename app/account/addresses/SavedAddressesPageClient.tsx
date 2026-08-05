"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCustomerSession } from "../../customer/CustomerSessionContext";
import "../account.css";

export default function SavedAddressesPageClient() {
  const router = useRouter();
  const {
    isAuthenticated,
    ready,
    savedAddresses,
    selectedSavedAddressId,
    selectSavedAddress,
  } = useCustomerSession();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/sign-in?next=/account/addresses");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return (
      <main className="account-page">
        <div className="account-page__inner">
          <h1 className="account-page__title">Saved Addresses</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="account-page__inner">
        <Link href="/account" className="account-page__back">
          ← Back
        </Link>
        <h1 className="account-page__title">Saved Addresses</h1>
        <div className="account-card">
          {savedAddresses.length === 0 ? (
            <p className="account-card__meta">No saved addresses.</p>
          ) : (
            <ul className="saved-address-list">
              {savedAddresses.map((address) => {
                const selected = address.id === selectedSavedAddressId;
                return (
                  <li key={address.id} className="saved-address-item">
                    <p className="saved-address-item__label">
                      {address.label}
                      {selected ? " · Selected" : ""}
                    </p>
                    <p className="saved-address-item__body">
                      {address.recipient}
                      <br />
                      {address.address}
                      {address.building ? `, ${address.building}` : ""}
                      {address.unitFloor ? `, ${address.unitFloor}` : ""}
                      <br />
                      {address.subdistrict}, {address.district},{" "}
                      {address.province} {address.postalCode}
                      <br />
                      {address.phone}
                    </p>
                    <button
                      type="button"
                      className="account-card__button saved-address-item__action"
                      onClick={() => selectSavedAddress(address.id)}
                      disabled={selected}
                    >
                      {selected ? "Selected" : "Use this address"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
