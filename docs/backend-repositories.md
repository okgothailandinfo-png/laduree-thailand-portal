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
npm run smoke:admin

# 8. App
npm run dev
```

### Admin CMS runtime

Admin Product/Category CRUD uses Prisma repositories when `DATA_SOURCE=prisma`.

- Updates accept **PUT** and **PATCH** on `/api/admin/products/[id]` and `/api/admin/categories/[id]`
- Admin writes refuse mock mode (`CONFIG_ERROR`) — never silently write to mock data
- Mock admin session cookie remains a non-production placeholder
- Cart / gateway payment / webhook event stores stay in-memory until dedicated Prisma models exist

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
| `smoke:admin` | admin auth + catalog CRUD smoke |

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

### Admin smoke — `npm run smoke:admin`

- Unauthenticated admin product/category APIs → `401`
- Storefront `/api/products` + `/api/categories` + `/api/products/[slug]` remain compatible
- Mock mode: admin catalog operations return `CONFIG_ERROR`
- Prisma mode: create/update/list/search, duplicate slug/SKU conflict, category-with-products delete conflict, product delete

## Runtime verification status

As of Sprint 16C in this agent environment:

- PostgreSQL / Docker were **not** available here (port 5432 closed, no `.env`)
- Live Prisma migrate/seed/admin CRUD against Postgres remain **pending** on a machine with local Postgres
- Mock `smoke:repos`, `smoke:api`, and `smoke:admin` are expected to pass without a database

## Remaining production tasks / risks

See also [production-hardening.md](./production-hardening.md) for fail-closed rules and Production Blockers.

- Replace development seed with owner-approved Thailand catalog, prices, boutique ops, and hours
- Product modifier groups not persisted in Prisma yet
- Real admin authentication provider not implemented (mock session only — refused in production)
- Cart / gateway payment persistence still in-memory under `DATA_SOURCE=prisma`
- Webhook event persistence is now Prisma-backed (`WebhookEvent`); cart/gateway payments remain in-memory
- Pickup reservation counts not decremented on order create
- Payment gateway not implemented (mock payment refused in production)
- Production must set `DATA_SOURCE=prisma` (mock refused)
- Cloud storage / real notification providers / Redis rate-limit client still required before go-live
