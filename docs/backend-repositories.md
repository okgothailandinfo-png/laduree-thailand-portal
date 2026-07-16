# Backend repositories

## Architecture

```
Next.js Route Handlers (app/api/*)
  → Services (src/server/services)
    → Repository interfaces (src/server/repositories/interfaces.ts)
      → Mock repositories (src/server/repositories/mock)
      → Prisma repositories (src/server/repositories/prisma)
        → Prisma Client (src/server/database/prisma.ts)
          → PostgreSQL
```

Services depend only on repository interfaces. Route handlers and frontend components must not import Prisma Client.

Prisma records are mapped to domain models in `src/server/repositories/prisma/mappers.ts`, then to DTOs in `src/server/services/mappers.ts`.

## DATA_SOURCE selection

| Value | Behavior |
|-------|----------|
| unset (development/test) | `mock` |
| unset (production runtime) | **error** — no silent mock fallback |
| unset (`next build`) | `mock` (compile-time only) |
| `mock` | In-memory mock repositories |
| `prisma` | Prisma repositories — requires `DATABASE_URL` |

Selection is implemented in `src/server/config/env.ts` (`resolveDataSource` / `getDataSource`) and applied by `src/server/repositories/create-repositories.ts`.

## Environment variables

Copy `.env.example` to `.env` locally:

```bash
DATABASE_URL=
DATA_SOURCE=mock
```

- `DATABASE_URL` — PostgreSQL connection string (required when `DATA_SOURCE=prisma`)
- `DATA_SOURCE` — `mock` or `prisma`
- Optional: `APP_NAME`, `APP_TIMEZONE` (default `Asia/Bangkok`), `LOG_LEVEL`

Never commit real credentials. Do not invent production database URLs in this repository.

## Local database setup

1. Provide a local PostgreSQL instance and set `DATABASE_URL`.
2. Set `DATA_SOURCE=prisma`.
3. Apply migrations:

```bash
npx prisma migrate deploy
# or during development:
npx prisma migrate dev
```

4. Seed catalog/boutique/slot rows as needed (seed script not included in Sprint 12B).
5. Generate client:

```bash
npx prisma generate
```

6. Run smoke checks:

```bash
npm run smoke:repos
```

## Smoke tests

`npm run smoke:repos` exercises:

- category listing
- product listing / slug lookup / missing product
- boutique listing
- pickup availability
- invalid order payload
- valid order creation + retrieval

Default mode uses mock data (no database). Prisma runtime verification requires a migrated and seeded database.

## Runtime verification status

As of Sprint 12B, this environment had **no local PostgreSQL**. Prisma repository classes are implemented and type-checked, but **database runtime verification remains pending**.

## Remaining production risks

- No seed data pipeline for Thailand catalog, boutiques, or pickup slots
- Product modifier groups are not persisted in Prisma yet (domain returns `[]` from Prisma)
- No `isActive` column on Category/Boutique (all rows treated as active)
- Pickup capacity filtering does not track reservations yet
- Prices may be null (`priceMinor`) until owner-approved Thailand retail data exists
- Payment records store method/status/amount only — no gateway capture
- Production must set `DATA_SOURCE` explicitly
