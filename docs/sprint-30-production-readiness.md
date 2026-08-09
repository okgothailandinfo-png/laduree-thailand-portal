# Sprint 30 — Production Readiness Gap Closure

**Branch:** `cursor/sprint-30-production-readiness`  
**Objective:** Close safe code-only production-readiness gaps without external vendors, credentials, or infrastructure.

## Owner decisions (locked for this sprint)

| Decision | Value |
|----------|-------|
| Go-live MVP | **Pickup only** — Delivery deferred |
| Email day-1 | Not required unless already critical |
| External vendors (PSP / ESP / storage / IdP / hosting) | Deferred |
| Thailand content | Only already-confirmed project docs; no invented copy |
| Non-prod Postgres / `DATABASE_URL` | Not approved — no DB connection this sprint |
| SEO title | Exactly `Ladurée Thailand` |
| Backup / RPO / RTO | Deferred |

## In scope (completed)

1. CSRF Origin/Referer checks on public cart + checkout mutations
2. Persist pickup `recipientName` / `specialRequest` through checkout parse → order
3. Root metadata title → `Ladurée Thailand`
4. Pickup slot capacity reserve/release on draft/order create
5. Exclusive PENDING payment create (prevents dual-PENDING races in-process / transactional)
6. Docs refresh for post–Sprint 29 readiness status

## Out of scope (unchanged)

- Real Thailand PSP / email / OIDC / cloud storage / Redis provisioning
- Hosting, secrets managers, backups, production deploy
- Inventing Thailand catalog, legal, or notification copy
- Delivery courier / zone go-live
- Admin modifier CMS UI

## Sprint 28 / 29 safeguards (must remain)

| Safeguard | Status |
|-----------|--------|
| Server-order payment recovery | Unchanged |
| Cart clear only after SUCCESS (`sourceCartId`) | Unchanged |
| Idempotent payment recovery / webhook claim | Unchanged |
| Capability tokens on order/payment access | Unchanged |
| Mock provider isolation + production fail-closed | Unchanged |
| Prisma modifier JSON + allergen mapping | Unchanged |

## Validation (mock path)

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
```

Prisma live UAT remains blocked until an owner-approved `DATABASE_URL` exists.

## Remaining EXTERNAL blockers

See `PRODUCTION_BLOCKERS` in `src/server/config/env.ts` and `docs/production-hardening.md`.
