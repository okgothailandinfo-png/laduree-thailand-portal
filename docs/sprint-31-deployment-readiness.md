# Sprint 31 — Deployment & Production Data Readiness

**Branch:** `cursor/sprint-31-deployment-readiness`  
**Objective:** Close safe code-only deployment / migration / readiness gaps without external vendors, credentials, or infrastructure.

## Owner decisions (unchanged / still required)

| Decision | Status |
|----------|--------|
| Go-live MVP | Pickup only — Delivery deferred |
| Real Thailand PSP | Deferred |
| Managed PostgreSQL / Redis / OIDC / ESP / storage / hosting | External — not provisioned this sprint |
| Backup / RPO / RTO | Owner decision — deferred |
| Production catalog load | Owner-approved process — **never** `db:seed` |
| Non-prod `DATABASE_URL` for Prisma live UAT | Still requires owner approval |

## In scope (completed)

1. **Seed fail-closed** — `assertDatabaseSeedAllowed()` refuses `db:seed` when `APP_ENV=production` (or `NODE_ENV=production` without `APP_ENV`)
2. **Deploy preflight** — `npm run preflight:deploy` prints ordered cutover checklist + migration recovery steps
3. **Deploy smoke** — `npm run smoke:deploy` validates seed guard, health/ready contracts, rate-limit fail-closed, checklist presence; optional `DEPLOY_SMOKE_BASE_URL` HTTP probes
4. **Readiness Redis probe** — `/api/ready` pings Redis when `RATE_LIMIT_STORE=redis` (fail-closed; never falls back to memory)
5. **Liveness vs readiness** — `/api/health` remains dependency-free; `/api/ready` remains dependency-aware
6. **Docs** — migration recovery, rollback decision tree, post-deploy smoke packaging

## Out of scope (unchanged)

- Real Postgres / Redis / PSP / email / OIDC / cloud storage / hosting
- Credentials, secrets, production URLs, vendor SDKs
- Risky schema migrations requiring a live database
- Invented Thailand content, SLA, or customer-facing copy
- Delivery go-live

## Sprint 28–30 safeguards (must remain)

| Safeguard | Status |
|-----------|--------|
| Server-order payment recovery | Unchanged |
| Cart clear only after SUCCESS (`sourceCartId`) | Unchanged |
| Idempotent payment recovery / webhook claim | Unchanged |
| Capability tokens on order/payment access | Unchanged |
| Mock provider isolation + production fail-closed | Unchanged |
| Prisma modifier JSON + allergen mapping | Unchanged |
| CSRF on cart/checkout | Unchanged |
| `savePendingExclusive` | Unchanged |
| Slot capacity reserve/release | Unchanged |

## Cutover order (platform-agnostic)

1. Load secrets from a secrets manager into process env (never commit)
2. Set `APP_ENV=production` with fail-closed provider values
3. `npm ci`
4. `npm run prisma:generate`
5. `npm run db:status` (requires approved `DATABASE_URL`)
6. `npm run db:deploy`
7. **Do not** run `db:seed` against production (code-refused)
8. `npm run build && npm run start` (or host equivalent)
9. Probe `GET /api/health` → expect **200**
10. Probe `GET /api/ready` → expect **503** until real providers + DB are ready
11. `npm run smoke:deploy` (optionally with `DEPLOY_SMOKE_BASE_URL`)

## Migration recovery (forward-only)

1. Stop rolling new app instances if `migrate deploy` failed
2. Capture `db:status` + error (redact secrets)
3. If migration marked failed but SQL partially applied: `prisma migrate resolve` only after DBA review
4. Prefer forward-fix migrations over destructive downs
5. App image rollback is safe only when the new migration is backward-compatible (expand/contract)
6. Backup/PITR restore is owner + infra — not an application code path
7. Re-run `db:status` → `db:deploy` → health/ready before traffic

## Rollback decision tree

| Symptom | First action | Notes |
|---------|--------------|-------|
| App crash / bad release, DB unchanged | Roll back app image/build | Preferred |
| Failed `db:deploy`, no traffic yet | Fix forward or resolve + retry | Do not invent URLs |
| Migration applied, old app incompatible | Forward-fix migration or coordinated cutover | Expand/contract |
| Data corruption | Owner-approved PITR/restore | External |

## Validation (mock path — no real infra)

```bash
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

Prisma live UAT remains blocked until an owner-approved `DATABASE_URL` exists.

## Remaining EXTERNAL blockers

See `PRODUCTION_BLOCKERS` in `src/server/config/env.ts` and `docs/production-hardening.md`.
