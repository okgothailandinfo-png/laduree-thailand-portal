/**
 * Safe storefront image fallback. Does not invent product photography.
 * Placeholder is the existing catalog asset used for Safe-Draft SKUs.
 */

export const STOREFRONT_IMAGE_PLACEHOLDER = "/product-placeholder.svg";

export function storefrontImageSrc(url: string | null | undefined): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : STOREFRONT_IMAGE_PLACEHOLDER;
}
