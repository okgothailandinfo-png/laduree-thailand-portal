"use client";

import Link from "next/link";
import { isStorefrontUnavailableDisplay } from "@/lib/catalog/storefront-visibility";
import { formatPriceThb } from "@/lib/api/catalog";
import type { ProductSummary } from "@/lib/api/types";

export default function ProductCard({ product }: { product: ProductSummary }) {
  const unavailable = isStorefrontUnavailableDisplay(product);
  const href = `/product/${product.slug}`;

  return (
    <div className="lazy item-products" data-full-height-item="">
      <div className="thumbnail thumbnail-1 style-1">
        <div className="thumbnail-group__top">
          <div className="product__img">
            <Link href={href} className="img-1">
              <img
                className="img-responsive-2"
                src={product.imagePlaceholder}
                alt={product.title}
              />
            </Link>
          </div>
          <div className="title-4">
            <Link href={href} className="text-clamp-overflow-item">
              {product.title}
            </Link>
          </div>
        </div>
        <div className="thumbnail-group__bottom">
          <div className="price-bottom">
            <span>{formatPriceThb(product.priceThb)}</span>
          </div>
          <div className="btn-add">
            <div className="product-item__footer">
              {unavailable ? (
                <span
                  className="btn btn-3 btn-sm btn-add-to-cart product__btn btn-grey is-unavailable"
                  aria-disabled="true"
                >
                  Unavailable
                </span>
              ) : (
                <Link
                  href={href}
                  className="btn btn-3 btn-sm btn-add-to-cart product__btn btn-grey"
                >
                  ADD
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
