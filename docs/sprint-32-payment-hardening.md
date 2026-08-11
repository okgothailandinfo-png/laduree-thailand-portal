# Sprint 32 — Payment Concurrency & Webhook Durability

**Branch:** `cursor/sprint-32-payment-hardening`  
**Objective:** Close multi-instance dual-PENDING races and webhook claim-before-process poison-pill without external vendors, credentials, or live database apply.

## Owner decisions (unchanged / still required)

| Decision | Status |
|----------|--------|
| Go-live MVP | Pickup only — Delivery deferred |
| Real Thailand PSP | Deferred |
| Managed PostgreSQL / Redis / OIDC / ESP / storage / hosting | External — not provisioned this sprint |
| Apply Sprint 32 migration via `db:deploy` | Requires owner-approved `DATABASE_URL` |
| Backup / RPO / RTO | Owner decision — deferred |

## In scope (completed)

1. **Partial unique PENDING index** — migration SQL `GatewayPayment_orderId_pending_key` on `(orderId) WHERE status = 'PENDING'`
2. **`savePendingExclusive` P2002 recovery** — Prisma retries / reuses / cancels safely when another instance wins the unique race
3. **Two-phase webhook claims** — `PROCESSING` → `PROCESSED`, with `releaseClaim` on apply failure and stale `PROCESSING` reclaim
4. **PaymentService** — claim → apply/sync → `markProcessed`; failures call `releaseClaim` so retries are not poisoned
5. **Mock/Prisma parity** — mock webhook store mirrors two-phase lifecycle; mock payment exclusive PENDING unchanged (in-process lock)
6. **Docs** — readiness audit IDs refreshed for closed historical defects

## Out of scope (unchanged)

- Real Postgres apply / Redis / PSP / email / OIDC / cloud storage / hosting
- Credentials, secrets, production URLs, vendor SDKs
- Storefront P2 work (images, dateKey calendar, CSP)
- Optional API CSRF / cart rate-limit pack (parked pending separate approval)
- Invented Thailand content
- Delivery go-live

## Sprint 28–31 safeguards (must remain)

| Safeguard | Status |
|-----------|--------|
| Server-order payment recovery | Unchanged |
| Cart clear only after SUCCESS (`sourceCartId`) | Unchanged |
| Capability tokens on order/payment access | Unchanged |
| Mock provider isolation + production fail-closed | Unchanged |
| Prisma modifier JSON + allergen mapping | Unchanged |
| CSRF on cart/checkout | Unchanged |
| Slot capacity reserve/release | Unchanged |
| Production seed refuse + deploy preflight/smoke | Unchanged |

## Migration

Folder: `prisma/migrations/20260811160000_payment_concurrency_webhook_durability/`

Apply **only** against approved PostgreSQL:

```bash
npm run prisma:generate
npm run db:deploy
```

Do **not** apply to production without an explicit go-live process. This sprint ships the migration file only.

## Validation (mock path — no live DB required)

```bash
npm run prisma:validate
npm run prisma:generate
npm run test:pickup
npm run lint
npm run build
npm run smoke:security
npm run smoke:webhook
npm run smoke:repos
npm run smoke:api
npm run smoke:notifications
npm run smoke:admin
npm run preflight:deploy
npm run smoke:deploy
```

## Remaining EXTERNAL blockers

See `PRODUCTION_BLOCKERS` in `src/server/config/env.ts` and `docs/production-hardening.md`.
