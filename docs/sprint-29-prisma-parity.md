# Sprint 29 — Prisma Pickup Parity

**Branch:** `cursor/sprint-29-prisma-parity`  
**Objective:** Harden the Prisma data layer so pickup ordering under `DATA_SOURCE=prisma` reaches functional parity with the verified mock path, while preserving Sprint 28 safeguards.

## In scope

1. Persist `Order.sourceCartId` so cart clear after payment SUCCESS works on Prisma carts.
2. Persist product `allergenLabel` / `allergenText` / `modifierGroupsJson` so exact-selection boxes and acknowledgements load from Prisma.
3. Seed DEV macaron placeholder with **mock-derived** modifier/allergen structure (no invented Thailand catalog).
4. Fix smoke order-create fixtures to satisfy exact selection + acknowledgement from product config.
5. Automated tests for mapper/JSON parse + smoke modifier builder.

## Out of scope

- Real Thailand PSP / email / OIDC / cloud storage / Redis provisioning
- Inventing customer-facing content, pricing, legal text, or product data
- Full Admin modifier CMS UI (API/repository persistence only)
- Expanding Prisma delivery architecture beyond existing Pending Infrastructure

## Migration

Folder: `prisma/migrations/20260809160000_prisma_parity_source_cart_modifiers/`

Apply **only** against approved non-production PostgreSQL:

```bash
# After DATABASE_URL is set for a local/staging DB:
npm run prisma:generate
npm run db:deploy
npm run db:seed
# optional:
DATA_SOURCE=prisma npm run smoke:repos
DATA_SOURCE=prisma npm run smoke:api
```

Do **not** apply to production without an explicit go-live process.

## Sprint 28 safeguards (must remain)

| Safeguard | Status |
|-----------|--------|
| Server-order payment recovery | Unchanged (mock + tokenized order path) |
| Cart clear only after SUCCESS | Now durable on Prisma via `sourceCartId` |
| Idempotent payment recovery | Unchanged |
| Authoritative server order/payment state | Unchanged |
| Order history reopen behavior | Unchanged |
| Mock provider isolation | Unchanged (`production-guard.ts`) |
| Production fail-closed guards | Unchanged (`env.ts` / `smoke:security`) |

## Prisma staging UAT (when Postgres available)

Repeat Sprint 28 matrix (`docs/sprint-28-uat-matrix.md`) with:

| Check | Expected |
|-------|----------|
| `DATA_SOURCE` | `prisma` |
| `PAYMENT_PROVIDER` | `mock` (still staging) |
| Catalog | Seeded DEV macaron placeholder exposes exact-8 + acknowledgement groups |
| Cart clear after SUCCESS | Source cart emptied using persisted `sourceCartId` |
| Smoke | `smoke:repos` / `smoke:api` order-create checks pass |
| Order GET | Capability token required (`?token=` / header) — smoke issues token after create |

## Content rule

Modifier options, acknowledgement wording, and allergen referral text must come from existing mock/Singapore-reference structures (`src/server/repositories/mock/data.ts`). Seed attaches that structure to the DEV macaron placeholder only — it does not invent Ladurée Thailand marketing copy.

## Related docs

- `docs/sprint-28-uat-matrix.md` — mock RC1 matrix + known prisma gaps (updated)
- `docs/admin-modifier-gaps.md` — Admin UI remaining gaps
- `docs/production-hardening.md` — external production blockers (deferred)
