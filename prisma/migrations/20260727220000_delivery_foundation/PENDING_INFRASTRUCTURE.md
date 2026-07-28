# Pending Infrastructure — Delivery Foundation migration

**Status:** Pending Infrastructure  
**Sprint:** 21 — Delivery Foundation  
**Do not block** Delivery Foundation work on applying this migration.

## Why this is pending

`DATABASE_URL` is intentionally empty because no approved development PostgreSQL database has been provisioned. Sprint 21 continues on the **mock / in-memory data layer** (`DATA_SOURCE=mock`).

## What this migration will do (when ready)

Applies `ServiceType`, delivery address columns, and delivery fee fields on `Order` (see `migration.sql`).

## Migration artifact

- **Folder:** `prisma/migrations/20260727220000_delivery_foundation/`
- **SQL file:** `migration.sql`
- **Do not modify or remove** this migration while it remains Pending Infrastructure.

## When to apply

1. Provision an approved development PostgreSQL database (see `docs/backend-repositories.md`).
2. Set `DATABASE_URL` in local `.env` (never invent or commit a connection string).
3. Run `npm run prisma:generate`.
4. Run `npm run db:deploy` (or `npm run db:migrate` in interactive dev).
5. Only then set `DATA_SOURCE=prisma` if Prisma-backed orders are required.

Until then: keep `DATA_SOURCE=mock`. Delivery checkout, fee engine, and courier stubs run without Postgres.
