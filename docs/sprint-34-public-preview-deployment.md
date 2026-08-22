# Sprint 34 — Public Preview / Soft Launch Deployment

**Branch:** `cursor/sprint-34-public-preview-deployment`  
**Operating model:** PUBLIC WEBSITE LIVE = yes · LIVE COMMERCE = no

This sprint prepares the Ladurée Thailand Ordering Platform for the owner-selected real domain as a public preview. Visitors may browse the storefront. They must not purchase, pay, create orders, trigger delivery, or index unfinished commercial content.

Do **not** reuse `cursor/sprint-34-staging-readiness`.

---

## 1. Architecture

| Layer | Current |
| --- | --- |
| App | Next.js 16 App Router (`app/`) + Node server services (`src/server/`) |
| UI | React 19 storefront chrome from Sprint 33A/33D |
| Catalog | Thailand Product Master LDR001–LDR038 via Sprint 33C Safe-Draft import |
| Data (preview) | `DATA_SOURCE=mock` — no Postgres required |
| Payments | `PAYMENT_PROVIDER=mock` only; external PSP is an unregistered fail-closed stub |
| SEO | Sprint 33D indexing architecture; preview is always noindex |
| Consent | Technical cookie banner (legal body still pending approval) |
| Runtime | `npm run build` then `npm run start` (`next start`) |

Public preview is **`APP_ENV=preview`**, not `APP_ENV=production`.

If `NODE_ENV=production` and `APP_ENV` is unset, the process resolves to **production**: mock catalog listing is empty, draft PDPs 404, and mock providers are refused. That is the wrong mode for this sprint.

---

## 2. Hosting target / discovery

The repository does **not** lock a paid hosting vendor.

Observed evidence:

- No `vercel.json` or committed cloud project config
- `.vercel` is gitignored
- `docker-compose.yml` is **local Postgres + Redis only**, not an app host
- Production runtime is a standard Node `next start`

Technically appropriate options (owner must choose; none is purchased here):

1. **Vercel** — native Next.js host; custom domain + managed TLS
2. **Node container / VM** — `npm ci && npm run build && npm run start` behind HTTPS
3. **Cloudflare** — possible, but needs an explicit Next.js adapter decision

Minimum owner decision: **which host will terminate HTTPS for the real domain.**

Do not migrate hosting merely for convenience. Do not create paid infrastructure without approval.

---

## 3. Build command

```bash
npm ci
npm run prisma:generate
npm run build
npm run start
```

`prisma:generate` is required by the application graph even when `DATA_SOURCE=mock`.

Public preview does **not** require:

- `db:deploy`
- `db:seed` (never use seed as a production catalog load)
- Redis
- OIDC
- a production PSP

---

## 4. Runtime requirements

| Requirement | Public preview |
| --- | --- |
| Node | Compatible with Next.js 16 / this `package.json` |
| `APP_ENV` | `preview` (required) |
| `NODE_ENV` | `production` on the host |
| HTTPS | Required for `APP_BASE_URL` at runtime |
| Database | Not required (`DATA_SOURCE=mock`) |
| Redis | Not required (`RATE_LIMIT_STORE=memory`) |
| PSP | Must remain `PAYMENT_PROVIDER=mock` |

Build-phase validation skips HTTPS/host/secret checks so `npm run build` can run without preview secrets. Runtime (`next start`) enforces HTTPS canonical URL + integrity secrets.

---

## 5. Environment variables

### Required for public preview

| Variable | Classification | Notes |
| --- | --- | --- |
| `APP_ENV=preview` | PUBLIC CONFIG | Required. Do not omit. |
| `NODE_ENV=production` | PUBLIC CONFIG | Host runtime |
| `APP_BASE_URL` | PUBLIC CONFIG | `https://` + **owner-approved real domain**. Not localhost. Not `laduree.sg`. |
| `NOTIFICATION_BASE_URL` | PUBLIC CONFIG | Same HTTPS origin unless owner supplies another |
| `DATA_SOURCE=mock` | PUBLIC CONFIG | Browse Safe-Draft catalog without Postgres |
| `PAYMENT_PROVIDER=mock` | PUBLIC CONFIG | Preview **refuses** `external` |
| `STORAGE_PROVIDER=local` | PUBLIC CONFIG | No cloud storage required |
| `NOTIFICATION_*_PROVIDER=mock` | PUBLIC CONFIG | No ESP required |
| `ADMIN_AUTH_PROVIDER=mock` | PUBLIC CONFIG | Admin UI/API still 403/404 in preview |
| `RATE_LIMIT_STORE=memory` | PUBLIC CONFIG | Redis not required |
| `MOCK_PAYMENT_WEBHOOK_SECRET` | SECRET | Integrity secret, **not** a PSP key (≥16 chars) |
| `PICKUP_REVEAL_SECRET` | SECRET | Integrity secret (≥16 chars) |

`STOREFRONT_INDEXING` must be unset, empty, or anything other than `live`. `STOREFRONT_INDEXING=live` **refuses process start** in preview.

### Optional

| Variable | Notes |
| --- | --- |
| `LOG_LEVEL` | defaults apply |
| `ORDER_ACCESS_SECRET` | falls back to pickup secret |
| `APP_NAME` / `APP_TIMEZONE` | timezone remains Asia/Bangkok |

### Deferred until live commerce

| Variable | Why deferred |
| --- | --- |
| `PAYMENT_PROVIDER=external` + vendor credentials | Production PSP not authorized |
| `DATABASE_URL` / Prisma | Live commerce persistence |
| `REDIS_URL` / `RATE_LIMIT_STORE=redis` | Production rate-limit store |
| `ADMIN_AUTH_PROVIDER=oidc` + `OIDC_*` | Production admin |
| `STOREFRONT_INDEXING=live` | Indexing not authorized |
| Delivery courier credentials | Delivery go-live not authorized |

Never commit `.env` or real secrets. `.env*` is gitignored except `.env.example`.

---

## 6. Domain configuration (code vs DNS)

**Do not invent the domain.** No owner-approved public hostname is stored in this repository.

Code configuration (this sprint):

- Canonical origin = `APP_BASE_URL`
- Metadata / Open Graph / robots `host` use that origin
- Preview runtime refuses localhost and `laduree.sg` as canonical

DNS / registrar configuration (owner + host; **not performed in this sprint**):

- Point the chosen hostname at the chosen host
- Issue TLS for that hostname
- Redirect HTTP → HTTPS at the host/CDN
- Redirect www ↔ apex so only one host matches `APP_BASE_URL`

---

## 7. DNS records expected

Exact values depend on the owner-selected host. Typical patterns:

| Record | When |
| --- | --- |
| `CNAME www` → host target | If canonical host is `www.` |
| `A` / `AAAA` apex, or ALIAS/ANAME | If canonical host is the apex |
| `CNAME` of the non-canonical host → canonical, **or** host-level 301 | www/non-www strategy |

Do not change real DNS without explicit owner approval.

---

## 8. HTTPS / SSL

- Runtime `APP_BASE_URL` must be `https://`
- Preview enables HSTS and CSP `upgrade-insecure-requests`
- Certificates are issued by the hosting platform (or the reverse proxy), not by this repository
- No localhost canonical in preview

---

## 9. Canonical host policy

1. Owner picks **one** public hostname (www **or** apex, not both as canonical).
2. Set `APP_BASE_URL` to that exact HTTPS origin.
3. Configure the host to 301 the other hostname to that origin.
4. Never set Singapore (`laduree.sg`) as the Thailand canonical.
5. Never set a staging URL as the public preview canonical.

Recommendation when the owner has not yet chosen: prefer a single hostname and keep the other as a redirect. The code does not invent which of www vs apex is brand-correct.

---

## 10. SEO / noindex policy

Default for public preview: **noindex / nofollow**, `robots.txt` `Disallow: /`, empty sitemap.

Indexing becomes live **only** when all of the following are true later:

- `APP_ENV=production`
- `STOREFRONT_INDEXING=live`
- live commerce is authorized

`APP_ENV=preview` keeps indexing closed even if `STOREFRONT_INDEXING=live` is mis-set (and process start refuses that combination).

Do not submit unfinished catalog pages to search consoles.

---

## 11. Commerce fail-closed policy

Sprint 33C Safe-Draft remains authoritative.

Additional Sprint 34 server kill switch (`APP_ENV=preview`):

| Path | Result |
| --- | --- |
| Cart add / update | 403 `PREVIEW_COMMERCE_DISABLED` |
| Checkout draft (pickup or delivery) | 403 |
| Order create | 403 |
| Payment create / mock confirm / mock webhook | 403 |
| Delivery quote API | 403 |
| Delivery demo fixture | forced off |
| Admin UI (`/admin`) | 404 |
| Mock admin login / OIDC start | 403 `PREVIEW_ADMIN_DISABLED` |

Client “Unavailable” / disabled ADD is **not** the only control.

Missing price never becomes ฿0, SGD, or a fabricated THB amount. Display uses `฿ —`. Direct URLs cannot bypass purchasability or the preview kill switch.

---

## 12. Product data update process

Do **not** hard-code prices, availability, flavours, or claims in storefront components.

Later updates go through the existing Product Master / ingestion / backend path:

1. Owner-approved change in Thailand Product Master (or future CMS/Prisma catalog)
2. Import mapping in `lib/catalog/thailand-product-import.ts` remains fail-closed
3. Storefront reads catalog APIs / repositories

Public preview uses `DATA_SOURCE=mock`, which materializes the in-repo master. Switching to Prisma is a later live-commerce decision.

---

## 13. Image update process

Final photography is deferred. Current Safe-Draft rows use `/product-placeholder.svg`.

To replace later:

- Supply owner-approved image URLs (or CMS media ids) on the product record
- Keep `StorefrontImg` / `storefrontImageSrc` as the fallback — do not hard-code final art in components

Broken or empty URLs fall back to the placeholder and do not loop.

---

## 14. Future PSP integration boundary

Out of scope for public preview.

Later live commerce:

1. Register a Thailand PSP adapter behind `PAYMENT_PROVIDER=external`
2. Supply merchant credentials and webhook secrets via the host secrets manager
3. Leave mock mutation routes disabled in production (existing production guard)

Public preview **must not** set `PAYMENT_PROVIDER=external`. The external adapter currently fails closed (no vendor SDK, no credentials).

---

## 15. Deployment procedure

Code is prepared; **this sprint does not deploy.**

When the owner approves deploy:

1. Confirm the exact domain and host
2. Set preview environment variables on the host (never commit them)
3. `npm ci`
4. `npm run prisma:generate`
5. `npm run build`
6. `npm run start` (or host equivalent)
7. Attach custom domain + TLS on the host
8. Point DNS only after TLS works
9. Run the smoke-test procedure below
10. Leave `STOREFRONT_INDEXING` unset

---

## 16. Smoke-test procedure

Automated (local / CI, no public deploy required):

```bash
npm run lint
npm run test:pickup
npm run smoke:preview
npm run smoke:security
npm run smoke:deploy
npm run build
```

After a real-domain deploy (owner-approved):

| Check | Expect |
| --- | --- |
| Open `https://<owner-domain>/` | Homepage renders |
| Category + PDP browse | LDR drafts visible; ADD disabled / Unavailable |
| Direct `/checkout`, `/payment` | No paid order |
| `POST /api/cart/items`, `/api/checkout`, `/api/payment/create` | 403 preview commerce |
| `POST /api/delivery/quote` | 403 |
| `/admin` | 404 |
| `/robots.txt` | `Disallow: /` |
| View-source robots meta | noindex |
| Desktop + mobile layout | usable |
| Cookie banner | opens / saves; legal body still pending |
| `GET /api/health` | 200 |

---

## 17. Rollback procedure

1. Stop serving the new build at the host (restore previous deployment/image)
2. DNS can remain pointed at the host if TLS is still valid
3. Preview uses mock data — no Prisma catalog rollback is required
4. To take the site off the public internet: remove/pause the host deployment or remove DNS (owner action)

Do not “roll forward” into `APP_ENV=production` to fix a preview issue.

---

## 18. Preview → live commerce activation checklist

Do **not** treat this as authorized now.

- [ ] Owner-approved final THB prices (never SGD, never inferred)
- [ ] Owner-approved product images
- [ ] Availability / status reconciliation (Draft → Active only when gates pass)
- [ ] Flavour lists (MACARON_FLAVORS / EUGENIE_FLAVORS) and add-on pricing
- [ ] Delivery eligibility approvals (delivery remains off until then)
- [ ] Production PSP adapter + credentials + webhooks
- [ ] Postgres + Redis + OIDC admin
- [ ] Legal / cookie / Thai copy approvals
- [ ] `APP_ENV=production` with fail-closed providers
- [ ] Explicit authorization to enable `STOREFRONT_INDEXING=live`
- [ ] Explicit authorization to make LDR SKUs purchasable

---

## 19. Owner decisions still required

1. **Exact public domain** (including www vs apex)
2. **Hosting provider** (none is configured in-repo)
3. **HTTPS `APP_BASE_URL`** matching that domain
4. Preview integrity secrets (≥16 characters) — not PSP credentials
5. Whether DNS should be pointed now (this sprint does not change DNS)

Deferred (not required to put the website on the internet in preview mode):

- Final THB prices, images, availability, flavours, add-ons
- Production PSP
- Delivery go-live
- Thai locale activation
- Search-console submission / live indexing
- Outlet name / phone / email / LINE OA still listed as TODO in `docs/thailand-content.md`
- Cookie policy / legal body beyond `[CONTENT PENDING APPROVAL]`
