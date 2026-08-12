# Sprint 33A — Brand / UI / Mobile / Accessibility

**Branch:** `cursor/sprint-33a-brand-ui-a11y`  
**Scope:** Storefront brand/UI foundation, mobile-first behavior, native accessibility, EN/TH chrome readiness.  
**Out of scope:** Thailand catalog import, Sprint 18 product-type generalization, real PSP/infra, accessibility overlay widgets, invented brand assets or Thai product/legal copy.

## Brand / UI

- Isolated page-canvas tokens:
  - `--sg-page-canvas-cream` (`#fdf8ec`, Singapore verified)
  - `--brand-page-canvas-white` (`#ffffff`, Global white candidate)
  - `--brand-page-canvas` → currently cream until owner confirms Global pure-white canvas
- Surfaces/drawers/mobile menu use white (`--color-white` / `--surface`) for light presentation
- Secondary text contrast improved via `--color-text-muted: #555555`
- Body line-height token `--body-line-height: 1.45` for readability
- Logo path unchanged (`/logo.jpg`) — approval still OWNER CONFIRMATION REQUIRED

## Accessibility (WCAG 2.2 AA–oriented, native)

- Skip link → `#main-content`
- Global `:focus-visible` ring using brand olive
- Cart drawer: Escape, Tab trap, initial focus, restore focus, `inert` when closed, `aria-labelledby`
- Pickup modal: shared focus helpers + restore focus
- Mobile menu: Escape close, backdrop as button, `inert` when closed
- Pending nav items: disabled controls (no dead links)
- Product card + PDP image ALT from product title
- `app/not-found.tsx` + `app/error.tsx`
- `prefers-reduced-motion` CSS + slider autoplay pause
- `overflow-x: hidden` on body; touch-target floor token `44px`

## EN / TH readiness

- `lib/i18n/locale.ts` + `lib/i18n/ui-chrome.ts`
- Language switcher in header (EN active, TH disabled with pending title)
- HTML `lang="en"` retained until TH is owner-activated
- Thai message values are `[CONTENT PENDING APPROVAL]` only

## Owner / brand confirmations still required

1. Graphic Charter / exact Global token set
2. Approved digital logo variant
3. Page canvas: cream vs pure white (`--brand-page-canvas`)
4. Activate TH locale + approved Thai UI chrome strings
5. About Us / Recommended / Promotions / Allergen / Search destinations
6. Thailand legal + allergen page content (deferred — not invented in 33A)

## Deferred

- **33B** Product architecture generalization (CONFIGURABLE_BOX / FIXED_PACK / SIMPLE_PRODUCT) — see `docs/sprint-33b-product-architecture.md`
- **33C** Thailand product & content integration
- **33D** Storefront finalization (SEO robots/sitemap/OG, consent/privacy pages, full chrome reuse)

## Tests

- `app/a11y/sprint-33a-a11y.test.ts` added to `npm run test:pickup`
