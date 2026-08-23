/**
 * Product-detail ADD CTA enablement.
 * Exact-selection completeness is supplied by the flavor engine.
 */

export function isProductAddCtaEnabled(input: {
  storefrontUnavailable: boolean;
  exactSelectionComplete: boolean;
  requiredComplete: boolean;
  priceAvailable: boolean;
}): boolean {
  return (
    !input.storefrontUnavailable &&
    input.exactSelectionComplete &&
    input.requiredComplete &&
    input.priceAvailable
  );
}
