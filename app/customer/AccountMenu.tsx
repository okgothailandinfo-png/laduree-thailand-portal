"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useCustomerSession } from "./CustomerSessionContext";
import "./account-menu.css";

type AccountMenuProps = {
  /** Extra class on the Member? trigger (desktop / mobile variants). */
  triggerClassName?: string;
};

/**
 * Header account menu.
 * Guest / anonymous: Continue as Guest, Sign In, Register (placeholder).
 * Member: My Account, Order History, Saved Addresses, Sign Out.
 */
export default function AccountMenu({
  triggerClassName = "btn-login",
}: AccountMenuProps) {
  const {
    isAuthenticated,
    customerName,
    continueAsGuest,
    signOut,
    ready,
  } = useCustomerSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerLabel =
    ready && isAuthenticated && customerName ? customerName : "Member?";

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="account-menu__panel" id={menuId} role="menu">
          {isAuthenticated ? (
            <>
              <Link
                href="/account"
                role="menuitem"
                className="account-menu__item"
                onClick={() => setOpen(false)}
              >
                My Account
              </Link>
              <Link
                href="/order-history"
                role="menuitem"
                className="account-menu__item"
                onClick={() => setOpen(false)}
              >
                Order History
              </Link>
              <Link
                href="/account/addresses"
                role="menuitem"
                className="account-menu__item"
                onClick={() => setOpen(false)}
              >
                Saved Addresses
              </Link>
              <button
                type="button"
                role="menuitem"
                className="account-menu__item account-menu__item--button"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                className="account-menu__item account-menu__item--button"
                onClick={() => {
                  continueAsGuest();
                  setOpen(false);
                }}
              >
                Continue as Guest
              </button>
              <Link
                href="/sign-in"
                role="menuitem"
                className="account-menu__item"
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
              <button
                type="button"
                role="menuitem"
                className="account-menu__item account-menu__item--button"
                disabled
                aria-disabled="true"
              >
                Register
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
