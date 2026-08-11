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
- Cart / gateway payment / webhook event stores use Prisma models when `DATA_SOURCE=prisma` (Sprint 26); mock repositories remain for `DATA_SOURCE=mock`
- Sprint 29: `Order.sourceCartId` + `Product.modifierGroupsJson` / allergen columns enable pickup parity with mock (see `docs/sprint-29-prisma-parity.md`)

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

## Sprint 21 — Delivery Foundation (mock-first)

Delivery extends Pickup on the **mock data layer**. Do **not** block Delivery Foundation on Prisma.

| Item | Status |
|------|--------|
| `serviceType` PICKUP / DELIVERY on domain Order + checkout | Done (mock) |
| Delivery address + slot selection UI | Done (mock session + checkout) |
| Delivery fee engine (zones / flat rate / distance stub) | Done (in-memory config; default zones empty — no invented prices) |
| Courier provider stubs (GrabExpress, Lalamove, LINE MAN, Flash) | Done (no API calls) |
| Prisma migration `20260727220000_delivery_foundation` | **Pending Infrastructure** |
| `DATABASE_URL` / approved development PostgreSQL | **Pending Infrastructure** (intentionally empty) |

Keep `DATA_SOURCE=mock` and leave `DATABASE_URL` empty until an approved development PostgreSQL database is provisioned. See `prisma/migrations/20260727220000_delivery_foundation/PENDING_INFRASTRUCTURE.md`.

Do **not** run `npm run db:migrate` / `db:deploy` for Delivery Foundation work until infrastructure is ready. Do **not** invent or hard-code a database connection.

## Remaining production tasks / risks

See also [production-hardening.md](./production-hardening.md) for fail-closed rules and Production Blockers.

- Replace development seed with owner-approved Thailand catalog, prices, boutique ops, and hours
- Admin modifier **UI** still pending (API/JSON persistence done in Sprint 29 — see `docs/admin-modifier-gaps.md`)
- Real admin authentication provider not implemented (mock session only — refused in production; OIDC path exists)
- Cart (`Cart`), gateway payment (`GatewayPayment`), and webhook event (`WebhookEvent`) persistence are Prisma-backed under `DATA_SOURCE=prisma` (Sprint 26+)
- `DATA_SOURCE=mock` keeps in-memory repositories for local prototype runs without PostgreSQL
- Pickup slot capacity reserve/release on order create (Sprint 30)
- Payment gateway not implemented (mock payment refused in production)
- Production must set `DATA_SOURCE=prisma` (mock refused)
- Cloud storage / real notification providers still required before go-live; Redis rate-limit client exists (needs provisioned `REDIS_URL`)
- Sprint 32 migration (pending unique + webhook two-phase status) ships in-repo; apply via `db:deploy` only with approved Postgres
- **Pending Infrastructure:** apply delivery foundation Prisma migration after local Postgres is available
