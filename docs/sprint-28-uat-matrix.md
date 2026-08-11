# Sprint 28 — Staging UAT Matrix (RC1)

Scope: Ladurée Thailand pickup prototype/staging candidate with `PAYMENT_PROVIDER=mock` and `DATA_SOURCE=mock` (default local/staging path).

Customer-facing labels must match Singapore portal wording already used in the app. Do not invent marketing copy during UAT.

## Environment checklist

| Check | Expected |
|-------|----------|
| Branch | `cursor/sprint-28-staging-uat` |
| `APP_ENV` | `development` or `staging` |
| `DATA_SOURCE` | `mock` for this matrix |
| `PAYMENT_PROVIDER` | `mock` |
| Health | `GET /api/health` → 200, `prototypeMode: true` when mock allowed |
| Ready | `GET /api/ready` → provider names only (no secrets) |

## Pickup E2E (happy path)

| # | Step | Pass criteria |
|---|------|---------------|
| P1 | Home → Menu → product | Product detail loads; ADD gated when price unavailable |
| P2 | Select service, date and time | Boutique + date + slot confirmed |
| P3 | Add item(s) → Cart | Qty/options/totals match selection |
| P4 | Proceed to Checkout | Customer info + Terms required |
| P5 | Order Review → Payment | Server order created; URL has `orderId` + `token` |
| P6 | Choose PromptPay QR or Credit Card | Mock-only notice visible |
| P7 | Mock authorize → Simulate Success | Order confirmed; final `LD-TH-********` number |
| P8 | Order Confirmation | Tokenized server order; pickup credentials for PICKUP |
| P9 | Order History → View Order Details | Same order reopenable with token |
| P10 | Cart after SUCCESS | Server source cart cleared; UI cart empty/reset |

## Mock payment recovery scenarios

| # | Scenario | Pass criteria |
|---|----------|---------------|
| R1 | SUCCESS | Order `confirmed`; payment `mock_accepted`; confirmation allowed |
| R2 | FAILURE | Order stays `pending`; return to Payment with token; retry allowed |
| R3 | CANCEL | Payment cancelled; order stays unpaid; retry allowed |
| R4 | EXPIRED | Pending payment expires; create new payment with same token |
| R5 | RETRY after fail | New payment id; prior terminal payment unchanged |
| R6 | DUPLICATE / idempotent SUCCESS | Second SUCCESS confirm does not create a second order |
| R7 | REFRESH during mock pay | Unpaid refresh does not mark paid |
| R8 | REOPEN completed | History → confirmation/completed; payment create rejected (“Order already paid.”) |
| R9 | Webhook duplicate SUCCESS | Event idempotent; order remains confirmed once |
| R10 | Empty cart + unpaid `orderId`+token | Payment page recovers review from server order; Place Order enabled |
| R11 | Member + guest history | Both use remembered tokenized orders (no fabricated mock member rows) |
| R12 | Unpaid history reopen | View Order Details → `/payment?orderId&token` |
| R13 | Paid history reopen | View Order Details → confirmation/completed path |

## Failure / recovery UX

| # | Failure | Pass criteria |
|---|---------|---------------|
| F1 | Missing/invalid access token | Safe gate + Order History link; no stack traces |
| F2 | Expired access token | Safe expired message; no technical dump |
| F3 | Network/API failure on Place Order | Customer-safe retry message |
| F4 | Stale pickup slot at checkout | Existing SG-parity blocking message |
| F5 | Browser back after SUCCESS | No second charge; already-paid handling if Payment revisited |

## Automated gates (run before RC1 sign-off)

```bash
npm run test:pickup
npm run lint
npm run build
npm run smoke:security
npm run smoke:webhook
npm run smoke:repos
npm run smoke:api
npm run smoke:notifications
```

## Known non-blockers for mock staging RC1

| Item | Notes |
|------|-------|
| Prisma modifiers / `sourceCartId` | Addressed in Sprint 29 (`docs/sprint-29-prisma-parity.md`) — schema + mapper + seed; prisma UAT still needs approved Postgres |
| Real Thailand PSP / OIDC / Redis / cloud storage | External production blockers (see `docs/production-hardening.md`) |
| Orphan draft orders on repeated checkout | Accepted residual for RC1; reopen uses latest tokenized draft |
| Concurrent dual PENDING payments | Hardened in Sprint 30 via `savePendingExclusive`; Sprint 32 adds partial unique PENDING index + P2002 recovery (apply migration when Postgres approved) |
| `smoke:repos` / `smoke:api` order-create checks | Sprint 29 builds valid exact-selection + acknowledgement modifiers from product config |
| Public cart/checkout CSRF / capacity / SEO title | Closed in Sprint 30 (`docs/sprint-30-production-readiness.md`) |
| Webhook claim-before-process poison-pill | Closed in Sprint 32 (`docs/sprint-32-payment-hardening.md`) |
## RC1 decision

Staging UAT RC1 is ready when:

1. Pickup E2E P1–P10 pass on mock
2. Recovery scenarios R1–R13 pass
3. Automated gates above are green
4. No P0 defects remain open for the mock staging path
