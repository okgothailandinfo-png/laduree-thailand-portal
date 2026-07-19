# Production Hardening (Sprint 20B)

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

## Production Blockers (remaining)

Real providers / auth are **not** implemented in this sprint. Production runtime will refuse to start until they exist and are configured:

1. Real admin authentication provider (replace mock session cookie)
2. Real payment provider (Omise/Stripe/etc.)
3. Cloud storage provider (S3/GCS/etc.)
4. Real notification email provider (SendGrid/SES/SMTP)
5. Real LINE Messaging API provider
6. Persistent cart store under `DATA_SOURCE=prisma`
7. Persistent gateway payment records under `DATA_SOURCE=prisma`
8. Redis/Upstash rate-limit client wiring (interface + fail-closed config exist)
9. Customer order access control (capability token / signed link) for IDOR hardening

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
