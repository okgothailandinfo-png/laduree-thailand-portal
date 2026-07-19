# Production Readiness Audit — Sprint 20.8

**Project:** Ladurée Thailand Pickup Platform  
**Branch:** `cursor/sprint-20-8-production-readiness-audit`  
**Date:** 2026-07-19  
**Verdict:** **Not production-ready.** Estimated readiness: **62%** (verified evidence below).

---

## Executive summary

The SG-parity ordering path (catalog → exact macaron selection → cart → pickup → checkout → mock payment → confirmation / QR / pickup code) is functionally strong on the **mock catalog** path. Sprint 20.8 fixed safe Critical/High defects that could corrupt pickup dates, allow unpriced purchases into the cart, skip stale-slot gating on the cart CTA, create duplicate draft orders, ignore terms acceptance server-side, and hide trusted totals on payment review.

The platform remains blocked for production by missing real integrations, Prisma modifier persistence, persistent cart, customer order access control, approved Thailand content, and boutique/ops data. Do not soft-launch.

---

## Readiness percentage (62%)

| Area | Weight | Score | Notes |
|------|--------|-------|-------|
| Storefront / SG ordering flow (mock) | 20% | 16 | Working; content placeholders remain |
| Cart / pricing trust | 15% | 13 | Server-trusted prices; add rejects null price |
| Pickup availability | 10% | 8 | DateKey fixed; capacity not decremented |
| Checkout / mock payment | 10% | 8 | Idempotency + terms + trusted totals |
| Order / fulfilment / QR | 10% | 7 | Snapshots OK; IDOR remains |
| Admin / CMS | 10% | 4 | CRUD basics; no modifier CMS |
| API / security hardening | 15% | 6 | Sprint 20B scaffolding; providers missing |
| Content / localization / SEO | 10% | 0 | Pending approval + i18n |

**Formula:** sum of weighted scores ≈ **62%**. This is **not** a go-live score.

---

## Defects fixed in this sprint

| ID | Sev | Area | Description | User impact | Root cause | Fix | Status | Validation |
|----|-----|------|-------------|-------------|------------|-----|--------|------------|
| PR-001 | P0 | Pickup | Mock `findSlotById` stamped `dateKey` as today | Orders could store wrong pickup date | Template slots treated as dated rows | Empty template `dateKey`; checkout requires/validates `pickup.dateKey` via availability | **Fixed** | `pickup.repository.test.ts`, `checkout.service.test.ts` |
| PR-002 | P1 | Storefront | Null price still allowed ADD | Unpriced items could enter cart UX | `addDisabled` ignored price | Gate on `priceAvailable`; `disabled` + early return | **Fixed** | `product-detail.layout.test.ts` |
| PR-003 | P1 | Cart API | Server allowed add with null unit price | Cart held unpriced lines | No price assert on add | Reject `PRICE_UNAVAILABLE` on add | **Fixed** | `cart.service.test.ts` |
| PR-004 | P1 | Cart/Pickup | Cart CTA ignored stale slots | Proceed to Checkout with dead slot | `pickupSlotAvailable` never passed | Revalidate confirmed slot; pass flag to eligibility | **Fixed** | eligibility + pickup behavior tests |
| PR-005 | P1 | Checkout | No client idempotency key | Double-submit → duplicate drafts | Optional header unused by UI | Client sends `Idempotency-Key` per attempt | **Fixed** | code review + checkout route existing store |
| PR-006 | P1 | Payment | Totals showed `฿ —` | Customers could not see trusted total | Payment page ignored order DTO | Load order; show server `totalThb` | **Fixed** | `OrderDto.totalThb` + PaymentPageClient |
| PR-007 | P1 | Checkout | `termsAccepted` hardcoded true server-side | Bypass checkbox via API | Parse ignored body field | Require `termsAccepted === true` | **Fixed** | `checkout.service.test.ts` |

---

## P0 issues (open — production blockers)

| ID | Sev | Area | Description | User impact | Root cause | Recommended fix | Status | Validation |
|----|-----|------|-------------|-------------|------------|-----------------|--------|------------|
| PR-010 | P0 | Data/CMS | Prisma `modifierGroups: []` | Exact selection / acks vanish on prisma path | No modifier persistence | Schema/JSON + mapper + Admin CRUD (later CMS sprint) | **Open** | `mappers.ts`, `docs/admin-modifier-gaps.md` |
| PR-011 | P0 | Infra | Cart still in-memory under prisma | Cart lost on restart/scale | `MockCartRepository` always | Persist Cart model | **Open** | `create-repositories.ts`, `PRODUCTION_BLOCKERS` |
| PR-012 | P0 | Security | Customer order/pickup IDOR | Anyone with UUID can fetch order/credentials | Unauthenticated public GETs | Capability token / signed link | **Open** | `app/api/orders/[id]/*` |
| PR-013 | P0 | Infra | Real admin auth, payment, storage, email, LINE, Redis client | Production fail-closed cannot start | Providers unimplemented | Wire real providers | **Open** | `env.ts`, `docs/production-hardening.md` |

---

## P1 issues (open — deferred)

| ID | Sev | Area | Description | Status |
|----|-----|------|-------------|--------|
| PR-020 | P1 | Orders | Confirmed orders keep `DRAFT-…` numbers | Deferred |
| PR-021 | P1 | Checkout | Recipient / special request collected but not sent | Deferred |
| PR-022 | P1 | Cart | Cart not cleared after successful payment | Deferred |
| PR-023 | P1 | SEO | Root metadata still `OKGO Pickup`; weak OG/canonical | Deferred |
| PR-024 | P1 | Security | Public cart/checkout mutations lack CSRF origin check | Deferred (admin writes already protected) |

---

## P2 issues (documented)

| ID | Sev | Area | Description |
|----|-----|------|-------------|
| PR-030 | P2 | Storefront | No `onError` image fallbacks on homepage/PDP |
| PR-031 | P2 | Storefront | PDP carousel ignores `product.images` (placeholder ×4) |
| PR-032 | P2 | Storefront | Direct slug can load inactive/unavailable products |
| PR-033 | P2 | Cart API | Quantity has no server upper bound (client clamps 999) |
| PR-034 | P2 | Pickup | Slot capacity not decremented (overbooking risk) |
| PR-035 | P2 | Pickup | `parseDateKey` weak calendar validity |
| PR-036 | P2 | Security | CSP still allows `'unsafe-inline'` |
| PR-037 | P2 | Admin | Media delete can orphan files |

---

## P3 issues (documented)

| ID | Sev | Area | Description |
|----|-----|------|-------------|
| PR-040 | P3 | UX | Empty-cart copy missing space is **SG-parity intentional** (`Your cart is empty.Add…`) |
| PR-041 | P3 | Storefront | Footer/category icon placeholders |
| PR-042 | P3 | Nav | Search / Recommended / About / Promotions shells non-functional |

---

## Production blockers (integrations & infrastructure)

See also `PRODUCTION_BLOCKERS` in `src/server/config/env.ts` and `docs/production-hardening.md`.

1. Real admin authentication  
2. Real payment provider  
3. Cloud storage  
4. Real email notifications  
5. Real LINE Messaging API  
6. Persistent cart under prisma  
7. Persistent gateway payments under prisma  
8. Redis/Upstash rate-limit client  
9. Customer order access control (IDOR)  
10. Prisma modifier-group persistence (PR-010)  
11. `/api/ready` remains 503 until providers exist  

---

## Pending content approval

Do **not** invent. Owner must approve (see `docs/thailand-content.md`):

- Boutique name, code, address, hours, last-order time, phone, maps, LINE  
- Product catalogue, availability, allergen text, acknowledgement copy  
- Add-on THB prices (null → `฿ —` until approved)  
- Legal: T&Cs, privacy, refund  
- Notification email/LINE templates (`[CONTENT PENDING APPROVAL]`)  
- Homepage announcement / delivery table cells  
- Payment method customer-facing labels where pending  

---

## Pending production integrations

- Omise/Stripe (or chosen PSP) + webhooks  
- LINE Login / Messaging  
- Email provider (SendGrid/SES/SMTP)  
- Object storage (S3/GCS)  
- Redis rate limiting  
- Production deploy pipeline + secrets  

---

## Infrastructure blockers

- Production refuses mock data source and mock providers (fail-closed) — correct, but blocks go-live until wired  
- No durable cart/payment gateway stores under prisma  
- Rate-limit Redis client throws `PROVIDER_UNAVAILABLE` until implemented  

---

## Admin / CMS backlog

From `docs/admin-modifier-gaps.md` and this audit:

1. Persist modifier groups / option details / acknowledgements  
2. Admin UI for modifier min/max / exact selection / sort / active  
3. Allergen fields on Prisma + Admin  
4. Audit log viewer  
5. Price approval workflow for add-ons  
6. Orphan media reporting/sweeper  
7. Boutique/hours CMS beyond settings stubs  
8. Real roles/permissions (beyond mock admin session)  

---

## Manual test matrix

| # | Scenario | Desktop | Mobile (~390×844) | Result |
|---|----------|---------|-------------------|--------|
| 1 | Homepage loads | ✓ | ✓ (390×844 emulated) | Pass — products + cart shell |
| 2 | Category / product list | ✓ | ✓ | Pass — Macaron Gift Boxes / All Items |
| 3 | Macaron 8-piece exact selection | ✓ | — | Pass — ADD disabled until 8 + ack |
| 4 | Required acknowledgement enforced | ✓ | — | Pass — ADD disabled until radio |
| 5 | Invalid price disables ADD | Automated | Automated | Pass |
| 6 | Cart merge / separate gift lines | Automated | — | Pass |
| 7 | Cart footer CTA visible with items | ✓ | ✓ | Pass — `฿990` + blocking reason visible |
| 8 | Stale pickup blocks CTA | Automated | — | Pass |
| 9 | Checkout dateKey + terms | Browser API + unit | — | Pass — order `dateKey=2026-07-20` (not today stamp); terms false → `VALIDATION_ERROR` |
| 10 | Duplicate submit idempotency | Browser API | — | Pass — same `Idempotency-Key` returns same `orderId` |
| 11 | Trusted totals on order DTO | Browser API | — | Pass — `totalThb=990` |
| 12 | Confirmation / QR / pickup code | Prior sprint coverage | — | Not re-run UI this sprint; APIs unchanged |
| 13 | Cart survives stale-slot reject | Automated contract | — | Pass |

Note: Boutique UI click through the pickup modal was not completed in browser automation (pending-approval boutique control). Server path for boutique/date/slot was verified via `/api/pickup/availability` + `/api/checkout`.

---

## Recommended sequence before Sprint 21

1. **Content freeze:** Owner-approved boutique, prices, acknowledgements, legal.  
2. **Modifier persistence** (PR-010) before any prisma-only staging with real boxes.  
3. **Customer order access control** (PR-012) before any shared staging with PII.  
4. **Persistent cart + payment records** (PR-011 / blocker 7).  
5. **Redis rate-limit client** + real admin auth.  
6. **Payment / LINE / email / storage** providers.  
7. Localization (EN/TH message keys) + SEO metadata pass.  
8. Capacity decrement + production boutique schedules.  

---

## Validation commands (Sprint 20.8)

```bash
npx prisma format
npx prisma validate
npx prisma generate
npm run test:pickup
npm run lint
npm run build
npm run smoke:security
npm run smoke:notifications
```

Additional relevant: `npm run smoke:api`, `npm run smoke:admin` when environment allows.

---

## Explicit non-claims

- This sprint did **not** implement real payment, LINE, or production deployment.  
- This sprint did **not** invent Thailand prices, boutique details, or schedules.  
- This sprint did **not** redesign the storefront or weaken validation.  
- The platform is **not** production-ready at 62%.  
