# Hosting and runtime note: Vercel (sin1) + Railway (Singapore) + Supabase (Singapore)

**ID:** ARCH-001-hosting-runtime (extract of ARCH-001-web-frontend sections 5, 7, 9, 17.2, 18, 19; ops companion like OPS-001, so `schemas/architecture.schema.yaml` is not applied)
**Type:** architecture-extract
**Feature:** FEAT-001 | **Plan task:** PLAN-001 TASK-115 | **Version:** 1 | **Status:** draft
**Date:** 2026-10-22 | **Author:** architect
**Audience:** the owner (accounts, DNS, secrets), the frontend engineer (TASK-105, 109, 116), the backend planner (Railway services, pooler constraint).

## 0. How to read this

- Topology and regions are owner-confirmed decisions (PLAN-001 Q15 and Q16, FEAT-001 D-05 and D-06, FEAT-000 OQ-06). This note records them; it does not choose a host.
- **I had no web access. Every statement about what Vercel, Railway or Supabase does or offers is from memory and is tagged `VERIFY` ("verify against current vendor docs").** No prices, quotas or plan limits are given as fact. Section 11 collects every VERIFY item.
- Detailed Firewall, Deployment Protection and secret-rotation checklists live in OPS-001 and are linked, not copied. CI and supply-chain rules live in OPS-002.
- Revalidation and preview contracts: `ARCH-001-isr-revalidation.md`. Database move and Supabase lockdown: `RUNBOOK-001-database-region-move.md`.

## 1. Topology

| Layer | Decision | Source |
|---|---|---|
| Frontend | Next.js 16 on Vercel, Pro plan (needed for commercial use, VERIFY plan terms), Node.js runtime, functions pinned to Singapore `sin1` | PLAN-001 section 2; ARCH-001 18 |
| Backend | Railway, Southeast Asia (Singapore): **API** service, **worker** service, **scheduler/cron** service | FEAT-000 section 5 |
| Database | Supabase Postgres, new Singapore project (ap-southeast-1), moving from Seoul (ap-northeast-2); reached through the Supabase connection pooler in transaction mode | TASK-117 runbook |
| Media | Supabase Storage, public-read for published media; objects addressed by key so the host can change | FEAT-001 D-06, C-05; ARCH-001 13.3 |
| Payments | Razorpay webhooks go straight to the Railway API service, never through Vercel | contract 5.1 |
| Revalidation | Railway calls `https://{site}/api/revalidate` directly | ARCH-001 9.1 |
| Browser to API | Same origin: Vercel rewrite `/api/*` to the Railway API (no CORS) | ARCH-001 12.7 |

```
                        Browser
                           |
             https://{site}/ (pages, /api/*)
                           v
          +---------------------------------+
          | Vercel (sin1) Next.js 16         |
          |  ISR pages, route handlers       |
          |  /api/revalidate  /api/draft     |
          |  /api/csp-report                 |
          |  everything else under /api/*  --rewrite--> Railway API
          +---------------------------------+      (API_INTERNAL_URL)
             ^                 |  server fetches (ISR, preview exchange)
             | signed POST     v
   +---------+-----------------------------+      Razorpay --webhook--> Railway API
   | Railway (Singapore)                    |
   |  API  |  worker  |  scheduler          |      Browser --signed upload URL--> Supabase Storage
   +--------------------+-------------------+      Browser <-- public media (via next/image on Vercel)
                        | pooler, transaction mode
                        v
   Supabase Postgres (ap-southeast-1) + Storage
```

Three data paths bypass the rewrite on purpose: revalidation (Railway to Vercel), Razorpay webhooks (Razorpay to Railway), media upload (browser to Storage).

## 2. Open decision OD-07 (Vercel constraints), as far as the sources allow

PLAN-001 OD-07: "Confirm Node 24, ISR persistence, rewrite limits (TASK-115)". Status after this note: **partially resolved by design, remainder is verification that needs a live project.**

| OD-07 item | Resolved here | Remains (needs vendor docs or a live staging deploy) |
|---|---|---|
| Node 24 | Design: `.nvmrc` 24, `engines.node` `>=22.12 <25`, Vercel project Node 24.x; fallback Node 22 LTS (ARCH-001 5.1). Local tooling is Node 24 with npm 12 (OPS-002). | Whether Vercel offers Node 24.x for this project, and which npm version its build image bundles (VERIFY). |
| ISR persistence | Design does not depend on a persistent shared filesystem: it uses the framework data cache and `revalidateTag(tag, { expire: 0 })`. | That the tag expiry applies globally across regions and survives deployments; behaviour when a new deployment starts with an empty cache (VERIFY, TASK-105/116). |
| Rewrite limits | Design keeps proxied bodies small: uploads go direct to Storage; `/api/revalidate`, `/api/draft`, `/api/csp-report` are filesystem handlers that win over `afterFiles` rewrites. | Request body size limit, proxy timeout, header pass-through (`Authorization`, `Idempotency-Key`, `X-Request-ID`, `X-Forwarded-For`) (VERIFY). |
| Image optimiser | Config pinned: one exact `remotePatterns` entry, `qualities: [75]`, AVIF/WebP, no SVG. | Source-image and transformation limits for the plan; cost; fallback is `images.unoptimized` for local placeholders only (VERIFY). |
| Pro plan | Required for commercial use per owner decision. | Confirm the current plan terms (VERIFY). |

OD-07 should be marked "resolved by design, verification pending in TASK-105" rather than closed; the plan owner decides.

## 3. Environment matrix

| Item | Production | Staging | Preview (per PR) | Local |
|---|---|---|---|---|
| Vercel | Production environment, custom domain, `sin1` | Custom environment `staging` in the same project (ARCH-001 18.1, OPS-001 PRE-02), stable domain, protected | Preview deployments, protected, `noindex` | `next dev` |
| Backend | Railway production (API, worker, scheduler) | Railway staging environment (own services) | none | mock by default |
| Database and Storage | Supabase production project (paid plan, daily backups before real payments) | Separate Supabase staging project | none | none |
| Mocks | Forbidden; build fails | Off | On only by explicit opt-in (`NEXT_PUBLIC_USE_MOCKS=true` on the preview target) | On |
| Razorpay | Live keys, on Railway only | Test keys, on Railway only | none | none |
| CSP | Enforcing | Report-Only first, then Enforcing (ARCH-001 10.5) | Report-Only | Report-Only |
| Indexing | `index` on public routes | `noindex` | `noindex` | `noindex` |

Notes:
- `next.config.ts` already sends `X-Robots-Tag: noindex, nofollow` on every path when `VERCEL_ENV !== production`, and HSTS only on production.
- The build guard (`web/src/lib/env/guard.ts`) refuses `NEXT_PUBLIC_USE_MOCKS=true` on any Vercel target other than `preview` or `development`. How a custom environment such as `staging` reports `VERCEL_ENV` (as `preview`, or its own name) is a VERIFY item. If it reports `preview`, the guard would allow mocks on staging if someone sets the variable; OPS-001 7.1 requires that variable to be `false` on staging, so check it explicitly (see D-H4).
- Disable "promote preview to production" (OPS-001 DP-05): the guard does not run on promotion.
- A separate Vercel project for `web/` is recommended so the legacy project is untouched until cutover (OPS-002 DEC-CI-09, OD-CI-06). Owner decision pending.

## 4. Environment variables

Parsed by `web/src/lib/env/server-schema.ts` and `public-schema.ts` (zod, fail fast). Secrets must be at least 32 characters; generate 32 random bytes from a CSPRNG per environment (OPS-001 SEC-12). No Supabase anon or service-role key exists in any frontend environment (ARCH-001 17.2).

### 4.1 Web app (Vercel)

| Variable | Scope | Set by | Required when | Notes |
|---|---|---|---|---|
| `API_INTERNAL_URL` | server-only | Owner (Vercel Production and staging only; unset on Preview) | mocks off | Railway API origin. Used by server fetches, the preview exchange and the `/api/*` rewrite destination. A preview must never point at production. |
| `REVALIDATE_SECRET` | server-only, secret | Owner (Vercel and the matching Railway env) | mocks off | Shared HMAC key. Different per environment. Mark Sensitive where the plan allows (VERIFY). |
| `REVALIDATE_SECRET_PREVIOUS` | server-only, secret | Owner, only during a rotation | optional | Remove after rotation (OPS-001 7.3). |
| `PREVIEW_SECRET` | server-only, secret | Owner (Vercel and Railway, same environment) | real-backend previews | Bearer for `POST /api/preview/exchange`. Unset on Preview. No two-value rotation window today (OPS-001 7.4). |
| `NEXT_PUBLIC_SITE_URL` | public | Owner | always | Absolute origin for canonical, sitemap, OG. Default `http://localhost:3000`. |
| `NEXT_PUBLIC_API_BASE_URL` | public | Owner | always | `/api` (relative). Default `/api`. |
| `NEXT_PUBLIC_USE_MOCKS` | public | Owner | n/a | `true` only local and explicit Preview opt-in; build fails on production. |
| `NEXT_PUBLIC_GOOGLE_AUTH` | public | Owner | n/a | Flag `true` or `false`. |
| `NEXT_PUBLIC_RAZORPAY_ENABLED` | public | Owner | n/a | Flag. The Razorpay key id comes from the create-order response, not an env var. |
| `NEXT_PUBLIC_CONTACT_MODE` | public | Owner | n/a | `form` or `off`, default `form` (scaffold assumption; web README deviation 3 asks the architect to confirm). |
| `NEXT_PUBLIC_SUPABASE_STORAGE_HOST` | public, not secret | Owner | real media | Host only, for `remotePatterns`. Changes with the Singapore move. |
| `NEXT_PUBLIC_MEDIA_BUCKET` | public, not secret | Owner | real media | Bucket name used in the `remotePatterns` path. |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | public, not secret | Owner | optional | Custom media domain; the API returns object keys and `lib/media/url.ts` composes the URL. |
| `VERCEL_ENV` | platform-set | Vercel | n/a | Read by the build guard and `next.config.ts` (HSTS, noindex). |

Rules: anything `NEXT_PUBLIC_` is inlined at build time and visible to every visitor; the build guard refuses `NEXT_PUBLIC_*` names matching `SECRET|TOKEN|KEY|PASSWORD`. Flag changes need a redeploy. Scope each secret to exact Vercel environments (OPS-001 SEC-10). A Vercel team member can read production values, so keep the team small and require 2FA (OPS-001 DP-06).

### 4.2 Railway (names only; the backend plan owns the list)

Per environment (production and staging each hold their own values): database URL via the pooler; `REVALIDATE_SECRET` and `PREVIEW_SECRET` (same value as the matching Vercel environment); `SITE` origin for the dispatcher; Razorpay key id, key secret and webhook secret; email provider key; Supabase service-role key only if the backend uses Storage admin APIs for signed upload URLs (Railway only); token signing key; staging only: the Vercel protection bypass value if the staging domain is protected (OPS-001 DP-13). The legacy Django settings read `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DJANGO_SECRET_KEY`, `SENDGRID_API_KEY`, `FRONTEND_URL`; the new backend may rename these.

### 4.3 Local

`web/.env.example` documents the web variables (it exists but was not read for this note; confirm it matches section 4.1). The repo root `.env.example` is a legacy Vite file (`VITE_SUPABASE_*`, `VITE_RAZORPAY_*`) belonging to code that TASK-107 deletes; do not copy it into `web/`.

## 5. The /api/* rewrite

- Planned config (ARCH-001 12.7): `rewrites()` returns `afterFiles` with source `/api/:path*` and destination `API_INTERNAL_URL` + `/api/:path*`. At the time of this note `web/next.config.ts` has **no** `rewrites()` yet (TASK-013 adds it); `web/vercel.json` contains only `framework`, `regions: ["sin1"]`, `installCommand: npm ci`, `buildCommand: npm run build`.
- Precedence: filesystem route handlers (`/api/revalidate`, `/api/draft`, `/api/draft/exit`, `/api/csp-report`) win over `afterFiles` rewrites; TASK-013 asserts it with a test. VERIFY on the deployed platform in TASK-105.
- Consequences: no CORS and no preflight; the backend must not depend on `Origin`; the real client IP reaches Railway through forwarded headers, so the backend must say which header it trusts (OPS-001 SEC-05) and must not trust a client-supplied `X-Forwarded-For`.
- Limits: proxied request body size, timeout and header pass-through are VERIFY items. Design response: media upload bypasses the rewrite via signed Storage URLs; backend requests should finish well inside the platform function limit; the Razorpay webhook never uses it.
- The Railway origin is directly reachable on its public domain, so the Vercel Firewall does not protect it (OPS-001 SEC-06). The backend keeps its own rate limits (contract 2.10). A shared edge secret header checked by the backend is an option for later; owner decision open.
- `API_INTERNAL_URL` must resolve to the Railway service in the Singapore region and be reachable from `sin1` over HTTPS.

## 6. Node, npm and the build chain

| Setting | Value | Source |
|---|---|---|
| Node | 24 LTS: `web/.nvmrc` = 24; `engines.node` `>=22.12 <25`; fallback 22 LTS | ARCH-001 5.1; `web/package.json` |
| Package manager | npm, lockfile v3, own `web/package-lock.json`; Vercel `installCommand` `npm ci` | `web/vercel.json` |
| `web/.npmrc` | `ignore-scripts=true`, `engine-strict=true`, `save-prefix=~` today; OPS-002 specifies adding `allow-git`, `min-release-age` (7) and related keys | file; OPS-002 |
| Build command | `npm run build` = `npm run guard:env && next build` today | `web/package.json` |
| Chain rule | With `ignore-scripts=true`, npm skips `prebuild` and `postbuild` hooks (observed on npm 12). Guards must be chained explicitly. ARCH-001 18.3 target: `guard:env && next build && check:build-output` | web README deviation 1; OPS-002 DEC-CI-07 |
| Next.js | 16.4.x, Turbopack default | `package.json` |
| Browser floor | last 2 majors, iOS >= 16.4, Chrome Android >= 111 | ARCH-001 5.2 |

`check:build-output` is not yet in `package.json`; it is future work. The Vercel build image npm version may differ from local npm 12 (VERIFY); install-script and min-release-age keys must be tested there (OPS-002).

## 7. Image optimisation and ISR runtime requirements

- **Images:** `next/image` on Vercel serves derivatives of originals in Supabase Storage. `images.remotePatterns` has one exact entry: `https://{NEXT_PUBLIC_SUPABASE_STORAGE_HOST}/storage/v1/object/public/{NEXT_PUBLIC_MEDIA_BUCKET}/**`, empty search; `qualities: [75]`; formats avif and webp; `dangerouslyAllowSVG: false` (implemented in `web/next.config.ts`). With host or bucket unset no remote patterns are registered (mock builds use `/placeholders/*`).
- **Privacy purge of images (F-15):** the optimiser caches derivatives; deleting the Storage object may not clear them. Use versioned object keys or a reduced `minimumCacheTTL`, and keep an emergency purge procedure (TASK-127). How to purge the Vercel optimiser cache is a VERIFY item.
- **Host change:** the Storage host changes with the Singapore move (a new project has a new hostname). Update `NEXT_PUBLIC_SUPABASE_STORAGE_HOST` and redeploy. A custom media domain (`NEXT_PUBLIC_MEDIA_BASE_URL`, with that host in `remotePatterns`) makes later moves invisible. Stored rows must hold object keys, never absolute URLs (legacy `gallery_photos.url` is free text, see the runbook).
- **ISR:** public routes are static/ISR with `revalidate = 900` and tag-based on-demand expiry. `/api/revalidate` is a Node route handler (never edge) with a per-instance in-memory event-id map; all functions run in `sin1` only. To confirm on the platform: tag expiry is global; `generateStaticParams` with `dynamicParams` works as designed; a failed regeneration keeps serving the last good page.
- **Client groups** (`auth`, `app`, `admin`) are dynamic shells (one function invocation per hard load) to carry a per-request CSP nonce.

## 8. Backend runtime constraints (for the backend plan)

- **Services:** API, worker, scheduler on Railway Singapore. Whether they share one repo or image is a backend-plan choice; the topology works whether the backend extends the current Django app or is rebuilt (OQ-18 stays open).
- **Pooler, transaction mode:** no session-level state. If the backend is Django: set `DISABLE_SERVER_SIDE_CURSORS = True`; avoid advisory locks, `LISTEN/NOTIFY` and prepared statements through the pooler; use the direct connection for migrations only; do not hold a pooled connection across external calls (contract 6.4). Pooler hostnames, ports and modes are vendor specifics (VERIFY against current Supabase docs).
- **Connection counts:** one pooled connection budget is shared by three Railway services (API, worker, scheduler) per environment; set per-service limits (VERIFY the pooler client limits for the plan).
- **Time-based jobs** run on the Railway scheduler, not on Vercel. Vercel cron is not used.
- **Uploads:** large uploads go browser to Supabase Storage with signed upload URLs issued by the backend, never via the rewrite (ARCH-001 13.3, 12.7). Published media is public-read; drafts use signed URLs; writes only through backend-issued URLs (contract 6.4).
- **Webhook endpoints:** Razorpay posts to the Railway API directly. Its URL is configured in the Razorpay dashboard per mode (test and live); it must never point at the Vercel domain (OPS-001 FW-11).
- **Health:** the backend exposes a cheap health endpoint for Railway checks and the post-deploy smoke (TASK-109). Name not fixed in the sources.

## 9. Observability and log expectations

Vendor-neutral by design (ARCH-001 19; provider TBD). Expectations:

| Where | Must be visible | Must never appear |
|---|---|---|
| Vercel runtime logs | Revalidation handler: request id, event id, type/action, outcome code. `/api/csp-report`: violated directive, blocked-URI origin. ISR regeneration errors. | Secrets, signatures, bodies, tokens, emails, phone numbers, payment ids, `script-sample`, the protection bypass value |
| Vercel deployment logs | Guard results (`guard:env`, mock guard), future `check:build-output` | Environment values |
| Vercel Firewall / usage | Per-rule hits, rate limits, function invocations, image transformations | n/a |
| Railway logs | Request id on every line (`meta.request_id` equals `X-Request-ID`), webhook receipt and outcome with provider event id, revalidation attempts and exhaustion, job runs | Same list as above |
| Alerts (OPS-001 10.2, proposals) | 401 spikes on `/api/revalidate`, outbox exhaustion, handler 5xx, backend 5xx and 429 rates, payment/webhook failures, reconcile mismatches | n/a |

The join key between a user report and backend logs is `requestId`. Log retention, search, export and drains depend on the plan (VERIFY; OPS-001 LOG-01). Error tracking and analytics are not chosen (NG-12); adding any provider needs a CSP change and a security review.

## 10. DNS and domain notes (questions for the owner)

No DNS, registrar or domain information exists in the repo sources apart from legacy references to `pgchess.in` (legacy `FRONTEND_URL` default and a legacy admin email domain). Questions:

1. Which domain is the production site (is it `pgchess.in`, and who holds the registrar account)? Who controls DNS today and is 2FA on it (OPS-002 account hygiene register includes DNS)?
2. Is the live legacy site on the same domain, and on which Vercel project? Cutover implies moving the domain to the new project (TASK-105 to 108); a separate Vercel project for `web/` is recommended (OPS-002 DEC-CI-09). Do you accept that?
3. Staging domain: a subdomain such as `staging.<domain>` on the same project (custom environment)? It will be behind Deployment Protection (OPS-001 DP-02).
4. Should the API be reachable on its own subdomain (for example `api.<domain>`) as well as via `/api/*`? The Razorpay webhook needs a stable public Railway URL; a custom domain for Railway keeps it independent of the generated hostname (VERIFY Railway custom-domain behaviour).
5. Media domain: use the Supabase hostname at launch, or create a custom media domain now so a later host change is invisible (FEAT-001 C-05)? A custom domain on Supabase Storage may need a paid add-on (VERIFY).
6. Email sending domain (SPF, DKIM, DMARC records) for the transactional provider, provider still open (FEAT-000 OQ-05).
7. www versus apex redirect and HSTS preload: not specified in any source; decide before launch. HSTS is already sent on production by `next.config.ts` (one year, includeSubDomains), which affects every subdomain including staging if on the same registrable domain.
8. Who needs Vercel, Railway and Supabase seats, and which accounts are owner-held? Billing owner for each (no prices given here).

## 11. Verify against current vendor docs (nothing here was checked)

| Id | Item |
|---|---|
| V-1 | Vercel Pro plan terms for commercial use; what a custom environment such as `staging` provides on Pro. |
| V-2 | Node 24.x availability for Vercel functions and builds; bundled npm version in the build image. |
| V-3 | `vercel.json` `regions` versus project region setting precedence; that `preferredRegion` is deprecated; `x-vercel-id` region format. |
| V-4 | ISR/data cache persistence across deployments and regions; global effect of `revalidateTag(tag, { expire: 0 })`. |
| V-5 | Rewrite limits: body size, timeout, header pass-through, forwarded IP header, precedence of route handlers. |
| V-6 | Image optimiser limits, caching, cache purge method, remote pattern matching. |
| V-7 | `VERCEL_ENV` value for a custom environment; env var scoping per custom environment; Sensitive variables; promote-from-preview controls. |
| V-8 | Log retention, drains, alert options on the plan. |
| V-9 | Railway: Singapore region name, per-service regions, private networking between services, custom domains, scheduler/cron service type, restart and deploy behaviour, secret variable handling, whether the generated public domain can be disabled. |
| V-10 | Supabase: Singapore region (ap-southeast-1) naming; pooler endpoint, ports, transaction mode behaviour and client connection limits; Data API disable switch; Storage public bucket URL format and custom-domain support; backup retention and point-in-time options per plan; network restrictions; supported extensions list. |
| V-11 | Razorpay: webhook configuration per mode (not a hosting vendor, listed for completeness). |

## 12. Discrepancies and gaps found

| Id | Item |
|---|---|
| D-H1 | Plan TASK-115 names the file `ARCH-001-hosting.md`; delivered as `ARCH-001-hosting-runtime.md` as instructed. ARCH-001 section 18 says TASK-115 expands into `ARCH-001-hosting.md`. |
| D-H2 | Plan TASK-115 lists "Add section 18.2 Vercel behaviours list" as an edit to ARCH-001; 18.2 already exists. This note supersedes it by carrying the full VERIFY list (section 11). |
| D-H3 | `web/README.md` and ARCH-001 18.3 disagree on the build chain: ARCH-001 18.3 says `guard:env && next build && check:build-output`; `package.json` has only `guard:env && next build` (check:build-output not implemented). |
| D-H4 | The mock guard allows `NEXT_PUBLIC_USE_MOCKS=true` on any `preview` or `development` target. ARCH-001 18.1 says staging has mocks off; whether the staging custom environment reports as `preview` is unknown. Consider an explicit guard on a staging marker. |
| D-H5 | PLAN-001 R17 and OD-07 expect ISR persistence, optimiser and rewrite behaviour to be "confirmed" by TASK-115; without vendor access they can only be listed (section 11). |
| D-H6 | OPS-001 recommends distinct secrets for Preview or unset; the scaffold server schema requires `API_INTERNAL_URL` and `REVALIDATE_SECRET` whenever mocks are off, so a Preview with a real backend would need its own values, which OPS-001 does not allow. Preview with a real backend is therefore not supported (consistent with the matrix). |
| D-H7 | ARCH-001 17.2 lists `NEXT_PUBLIC_SUPABASE_STORAGE_HOST`, `NEXT_PUBLIC_MEDIA_BASE_URL`, `NEXT_PUBLIC_MEDIA_BUCKET` as three variables; PLAN-001 TASK-115 mentions only the Supabase storage host. This note follows ARCH-001 and the scaffold. |
| D-H8 | The hosting note in the plan says Supabase Singapore project is "paid plan"; FEAT-001 only requires paid plan with daily backups before real payments. Staging plan tier is not stated anywhere. |
