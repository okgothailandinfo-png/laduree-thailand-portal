"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import CatalogStatus from "./catalog/CatalogStatus";
import { useAsyncResource } from "./catalog/useAsyncResource";
import DesktopCartAside from "./cart/DesktopCartAside";
import MobileViewCartButton from "./cart/MobileViewCartButton";
import ServiceDateTimeBar from "./pickup/ServiceDateTimeBar";
import {
  fetchCategories,
  fetchProducts,
  formatPriceThb,
} from "@/lib/api/catalog";
import {
  contentByKey,
  fetchHomepage,
  sectionByKey,
} from "@/lib/api/homepage";
import type {
  Category,
  HomepageBanner,
  ProductSummary,
} from "@/lib/api/types";

type CatalogSection = {
  id: string;
  categoryId: string;
  title: string;
  products: ProductSummary[];
};

const CONTENT_PENDING = "[CONTENT PENDING APPROVAL]";

type HeroSlide = {
  id: string;
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  linkUrl: string | null;
};

/** Safe empty-banner shell — existing placeholders only, no invented copy. */
const FALLBACK_HERO_SLIDE: HeroSlide = {
  id: "fallback-banner",
  desktopSrc: "/hero-placeholder-desktop.svg",
  mobileSrc: "/hero-placeholder-mobile.svg",
  alt: "",
  linkUrl: null,
};

function isSafeHref(href: string): boolean {
  const lower = href.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function BannerSlideLink({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  if (!href || !isSafeHref(href)) {
    return (
      <a href="" onClick={(e) => e.preventDefault()}>
        {children}
      </a>
    );
  }
  if (href.startsWith("/") && !href.startsWith("//")) {
    return <Link href={href}>{children}</Link>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function bannersToSlides(banners: HomepageBanner[]): HeroSlide[] {
  if (banners.length === 0) return [FALLBACK_HERO_SLIDE];
  return banners.map((banner) => ({
    id: banner.id,
    desktopSrc: banner.imageUrl,
    mobileSrc: banner.mobileImageUrl || banner.imageUrl,
    alt: banner.altText ?? banner.title,
    linkUrl: banner.linkUrl,
  }));
}

function multilineParagraphs(value: string | null): string[] {
  if (!value) return [CONTENT_PENDING];
  const parts = value
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [CONTENT_PENDING];
}

function buildCatalogSections(
  categories: Category[],
  products: ProductSummary[],
): CatalogSection[] {
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      id: category.slug,
      categoryId: category.id,
      title: category.name,
      products: products.filter(
        (product) => product.categoryId === category.id,
      ),
    }));
}

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

const HOME_SLIDER_AUTOPLAY_MS = 5000;
const HOME_SLIDER_SPEED_MS = 500;

/** Singapore footer slider shell — Thailand assets pending approval. */
const FOOTER_SLIDES = [{ id: "footer-1" }, { id: "footer-2" }] as const;
const FOOTER_SLIDER_AUTOPLAY_MS = 5000;
const FOOTER_SLIDER_SPEED_MS = 500;

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [service, setService] = useState<"Pick-up" | "Delivery">("Pick-up");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    null,
  );
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [footerSlide, setFooterSlide] = useState(0);
  const menuRef = useRef<HTMLLIElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const catalog = useAsyncResource(
    async (signal) => {
      const [categories, products] = await Promise.all([
        fetchCategories({ signal }),
        fetchProducts({ signal }),
      ]);
      return { categories, products };
    },
    {
      isEmpty: (data) =>
        data.categories.length === 0 && data.products.length === 0,
    },
  );

  const homepage = useAsyncResource(
    async (signal) => fetchHomepage({ signal }),
    {
      isEmpty: (data) =>
        data.banners.length === 0 &&
        data.sections.length === 0 &&
        data.content.length === 0,
    },
  );

  const menuCategories = catalog.data?.categories ?? [];
  const catalogSections = useMemo(
    () =>
      buildCatalogSections(
        catalog.data?.categories ?? [],
        catalog.data?.products ?? [],
      ),
    [catalog.data],
  );

  const heroSlides = useMemo(() => {
    if (homepage.status === "success" || homepage.status === "empty") {
      return bannersToSlides(homepage.data?.banners ?? []);
    }
    return [] as HeroSlide[];
  }, [homepage.status, homepage.data]);

  const homepageContent = homepage.data?.content ?? [];
  const homepageSections = homepage.data?.sections ?? [];
  const brandDisplayName =
    contentByKey(homepageContent, "brand.display_name") ?? CONTENT_PENDING;
  const announcementGreeting =
    contentByKey(homepageContent, "announcement.greeting") ??
    "Dear Valued Ladurée Customers";
  const announcementParagraphs = multilineParagraphs(
    contentByKey(homepageContent, "announcement.body"),
  );
  const announcementSummaryTitle =
    contentByKey(homepageContent, "announcement.summary_title") ??
    CONTENT_PENDING;
  const announcementClosing =
    contentByKey(homepageContent, "announcement.closing") ??
    "Thank you for your support and understanding!";
  const chefStarBlurb =
    contentByKey(homepageContent, "homepage.chef_star_blurb") ??
    sectionByKey(homepageSections, "chef_recommendation")?.description ??
    null;
  const defaultSectionDescription =
    contentByKey(homepageContent, "catalog.default_section_description") ??
    CONTENT_PENDING;

  const resolvedActiveCategoryId =
    activeCategoryId ?? catalogSections[0]?.id ?? null;
  const touchStartX = useRef<number | null>(null);

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

  const activeHeroIndex =
    heroSlides.length > 0 ? activeSlide % heroSlides.length : 0;

  useEffect(() => {
    if (sliderPaused || heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, HOME_SLIDER_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [sliderPaused, heroSlides.length]);

  useEffect(() => {
    if (FOOTER_SLIDES.length <= 1) return;
    const timer = window.setInterval(() => {
      setFooterSlide((current) => (current + 1) % FOOTER_SLIDES.length);
    }, FOOTER_SLIDER_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, []);

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
                  <h1
                    className="brand-name"
                    onClick={() => {
                      window.location.href = "/";
                    }}
                  >
                    {homepage.status === "error"
                      ? CONTENT_PENDING
                      : brandDisplayName}
                  </h1>
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
                              <li key={item.id} role="none">
                                <a
                                  role="menuitem"
                                  href={`#scroll-${item.slug}`}
                                  onClick={() => {
                                    setMenuOpen(false);
                                    setActiveCategoryId(item.slug);
                                  }}
                                >
                                  {item.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                      <li>
                        <a
                          href="#recommended"
                          onClick={(e) => e.preventDefault()}
                        >
                          RECOMMENDED
                        </a>
                      </li>
                      <li>
                        <a
                          href="#about-us"
                          onClick={(e) => e.preventDefault()}
                        >
                          About Us
                        </a>
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

            <ServiceDateTimeBar />
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
                  href="#recommended"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                  }}
                >
                  <span>Recommended</span>
                </a>
              </li>
              <li>
                <a
                  href="#promotions"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                  }}
                >
                  <span>Promotions</span>
                </a>
              </li>
              <li>
                <a
                  href="#about-us"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                  }}
                >
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
                      <li key={item.id}>
                        <a
                          href={`#scroll-${item.slug}`}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setActiveCategoryId(item.slug);
                          }}
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
            </div>
          </div>
        </nav>
      </header>

      <main className="home-main">
        <section id="main-slide" className="block slider-block">
          <div className="container-fluid">
            {homepage.status === "loading" || homepage.status === "error" ? (
              <CatalogStatus
                status={homepage.status === "loading" ? "loading" : "error"}
                errorMessage={homepage.errorMessage}
                emptyMessage="No banners available."
                onRetry={homepage.reload}
              />
            ) : (
              <div
                className="slider slider-1 home-page-slider slick-initialized slick-slider"
                data-slider="home-slider"
                onMouseEnter={() => setSliderPaused(true)}
                onMouseLeave={() => setSliderPaused(false)}
                onTouchStart={(event) => {
                  touchStartX.current =
                    event.changedTouches[0]?.clientX ?? null;
                  setSliderPaused(true);
                }}
                onTouchEnd={(event) => {
                  const startX = touchStartX.current;
                  const endX = event.changedTouches[0]?.clientX;
                  touchStartX.current = null;
                  setSliderPaused(false);
                  if (startX == null || endX == null) return;
                  const delta = endX - startX;
                  if (Math.abs(delta) < 40) return;
                  setActiveSlide((current) =>
                    delta < 0
                      ? (current + 1) % heroSlides.length
                      : (current - 1 + heroSlides.length) % heroSlides.length,
                  );
                }}
              >
                <div className="slick-list draggable" aria-live="polite">
                  <div
                    className="slick-track"
                    style={{
                      transform: `translate3d(-${activeHeroIndex * 100}%, 0, 0)`,
                      transition: `transform ${HOME_SLIDER_SPEED_MS}ms ease`,
                    }}
                  >
                    {heroSlides.map((slide, index) => (
                      <div
                        key={slide.id}
                        className={`slide slick-slide${index === activeHeroIndex ? " slick-current slick-active" : ""}`}
                        data-slick-index={index}
                        aria-hidden={index !== activeHeroIndex}
                      >
                        <BannerSlideLink href={slide.linkUrl}>
                          <picture>
                            <source
                              media="(max-width: 767px)"
                              srcSet={slide.mobileSrc}
                            />
                            <img
                              className="asyncImage img-responsive-1"
                              src={slide.desktopSrc}
                              alt={slide.alt}
                            />
                          </picture>
                        </BannerSlideLink>
                      </div>
                    ))}
                  </div>
                </div>
                <ul className="slick-dots" role="tablist">
                  {heroSlides.map((slide, index) => (
                    <li
                      key={slide.id}
                      className={
                        index === activeHeroIndex ? "slick-active" : undefined
                      }
                      role="presentation"
                    >
                      <button
                        type="button"
                        data-role="none"
                        role="tab"
                        aria-label={`${index + 1}`}
                        aria-selected={index === activeHeroIndex}
                        tabIndex={0}
                        onClick={() => setActiveSlide(index)}
                      >
                        {index + 1}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <div id="bodyMainHome" className="home-body container-fluid">
          <div className="home-layout">
            <div className="home-content">
              {/* Mobile iconic category navigation (Singapore homepage body pattern) */}
              <nav
                className="category-nav-mobile"
                aria-label="Menu Categories"
              >
                {catalog.status === "loading" ||
                catalog.status === "error" ||
                catalog.status === "empty" ? (
                  <CatalogStatus
                    status={catalog.status}
                    errorMessage={catalog.errorMessage}
                    emptyMessage="No categories available."
                    onRetry={catalog.reload}
                  />
                ) : (
                  <ul className="category-menu-mobile category-menu-iconic">
                    {catalogSections.map((section) => (
                      <li
                        key={`mobile-nav-${section.id}`}
                        className="menu-mobile-item"
                      >
                        <a
                          href={`#scroll-${section.id}`}
                          title={section.title}
                          onClick={() => setActiveCategoryId(section.id)}
                        >
                          <span
                            className="img-category-iconic b-radius"
                            style={{
                              backgroundImage:
                                "url(/category-icon-placeholder.svg)",
                            }}
                            aria-hidden="true"
                          />
                          <span className="slide__title item-menu-title">
                            {section.title}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </nav>

              <div
                id="floating-category__menu"
                className="row floating-category menu-floating"
              >
                {/* Promotion / Collection editorial — Singapore #announcement-homepage-section */}
                <section
                  id="announcement-homepage-section"
                  className={`announcement-section${announcementExpanded ? " readmore" : ""}`}
                >
                  <div className="col-xs-12">
                    {homepage.status === "loading" ||
                    homepage.status === "error" ? (
                      <CatalogStatus
                        status={
                          homepage.status === "loading" ? "loading" : "error"
                        }
                        errorMessage={homepage.errorMessage}
                        emptyMessage="No announcement content."
                        onRetry={homepage.reload}
                      />
                    ) : (
                      <>
                        <div className="announcement-content">
                          <p>
                            <span className="announcement-body-text">
                              <em>{announcementGreeting}</em>,
                            </span>
                          </p>
                          {announcementParagraphs.map((paragraph, index) => (
                            <p key={`announcement-p-${index}`}>
                              <span className="announcement-body-text">
                                {paragraph}
                              </span>
                            </p>
                          ))}
                          <div>
                            <hr className="announcement-divider" />
                            <p className="announcement-summary-title">
                              <strong>{announcementSummaryTitle}</strong>
                            </p>
                            <div className="announcement-table-wrap">
                              <table className="announcement-delivery-table">
                                <tbody>
                                  <tr>
                                    <td>
                                      <strong>
                                        Purchase Value
                                        <br />
                                        (with VAT)
                                      </strong>
                                    </td>
                                    <td>
                                      <strong>Weekdays</strong>
                                    </td>
                                    <td>
                                      <strong>
                                        Weekends /
                                        <br />
                                        Special Occasions
                                      </strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>{CONTENT_PENDING}</td>
                                    <td>{CONTENT_PENDING}</td>
                                    <td>{CONTENT_PENDING}</td>
                                  </tr>
                                  <tr>
                                    <td>{CONTENT_PENDING}</td>
                                    <td>{CONTENT_PENDING}</td>
                                    <td>{CONTENT_PENDING}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <p>
                            <span className="announcement-body-text">
                              {announcementClosing}
                            </span>
                          </p>
                        </div>
                        <div
                          className="view-actions"
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setAnnouncementExpanded((open) => !open)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setAnnouncementExpanded((open) => !open);
                            }
                          }}
                        >
                          <span className="view-more">View more</span>
                          <span className="view-less">View less</span>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* Category navigation — Singapore #idMenuLeft (below announcement) */}
                <div
                  id="idMenuLeft"
                  className="floating-category-rail col-xs-5 col-sm-4 col-md-3 pull-left remove-padding-left-right-mobile remove-padding-right"
                  aria-label="Menu Categories"
                >
                  <ul className="nav category-menu-mobile item-menu-floating position-fixed">
                    {catalogSections.map((section) => {
                      const isActive = resolvedActiveCategoryId === section.id;
                      return (
                        <li
                          key={`rail-${section.id}`}
                          id={`li-${section.id}`}
                          className={`menu-mobile-item floating-category-item${isActive ? " active" : ""}`}
                          data-href={`#scroll-${section.id}`}
                          onClick={() => setActiveCategoryId(section.id)}
                        >
                          <span className="slide__title item-menu-title">
                            {section.title}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Featured Product Grid — Singapore #product-grid */}
                <div id="product-grid" className="products-column">
                  <section
                    id="description-by-recommended"
                    className="full-menu-block style-1 description-by-recommended"
                  >
                    <div className="group-title">
                      {chefStarBlurb ? (
                        chefStarBlurb
                      ) : (
                        <>
                          Items with star{" "}
                          <i
                            className="fa fa-star color-by-star"
                            aria-hidden="true"
                          >
                            ★
                          </i>{" "}
                          are recommended by our chef and patrons
                        </>
                      )}
                    </div>
                  </section>

                  {catalog.status === "loading" ||
                  catalog.status === "error" ||
                  catalog.status === "empty" ? (
                    <CatalogStatus
                      status={catalog.status}
                      errorMessage={catalog.errorMessage}
                      emptyMessage="No items available."
                      onRetry={catalog.reload}
                    />
                  ) : (
                    catalogSections.map((section) => (
                      <section
                        key={section.id}
                        id={`category-${section.id}`}
                        data-category-id={section.id}
                        className="full-menu-block style-1 item-products-floating"
                      >
                        <div
                          className="title-group"
                          id={`scroll-${section.id}`}
                        >
                          <h2 className="title-2">
                            <a
                              href={`#scroll-${section.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setActiveCategoryId(section.id);
                                document
                                  .getElementById(`scroll-${section.id}`)
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }}
                            >
                              <span className="color-by-theme">
                                {section.title}
                              </span>
                            </a>
                            <i
                              className="fa fa-chevron-circle-right visible-xs"
                              aria-hidden="true"
                            />
                          </h2>
                          <div className="desc text-clamp-overflow">
                            <p>
                              {contentByKey(
                                homepageContent,
                                `catalog.${section.id}.description`,
                              ) ??
                                sectionByKey(
                                  homepageSections,
                                  `catalog.${section.id}`,
                                )?.description ??
                                defaultSectionDescription}
                            </p>
                          </div>
                        </div>

                        <div
                          className="LazyLoading product-container vertical-products"
                          data-item-per-row="3"
                        >
                          {section.products.length === 0 ? (
                            <CatalogStatus
                              status="empty"
                              emptyMessage="No items available."
                            />
                          ) : (
                            section.products.map((product) => (
                              <div
                                key={product.id}
                                className="lazy item-products"
                                data-full-height-item=""
                              >
                                <div className="thumbnail thumbnail-1 style-1">
                                  <div className="thumbnail-group__top">
                                    <div className="product__img">
                                      <span className="img-1">
                                        <img
                                          className="img-responsive-2"
                                          src={product.imagePlaceholder}
                                          alt=""
                                        />
                                      </span>
                                    </div>
                                    <div className="title-4">
                                      <div className="text-clamp-overflow-item">
                                        {product.title}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="thumbnail-group__bottom">
                                    <div className="price-bottom">
                                      <span>
                                        {formatPriceThb(product.priceThb)}
                                      </span>
                                    </div>
                                    <div className="btn-add">
                                      <div className="product-item__footer">
                                        <Link
                                          href={`/product/${product.slug}`}
                                          className="btn btn-3 btn-sm btn-add-to-cart product__btn btn-grey"
                                        >
                                          ADD
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </div>
            </div>

            <aside className="sidebar" aria-label="Cart">
              <DesktopCartAside />
            </aside>
          </div>
        </div>
      </main>

      <footer id="footer">
        {/* Singapore footer slider (data-slider="footer-slider") */}
        <section
          id="footer-slide"
          className="block slider-block footer-slider-block"
        >
          <div className="container-fluid">
            <div
              data-slider="footer-slider"
              className="slider slider-1 home-page-slider slick-initialized slick-slider"
            >
              <div className="slick-list draggable" aria-live="polite">
                <div
                  className="slick-track"
                  style={{
                    transform: `translate3d(-${footerSlide * 100}%, 0, 0)`,
                    transition: `transform ${FOOTER_SLIDER_SPEED_MS}ms ease`,
                  }}
                >
                  {FOOTER_SLIDES.map((slide, index) => (
                    <div
                      key={slide.id}
                      className={`slide slick-slide${index === footerSlide ? " slick-current slick-active" : ""}`}
                      data-slick-index={index}
                      aria-hidden={index !== footerSlide}
                    >
                      <a href="" onClick={(e) => e.preventDefault()}>
                        <picture>
                          <source
                            media="(max-width: 767px)"
                            srcSet="/footer-placeholder-mobile.svg"
                          />
                          <img
                            className="asyncImage img-responsive-1"
                            src="/footer-placeholder-desktop.svg"
                            alt=""
                          />
                        </picture>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="slick-dots" role="tablist">
                {FOOTER_SLIDES.map((slide, index) => (
                  <li
                    key={`footer-dot-${slide.id}`}
                    className={index === footerSlide ? "slick-active" : ""}
                    role="presentation"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={index === footerSlide}
                      aria-label={`Footer slide ${index + 1}`}
                      onClick={() => setFooterSlide(index)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="footer">
          <div className="container-fluid">
            <ul className="list-inline footer-menu">
              <li>
                <a
                  href="#allergen-information"
                  title="Allergen Information"
                  onClick={(e) => e.preventDefault()}
                >
                  Allergen Information
                </a>
              </li>
            </ul>
            <ul className="list-inline socials" />
            <p className="copy">
              <span className="copyrights-copy">©2026 Laduree Paris.</span>
            </p>
          </div>

          <div id="scroll-top" className="hidden" aria-hidden="true">
            <i className="fa fa-chevron-up" />
          </div>

          <div className="homepage-cart-button-display">
            <MobileViewCartButton />
          </div>
        </div>
      </footer>
    </div>
  );
}
