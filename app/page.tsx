"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const menuCategories = [
  { label: "All Items", href: "/Category" },
  { label: "Macaron Gift Boxes", href: "/Category/macaron-gift-boxes.html" },
  {
    label: "Eugénie Chocolates Gift Boxes",
    href: "/Category/eug%C3%A9nie-chocolates-gift-boxes.html",
  },
  { label: "Chocolates", href: "/Category/chocolates.html" },
  { label: "Biscuits", href: "/Category/biscuits.html" },
  { label: "Tea Boxes", href: "/Category/tea-boxes.html" },
  { label: "Merchandise", href: "/Category/merchandise.html" },
] as const;

/** Singapore-verified category structure for layout parity (Thailand content TBD). */
const catalogSections = [
  {
    id: "macaron-gift-boxes",
    title: "Macaron Gift Boxes",
    intro:
      "Macaron gift boxes include protective inserts for online orders only.",
    products: [
      "« Napoléon III » Macaron - 8pcs",
      "« Prestige » Macaron - 15pcs",
      "« Prestige » Macaron - 20pcs",
      "« Prestige » Macaron - 28pcs",
      "« Prestige » Macaron - 35pcs",
      "« Arabesque » Macaron - 42pcs",
    ],
  },
  {
    id: "eugenie-chocolates-gift-boxes",
    title: "Eugénie Chocolates Gift Boxes",
    intro:
      "A delicious, unexpected marriage of a crunchy sablé, a melting heart, and a delicate chocolate coating.",
    products: [
      "Eugénie Chocolates - 6pcs",
      "Eugénie Chocolates - 12pcs",
      "Eugénie Chocolates - 18pcs",
    ],
  },
  {
    id: "chocolates",
    title: "Chocolates",
    intro: "Soft marshmallow bears coated in rich, silky chocolate.",
    products: [
      "Marshmallow Bear Milk Chocolate",
      "Marshmallow Bear Dark Chocolate",
      "Dark Chocolate Candied Orange « Orangette »",
      "Dark Chocolate Almond Praline « 16 Royale » - 12pcs",
    ],
  },
  {
    id: "biscuits",
    title: "Biscuits",
    intro: "Delicate langue de chat biscuits with a light, buttery crunch.",
    products: [
      "Langue de Chat Vanilla & Strawberry",
      "Langue de Chat Vanilla & Caramel",
      "Langue de Chat Dark & Milk Chocolate",
    ],
  },
  {
    id: "tea-boxes",
    title: "Tea Boxes",
    intro:
      "A curated selection of aromatic teas inspired by Parisian tradition.",
    products: [
      "Marie-Antoinette Tea Box - 20 sachets",
      "Roi Soleil Tea Box - 20 sachets",
      "Mélange Ladurée Tea Box - 20 sachets",
      "Earl Grey Tea Box - 20 sachets",
      "1001 Nuits Tea Box - 20 sachets",
    ],
  },
  {
    id: "merchandise",
    title: "Merchandise",
    intro:
      "Beautifully crafted items inspired by Ladurée's timeless Parisian style.",
    products: [
      "« Pampille » Keyring",
      "« Macarons » Keyring",
      "« Little Bag » Keyring",
      "Vichy Travel Mug",
      "Pink Thermo Bottle",
      "Toile De Jouy Thermo Bottle",
      "Toile De Jouy (Pouch)",
      "Toile De Jouy (Notebook)",
      "Organic Cotton Pink Mini Tote Bag",
      "Organic Cotton Green Tote Bag",
      "Picnic Cooler Bag",
    ],
  },
] as const;

function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20L16.5 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg
      className="icon-caret"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="8"
      viewBox="0 0 13 8"
      fill="none"
    >
      <path
        d="M11.09 0.589996L6.5 5.17L1.91 0.589996L0.5 2L6.5 8L12.5 2L11.09 0.589996Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 33 32"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.5 27a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.2 6h2.1l1.1 2h15.4c.8 0 1.4.8 1.2 1.5l-2.1 7.2a1.3 1.3 0 0 1-1.2.9H12.4l.4 1.5h12.3v2H11.3a1.3 1.3 0 0 1-1.2-.9L7.2 6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [service, setService] = useState<"Pick-up" | "Delivery">("Pick-up");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative min-h-full flex-1 bg-page text-text">
      <header id="header" className="site-header">
        <div className="header-inner">
          {/* Desktop header */}
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
                  <div className="header-member">
                    <a
                      href="#"
                      className="btn-login btn-login-desktop"
                      onClick={(e) => e.preventDefault()}
                    >
                      Member?
                    </a>
                  </div>
                </div>

                <div className="header-desktop-nav">
                  <nav id="main-menu" className="main-menu" aria-label="Primary">
                    <ul id="navbar-collapse-1" className="navbar-nav">
                      <li className="active">
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
                              <li key={item.href} role="none">
                                <a role="menuitem" href={item.href}>
                                  {item.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                      <li>
                        <a href="/Recommendations">RECOMMENDED</a>
                      </li>
                      <li>
                        <a href="/Home/Hours">About Us</a>
                      </li>
                    </ul>
                  </nav>

                  <div className="search-form">
                    <form
                      id="search-form"
                      method="get"
                      action="#"
                      onSubmit={(e) => e.preventDefault()}
                    >
                      <div className="input-1">
                        <input
                          type="text"
                          id="txtSearch"
                          className="stxtProductSearch"
                          placeholder="Search for your items easily here"
                          aria-label="Search for your items easily here"
                        />
                        <button
                          type="submit"
                          id="btnProductSearch"
                          className="btn-product-search"
                          aria-label="Search"
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

          {/* Mobile header */}
          <div className="header-mobile">
            <div className="mobile-menu">
              <div className="menu__toggle">
                <button
                  type="button"
                  className={`navbar-toggle${mobileMenuOpen ? " is-open" : ""}`}
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  <span className="icon-bar" />
                  <span className="icon-bar" />
                  <span className="icon-bar" />
                </button>
                <a
                  href="#"
                  className="btn-login btn-login-mobile"
                  onClick={(e) => e.preventDefault()}
                >
                  Member?
                </a>
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

                  {/* Present in Singapore DOM; hidden on homepage empty-cart state */}
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
                    onClick={() => setMobileSearchOpen((open) => !open)}
                  >
                    <SearchIcon size={22} />
                  </button>

                  {/* Present in Singapore DOM; hidden on homepage empty-cart state */}
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
                <form
                  method="get"
                  action="#"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="text"
                    className="stxtProductSearch mobile-search-input"
                    placeholder="Search for your items easily here"
                    aria-label="Search for your items easily here"
                  />
                </form>
              </div>
            ) : null}

            <div className="services-info-block">
              <button
                type="button"
                className="select-datetime-service"
                title="Select service, date and time"
              >
                <span>Select service, date and time</span>
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="17"
                  viewBox="0 0 10 17"
                  fill="none"
                >
                  <path
                    d="M0 2.38L6.10667 8.5L0 14.62L1.88 16.5L9.88 8.5L1.88 0.5L0 2.38Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile off-canvas navigation */}
        <div
          className={`menu-mb-backdrop${mobileMenuOpen ? " is-open" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden={!mobileMenuOpen}
        />
        <nav
          id="menu-mb"
          className={`menu-mb${mobileMenuOpen ? " is-open" : ""}`}
          aria-label="Mobile"
          aria-hidden={!mobileMenuOpen}
        >
          <div className="menu-mb-inner">
            <ul className="menu-mb-links list-3">
              <li>
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <a
                  href="/Recommendations"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Recommended</span>
                </a>
              </li>
              <li>
                <a href="/Promotion" onClick={() => setMobileMenuOpen(false)}>
                  <span>Promotions</span>
                </a>
              </li>
              <li>
                <a href="/Home/Hours" onClick={() => setMobileMenuOpen(false)}>
                  <span>About Us</span>
                </a>
              </li>
            </ul>
            <div className="menu-mb-categories-block">
              <h2 className="menu-mb-categories-title title-5">
                Menu Categories
              </h2>
              <ul className="menu-mb-categories list-1">
                {menuCategories.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </header>

      <main className="home-main">
        <section
          id="main-slide"
          className="block slider-block"
          aria-label="Home slider"
        >
          <div
            className="slider slider-1 home-page-slider"
            data-slider="home-slider"
          />
        </section>

        <div className="home-body">
          <div className="home-layout">
            <div className="home-content">
              <section
                id="announcement-homepage-section"
                className="announcement-section"
              >
                <div
                  className={`announcement-content${announcementExpanded ? " is-expanded" : ""}`}
                >
                  <p>
                    <em>Dear Valued Ladurée Customers</em>,
                  </p>
                  <p>
                    - We offer Islandwide Delivery (or Advance orders) to a
                    single location in Singapore at <strong>$18</strong>, no
                    minimum purchase required.
                  </p>
                  <p>
                    - Enjoy <strong>FREE WEEKDAY</strong> delivery if you
                    purchase <strong>$90</strong> and above.
                  </p>
                  <p>
                    - A surcharge of +$8.80 will be incurred for all deliveries
                    fulfilled during Weekends and Special Occasions (Eve of PH,
                    PH & Celebratory Days). This surcharge also applies to
                    delivery orders above $90.
                  </p>
                  <p>
                    <strong>Summary of Delivery Charges:</strong>
                  </p>
                  <p>
                    - Potential delays might occur due to bad weather/shortage
                    of delivery personnel.
                  </p>
                  <p>
                    - Payment options: Visa/Mastercard only.
                  </p>
                  <p>Thank you for your support and understanding!</p>
                </div>
                <button
                  type="button"
                  className="announcement-toggle"
                  onClick={() => setAnnouncementExpanded((open) => !open)}
                >
                  {announcementExpanded ? "View less" : "View more"}
                </button>
              </section>

              <div className="row floating-category menu-floating">
                <aside
                  id="floating-category__menu"
                  className="floating-category-rail"
                  aria-label="Menu Categories"
                >
                  <ul className="category-menu-mobile item-menu-floating">
                    {catalogSections.map((section) => (
                      <li key={section.id} className="menu-mobile-item">
                        <a href={`#category-${section.id}`}>
                          <span className="slide__title">{section.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </aside>

                <div className="products-column">
                  {catalogSections.map((section) => (
                    <section
                      key={section.id}
                      id={`category-${section.id}`}
                      className="category-section block-1 full-menu-block style-1"
                    >
                      <div className="title-group">
                        <h2 className="title-2">
                          <span className="color-by-theme">{section.title}</span>
                        </h2>
                        <p className="desc text-clamp-overflow">{section.intro}</p>
                      </div>

                      <div
                        className="LazyLoading product-container vertical-products"
                        data-item-per-row="3"
                      >
                        {section.products.map((title) => (
                          <article
                            key={title}
                            className="item-products"
                          >
                            <div className="thumbnail thumbnail-1 style-1">
                              <div className="thumbnail-group__top">
                                <div
                                  className="product__img product__img--empty"
                                  role="img"
                                  aria-label={title}
                                />
                                <h3 className="title-4">
                                  <button
                                    type="button"
                                    className="text-clamp-overflow-item"
                                  >
                                    {title}
                                  </button>
                                </h3>
                              </div>
                              <div className="thumbnail-group__bottom">
                                <div className="price-bottom">฿ —</div>
                                <div className="btn-add">
                                  <button
                                    type="button"
                                    className="btn btn-3 btn-sm btn-add-to-cart product__btn btn-grey"
                                  >
                                    ADD
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}

                  <p
                    id="description-by-recommended"
                    className="description-by-recommended"
                  >
                    Items with star{" "}
                    <span className="star-icon" aria-hidden="true">
                      ★
                    </span>{" "}
                    are recommended by our chef and patrons
                  </p>
                </div>
              </div>
            </div>

            <aside className="sidebar" aria-label="Cart">
              <div className="cart-block">
                <div className="tab-service-main">
                  <div className="tab-service-item active">Pick-up</div>
                  <button type="button" className="tab-service-item tab-service-other">
                    Select Other Services
                  </button>
                </div>

                <div id="divPickupMyCart" className="bg-pink cart-fulfillment">
                  <div className="cart-outlet">
                    <span className="cart-outlet-name">Ladurée Thailand</span>
                  </div>
                  <div className="cart-pickup-time">
                    <span className="cart-pickup-label">Pickup Time</span>
                    <button type="button" className="cart-pickup-change">
                      Select a different date/time
                    </button>
                  </div>
                </div>

                <div className="cart-items-header">
                  <span>Item(s) Added</span>
                  <button type="button" id="clear-items" className="clear-items">
                    Clear items
                  </button>
                </div>

                <div
                  id="ErrNothingToCheckout"
                  className="danger_message cart-empty"
                >
                  Your cart is empty.Add at least 1 item to checkout!
                </div>

                <div id="info-total-cart" className="cart-totals">
                  <div className="cart-total-row">
                    <span>Item(s) Total</span>
                    <span>฿ —</span>
                  </div>
                  <div className="cart-total-row">
                    <span>Tax</span>
                    <span>฿ —</span>
                  </div>
                </div>

                <div id="content-cart-checkout" className="cart-checkout">
                  <button
                    type="button"
                    id="btnCheckOut"
                    className="btn-checkout"
                  >
                    <span className="checkout-total-amount">฿ —</span>
                    <span id="textCheckOut">Checkout</span>
                    <span className="checkout-total-quantity">0</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer id="footer" className="site-footer">
        <div className="footer">
          <div className="container-fluid footer-inner">
            <ul className="list-inline footer-menu">
              <li>
                <a href="/Home/TermsConditions" title="Allergen Information">
                  Allergen Information
                </a>
              </li>
            </ul>
            <p className="copy">
              <span className="copyrights-copy">
                ©2026 Laduree Paris. Powered by{" "}
              </span>
              <a href="http://getz.co" rel="noreferrer">
                Getz
              </a>
            </p>
          </div>
        </div>
      </footer>

      <div className="homepage-cart-button-display">
        <button type="button" className="btn-homepage-cart-display">
          View Cart
          <span className="view-cart-qty">0</span>
        </button>
      </div>
    </div>
  );
}
