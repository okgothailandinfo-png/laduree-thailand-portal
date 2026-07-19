# Ladurée Thailand Pickup Platform

Next.js storefront + Admin CMS for Ladurée Thailand pickup ordering.

## Local development

```bash
cp .env.example .env
# optional: docker compose up -d && set DATA_SOURCE=prisma + DATABASE_URL
npm install
npm run prisma:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development server |
| `npm run build` / `npm start` | Production build / runtime |
| `npm run lint` | ESLint |
| `npm run db:deploy` | Apply Prisma migrations |
| `npm run smoke:security` | Production-hardening smoke checks |
| `npm run smoke:api` | API route smoke |
| `npm run smoke:admin` | Admin CMS smoke |

## Production

See [docs/production-hardening.md](docs/production-hardening.md) and [docs/backend-repositories.md](docs/backend-repositories.md).

Production is **fail-closed**: mock payment, local storage, and `DATA_SOURCE=mock` are refused. Remaining real-provider work is listed as Production Blockers in the hardening doc.

Health probes:

- `GET /api/health` — liveness
- `GET /api/ready` — readiness (configuration + database + providers)
