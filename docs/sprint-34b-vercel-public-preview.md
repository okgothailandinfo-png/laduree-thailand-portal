# Sprint 34B — Vercel + ok-go.cloud Public Preview

**Branch:** `cursor/sprint-34b-vercel-public-preview`  
**Operating model:** PUBLIC WEBSITE = yes · LIVE COMMERCE = no  
**Canonical URL:** https://ok-go.cloud  
**Host:** Vercel · **DNS:** Vercel · **GitHub repo:** `laduree-thailand-portal` · **Production branch:** `main`

Vercel Production is **not** live commerce. Indexing stays noindex until `APP_ENV=production` **and** `STOREFRONT_INDEXING=live` are explicitly authorized later.

This document prepares deployment. It does **not** deploy, attach the domain, or change DNS by itself.

---

## 1. GitHub repository connection

1. In Vercel: **Add New Project** → Import `okgothailandinfo-png/laduree-thailand-portal`
2. Grant GitHub access if prompted
3. Production branch: **`main`**
4. Root directory: **repository root** (leave empty / `.`)

Do not connect a paid add-on (Postgres, Redis, KV) for Public Preview.

---

## 2. Vercel project creation / import

Framework preset: **Next.js** (also set in `vercel.json`).

After import, configure environment variables (section 8) **before** the first production deployment.

---

## 3. Framework preset

**Next.js** (`vercel.json` `"framework": "nextjs"`).

---

## 4. Root directory

Project root. Do not set a subfolder.

---

## 5. Build command

```bash
npx prisma generate && next build
```

`package.json` `build` is the same. Prisma generate is required so `@prisma/client` exists at compile time even when `DATA_SOURCE=mock` (the Prisma graph is imported; runtime still uses mock repositories).

No real database is used at runtime for Public Preview.

---

## 6. Install command

```bash
npm ci
```

`postinstall` also runs `prisma generate`.

Node: **≥ 20** (`package.json` `engines`).

---

## 7. Output settings

Leave Vercel Next.js defaults. Do **not** set a static `outputDirectory` / `out`.

---

## 8. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for **Production** and **Preview**.

`ACTIVE_STOREFRONT_LOCALES` is **not** a Vercel env var. The storefront is English-only in code (`["en"]`) until owner-approved Thai copy exists.

### PUBLIC PREVIEW REQUIRED

| Variable | Value | Class |
| --- | --- | --- |
| `APP_ENV` | `preview` | PUBLIC CONFIG |
| `APP_BASE_URL` | `https://ok-go.cloud` | PUBLIC CONFIG |
| `NOTIFICATION_BASE_URL` | `https://ok-go.cloud` | PUBLIC CONFIG |
| `DATA_SOURCE` | `mock` | PUBLIC CONFIG |
| `PAYMENT_PROVIDER` | `mock` | PUBLIC CONFIG |
| `STORAGE_PROVIDER` | `local` | PUBLIC CONFIG |
| `NOTIFICATION_EMAIL_PROVIDER` | `mock` | PUBLIC CONFIG |
| `NOTIFICATION_LINE_PROVIDER` | `mock` | PUBLIC CONFIG |
| `ADMIN_AUTH_PROVIDER` | `mock` | PUBLIC CONFIG |
| `RATE_LIMIT_STORE` | `memory` | PUBLIC CONFIG |
| `STOREFRONT_INDEXING` | `off` (or leave empty) | PUBLIC CONFIG |
| `MOCK_PAYMENT_WEBHOOK_SECRET` | owner-generated ≥16 chars | SECRET (integrity only, not a PSP key) |
| `PICKUP_REVEAL_SECRET` | owner-generated ≥16 chars | SECRET (integrity only) |

Generate the two secrets yourself (password manager / `openssl rand -hex 16`). Do not commit them. They do **not** enable payments.

### OPTIONAL

| Variable | Notes |
| --- | --- |
| `APP_NAME` | defaults |
| `APP_TIMEZONE` | Asia/Bangkok default |
| `LOG_LEVEL` | `info` on production Node |
| `ORDER_ACCESS_SECRET` | falls back to pickup secret |
| `DATABASE_URL` | **not required** for mock runtime or `prisma generate` |

### DEFERRED UNTIL LIVE COMMERCE

| Variable | Why |
| --- | --- |
| `PAYMENT_PROVIDER=external` + PSP credentials | Real payments not authorized |
| Real `DATABASE_URL` / Prisma runtime | Live commerce persistence |
| `REDIS_URL` / `RATE_LIMIT_STORE=redis` | Production rate limit |
| `OIDC_*` / `ADMIN_SESSION_SECRET` | Production admin |
| `STOREFRONT_INDEXING=live` | Indexing not authorized |

### CLIENT-SAFE PUBLIC

Only `APP_BASE_URL` / site metadata are used for absolute URLs. Do not prefix secrets with `NEXT_PUBLIC_`.

**Do not set** `APP_ENV=production` on this Vercel project until live commerce is authorized. If `APP_ENV` is omitted at runtime, the process **refuses to start** on Vercel (`VERCEL=1`).

---

## 9. Production branch

**`main`**

---

## 10. Domain attachment (owner action — not done in this sprint)

In Vercel → Project → Settings → **Domains**:

1. Add `ok-go.cloud`
2. Optionally add `www.ok-go.cloud`

Because DNS is already on Vercel, use Vercel’s domain UI so nameservers/records stay in Vercel. Do **not** point the domain elsewhere.

---

## 11. ok-go.cloud configuration

Canonical host: **apex** `ok-go.cloud` (matches the owner-stated public URL).

`APP_BASE_URL=https://ok-go.cloud`

Vercel issues the certificate after the domain is attached.

---

## 12. Optional www configuration

Recommended: add `www.ok-go.cloud` and keep apex canonical.

`vercel.json` already 301s `www.ok-go.cloud` → `https://ok-go.cloud/:path*`.

CSRF also accepts the sibling `www` origin when the base URL is the apex.

---

## 13. HTTPS verification

Vercel provides managed TLS. After domain attach, confirm:

- `https://ok-go.cloud` loads
- `http://` upgrades / redirects to HTTPS
- Response includes HSTS (`APP_ENV=preview`)
- Page metadata / Open Graph use `https://ok-go.cloud` (from `APP_BASE_URL`)

The app refuses localhost and `laduree.sg` as preview canonical hosts.

---

## 14. noindex verification

With `APP_ENV=preview`:

- `robots.txt`: `Disallow: /`
- meta robots: noindex, nofollow
- sitemap: empty
- `STOREFRONT_INDEXING=live` is refused at process start

Vercel Production does **not** turn indexing on.

---

## 15. Storefront smoke test (after a future deploy)

| Check | Expect |
| --- | --- |
| `https://ok-go.cloud/` | Homepage |
| Category + PDP | LDR drafts browseable; Unavailable / no ADD |
| Desktop + mobile | usable |
| Cookie banner | works; legal body still pending |
| `GET /api/health` | 200 |
| `/admin` | 404 |

---

## 16. Commerce-negative tests

| Check | Expect |
| --- | --- |
| `POST /api/cart/items` | 403 `PREVIEW_COMMERCE_DISABLED` |
| `POST /api/checkout` | 403 |
| `POST /api/payment/create` | 403 |
| `POST /api/delivery/quote` | 403 |
| LDR001–LDR038 purchasable | no |

Client disabled buttons are not sufficient; server gates remain.

---

## 17. Rollback procedure

1. In Vercel: **Deployments** → promote / redeploy the previous successful deployment
2. Or revert the Git commit on `main` and let Vercel redeploy
3. Preview uses mock data — no database rollback

To take the site off the internet: remove the domain or pause/unpublish the Vercel project (owner action).

---

## 18. Redeployment procedure

Push to `main` (after an approved merge) or **Redeploy** in Vercel. Confirm env vars still include `APP_ENV=preview`.

---

## 19. Preview → live commerce (future)

Do **not** treat this as authorized now.

- Final THB prices, images, availability, flavours
- Production Postgres + Redis + OIDC
- Thailand PSP adapter + credentials
- `APP_ENV=production`, `DATA_SOURCE=prisma`
- Explicit `STOREFRONT_INDEXING=live`
- Explicit SKU activation

---

## 20. Future PSP / domain / backend boundaries

| Concern | Boundary |
| --- | --- |
| PSP | `PAYMENT_PROVIDER=external` + adapter module; never in Public Preview |
| Domain | Keep `ok-go.cloud` canonical; do not use `laduree.sg` |
| Database | Prisma + `DATABASE_URL` only for live commerce |
| Admin | OIDC; mock admin stays 404 in preview |

---

## Owner actions still required (Vercel UI)

1. Import the GitHub repo (if not already)
2. Set the environment variables in section 8 (including two integrity secrets)
3. Attach `ok-go.cloud` (and optionally `www.ok-go.cloud`)
4. Trigger the first production deploy **only after explicit owner deploy approval**
5. Run sections 13–16 on the live hostname

This sprint does **not** perform those UI/DNS/deploy steps.
