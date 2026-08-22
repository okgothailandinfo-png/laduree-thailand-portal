"use client";

import type { ImgHTMLAttributes } from "react";
import {
  STOREFRONT_IMAGE_PLACEHOLDER,
  storefrontImageSrc,
} from "@/lib/catalog/storefront-image";

type StorefrontImgProps = ImgHTMLAttributes<HTMLImageElement>;

/** Catalog image with placeholder fallback. Does not invent photography. */
export default function StorefrontImg({
  src,
  alt,
  onError,
  ...rest
}: StorefrontImgProps) {
  return (
    <img
      {...rest}
      src={storefrontImageSrc(typeof src === "string" ? src : null)}
      alt={alt ?? ""}
      onError={(event) => {
        const img = event.currentTarget;
        if (img.dataset.fallbackApplied === "1") return;
        img.dataset.fallbackApplied = "1";
        img.src = STOREFRONT_IMAGE_PLACEHOLDER;
        onError?.(event);
      }}
    />
  );
}
