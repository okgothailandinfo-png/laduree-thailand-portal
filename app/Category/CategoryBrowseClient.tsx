"use client";

import CatalogStatus from "../catalog/CatalogStatus";
import { useAsyncResource } from "../catalog/useAsyncResource";
import DesktopCartAside from "../cart/DesktopCartAside";
import ProductCard from "../chrome/ProductCard";
import StorefrontChrome from "../chrome/StorefrontChrome";
import { fetchCategories, fetchProducts } from "@/lib/api/catalog";
import type { Category, ProductSummary } from "@/lib/api/types";

function ProductSection({
  heading,
  headingLevel,
  category,
  products,
}: {
  heading: string;
  headingLevel: "h1" | "h2";
  category: Category;
  products: ProductSummary[];
}) {
  const Heading = headingLevel;
  return (
    <section
      id={`category-${category.slug}`}
      className="full-menu-block style-1 item-products-floating"
    >
      <div className="title-group" id={`scroll-${category.slug}`}>
        <Heading className="title-2">
          <span className="color-by-theme">{heading}</span>
        </Heading>
      </div>
      <div className="LazyLoading product-container vertical-products">
        {products.length === 0 ? (
          <CatalogStatus status="empty" emptyMessage="No items available." />
        ) : (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </section>
  );
}

function CatalogBrowse({
  pageTitle,
  slug,
}: {
  pageTitle: string;
  slug?: string;
}) {
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

  const categories = catalog.data?.categories ?? [];
  const products = catalog.data?.products ?? [];
  const visible = slug
    ? categories.filter((category) => category.slug === slug)
    : categories.filter((category) => category.slug !== "all-items");

  return (
    <StorefrontChrome categories={categories}>
      <main
        id="main-content"
        className="home-main category-browse"
        tabIndex={-1}
      >
        <div id="bodyMainHome" className="home-body container-fluid">
          <div className="home-layout">
            <div className="home-content">
              <div id="product-grid" className="products-column">
                {catalog.status === "loading" ||
                catalog.status === "error" ||
                catalog.status === "empty" ? (
                  <CatalogStatus
                    status={catalog.status}
                    errorMessage={catalog.errorMessage}
                    emptyMessage="No items available."
                    onRetry={catalog.reload}
                  />
                ) : slug ? (
                  visible.map((category) => (
                    <ProductSection
                      key={category.id}
                      heading={pageTitle}
                      headingLevel="h1"
                      category={category}
                      products={products.filter(
                        (product) => product.categoryId === category.id,
                      )}
                    />
                  ))
                ) : (
                  <>
                    <h1 className="title-2 category-browse__page-title">
                      <span className="color-by-theme">{pageTitle}</span>
                    </h1>
                    {visible.map((category) => (
                      <ProductSection
                        key={category.id}
                        heading={category.name}
                        headingLevel="h2"
                        category={category}
                        products={products.filter(
                          (product) => product.categoryId === category.id,
                        )}
                      />
                    ))}
                  </>
                )}
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

export function AllItemsBrowse() {
  return <CatalogBrowse pageTitle="All Items" />;
}

export function CategoryBrowse({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  return <CatalogBrowse pageTitle={title} slug={slug} />;
}
