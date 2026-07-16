# Backend repositories & database workflow

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

Implemented in `src/server/config/env.ts` and `src/server/repositories/create-repositories.ts`.

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (required for `DATA_SOURCE=prisma`) |
| `DATA_SOURCE` | `mock` or `prisma` |
| `APP_TIMEZONE` | Optional, default `Asia/Bangkok` |
| `LOG_LEVEL` | Optional |

Never commit real credentials.

## Install PostgreSQL (local)

### Option A — Docker Compose (recommended)

Requires Docker Desktop / Docker Engine.

```bash
docker compose up -d
```

Then set in `.env`:

```bash
DATABASE_URL="postgresql://laduree:laduree@127.0.0.1:5432/laduree_pickup?schema=public"
DATA_SOURCE=prisma
```

The compose file uses **local-only** defaults (`laduree` / `laduree`). Change them for any shared environment.

### Option B — Native PostgreSQL

1. Install PostgreSQL 16+ for your OS.
2. Create a database/user locally.
3. Set `DATABASE_URL` in `.env` (do not commit it).

## Development workflow

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# edit DATABASE_URL + DATA_SOURCE

# 3. Prisma tooling
npm run prisma:format
npm run prisma:validate
npm run prisma:generate

# 4. Apply migrations (dev)
npm run db:migrate
# or non-interactive:
npm run db:deploy

# 5. Seed placeholder development data
npm run db:seed

# 6. Switch API/data layer to Prisma
# DATA_SOURCE=prisma in .env

# 7. Smoke checks
npm run smoke:repos
npm run smoke:api

# 8. App
npm run dev
```

### Useful scripts

| Script | Command |
|--------|---------|
| `prisma:format` | `prisma format` |
| `prisma:validate` | `prisma validate` |
| `prisma:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:deploy` | `prisma migrate deploy` |
| `db:status` | `prisma migrate status` |
| `db:seed` | `prisma db seed` → `prisma/seed.ts` |
| `smoke:repos` | repository/service smoke |
| `smoke:api` | route-handler smoke |

## Seed data notes

`prisma/seed.ts` inserts **development placeholders only**:

- Categories: Macarons, Chocolates, Tea, Gift Boxes
- Products/images: `[DEV]` titles, `[CONTENT PENDING APPROVAL]` copy, integer `priceMinor` placeholders
- Boutiques: Bangkok Flagship, Central Embassy, ICONSIAM with pending address/hours
- Pickup slots: sample capacities including `capacity=0` for filter checks

No real customer data. No payment card data. Not production Thailand retail pricing.

Seed is upsert-based and rerunnable.

## Production migration workflow

1. Set `DATABASE_URL` from a secret manager (never commit).
2. Set `DATA_SOURCE=prisma` explicitly.
3. Run `npm run db:deploy` (applies committed migrations).
4. Do **not** run the development seed against production.
5. Load owner-approved Thailand catalog/ops data through a controlled process (pending).

## Smoke tests

### Repository smoke — `npm run smoke:repos`

- category listing
- product listing / slug lookup / missing product
- boutique listing
- pickup availability
- reserved pickup filtering (`capacity=0` excluded; Prisma after seed)
- invalid order payload
- valid order creation + retrieval

### API smoke — `npm run smoke:api`

Invokes route handlers directly (no HTTP server):

- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/[slug]` (+ missing → 404)
- `GET /api/boutiques`
- `GET /api/pickup/availability`
- `POST /api/orders` (valid + invalid)
- `GET /api/orders/[id]`

Asserts status codes, `{ success, data }` / `{ success:false, error }` envelopes, and DTO-shaped payloads (no raw Prisma client leakage).

## Runtime verification status

As of Sprint 12C in this agent environment:

- PostgreSQL client/server tools were **not** available (`psql` / Docker missing, no `.env`)
- Migration apply / seed / Prisma smoke against a live DB remain **pending** on a machine with local Postgres
- Mock `smoke:repos` and `smoke:api` are expected to pass without a database

## Remaining production tasks / risks

- Replace development seed with owner-approved Thailand catalog, prices, boutique ops, and hours
- Product modifier groups not persisted in Prisma yet
- No `isActive` flags on Category/Boutique
- Pickup reservation counts not decremented on order create
- Payment gateway not implemented (mock payment status only)
- Frontend still defaults to client-side mock state (not yet wired to these APIs)
- Production must set `DATA_SOURCE` explicitly
