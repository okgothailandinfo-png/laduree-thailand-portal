"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import CatalogStatus from "./catalog/CatalogStatus";
import { useAsyncResource } from "./catalog/useAsyncResource";
import DesktopCartAside from "./cart/DesktopCartAside";
import ProductCard from "./chrome/ProductCard";
import StorefrontChrome from "./chrome/StorefrontChrome";
import {
  fetchCategories,
  fetchProducts,
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

const HOME_SLIDER_AUTOPLAY_MS = 5000;
const HOME_SLIDER_SPEED_MS = 500;

export default function HomePageClient() {
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    null,
  );
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);

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

  const activeHeroIndex =
    heroSlides.length > 0 ? activeSlide % heroSlides.length : 0;

  useEffect(() => {
    if (sliderPaused || heroSlides.length <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, HOME_SLIDER_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [sliderPaused, heroSlides.length]);

  return (
    <StorefrontChrome
      categories={catalog.data?.categories ?? []}
      brandName={
        homepage.status === "error" ? CONTENT_PENDING : brandDisplayName
      }
      brandAsHeading
    >
      <main id="main-content" className="home-main" tabIndex={-1}>
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
                <nav
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
                        >
                          <button
                            type="button"
                            className="floating-category-link"
                            aria-current={isActive ? "true" : undefined}
                            onClick={() => {
                              setActiveCategoryId(section.id);
                              document
                                .getElementById(`scroll-${section.id}`)
                                ?.scrollIntoView({ behavior: "smooth" });
                            }}
                          >
                            <span className="slide__title item-menu-title">
                              {section.title}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

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
                              <ProductCard key={product.id} product={product} />
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

    </StorefrontChrome>
  );
}
