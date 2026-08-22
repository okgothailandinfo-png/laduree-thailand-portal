"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchCategories } from "@/lib/api/catalog";
import { categoryPath } from "@/lib/catalog/storefront-visibility";
import { uiChrome } from "@/lib/i18n/ui-chrome";
import type { Category } from "@/lib/api/types";
import LanguageSwitcher from "../a11y/LanguageSwitcher";
import PendingNavControl from "../a11y/PendingNavControl";
import { useAsyncResource } from "../catalog/useAsyncResource";
import AccountMenu from "../customer/AccountMenu";
import ServiceDateTimeBar from "../pickup/ServiceDateTimeBar";
import { CaretIcon, CartIcon, SearchIcon } from "./icons";
import OfflineBanner from "./OfflineBanner";

type SiteHeaderProps = {
  categories?: Category[];
  brandName?: string;
  brandAsHeading?: boolean;
};

const DEFAULT_BRAND = "Ladurée Thailand";

export default function SiteHeader({
  categories,
  brandName = DEFAULT_BRAND,
  brandAsHeading = false,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [service, setService] = useState<"Pick-up" | "Delivery">("Pick-up");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const catalog = useAsyncResource(
    async (signal) => {
      if (categories !== undefined) return categories;
      return fetchCategories({ signal });
    },
    {
      isEmpty: (data) => data.length === 0,
      deps: [categories],
    },
  );

  const menuCategories = categories ?? catalog.data ?? [];
  const searchPending = uiChrome("navPendingTitle");

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(target)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header id="header" className="site-header">
      <OfflineBanner />
      <div className="header-inner">
        <div className="header-desktop">
          <div className="header-desktop-layout">
            <div className="header-logo-col">
              <Link href="/" className="navbar-brand">
                <span className="logo">
                  <img
                    src="/logo.jpg"
                    alt="Order online for pickup or delivery"
                    className="img-responsive logo-portrait"
                    width={252}
                    height={148}
                  />
                </span>
              </Link>
            </div>

            <div className="header-content-col">
              <div className="header-desktop-top">
                {brandAsHeading ? (
                  <h1 className="brand-name">
                    <Link href="/">{brandName}</Link>
                  </h1>
                ) : (
                  <p className="brand-name">
                    <Link href="/">{brandName}</Link>
                  </p>
                )}
                <div className="header-member">
                  <LanguageSwitcher className="language-switcher--desktop" />
                  <AccountMenu triggerClassName="btn-login btn-login-desktop" />
                </div>
              </div>

              <div className="header-desktop-nav">
                <nav id="main-menu" className="main-menu" aria-label="Primary">
                  <ul id="navbar-collapse-1" className="navbar-nav">
                    <li>
                      <Link href="/" title="Home">
                        Home
                      </Link>
                    </li>
                    <li
                      ref={menuRef}
                      id="getz-menu-mainsub-category"
                      className={`dropdown-getz${menuOpen ? " open" : ""}`}
                      onMouseEnter={() => setMenuOpen(true)}
                      onMouseLeave={() => setMenuOpen(false)}
                    >
                      <button
                        type="button"
                        className="dropdown-toggle"
                        aria-expanded={menuOpen}
                        aria-haspopup="true"
                        onClick={() => setMenuOpen((open) => !open)}
                      >
                        MENU
                        <span className="caret" aria-hidden="true" />
                      </button>
                      <div className="wrapper" hidden={!menuOpen}>
                        <ul className="dropdown-menu-getz" role="menu">
                          {menuCategories.map((item) => (
                            <li key={item.id} role="none">
                              <Link
                                role="menuitem"
                                href={categoryPath(item.slug)}
                                onClick={() => setMenuOpen(false)}
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                    <li>
                      <PendingNavControl label="RECOMMENDED" />
                    </li>
                    <li>
                      <PendingNavControl label="About Us" />
                    </li>
                  </ul>
                </nav>

                <div className="search-form">
                  <form
                    id="search-form"
                    method="get"
                    action="#"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <div className="input-1">
                      <input
                        type="search"
                        id="txtSearch"
                        className="stxtProductSearch"
                        placeholder="Search items"
                        aria-label="Search items"
                        disabled
                        title={searchPending}
                      />
                      <button
                        type="submit"
                        id="btnProductSearch"
                        className="btn-product-search"
                        aria-label="Search"
                        disabled
                        title={searchPending}
                      >
                        <SearchIcon />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="header-mobile">
          <div className="mobile-menu">
            <div className="menu__toggle">
              <button
                type="button"
                className={`navbar-toggle${mobileMenuOpen ? " is-open" : ""}`}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="menu-mb"
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                <span className="icon-bar" />
                <span className="icon-bar" />
                <span className="icon-bar" />
              </button>
              <LanguageSwitcher className="language-switcher--mobile" />
              <AccountMenu triggerClassName="btn-login btn-login-mobile" />
            </div>

            <div className="menu__branch-name">
              <div className="menu__home-page">
                <Link href="/">
                  <img
                    className="branch-name"
                    src="/logo.jpg"
                    alt="Order online for pickup or delivery"
                    width={252}
                    height={148}
                  />
                </Link>

                <div
                  ref={serviceRef}
                  className={`dropdown dropdown-service${serviceOpen ? " open" : ""}`}
                  hidden
                >
                  <button
                    type="button"
                    className="dropdown-toggle"
                    aria-expanded={serviceOpen}
                    aria-haspopup="true"
                    onClick={() => setServiceOpen((open) => !open)}
                  >
                    <span className="branch__text">{service}</span>
                    <CaretIcon />
                  </button>
                  <ul className="dropdown-menu-service" hidden={!serviceOpen}>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setService("Pick-up");
                          setServiceOpen(false);
                        }}
                      >
                        Pick-up
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setService("Delivery");
                          setServiceOpen(false);
                        }}
                      >
                        Delivery
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="menu__login-search">
                <button
                  type="button"
                  className="seach-input-icon btn-search"
                  aria-label="Search"
                  aria-expanded={mobileSearchOpen}
                  disabled
                  title={searchPending}
                  onClick={() => setMobileSearchOpen((open) => !open)}
                >
                  <SearchIcon size={22} />
                </button>

                <div className="menu__cart navbar-header" hidden>
                  <a
                    href="#cart"
                    className="cart car__mobile"
                    title="Cart"
                    aria-label="Cart"
                  >
                    <CartIcon />
                    <span id="my-cart-count" className="cart-count">
                      0
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {mobileSearchOpen ? (
            <div className="mobile-search-panel">
              <p className="mobile-search-pending">{searchPending}</p>
            </div>
          ) : null}

          <ServiceDateTimeBar />
        </div>
      </div>

      <button
        type="button"
        className={`menu-mb-backdrop${mobileMenuOpen ? " is-open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-label="Close menu"
        tabIndex={mobileMenuOpen ? 0 : -1}
        aria-hidden={!mobileMenuOpen}
      />
      <nav
        id="menu-mb"
        className={`menu-mb${mobileMenuOpen ? " is-open" : ""}`}
        aria-label="Mobile"
        aria-hidden={!mobileMenuOpen}
        {...(!mobileMenuOpen ? { inert: true } : {})}
      >
        <div className="menu-mb-inner">
          <ul className="menu-mb-links list-3">
            <li>
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <span>Home</span>
              </Link>
            </li>
            <li>
              <PendingNavControl label="Recommended" wrapLabel />
            </li>
            <li>
              <PendingNavControl label="Promotions" wrapLabel />
            </li>
            <li>
              <PendingNavControl label="About Us" wrapLabel />
            </li>
          </ul>
          <div className="menu-mb-categories-block">
            <h2 className="menu-mb-categories-title title-5">
              Menu Categories
            </h2>
            <ul className="menu-mb-categories list-1">
              {menuCategories.map((item) => (
                <li key={item.id}>
                  <Link
                    href={categoryPath(item.slug)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
