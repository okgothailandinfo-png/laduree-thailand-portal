# Production Hardening (Sprint 20B / Sprint 27)

## Fail-closed production rules

When `APP_ENV=production` (and not during `next build`):

- `DATA_SOURCE` must be `prisma` (`mock` is refused)
- `PAYMENT_PROVIDER=mock` is refused
- `STORAGE_PROVIDER=local` is refused
- Mock notification providers are refused
- `APP_BASE_URL` / `NOTIFICATION_BASE_URL` must be HTTPS
- `MOCK_PAYMENT_WEBHOOK_SECRET` and `PICKUP_REVEAL_SECRET` required (min 16 chars, no dev placeholders)
- `RATE_LIMIT_STORE=memory` is refused; `RATE_LIMIT_STORE=redis` + `REDIS_URL` required

Mock providers are allowed only in `development`, `test`, and explicitly configured `staging` (`APP_ENV=staging`).

There is **no** production bypass flag such as `ALLOW_MOCK_PAYMENT_IN_PRODUCTION`.

## Prototype / staging (Sprint 27)

There is no separate `APP_ENV=prototype` value. Use:

| Mode | `APP_ENV` | Typical providers |
|------|-----------|-------------------|
| Local development | `development` | mock payment, mock notifications, `DATA_SOURCE=mock` |
| Prototype / staging candidate | `staging` | mock payment allowed; secrets still required |
| Production | `production` | fail-closed external/oidc/prisma/redis |

Prototype/staging must keep `PAYMENT_PROVIDER=mock` until a client-approved Thailand PSP
adapter is registered. Mock mutation routes and the mock webhook require
`PAYMENT_PROVIDER=mock` and refuse production.

`GET /api/health` and `GET /api/ready` expose `prototypeMode: true` when mock providers
are intentionally allowed (non-production).

Optional durable prototype DB (not required locally):

1. `docker compose up -d`
2. Set `DATABASE_URL` + `DATA_SOURCE=prisma`
3. `npm run prisma:generate && npm run db:deploy`

## Production Blockers (remaining after Sprint 26–30)

Sprint 26 delivered persistence (cart + gateway payments), Redis rate-limit client,
provider abstractions (`mock|external`), admin OIDC boundary, and payment IDOR hardening
(capability token required on payment create/get/mutate).

Sprint 27 hardened the prototype/staging candidate: mock payment idempotency/expiry,
token-preserving payment recovery links, rate limits on history/deprecated payment,
and mock-mode notices on post-payment UI.

Sprint 28–29 delivered payment recovery RC1 hardening and Prisma pickup parity
(`sourceCartId`, modifier/allergen JSON). Sprint 30 closed safe code-only gaps
(CSRF on cart/checkout, pickup special-request persistence, capacity reserve,
dual-PENDING payment hardening, SEO title). Delivery remains deferred for MVP.

Still required before Go-Live (external accounts + adapter registration):

1. Register real Thailand PSP adapter behind `PAYMENT_PROVIDER=external`
2. Register real email adapter behind `NOTIFICATION_EMAIL_PROVIDER=external` (optional for day-1 MVP per owner)
3. Register cloud storage adapter behind `STORAGE_PROVIDER=external` (CMS uploads)
4. Configure production OIDC IdP (`ADMIN_AUTH_PROVIDER=oidc` + `OIDC_*`)
5. Provision managed PostgreSQL + `db:deploy` (incl. cart/gateway/prisma-parity migrations)
6. Provision Redis + `REDIS_URL`
7. Owner-approved notification templates and Thailand catalog/pricing content
8. LINE Login / LINE Messaging — deferred from pickup MVP (architecture preserved)
9. Real courier dispatch — deferred (delivery code preserved; not a Go-Live blocker)
10. Hosting / secrets manager / backup-PITR / rollback policy — deferred infra work

Customer order capability tokens (Sprint 25) remain required; payment endpoints no longer
mint tokens without a prior checkout token.

The absence of a real Thailand PSP is a **production external dependency**, not a
prototype blocker, while `PAYMENT_PROVIDER=mock` works correctly.

## Pending Infrastructure (does not block mock feature work)

Tracked in `PENDING_INFRASTRUCTURE` (`src/server/config/env.ts`):

1. Approved development PostgreSQL database (`DATABASE_URL` intentionally empty)
2. Apply `prisma/migrations/20260727220000_delivery_foundation` (ServiceType + delivery columns)
3. Owner-approved delivery zone flat rates for the fee engine

Sprint 21 Delivery Foundation runs on `DATA_SOURCE=mock` until the above are ready. See `docs/backend-repositories.md`.

## Security headers / CSP exceptions

Configured in `next.config.ts` via `src/server/http/security-headers.ts`.

Temporary CSP exceptions (documented):

- `script-src 'self' 'unsafe-inline'` — Next.js App Router hydration bootstrap
- `style-src 'self' 'unsafe-inline'` — Tailwind / runtime styles
- `img-src` includes `data:` / `blob:` / `https:` for media previews and QR data URLs

HSTS is enabled only when `APP_ENV=production`.

## Audit logging transaction boundary

`writeAuditLog` runs **after** the main business operation succeeds.

- Audit failure is logged and swallowed
- Audit failure must not roll back or corrupt the primary mutation
- Metadata must stay safe (no secrets, tokens, pickup codes, full payloads, or raw PII)

## Migration deployment sequence

1. Set secrets from a secret manager (`DATABASE_URL`, provider secrets, `PICKUP_REVEAL_SECRET`, `REDIS_URL`, …)
2. Set `APP_ENV=production`, `DATA_SOURCE=prisma`, real provider values
3. `npm ci`
4. `npm run prisma:generate`
5. `npm run db:deploy`
6. Do **not** run `db:seed` against production
7. `npm run build`
8. `npm run start`
9. Probe `GET /api/health` (liveness) and `GET /api/ready` (readiness — expect 503 until real providers exist)

## Health endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Process up; version; environment; timestamp |
| `GET /api/ready` | Config + DB/Prisma + provider readiness (no secrets) |

## Rate limiting

Provider-neutral abstraction in `src/server/http/rate-limit.ts`.

- Development/staging: in-memory store
- Production: requires redis store configuration; does not silently fall back to memory
- Sensitive key material is hashed before use
- HTTP 429 includes `Retry-After`

## Mock admin authentication

Marked as a **Production Blocker**. Cookie value is a known placeholder. Refused when `APP_ENV=production`.
