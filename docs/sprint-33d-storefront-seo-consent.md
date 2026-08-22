# Sprint 33D — Storefront Finalization, SEO, Consent & Release UX

**Branch:** `cursor/sprint-33d-storefront-seo-consent`  
**Scope:** Release-safety SEO, shared chrome, category PLP, Unavailable UX, metadata/robots/sitemap, technical cookie consent.  
**Not authorized:** live selling, product activation, invented legal/marketing/pricing data, production deploy, TH locale activation.

## Slice 1 — Release safety

- `STOREFRONT_INDEXING=live` **and** `APP_ENV=production` required before public indexing.
- Default: sitewide `noindex` + `robots` `Disallow: /`.
- `findBySlug` hides inactive/unavailable products in production (mock + Prisma).
- Non-production still allows Thailand LDR Draft PDPs for catalog QA.
- Sitemap emits **zero** product URLs until products are live **and** purchasable.
- Cart/checkout/order purchasability gates from Sprint 33C are unchanged.

## Slice 2 — Storefront

- Shared `SiteHeader` / `SiteFooter` / `StorefrontChrome` on Home, Category, PDP, checkout, payment, account, orders.
- Category routes: `/Category` (All Items) and `/Category/{slug}` from the Thailand hierarchy.
- Singapore `Unavailable` card label and PDP `This product is unavailable at this time.`
- Search remains a disabled pending control (`Search items`).
- About Us / Recommended / Promotions / Allergen Information stay `PendingNavControl`.

## Slice 3 — SEO

- `metadataBase`, title template, canonical, Open Graph, `en` locale alternates.
- Transactional routes always `noindex`.
- PDP metadata uses product title; drafts/unpriced stay `noindex`.
- No invented marketing descriptions.

## Slice 4 — Consent

- Technical banner + settings dialog.
- Essential always on; analytics/marketing default off and gated.
- Persistence: `laduree.consent.v1` in localStorage.
- Legal body: `[CONTENT PENDING APPROVAL]`.
- Footer **Cookie settings** reopens preferences.
- No privacy/terms/cookie-policy pages (no owner/counsel text; not on SG footer except Allergen which remains pending).

## Slice 5 — A11y / mobile

- Category rail is a keyboard button.
- Account menu Tab trap.
- Remark field labelled.
- Language switcher 44px minimum.
- Offline banner uses Singapore wording.
- TH locale remains disabled.

## Owner still required

See `docs/thailand-content.md`. Do not activate `STOREFRONT_INDEXING=live` until live commerce is authorized and the catalog is no longer Safe-Draft.
