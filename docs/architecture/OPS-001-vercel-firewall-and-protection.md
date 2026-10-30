# Ops checklist: Vercel Firewall rate limits and Deployment Protection

**ID:** OPS-001 (operator checklist; companion to `ARCH-001-web-frontend.md`. It is an ops runbook, not an architecture artifact, so `schemas/architecture.schema.yaml` does not apply.)
**Type:** ops-checklist
**Feature:** FEAT-001
**Plan task:** PLAN-001 TASK-126 (Phase 0.5). The task entry names the deliverable `ARCH-001-ops-checklist.md`; this file is the delivered form under the name given in the hand-off. Reconcile the name in the plan when convenient.
**Version:** 1
**Status:** ready for owner review (nothing here has been executed or tested against a live Vercel project)
**Date:** 2026-10-22
**Author:** architect
**Executed by:** the owner, in the Vercel dashboard or CLI. TASK-105 (deployment configuration) and TASK-109 (post-deploy smoke) consume this document.

---

## 0. How to use this document

This is a checklist the **owner** performs in the Vercel dashboard (or CLI where one exists), plus the small Railway and GitHub settings it touches. The architect cannot reach those systems.

**Conventions**

- Every actionable line is a checkbox with a stable id (`PRE-`, `FW-`, `DP-`, `SEC-`, `ACM-`, `REG-`, `LOG-`, `V-`, `RB-`). Verification items (`V-`) prove a control works and name the expected response. Tick a control only after its `V-` check passes.
- **PROPOSAL** marks a number or setting derived from the architecture and contract documents plus reasoning, not from measurement. Every threshold in this document is a proposal to be tuned after burn-in (section 4.3).
- **VERIFY** marks a Vercel feature, plan tier, limit or behaviour that I believe exists but have not confirmed against current Vercel documentation. Section 13.3 collects them all. Do not treat any such statement as fact. Pricing and quotas are deliberately not stated anywhere here.
- Paths are shown as the browser sees them (`/api/...`). The backend contract writes endpoints relative to `/api` (for example `POST /auth/login` is `POST /api/auth/login` on the site).

**Timing tags**

| Tag | Meaning |
|---|---|
| NOW | Project-level setting; can be done before `web/` exists |
| STAGING | Do when the staging environment exists (TASK-105); needs the route handlers from TASK-007 and TASK-114 |
| GATE | Must be complete before the cutover approval (TASK-106); PLAN-001 lists Firewall rate limits and preview protection as launch-gating |
| EVENT | Repeat or review around live events |

**State of the code this protects.** `web/` has not been scaffolded (TASK-007 pending). The route handlers named below (`/api/revalidate`, `/api/draft`, `/api/draft/exit`, `/api/csp-report`) are specified in ARCH-001 v2 sections 8.4, 9 and 10 but do not exist yet. Firewall rules can be created now; their verification (section 11) can only run once those handlers are deployed to staging.

**Recommended order**

1. Settle section 1 (prerequisites and questions for the backend owner).
2. NOW items: Deployment Protection (section 6), secrets and scoping (section 7), region pinning (section 9).
3. Create the Firewall rules (sections 4 and 5), with the log-first rules in log mode.
4. At staging: run section 11, tune thresholds, record results in section 13.2.
5. Before cutover: switch log-first rules to enforcing, re-run section 11 against production, owner signs off in section 13.2.
6. After each live event: review (section 10).

---

## 1. Prerequisites and facts to settle first

| Id | Timing | Item |
|---|---|---|
| - [ ] **PRE-01** | NOW | Confirm the Vercel plan. ARCH-001 section 18 assumes **Pro** (needed for commercial use). Several controls below differ by plan: rate-limit keys, window lengths, rule counts, Deployment Protection options, log retention, alerting. Open the current Vercel documentation for Firewall, Deployment Protection and Spend Management and note in section 13.2 which features your plan offers. Where a feature is missing, use the fallback written next to it. |
| - [ ] **PRE-02** | NOW | Record in section 13.2: Vercel team and project name, production custom domain, staging domain, and whether `staging` is a **custom environment inside the same project** (ARCH-001 18.1 says it is). Consequence (VERIFY): Firewall rules, Attack Challenge Mode and Deployment Protection settings are project-level, so staging and production share them, and rules that must behave differently use a hostname condition. |
| - [ ] **PRE-03** | NOW | Ask the backend owner and record answers: (a) can the revalidation dispatcher send one **extra static request header** per environment (needed for the staging bypass, section 6.3)? Contract sections 3.10 and 5.6 do not currently specify one. (b) Does Railway offer a **static outbound IP** for the API and worker services on your plan (VERIFY)? Only needed for an IP-based Attack Challenge Mode exemption (section 8). (c) What is the maximum burst of revalidation calls the outbox dispatcher can emit? It sets FW-01. (d) Confirm the Razorpay dashboard webhook URL is the **Railway** URL, never the Vercel domain (ARCH-001 section 18, contract 5.1). |
| - [ ] **PRE-04** | NOW | Record the **largest expected single-venue headcount** (players behind one shared Wi-Fi or carrier NAT). It drives the credential, refresh and anonymous-flood thresholds (FW-05, FW-07, FW-08). Contract 2.10 expects event-day bursts of tens to low hundreds of Event Room pollers, each polling every 5 to 30 s, and these can share one public IP. |
| - [ ] **PRE-05** | NOW | Once TASK-007 defines them, copy the real names of the **preview mock opt-in variable** and the **mock-only signing secret** (ARCH-001 F-09) into section 7. This document refers to them generically. |
| - [ ] **PRE-06** | NOW | Work through the VERIFY list (section 13.3) against current Vercel docs and write the answer beside each item. Several choices below (bypass handling, Attack Challenge Mode exemptions, rule precedence, project-level versus per-environment scope) depend on the answers. |

If an answer contradicts this document, the Vercel documentation wins; tell the architect so this file can be corrected.

---

## 2. Request surface this checklist protects

Sources: ARCH-001 sections 8.4, 9, 10, 12.7, 17, 18, 23.1; ARCH-001-backend-contract sections 2.10, 3.2, 3.10, 5.1, 5.6; SEC-001 findings F-06, F-07, F-08, F-09, F-11, F-12, F-18, F-21 and decision OD-06.

| Path (as seen on the site) | Handled by | Caller | Abuse of concern | Findings |
|---|---|---|---|---|
| `POST /api/revalidate` | Next route handler (Node), never rewritten | Railway API/worker only | Unsigned floods burn invocations; per-instance dedupe is bypassable by spreading across instances (accepted, bounded); forged or replayed calls | F-07, OD-06 |
| `POST /api/csp-report` | Next route handler | Browsers (any visitor) | Anonymous write endpoint; floods burn invocations and log quota; reports can carry tokens in URLs | F-11 |
| `GET /api/draft?token=` | Next route handler | Admin browsers; link unfurlers (WhatsApp, Slack) | Each hit makes the function call Railway `POST /api/preview/exchange` (amplification to the backend); unfurlers consume single-use tokens | F-06 |
| `POST /api/draft/exit` | Next route handler | Admin browsers | Low impact; Origin-checked by the handler | F-06 |
| `/api/auth/*`, `/api/contact`, all other `/api/*` | **Rewrite** (`afterFiles`) to `API_INTERNAL_URL` on Railway | Browsers | Credential stuffing, reset-email abuse, contact spam, scraping, floods that reach Railway. The Railway origin is also directly reachable, so edge limits are bypassable | F-12, F-21 (backend-owned) |
| `GET /events/{slug}`, `/stories/{slug}` | Next ISR pages, `dynamicParams = true` | Anyone | Random slugs fill the cache with 404 entries and cause backend lookups | F-08 |
| `POST /api/webhooks/razorpay` | **Railway directly**, not Vercel | Razorpay | Must never be routed through Vercel (FW-11) | contract 5.1 |
| `POST /api/preview/exchange` | Railway; called **server to server** by the `/api/draft` handler using `API_INTERNAL_URL` | The Vercel function only | Must not be callable from the public site through the rewrite (FW-11) | F-06, F-12 |

Facts that shape the thresholds:

- Filesystem route handlers win over `afterFiles` rewrites (ARCH-001 9.1, 12.7; TASK-013 tests it), so the four named handlers never reach Railway. The Firewall sits in front of both and does not care which wins.
- The browser calls `/api/auth/*` and the player and admin APIs through the rewrite, so Vercel sees the real player IP. Players at a venue share one IP.
- The backend already defines application limits (contract 2.10): login and register 10/min per IP and 5/min per email; password-reset 3/hour per email and 10/hour per IP; refresh 30/min per token family; contact 3/hour per IP; Event Room snapshot 12/min per user; admin commands 60/min per admin. **The edge rules here are a coarse outer flood guard and must be looser than those**, so legitimate users normally meet the backend's precise `RATE_LIMITED` envelope with `Retry-After`, not a generic Vercel 429 that the frontend copy map does not know (the client maps unknown 429 to `HTTP_429`, ARCH-001 11.7).

---

## 3. What an in-memory limiter cannot do on serverless

The architecture already contains in-process state: the revalidation event-id dedupe `Map` (max 1,000 entries, 10-minute TTL, ARCH-001 9.2), a "rate-limited" CSP route (10.5) and "sample 1-in-N after a per-instance burst" logging (SEC-001 F-11). Be clear about what such code can and cannot give you.

| Limitation | Consequence here |
|---|---|
| **Per instance, not per deployment.** Vercel runs many function instances and creates and discards them freely; each has its own memory. | A limit of N per minute in code is effectively N per instance per minute. An attacker who spreads load, or is simply load-balanced, sees no global cap. |
| **State is lost on cold start and instance recycle.** | A flood can restart onto a fresh instance with an empty counter. Counters and dedupe entries are best effort only. |
| **Runs after the invocation has started.** | The billed part (function invocation, runtime, log line) has already happened when the code decides to refuse. Code cannot stop invocation cost or log volume; only a rule in front of the function can. |
| **Cannot act before cache or function.** | The Firewall acts at the edge before the function (VERIFY exact ordering relative to cache). Code cannot. |
| **No sync across instances or edge locations.** | Even with functions pinned to `sin1`, instances do not share memory. |
| **Bounded maps can be flushed.** | The event-id `Map` is written only after full authentication, so an attacker cannot insert entries, but recycling empties it. This is why OD-06 accepted per-instance dedupe as bounded replay (300 s window, idempotent tag expiry), not a guarantee. |
| **Cannot key on what only the platform knows.** | Per-IP, per-ASN, fingerprint, challenge and persistent blocking are Firewall features, not available to application code. |

What in-memory state is still good for (keep it, never rely on it): suppressing duplicate log lines, sampling CSP-report logging after a burst (F-11), and best-effort idempotent dedupe.

**If the Firewall proves insufficient** (for example a needed rate-limit key is missing on your plan), options in order of preference:

1. A programmatic rate-limit check inside the handler that is backed by a Firewall rate-limit rule (current Vercel docs describe an SDK for this; VERIFY it exists, which plans include it, and that enforcement is global). This adds a runtime dependency and needs an ADR plus a PR note (ARCH-001 17.1).
2. A shared external store (Redis or similar). New infrastructure; not recommended at this scale; needs an ADR.
3. Rely more on the Railway backend's own limits (it must have them anyway, contract 2.10) and accept that Vercel invocations are still spent.

None is needed to start; the Firewall rules in section 4 are the plan of record.

---

## 4. Firewall rate-limit rules

### 4.1 Rule summary

All thresholds are **PROPOSALS to tune** (section 4.3). Key = what the counter is grouped by; unless stated it is the client IP. "Mode" is the setting to start with: **Log** (rule matches and is recorded, nothing is blocked), then **Enforce** after the burn-in in 4.3. Names below are suggestions for the rule description field so the Firewall tab stays readable.

| Id | Rule name | Match (all conditions) | Limit per window (PROPOSAL) | Action | Start mode | Timing |
|---|---|---|---|---|---|---|
| - [ ] **FW-01** | `pg-revalidate-rate` | Path equals `/api/revalidate` | **120 / 60 s** per IP | Rate limit (429) | Enforce on staging, Log then Enforce on production | STAGING, GATE |
| - [ ] **FW-02** | `pg-csp-report-rate` | Path equals `/api/csp-report` | **20 / 60 s** per IP on production; **60 / 60 s** on staging during Report-Only collection | Rate limit (429) | Enforce | STAGING, GATE |
| - [ ] **FW-03** | `pg-draft-rate` | Path starts with `/api/draft` (covers `/api/draft` and `/api/draft/exit`; method-agnostic on purpose, see note) | **10 / 60 s** per IP | Rate limit (429) | Enforce | STAGING, GATE |
| - [ ] **FW-04** | `pg-draft-no-unfurlers` | Path starts with `/api/draft` AND User-Agent contains one of `WhatsApp`, `Slackbot`, `facebookexternalhit`, `Twitterbot`, `LinkedInBot`, `Discordbot`, `TelegramBot`, `Googlebot`, `bingbot` | n/a | Deny (403) | Enforce | STAGING, GATE |
| - [ ] **FW-05** | `pg-auth-credentials-rate` | Method equals `POST` AND path is one of `/api/auth/login`, `/api/auth/register`, `/api/auth/password-reset`, `/api/auth/password-reset/confirm`, `/api/auth/oauth/exchange` | **60 / 60 s** per IP | Rate limit (429) | Log, then Enforce | STAGING, GATE |
| - [ ] **FW-06** | `pg-auth-slow-rate` | Method equals `POST` AND path is one of `/api/auth/password-reset`, `/api/contact` | **10 per 10 min** per IP (fallback if your plan's longest window is shorter: **3 / 60 s**) | Rate limit (429) | Enforce | STAGING, GATE |
| - [ ] **FW-07** | `pg-auth-refresh-rate` | Method equals `POST` AND path equals `/api/auth/refresh` | **120 / 60 s** per IP | Rate limit (429) | Log, then Enforce | STAGING, GATE |
| - [ ] **FW-08** | `pg-api-anon-flood` | Path starts with `/api/` AND request has **no** `Authorization` header AND path is not one of the paths covered by FW-01 to FW-07 | **600 / 60 s** per IP | Rate limit (429) | Log first | STAGING, GATE |
| - [ ] **FW-09** | `pg-pages-watch` (observation only) | Path starts with `/events/` or `/stories/` | **1200 / 60 s** per IP | **Log only; do not enforce** | Log | STAGING |
| - [ ] **FW-10** | `pg-api-method-guard` | Path is `/api/revalidate` or `/api/csp-report` AND method is not `POST`; also path starts with `/api/draft/exit` AND method is not `POST` | n/a | Deny (403) | Enforce | STAGING, GATE |
| - [ ] **FW-11** | `pg-api-internal-deny` | Path starts with any of `/api/preview/exchange`, `/api/webhooks/`, `/api/health`, `/api/docs`, `/api/schema`, `/api/swagger`, `/api/redoc`, `/api/debug`, `/api/metrics` (confirm the real names with the backend owner first) | n/a | Deny (403) | Enforce | STAGING, GATE |
| - [ ] **FW-12** | `pg-api-path-hygiene` | Path starts with `/api/` AND (path contains `..` OR `%2e` OR `%2E` OR `%2f` OR `%2F` OR `%5c` OR `%5C` OR `//` OR `\`) | n/a | Deny (403) | Log, then Enforce | STAGING, GATE |
| - [ ] **FW-13** | `pg-revalidate-case-guard` | Path contains `evalidate` (case-insensitive if the condition allows) AND path does not equal `/api/revalidate` | n/a | Deny (403) | Enforce | STAGING, GATE |
| - [ ] **FW-14** | `pg-csp-report-content-type` | Path equals `/api/csp-report` AND `Content-Type` does not contain `application/csp-report` AND does not contain `application/reports+json` | n/a | Deny (403) | Enforce | STAGING, GATE |
| - [ ] **FW-15** | `pg-revalidate-shape` | Path equals `/api/revalidate` AND (header `X-PG-Signature` is absent OR header `X-PG-Timestamp` is absent OR header `X-PG-Event-Id` is absent) | n/a | Deny (403) | Enforce | STAGING, GATE |
| - [ ] **FW-16** | `pg-revalidate-bypass-acm` (conditional) | Method equals `POST` AND path equals `/api/revalidate` AND header `X-PG-Signature` present (add "IP equals Railway static egress IP" if PRE-03(b) is yes) | n/a | Bypass (only if section 8 requires it; see ACM-03) | Create disabled; enable per section 8 | GATE |
| - [ ] **FW-17** | `pg-owner-ip-no-allowlist` (negative item) | Do **not** create a permanent allow rule for the owner's or office IP. Use the bypass header for tests. | n/a | n/a | n/a | NOW |

Condition syntax, available actions, header-existence and case-insensitive conditions, the number of custom rules allowed, and the longest rate-limit window differ by plan and may differ from the wording above. All are **VERIFY** items (13.3). If a condition type is missing, drop that rule's extra condition and record the gap in 13.2; do not substitute a broader rule that could catch legitimate traffic.

Notes on the table:

- **Method-agnostic `/api/draft` (FW-03, FW-04).** ARCH-001 8.4 and 23.1 specify `GET /api/draft?token=`; SEC-001 F-06 recommends an admin-initiated `POST /api/draft`. The document set is not settled on the method, so the rules key on the path only. If TASK-111 or a follow-up changes the method, no rule changes.
- **FW-04 and unfurlers.** WhatsApp and Slack previewers fetch URLs pasted into chats; a single-use preview token is consumed by the previewer before a human opens it (F-06). A User-Agent rule is easy to evade by a determined attacker and is not a security boundary; it only stops accidental token consumption by honest previewers. The `Googlebot` and `bingbot` entries are belt-and-braces: `/api/` is disallowed in `robots.txt` (ARCH-001 8.3) and the handlers answer non-browsers uninformatively.
- **FW-06 is deliberately looser than the backend.** Contract 2.10 gives password-reset 3 per hour per email and 10 per hour per IP, and contact 3 per hour per IP. FW-06 at 10 per 10 minutes is looser than both, as section 2 requires, and exists only to cap raw request volume reaching Railway. FW-05 and FW-06 both match `/api/auth/password-reset`; that is intentional, and which rule wins when several match is a VERIFY item (13.3 item 2).
- **FW-02 needs two copies if staging and production share one project.** Create `pg-csp-report-rate-prod` (20 / 60 s, with a hostname condition equal to the production domain) and `pg-csp-report-rate-staging` (60 / 60 s, hostname equal to the staging domain). If the plan has no hostname condition, use the staging value on both until cutover, then lower it (GATE).
- **FW-08 excludes authenticated calls.** Players at a venue poll the Event Room snapshot (`GET /api/me/events/{id}/room`) up to 12 times a minute each (contract 2.10, M05) and carry a bearer token. 100 to 150 players behind one venue IP generate 1,200 to 1,800 such requests a minute from a single address. A per-IP cap that counted those would block the event it is meant to protect. Authenticated traffic is therefore left to the backend's per-user limits. If your plan can key a rate limit on a request header value (VERIFY), consider an additional per-`Authorization` rule of **60 / 60 s** as a defence against a single stolen token; do not add it if the key option is missing.
- **FW-09 is observation only.** Prerendered pages are served from the CDN cache and do not invoke a function; a Firewall limit on them mostly produces false positives (Next.js prefetches the pages of every visible event card, so one visitor can legitimately produce a dozen requests at once, multiplied by a venue). The real cost of F-08 (random-slug floods populating the cache with 404 entries and calling the backend) is handled in code: slug regex before any fetch, capped negative-cache TTL. Use FW-09 to see abnormal sources, then react manually (block that IP, or section 8).
- **FW-11.** `POST /api/preview/exchange` is called by the Vercel function straight at `API_INTERNAL_URL` (Railway), not through the public site, so denying it on the site breaks nothing. `/api/webhooks/razorpay` is delivered by Razorpay to Railway, never to the site, so denying `/api/webhooks/` on the site breaks nothing. This removes two sensitive backend routes from the public rewrite surface and also covers the SEC-001 F-12(e) risk that backend health, docs or debug routes become world-visible. Do **not** deny a path that TASK-109 or an uptime check uses through the site; if one does use `/api/health` via the site, narrow the rule (for example to `/api/health/` sub-paths) after agreeing with the backend owner.
- **FW-12 and FW-13** address F-12(d): differences in path normalisation between Next.js, the Vercel edge and the backend that could reach an unintended backend route or shadow `/api/revalidate`. The legitimate API uses UUIDs and slugs only, so no valid request contains encoded separators. Whether the Firewall evaluates the raw or the normalised path is a **VERIFY** item; test both with `curl --path-as-is` (section 11).
- **FW-15** only prefilters. It cannot validate the signature (that stays in the handler per ARCH-001 9.1). Because the edge answers 403 where the handler would answer 401, the 401 uniformity of AC-108 is relaxed at the edge for obviously malformed requests; this leaks nothing beyond "this is not a well-formed call".
- **FW-16 is conditional.** A Bypass-type action may skip system-level mitigations (Attack Challenge Mode, bot protection) for matching requests; it must not skip the rate limits FW-01 and FW-15 (VERIFY precedence). The HMAC remains the authentication. See section 8.

### 4.2 Threshold rationale and timing

| Rule | Why this number | Why this window |
|---|---|---|
| FW-01 (120 / 60 s) | The only legitimate caller is the Railway dispatcher. Normal volume is a handful of calls per publish, plus scheduler-driven transitions (open, sold out, start, completed; contract 5.2) and retries (up to 5 attempts, contract 5.6). A worst legitimate burst is a media change that fans out to one call per referencing entity (contract 3.10), which could be dozens. 120/min gives roughly an order of magnitude over normal and covers a burst of about 100 with margin. If the burst you recorded in PRE-03(c) is larger, set the limit to at least twice that burst. A legitimate sender that is limited receives 429 and retries with backoff (same event id), so the worst case is a delay, never a loss; the 15-minute safety net backstops it. | 60 s matches the publish-to-visible target of 60 s (ARCH-001 9.5): a longer window would let a blocked sender wait too long. |
| FW-02 (20 / 60 s production; 60 / 60 s staging) | A browser emits one report per violated directive per resource. A clean production site should emit approximately none; during the staging Report-Only run a systemic violation can produce several reports per page view, so staging needs more headroom to collect the data (OD-03). 429 on a report endpoint costs nothing: the browser does not retry meaningfully and the violations repeat. | 60 s is the common, safest window. |
| FW-03 (10 / 60 s) | Admins open previews by hand, rarely. Each hit triggers a server-to-server call to Railway (amplification), so cap it tightly. 10/min allows a team behind one office IP to click through several previews in a minute. | 60 s. |
| FW-05 (60 / 60 s) | A coarse flood guard for credential endpoints, deliberately above the backend's 10/min per IP for login and register (contract 2.10) so the backend's precise `RATE_LIMITED` response is what users normally see. See the venue note below. | 60 s. |
| FW-06 (10 / 10 min) | Reset-email and contact submission are the most abusable (email cost, spam); backend allows 10 per hour and 3 per hour per IP respectively. This is a looser backstop. | A longer window fits "per hour" semantics; fallback of 3 per minute if only short windows exist. |
| FW-07 (120 / 60 s) | Refresh happens every 5 to 15 minutes per client plus once per tab load and across tabs (single-flight lock reduces it). 100 to 150 players at a venue produce roughly 10 to 30 per minute; 120 leaves margin. Backend allows 30/min per token family. | 60 s. |
| FW-08 (600 / 60 s) | Anonymous browser calls are mostly the 30-second availability poll (ARCH-001 9.6): 2 per minute per viewer. 150 viewers behind one IP is about 300 per minute. 600 doubles it. | 60 s. |

**Venue and NAT warning (important).** Every per-IP limit here must tolerate a whole venue sharing one public address. Record the real venue headcount in PRE-04 and scale FW-05, FW-07 and FW-08 up if needed (the contract's own 10/min per IP login limit at the backend, if left unchanged, would already throttle a venue where 40 players log in during check-in; the backend owner should be told, section 13.4). Prefer raising a limit to blocking a venue. A false positive that locks players out of check-in on event day is worse than a flood.

**Pre-defined tuning loop.** Record the observed peak per rule from the Firewall tab (13.2). After two live events or two weeks of staging, set each enforced limit to the larger of the proposal and 3 times the observed legitimate peak.

### 4.3 Burn-in procedure (log first, then enforce)

- [ ] **FW-18** Create FW-05, FW-07, FW-08, FW-12 and FW-16 in **Log** mode first; leave the rest in Enforce. (Log rules create no outage risk.)
- [ ] **FW-19** Run staging for at least one release cycle, including a mock "event day" burst (section 11, V-12) and the CSP Report-Only collection.
- [ ] **FW-20** Read the Firewall tab, write the observed peak and any false positive per rule into 13.2.
- [ ] **FW-21** Switch the Log rules to Enforce one at a time, 24 hours apart where possible, and re-run the matching `V-` check each time.
- [ ] **FW-22** Re-check thresholds after the first real event day (EVENT) and after any marketing push; record the date in 13.2.
- [ ] **FW-23** Publish rule changes only through the dashboard's review-and-publish step (VERIFY that the dashboard stages changes); take a note of the active configuration version before each change so it can be restored (section 12).

---

## 5. Other Firewall, WAF and header rules

| Id | Timing | Item |
|---|---|---|
| - [ ] **SEC-01** | NOW | **System-level DDoS mitigation.** Vercel documents an always-on platform layer. Nothing to configure. Record that you read the current description of what it covers and what it does not (VERIFY, 13.3). |
| - [ ] **SEC-02** | STAGING | **Bot protection / managed rulesets.** Review the managed rulesets offered for your plan (bot protection, AI-bot control, OWASP core rules). I believe the OWASP-style core ruleset may be an Enterprise feature (VERIFY). Rule of thumb: enable bot protection in **Log** first. **Do not set it to Challenge on `/api/*`**: a challenge cannot be solved by an XHR/fetch call or by the Railway dispatcher, and it would break `/api/revalidate` and the app's API calls. If it can only be set project-wide, keep it in Log and rely on FW-16 only if you later switch it on. |
| - [ ] **SEC-03** | NOW | **Single owner of response headers.** Keep every response header in `next.config.ts` and `proxy.ts` (ARCH-001 10.3, 18.3). Do **not** add CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Robots-Tag` or `Cache-Control` through the Vercel dashboard header features or `vercel.json` `headers`: a second source can produce two `Content-Security-Policy` headers, which breaks the one-header-per-route test (SEC-001 F-05, ARCH-001 10.5). |
| - [ ] **SEC-04** | STAGING | **Edge cache must not hold authenticated or nonce responses.** The backend marks authenticated responses `Cache-Control: no-store` and the client groups are dynamic shells (contract 2.12; SEC-001 F-12, F-18). Confirm with V-18 that no `/api/me/*` or `(app)` page response is served as a cache HIT (look at `x-vercel-cache`). |
| - [ ] **SEC-05** | STAGING | **Forwarded-IP trust for the rewrite.** The backend's own per-IP limits depend on a real client IP. Ask the backend owner to confirm which header it trusts (the Vercel-set forwarded address) and that a client-supplied `X-Forwarded-For` is overwritten, not appended-and-trusted (SEC-001 F-12(b); contract 2.10; ARCH-001 18.2 item 3). V-17 tests it. If the backend cannot see the real IP, the FW-05 to FW-08 edge limits are the **only** per-IP control for the API; say so in 13.2. |
| - [ ] **SEC-06** | NOW | **Railway origin is reachable directly** (F-12(a)). The Firewall cannot protect `*.up.railway.app` or the Railway custom domain. Accept and record it, or open a decision for a shared edge secret header plus backend check. Note the architecture excludes `/api` from `proxy.ts` (ARCH-001 10.3), so a proxy cannot add such a header today. Until decided, the backend must carry its own rate limits, auth and audit (SEC-001 F-12 fix), and `API_INTERNAL_URL` must not be published anywhere. |
| - [ ] **SEC-07** | NOW | **HSTS preload.** SEC-001 F-18 notes preload is undecided. Do not submit the domain to the preload list until the owner decides; it is hard to undo. No action in the Firewall. |
| - [ ] **SEC-08** | NOW | **Manual block procedure.** Know where to add an IP or CIDR block rule (and, if available, a country or ASN condition) for an abusive source, and that doing so is a quick rule publish. Do not pre-create country blocks: players travel and Razorpay/Google callbacks come from browsers. |
| - [ ] **SEC-09** | NOW | **Spend and usage guard.** Turn on whichever usage or spend notifications (and, if offered, a hard stop) your plan has, with thresholds you choose. I am deliberately not stating any figures or quotas. Rationale: a flood of function invocations, image optimisation requests or log volume is billed even if every response is cheap (VERIFY how denied/rate-limited requests are billed, 13.3). |

---

## 6. Deployment Protection

### 6.1 Why

Preview deployments are mock builds by design (ARCH-001 18.1): they expose the admin UI shells and the "Mock data" banner is the only guard (SEC-001 F-18). Unprotected previews are also indexable unless `noindex` is set, and are a path to the F-09 failure (mock build promoted to production). Deployment Protection puts authentication in front of non-production URLs.

The Vercel documentation describes several mechanisms: Vercel Authentication (team members), password protection, trusted IPs, a shareable-link flow, and a Protection Bypass for Automation (secret header or query parameter). Which of these exist on **Pro** versus **Enterprise**, and whether any add-on is needed, I have not confirmed (VERIFY, 13.3). Use what your plan offers and record it in 13.2.

### 6.2 Settings

| Id | Timing | Setting | Value / action |
|---|---|---|---|
| - [ ] **DP-01** | NOW | Protection scope | Protect **Preview** deployments. Target: only team members (Vercel Authentication) or password protection, whichever your plan offers. Production stays public. |
| - [ ] **DP-02** | NOW | Custom `staging` environment | Check whether protection settings can be applied per environment (VERIFY). If the custom environment `staging` is covered by "Preview" protection (likely, since custom environments are preview-like), keep it protected. The staging domain must not be public: it runs against a real Railway staging backend and a Supabase staging project, with Razorpay **test** keys (ARCH-001 18.1). |
| - [ ] **DP-03** | NOW | Production domain | Confirm the production custom domain is **not** protected, or the public site would be inaccessible. Also confirm every `*.vercel.app` alias for production behaves as you intend (VERIFY whether the project's production `vercel.app` alias is protected under your settings; either is acceptable, but record which). |
| - [ ] **DP-04** | NOW | Auto-generated deployment URLs | Each deployment has its own unique URL. Confirm they fall under the preview protection setting (VERIFY) so an old deployment URL does not stay public. |
| - [ ] **DP-05** | NOW | Disable "promote preview to production" | SEC-001 F-09 and ARCH-001 17.1: a mock-enabled preview must never be promotable to production, because the `VERCEL_ENV=production` build guard does not run on promotion. Turn off or restrict who can promote and restrict the production branch to the protected branch (VERIFY the dashboard control and the permission role that governs it). Production deployments must come only from a fresh build of the protected branch. Also confirm Vercel project settings do not auto-promote the latest preview. |
| - [ ] **DP-06** | NOW | Roles and 2FA | Limit Vercel team members to those who need access; require 2FA on the GitHub org and the Vercel team (ARCH-001 17.1, SEC-001 F-19, TASK-128). A Vercel team member can read production env values; keep the team small. |
| - [ ] **DP-07** | NOW | Do not share preview links publicly | A shareable link (if you use that feature) bypasses authentication for whoever has it. Treat it as a secret, time-limit it if possible, and never post it in a public channel. (VERIFY behaviour.) |
| - [ ] **DP-08** | STAGING | Previews return `noindex` | Independent of Deployment Protection: `X-Robots-Tag: noindex` on all paths when `VERCEL_ENV !== 'production'` (ARCH-001 18.1). Confirm with V-14. |

### 6.3 Exceptions needed for Railway, webhooks and Razorpay

I walked through every machine-to-machine flow in ARCH-001 and the backend contract against protected URLs.

| Flow | Hits protected URL? | Exception required? | Reason |
|---|---|---|---|
| Browsers using a **production** domain | No | None | Production is not protected |
| Razorpay webhook (`POST /webhooks/razorpay`) | **No.** Goes straight to Railway (ARCH-001 18, contract 5.1) | **None** | Vercel is not in the path. Never point Razorpay at the Vercel domain |
| Razorpay Checkout in the browser | No | None | `checkout.js` and the iframe load from Razorpay origins; Razorpay's callbacks go to the browser, not to the Vercel URL |
| Vercel function calling Railway (`/api/draft` to `/api/preview/exchange`, SSR/ISR fetches to the backend) | No | None | Outbound from Vercel; Railway is not protected by Vercel |
| Browser `/api/*` rewrite to Railway | Only on the user's own (protected) preview; carries the Vercel auth cookie | None | Same-origin to the site |
| **Railway production dispatcher to `https://{production domain}/api/revalidate`** | No (production is public) | None (the HMAC and Firewall rules authenticate) | |
| **Railway staging dispatcher to `https://{staging domain}/api/revalidate`** | **Yes** if the staging domain is protected (DP-02) | **Yes, needed** | A protected deployment answers machine requests with an authentication challenge before the app sees them, so the revalidation callout would never reach the handler. Use the **Protection Bypass for Automation** secret as a header sent only by the Railway **staging** dispatcher (see 6.4). |
| Preview deployments (mock builds) calling revalidate | `mockPublish` calls the handler in-process on the same deployment (ARCH-001 9.7) | None | No Railway involved on previews |
| Link unfurlers fetching a preview link (WhatsApp, Slack) | Yes (protected) | None; intended | They see the auth page, which also protects the single-use token (F-06). Draft-preview links are for the production/staging admin, who is already signed in |
| Uptime monitors, TASK-109 smoke, Playwright E2E, Lighthouse | Yes if aimed at staging/preview | Yes, via the bypass secret (6.4) | |
| Google OAuth redirect | Lands in the user's browser on the site | None | Redirect, not a server callback to Vercel (contract A10 redirects the browser) |

**Rule for `PREVIEW_SECRET` / staging draft flow.** A real staging admin opening `/api/draft?token=` is a signed-in team member in a browser, so Vercel Authentication passes naturally. If admins who are not Vercel team members must use staging previews, use password protection (if your plan offers it) rather than adding people to the Vercel team, and tell them the password out of band.

### 6.4 Protection bypass handling for automated tests

| Id | Timing | Item |
|---|---|---|
| - [ ] **DP-10** | STAGING | Generate a **Protection Bypass for Automation** secret (dashboard, Deployment Protection) (VERIFY exact name, whether one secret or several are allowed, plan needed). Store it as a CI secret (GitHub Actions environment secret scoped to the staging/preview workflow) and, for the Railway staging dispatcher, as a Railway **staging** service variable. Never in the repo, never in `NEXT_PUBLIC_*`, never in a client bundle. |
| - [ ] **DP-11** | STAGING | Pass it **as a request header** (`x-vercel-protection-bypass: <secret>`), never as a query parameter, so it does not land in logs, referrers or CSP reports (SEC-001 F-10 principle). If header injection is impossible for some tool, use the documented query form only for that tool and rotate afterwards (VERIFY both forms and any cookie-setting option, `x-vercel-set-bypass-cookie`). |
| - [ ] **DP-12** | STAGING | Playwright (TASK-009, 116, 119, 120): set it as an extra HTTP header on the browser context from an environment variable (for example `PW_VERCEL_BYPASS`) when the base URL is a preview or staging host. Skip when the base URL is `localhost`. The CI workflow must expose it only to jobs that need it (TASK-128: no production secrets in PR workflows; this secret is not production-scoped, but treat it as sensitive). |
| - [ ] **DP-13** | STAGING | Railway staging dispatcher (PRE-03(a)): the revalidation sender adds that same header to its outbound `POST /api/revalidate`. The HMAC headers are unchanged. The header must **not** be part of the signed material. The handler ignores it. |
| - [ ] **DP-14** | STAGING | Does the bypass also skip Firewall rules and rate limits? Firewall rules still evaluate in my understanding, but whether the bypass also skips system mitigations is a VERIFY item. After enabling the bypass, re-run V-04 and V-05 with and without it to see that FW-01 and FW-15 still apply to staging. |
| - [ ] **DP-15** | EVENT | **Rotate** the bypass secret on a schedule (suggested 90 days, PROPOSAL), on any team member departure, and immediately if it appears in a log or chat. Update CI and Railway staging in the same change; there is a short window where one side has the old value (see 7.3). |
| - [ ] **DP-16** | GATE | Never enable the bypass on a deployment that can serve production traffic. Confirm the production domain has no protection whose bypass would be meaningful (it has none; DP-03). |

### 6.5 What Deployment Protection does not do

- It does not protect `*.up.railway.app` or the Railway domain (SEC-06).
- It does not replace the app's own auth, the HMAC, or the noindex headers.
- It is not a rate limit; the Firewall is separate. Whether protected deployments still bill invocations for rejected unauthenticated requests I have not confirmed (VERIFY).

---

## 7. Environments and secrets

### 7.1 Matrix

Sources: ARCH-001 17.2 and 18.1; contract 3.10 and 5.6. Variable names marked `(TASK-007)` are defined by the scaffold and may change.

| Item | Production | Staging (custom environment) | Preview (per PR) | Local |
|---|---|---|---|---|
| Domain | Custom domain, public | Stable staging domain, **protected** (DP-02) | Per-deployment URL, **protected** (DP-01), `noindex` | localhost |
| Backend | Railway production + Supabase production | Railway staging + Supabase **staging** project | None (mocks) | Mock or remote via `API_INTERNAL_URL` |
| `NEXT_PUBLIC_USE_MOCKS` | `false`; build **fails** if true (F-09) | `false` | `true` only with the explicit opt-in variable (PRE-05) | `true` |
| `NEXT_PUBLIC_SITE_URL` | Production origin | Staging origin | Preview origin or left to default | `http://localhost:3000` |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | `/api` | `/api` | `/api` |
| `API_INTERNAL_URL` | Railway production API | Railway staging API | **Unset** (no backend). Must never point at production | optional |
| `REVALIDATE_SECRET` | Production-only value | **Different** staging value | **Different**, or unset on preview (F-07: distinct per environment, preview too) | `.env.local` |
| `REVALIDATE_SECRET_PREVIOUS` | Only during a rotation | Only during a rotation | Same | n/a |
| `PREVIEW_SECRET` | Production-only value, also on Railway production | **Different** value, also on Railway staging | **Unset** (`/api/draft` returns 404 in mock builds, ARCH-001 8.4) | n/a |
| Mock-only signing secret (`mockPublish`, F-09) | **Must not exist** | **Must not exist** | Own mock-only secret | `.env.local` |
| Protection bypass secret | Not applicable | CI secret and Railway **staging** variable | CI secret | n/a |
| CSP mode | Enforcing | Report-Only first, then Enforcing (10.5) | Report-Only | Report-Only |
| Razorpay | Live keys on Railway only | Test keys on Railway only | None | None |
| Supabase anon/service keys | **None** in any frontend env (ARCH-001 17.2; TASK-117) | None | None | None |

### 7.2 Checklist

| Id | Timing | Item |
|---|---|---|
| - [ ] **SEC-10** | NOW | Set each Vercel environment variable **scoped to the exact environments in 7.1** (Production, the custom `staging` environment, Preview, Development). In particular `REVALIDATE_SECRET`, `PREVIEW_SECRET` and `API_INTERNAL_URL` must not be ticked for Preview. |
| - [ ] **SEC-11** | NOW | Mark secrets as **Sensitive** (write-only) where the plan allows (VERIFY availability and effect), so they cannot be read back in the dashboard or via the CLI after saving. |
| - [ ] **SEC-12** | NOW | Generate every secret as at least **32 random bytes** from a CSPRNG (for example `openssl rand -hex 32`), different per environment (ARCH-001 17.2, SEC-001 F-07). Do not reuse the production value anywhere else, including on the owner's machine. |
| - [ ] **SEC-13** | NOW | Mirror: each secret exists in **two** places only, Vercel and the matching Railway environment. Keep a record of where, never the value, in 13.2. |
| - [ ] **SEC-14** | STAGING | Confirm no `NEXT_PUBLIC_*` variable holds a secret (the build guard `guard-env.ts` also checks; ARCH-001 17.1, AC-100). |
| - [ ] **SEC-15** | NOW | Confirm no production secret is available to pull-request workflows or forks (TASK-128; GitHub environment secrets, "require approval for outside contributors"). |
| - [ ] **SEC-16** | GATE | After first production deploy confirm there is no `VERCEL_ENV`-based mock path reachable: TASK-109 sentinel smoke (no mock banner, no handoff routes). Not a Firewall control, but the F-09 backstop for DP-05. |

### 7.3 `REVALIDATE_SECRET` rotation window

Design (ARCH-001 9.2 and 17.2): the verifier tries the current secret and, when present, `REVALIDATE_SECRET_PREVIOUS`, in constant time. The backend signs with one secret only. The window is therefore the time between "web accepts both" and "backend switches". Zero-downtime order:

1. - [ ] **RT-01** Generate the new secret `N` (32+ random bytes).
2. - [ ] **RT-02** In Vercel (target environment only) set `REVALIDATE_SECRET_PREVIOUS = O` (current value) and `REVALIDATE_SECRET = N`. **Redeploy** so the running functions pick up both values (environment variable changes apply to new deployments, not live ones; VERIFY). Until this deployment is live, the web side accepts only `O`.
3. - [ ] **RT-03** Wait until the new deployment is serving all traffic. Confirm with a test call signed with `N` and one signed with `O`; both must return 202 (V-06).
4. - [ ] **RT-04** In Railway (same environment) change the signing secret to `N` and restart the dispatcher. Calls in flight at that moment may be signed with `O`; they are still accepted.
5. - [ ] **RT-05** Observe at least one full publish cycle succeeding and the outbox with no exhausted attempts (alert LOG-A3).
6. - [ ] **RT-06** After at least one **hour (PROPOSAL)** and no `O`-signed traffic, remove `REVALIDATE_SECRET_PREVIOUS` in Vercel and **redeploy**. A call signed with `O` must now be rejected 401 (V-06).
7. Never leave `REVALIDATE_SECRET_PREVIOUS` set indefinitely. Maximum window **24 hours (PROPOSAL)** unless a rotation is in progress.

Rotation triggers: every 180 days (**PROPOSAL**), on departure of anyone who could read it, on any suspected exposure (log, chat, screenshot), or if V-06 or a log shows a forged but well-formed signature. For suspected exposure: skip the grace period, set `REVALIDATE_SECRET = N`, leave `REVALIDATE_SECRET_PREVIOUS` unset, redeploy and switch Railway at once; accept up to a few minutes of failed callouts (the outbox retries, and the 15-minute safety net heals; ARCH-001 9.5).

**Dependency to flag:** the replay window is 300 s and event ids are per instance, so rotation does not require flushing any state.

### 7.4 `PREVIEW_SECRET` rotation

`PREVIEW_SECRET` authenticates the web function to Railway (`Authorization: Bearer <PREVIEW_SECRET>` on `POST /api/preview/exchange`, contract 3.10). It is a two-party secret with **no** two-secret window in the current design, so rotation causes a short period where previews fail.

- [ ] **RT-10** Rotate during a quiet period (no admin using previews). Change Railway first or Vercel first, whichever is faster for you, then redeploy Vercel; any in-flight preview token (valid 5 minutes) will fail with 401 and the admin re-clicks "Open public preview". Rotation cadence: every 180 days or on exposure (PROPOSAL).
- [ ] **RT-11** Ask the backend owner whether Railway can accept two values during rotation (same idea as `REVALIDATE_SECRET_PREVIOUS`). This is a small enhancement and is not required.

---

## 8. Attack Challenge Mode

Vercel documents a project-level "Attack Challenge Mode" that presents a challenge to visitors for a period. It is the emergency lever; it is not a standing control. Details, plan availability and exemptions are VERIFY items.

| Id | Timing | Item |
|---|---|---|
| - [ ] **ACM-01** | NOW | Know where it is (dashboard, Firewall) and who on the team may switch it on. Do not enable it pre-emptively. |
| - [ ] **ACM-02** | NOW | **What it will break.** Challenges are solved by a browser rendering a page. They cannot be solved by: (a) `fetch`/XHR calls from the app to `/api/*` (the SPA shell would load but every API call would get a challenge response, appearing as `BAD_RESPONSE` or HTTP errors in the client); (b) the Railway dispatcher calling `/api/revalidate` (no browser); (c) the Playwright/CI bypass flow unless exemptions apply; (d) search-engine crawlers and link previews (assume the vendor excludes verified crawlers; VERIFY); (e) Razorpay's browser flow is unaffected, but the player's session with your API is. |
| - [ ] **ACM-03** | NOW | **Exemption plan for the dispatcher.** Before ever enabling ACM in production, make sure the revalidation callouts still arrive. Options, strongest first: (1) the vendor's documented exemption for specific paths or IPs (VERIFY; I believe the system-level challenge may be skipped for requests matched by a Bypass-type custom rule, or by IP allow-listing, but this is unconfirmed); (2) if PRE-03(b) is yes, a Bypass rule FW-16 with the Railway static egress IP; (3) if neither exists, accept that revalidation pauses during ACM: the 15-minute safety net keeps public pages correct to within 15 minutes (ARCH-001 9.5) and the outbox retries up to 5 times before alerting. Record the option you chose in 13.2. |
| - [ ] **ACM-04** | NOW | **Order of response to an attack:** (1) look at the Firewall traffic view to see which path and source; (2) add a targeted rule (IP, ASN, path rate limit; SEC-08); (3) only if the target is the site generally and rule-by-rule is not keeping up, enable ACM, announce it internally, and watch the backend's 429/5xx rate; (4) disable ACM as soon as the traffic returns to baseline. |
| - [ ] **ACM-05** | EVENT | **Do not enable ACM during a live event** unless the site would otherwise be down. Checked-in players on venue Wi-Fi use the Event Room (ARCH-001 6, contract M05); a challenge interrupts their polling and result submission. Prefer a precise block rule or raising limits for that event. |
| - [ ] **ACM-06** | EVENT | Challenge duration after enabling (VERIFY the default expiry and whether it auto-reverts). Put the actual expiry in your runbook note so nobody forgets to turn it off. |
| - [ ] **ACM-07** | GATE | Rehearse once on **staging** (not production): enable, confirm what breaks per ACM-02 using V-15, confirm the staging dispatcher exemption works (ACM-03), disable. Record the result. |

---

## 9. Region pinning check (sin1)

Topology (ARCH-001 section 18, owner-confirmed): Vercel functions in `sin1`, Railway Singapore, Supabase Singapore. `preferredRegion` route config is deprecated and must not be used; pin through the project setting or `vercel.json` `regions: ["sin1"]`.

| Id | Timing | Item |
|---|---|---|
| - [ ] **REG-01** | NOW | In project settings, find the function region setting and confirm it lists exactly `sin1` (Singapore). If `vercel.json` also sets `regions`, confirm they agree and know which one wins (VERIFY). Record both in 13.2. |
| - [ ] **REG-02** | STAGING | After a deploy, confirm the build/deployment output shows functions in `sin1` (`vercel inspect <deployment-url>` or the deployment page; VERIFY that the output lists function regions). TASK-105 acceptance already requires "Vercel functions run in `sin1`". |
| - [ ] **REG-03** | STAGING | Confirm from a live response: the `x-vercel-id` response header ends with the region that executed the function (documented format is `<edge region>::<function region>::<id>`; VERIFY). Run V-19. For ISR/static responses the second segment may be absent or differ; test a dynamic path such as the revalidate handler, which is never cached. |
| - [ ] **REG-04** | STAGING | Confirm Railway services (API, worker, scheduler) are in the Singapore region and `API_INTERNAL_URL` uses the Railway domain for that region, not a global alias. |
| - [ ] **REG-05** | STAGING | Latency sanity: from a shell on the owner's connection, record time to first byte for (a) a cached public page, (b) a rewrite call such as `GET /api/events` through the site, (c) the same call direct to Railway. The extra hop through the rewrite should be a small difference, not hundreds of milliseconds. Record in 13.2; if large, the region pin or `API_INTERNAL_URL` is wrong. (No numeric target is set here; ARCH-001 RISK-008 only requires confirming limits.) |
| - [ ] **REG-06** | STAGING | Do not enable multiple function regions or edge-runtime for `/api/revalidate` or `/api/draft`: the handlers use Node.js crypto (ARCH-001 9.1) and in-process state. |
| - [ ] **REG-07** | GATE | Confirm Firewall rules are not region-scoped in a way that exempts traffic (conditions on country/continent are not used in section 4). |
| - [ ] **REG-08** | NOW | Confirm no `maxDuration`/memory override is set that is needed by the rewrite: rewrites to Railway are subject to Vercel's request body and timeout limits (ARCH-001 12.7, RISK-008). Record the limits you read in the current Vercel docs in 13.2 (VERIFY); do not assume them. |

---

## 10. Logging and alerting expectations

### 10.1 What should be visible

Vercel-side (what the owner can see without code changes; all details of retention, search, export and drains are plan dependent, VERIFY):

| Source | Expect to find | Used for |
|---|---|---|
| Firewall tab / traffic view | Per rule: matched, logged, denied, rate limited; top paths and top IPs | Tuning (section 4.3), attack triage (ACM-04) |
| Runtime logs | Function invocations for the four route handlers with status codes, and for ISR regeneration | LOG alerts, V-checks |
| Deployment logs | `prebuild` guard results (`guard-env`, mock guard, `check:build-output`) | F-09 |
| Usage and spend pages | Function invocations, bandwidth, image optimisation | SEC-09 |

Application-side (already specified, nothing for the owner to configure): the revalidation handler logs the request id, event id, type/action and outcome code only, never the signature, secret or body (ARCH-001 9.1, 19.4); `/api/csp-report` logs the violated directive and blocked-URI origin only, never query strings or `script-sample` (F-11); no tokens, emails, phone numbers or payment ids anywhere (19.4). Neither the Firewall rules nor any dashboard setting should add request-header logging: the `x-vercel-protection-bypass` header and the `Authorization` header must never be logged.

### 10.2 Alerts

Thresholds are **PROPOSALS**. Alert delivery options depend on plan and tooling (VERIFY: Vercel notification/alert features, log drains, integration with email or chat). If no automatic alert is available for an item, the fallback is a calendar reminder to look at the named screen **weekly** and **after every event**.

| Id | Timing | Alert | Condition (PROPOSAL) | Where | Response |
|---|---|---|---|---|---|
| - [ ] **LOG-A1** | GATE | Revalidation sender rate limited | Any rate-limit hit on FW-01 in production | Firewall tab | The legitimate dispatcher is bursting or a flood is occurring. Check the Railway outbox; raise FW-01 only if the burst is legitimate. |
| - [ ] **LOG-A2** | GATE | Revalidation auth failures | More than 5 responses of 401 from `/api/revalidate` in 10 minutes in production | Runtime logs | After a rotation: secret mismatch (7.3). Otherwise a forged-call probe: check source IP and consider SEC-08. |
| - [ ] **LOG-A3** | GATE | Outbox delivery exhausted | Backend reports attempts exhausted for any outbox row (contract 5.6, 6.7) | Railway alerting (backend owner) | Public pages heal within the 15-minute safety net; investigate FW-01, secret, Vercel availability. |
| - [ ] **LOG-A4** | GATE | Handler 5xx | Any 5xx from `/api/revalidate` or `/api/draft` in production | Runtime logs | Application defect; a 5xx on revalidate is also an oracle (ARCH-001 9.1 says uninformative responses). |
| - [ ] **LOG-A5** | GATE | CSP report spike | More than 3x the staging baseline for 15 minutes in production, or any report at all in the first week after enforcing | Runtime logs / Firewall (FW-02) | Possible injected script, third-party breakage, or a bad deploy. |
| - [ ] **LOG-A6** | GATE | Backend 429 rate | Contract 6.7 metric `429 rate` rising on login or refresh | Railway | Credential stuffing or a venue sharing one IP; compare with the Firewall view (V-13). |
| - [ ] **LOG-A7** | GATE | Usage / spend | Notifications at thresholds you choose (SEC-09) | Vercel billing/usage | Flood or runaway loop. |
| - [ ] **LOG-A8** | EVENT | Event-day watch | During a live event, someone has the Firewall traffic view and the backend 429/5xx dashboard open; if players are being limited, raise the rule rather than telling players to retry | Firewall tab, Railway | Section 4.2 venue warning. |
| - [ ] **LOG-A9** | STAGING | Alert test | Cause one of LOG-A1 to A5 deliberately on staging (V-05 does LOG-A1) and confirm the alert arrives; if no automatic alert exists, record "manual only" in 13.2 | staging | Proves the path from event to human. |

### 10.3 Retention and PII

- [ ] **LOG-01** NOW. Read the current log retention and export options for your plan and record them in 13.2 (VERIFY). If retention is shorter than the time needed to investigate an incident, decide whether to add a log drain; if you do, the destination becomes a PII and secrets concern and needs a note to the architect first (ARCH-001 19.2 says any provider needs a security review).
- [ ] **LOG-02** STAGING. Search staging runtime logs after V-06 and V-08 for the test secret, a signature value, the bypass secret and the string `script-sample`. None may appear.

---

## 11. Verification

Run these on **staging** first (with the bypass header), then the production-relevant ones against production. Items that need the handlers cannot run until TASK-007, TASK-111, TASK-114 and the CSP route exist.

**Safety.** Rate-limit tests lock your own IP out of that path for roughly the window length. Run them from your own machine, not from a shared office or venue. Wait for the window to pass before the next test. Never run floods against production except V-03 (which sends one request) and, if you want, V-05 after the burn-in at a quiet time with a very low request count (use the first 3 requests of the loop only and trust the staging result). Use a non-existent email address for credential tests.

**Setup (bash; Git Bash on Windows is fine).**

```bash
# Replace the values. Never paste secrets into a shared terminal or a file.
export BASE='https://<staging-domain>'            # or the production domain
export BYPASS='<protection bypass secret>'        # staging/preview only; see DP-10
read -rs REVALIDATE_SECRET; export REVALIDATE_SECRET   # silent prompt; the value is not echoed

# Signs and sends a revalidate call. Args: <body-json> [timestamp] [event-id] [secret]
reval() {
  local body="$1" ts="${2:-$(date +%s)}" eid="${3:-$(node -e 'console.log(require("crypto").randomUUID())')}" sec="${4:-$REVALIDATE_SECRET}"
  local sig="v1=$(printf '%s.%s.%s' "$ts" "$eid" "$body" | openssl dgst -sha256 -hmac "$sec" -hex | sed 's/^.* //')"
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/revalidate" \
    -H "x-vercel-protection-bypass: $BYPASS" \
    -H 'Content-Type: application/json' \
    -H "X-PG-Timestamp: $ts" -H "X-PG-Event-Id: $eid" -H "X-PG-Signature: $sig" \
    --data-binary "$body"
}
BODY='{"type":"site","action":"updated","id":"home","occurredAt":"2026-10-22T10:00:00+05:30","version":1}'
```

Notes: for production leave out the `x-vercel-protection-bypass` line. The signature scheme is `v1=` + lowercase hex of `HMAC-SHA256(secret, timestamp + "." + eventId + "." + rawBody)` (ARCH-001 9.1). The `site`/`home` body is valid per section 9.1 (`id` is a section key; `slug` not required) and only expires the `site:home` tag, which is harmless. This helper assumes the secret is used as a UTF-8 string key; if TASK-114 decodes it differently (for example hex), adjust the helper and tell the architect so the contract is clarified.

**Reading the results.** "Edge" means the Vercel Firewall answered; "app" means the route handler answered. Edge responses for rate limiting and deny rules are not the app's JSON; they typically differ in body and carry a mitigation header (`x-vercel-mitigated`; VERIFY the header name and values). Record the actual body and headers once in 13.2 for the next person.

| Id | Proves | Command / action | Expected |
|---|---|---|---|
| - [ ] **V-01** | DP-01, DP-02: previews and staging are protected | `curl -s -o /dev/null -w '%{http_code}\n' "$BASE/"` with no header (staging or a preview URL) | **401** or a redirect to Vercel sign-in (VERIFY exact code), never 200 with the site HTML |
| - [ ] **V-02** | DP-10, DP-11: automation bypass works | Same URL with `-H "x-vercel-protection-bypass: $BYPASS"`; then again with a wrong secret | **200** with the correct secret; **401** (or sign-in redirect) with a wrong one |
| - [ ] **V-03** | DP-03: production is public | `curl -sI https://<production-domain>/` | **200**, `x-robots-tag` absent (production is indexable), exactly one `content-security-policy` header |
| - [ ] **V-04** | FW-10, FW-15, F-07 uniformity | (a) `curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/revalidate" -H "x-vercel-protection-bypass: $BYPASS"` (no PG headers). (b) `curl ... -X GET "$BASE/api/revalidate"` with the bypass header. (c) Valid-looking headers, wrong signature: `curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/revalidate" -H "x-vercel-protection-bypass: $BYPASS" -H 'Content-Type: application/json' -H "X-PG-Timestamp: $(date +%s)" -H 'X-PG-Event-Id: 11111111-1111-4111-8111-111111111111' -H "X-PG-Signature: v1=$(printf '0%.0s' $(seq 64))" --data '{}'` | (a) **403** from the edge (FW-15). (b) **403** from the edge (FW-10). (c) **401** with body `{"ok":false}` from the app, no detail |
| - [ ] **V-05** | FW-01: revalidate rate limit | `export BASE BYPASS; seq 1 150 \| xargs -P 10 -I{} sh -c 'curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/revalidate" -H "x-vercel-protection-bypass: $BYPASS" -H "Content-Type: application/json" -H "X-PG-Timestamp: $(date +%s)" -H "X-PG-Event-Id: 11111111-1111-4111-8111-111111111111" -H "X-PG-Signature: v1=$(printf "0%.0s" $(seq 64))" --data "{}"' \| sort \| uniq -c` | A mix of **401** (app) and **429** (edge). The number of 401s should be about the limit (about 120) and the remaining requests **429**; exact counts vary with the limiter's windowing (VERIFY). Then wait over a minute and repeat V-04(c): back to **401** |
| - [ ] **V-06** | F-07 signature, replay, window, rotation | Run `reval "$BODY"` expecting 202. Replay: `E=$(node -e 'console.log(require("crypto").randomUUID())'); reval "$BODY" "" "$E"; reval "$BODY" "" "$E"`. Stale: `reval "$BODY" $(( $(date +%s) - 400 ))`. Future: `reval "$BODY" $(( $(date +%s) + 120 ))`. Wrong secret: `reval "$BODY" "" "" 'wrong-secret'`. Rotation (RT-03 and RT-06): sign with the new, then the old secret | Valid: **202** `{"ok":true}`. Replay of the same event id: **202** both times (idempotent success, may hit a different instance; either way 202). Stale (>300 s old): **401**. More than 60 s ahead: **401**. Wrong secret: **401**. During rotation both secrets give **202**; after RT-06 the old secret gives **401** |
| - [ ] **V-07** | F-07 body cap | `head -c 20000 /dev/zero \| tr '\0' 'a' > /tmp/big.json; curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/revalidate" -H "x-vercel-protection-bypass: $BYPASS" -H 'Content-Type: application/json' -H "X-PG-Timestamp: $(date +%s)" -H 'X-PG-Event-Id: 11111111-1111-4111-8111-111111111111' -H "X-PG-Signature: v1=$(printf '0%.0s' $(seq 64))" --data-binary @/tmp/big.json` | **413** (spec says 413 beyond 16 KB; ARCH-001 9.1). Record the actual code and whether the platform or the app answered; a 401 here means the app authenticates before checking size, which is also acceptable if no body is buffered; report to the architect which it is |
| - [ ] **V-08** | FW-14, F-11 csp-report | (a) `curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/csp-report" -H "x-vercel-protection-bypass: $BYPASS" -H 'Content-Type: application/csp-report' --data '{"csp-report":{"document-uri":"https://example.invalid/x?token=SECRET","violated-directive":"script-src","blocked-uri":"https://evil.invalid/a.js?x=1"}}'`. (b) same with `-H 'Content-Type: application/json'`. (c) same as (a) with a 9 KB body (`head -c 9000 /dev/zero \| tr '\0' 'a'` inside the JSON string). (d) `-X GET` | (a) **204**. (b) **403** (FW-14). (c) **204** per F-11 ("always 204"; the body is dropped), though a 413 would also be defensible; record which, see 13.4. (d) **403** (FW-10) |
| - [ ] **V-09** | FW-02: csp-report rate limit | `seq 1 30 \| xargs -P 5 -I{} sh -c 'curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/csp-report" -H "x-vercel-protection-bypass: $BYPASS" -H "Content-Type: application/csp-report" --data "{\"csp-report\":{\"violated-directive\":\"img-src\"}}"' \| sort \| uniq -c` (production proposal 20/min; staging 60/min: send 70 on staging) | **204** up to the limit, then **429** from the edge. Then LOG-02: the runtime logs hold directive names only, no query strings |
| - [ ] **V-10** | FW-03, FW-04, F-06 | (a) `curl -s -o /dev/null -w '%{http_code}\n' -A 'WhatsApp/2.23' "$BASE/api/draft?token=abc" -H "x-vercel-protection-bypass: $BYPASS"`. (b) same with `-A 'Mozilla/5.0'`. (c) twelve quick requests as in (b). (d) on a preview/mock build | (a) **403** from the edge (FW-04). (b) **401**, no detail, never 500 (ARCH-001 8.4). (c) after about 10 requests, **429**. (d) **404** in a mock build (`/api/draft` is inactive when mocks are on) |
| - [ ] **V-11** | FW-10, F-06 exit | (a) `curl -s -o /dev/null -w '%{http_code}\n' -X GET "$BASE/api/draft/exit" -H "x-vercel-protection-bypass: $BYPASS"`. (b) `-X POST` with no `Origin`. (c) `-X POST -H 'Origin: https://evil.invalid'`. (d) `-X POST -H "Origin: $BASE"` | (a) **403** (FW-10). (b), (c) a non-2xx refusal from the app (spec says Origin check; the exact code is not fixed; record it). (d) success (2xx or redirect) |
| - [ ] **V-12** | Section 4.2: no false positives on an event-day pattern | Simulate 150 viewers behind one IP for one minute: `seq 1 300 \| xargs -P 20 -I{} sh -c 'curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/events/does-not-matter/availability" -H "x-vercel-protection-bypass: $BYPASS"' \| sort \| uniq -c` (use any harmless public GET that exists on staging). Also load the home page and one event page 50 times | **No 429** at 300 requests per minute (FW-08 is 600 per minute) and none on the pages. If any appear, raise the limit before enforcing, per section 4.2 |
| - [ ] **V-13** | Backend limits fire before edge limits (section 2) | On staging, `seq 1 30 \| xargs -P 1 -I{} sh -c 'curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/auth/login" -H "x-vercel-protection-bypass: $BYPASS" -H "Content-Type: application/json" --data "{\"email\":\"nobody-test@example.invalid\",\"password\":\"x\"}"' \| sort \| uniq -c` | A run of **401** (neutral `INVALID_CREDENTIALS` envelope) then **429** from the **backend** with the JSON envelope, `RATE_LIMITED` and a `Retry-After` header, at roughly the contract limit (10/min per IP, 5/min per email, contract 2.10). Fetch one 429 with `-i`: if it has the envelope, the backend answered; if it is not the envelope, FW-05 fired too early and must be loosened. Also confirm the backend sees the real IP (V-17) |
| - [ ] **V-14** | DP-08, ARCH-001 18.1 noindex | `curl -sI "$BASE/" -H "x-vercel-protection-bypass: $BYPASS" \| grep -i x-robots-tag` on staging and on a preview URL; also a `/admin` and `/login` path | `x-robots-tag: noindex` on every response on staging/preview; also on client groups in production (ARCH-001 8.3, 17.4). Also `curl -s "$BASE/robots.txt"` shows `Disallow: /api/` |
| - [ ] **V-15** | ACM-02, ACM-03, ACM-07 | On **staging only**: enable Attack Challenge Mode, then (a) request `$BASE/` with the bypass header, (b) call `reval "$BODY"` as the dispatcher would (also test the real Railway staging dispatcher by publishing in staging admin), (c) load the site in a browser and open DevTools network, (d) disable the mode | Record what happens for each. The expected pass condition is: (b) still returns 202 (via the exemption you chose in ACM-03) or you have written down that revalidation pauses and recovers within 15 minutes. (c) shows the browser challenge, confirming ACM-02(a) |
| - [ ] **V-16** | FW-11, FW-12, FW-13 | `for p in /api/preview/exchange /api/webhooks/razorpay /api/health /api/docs; do printf '%s ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE$p" -H "x-vercel-protection-bypass: $BYPASS"; done`; then `curl --path-as-is -s -o /dev/null -w '%{http_code}\n' -H "x-vercel-protection-bypass: $BYPASS" "$BASE/api/events/..%2f..%2fhealth"`; `curl --path-as-is -s -o /dev/null -w '%{http_code}\n' -X POST -H "x-vercel-protection-bypass: $BYPASS" "$BASE/api/revalidate/"`; `... "$BASE/api/Revalidate"` | All **403** from the edge. If the trailing-slash `/api/revalidate/` variant is not blocked, confirm it is not served by the handler (TASK-013 test) and not forwarded to Railway as a different route (expected **404** from the backend, never 202) |
| - [ ] **V-17** | SEC-05, F-12(b) | `curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/<any endpoint that echoes the caller IP in staging, e.g. a debug-only echo the backend owner enables for this test>" -H 'X-Forwarded-For: 203.0.113.77' -H "x-vercel-protection-bypass: $BYPASS"`. Alternatively ask the backend owner to log the IP they derive for this request and tell you | The IP the backend derives is **your** public IP, not `203.0.113.77`. If it is the spoofed value, or a Vercel address, the backend's per-IP limits are wrong; stop and tell the backend owner |
| - [ ] **V-18** | SEC-04, F-18 | `curl -sI "$BASE/api/auth/me" -H "Authorization: Bearer invalid" -H "x-vercel-protection-bypass: $BYPASS"` and `curl -sI "$BASE/app" -H "x-vercel-protection-bypass: $BYPASS"` twice each | `cache-control` contains `no-store` (or private), and `x-vercel-cache` is not `HIT` on either request; the second `/app` response has a **different** CSP nonce from the first |
| - [ ] **V-19** | REG-01 to REG-03 | `curl -sI -X POST "$BASE/api/revalidate" -H "x-vercel-protection-bypass: $BYPASS" \| grep -i x-vercel-id`; `vercel inspect "$BASE"` | The `x-vercel-id` value indicates the function ran in `sin1` (VERIFY the format); `inspect` shows the Singapore region |
| - [ ] **V-20** | DP-05, F-09 | In the dashboard open a preview deployment and look for any "Promote to Production" action; try as a non-owner role if you have one | Not available (or restricted to the role you decided). Also confirm a production deployment's build log shows the mock-build guard ran |
| - [ ] **V-21** | SEC-10, F-07 (preview has no secret) | `vercel env ls` (CLI, logged in as the team) or the dashboard environment-variable list | `REVALIDATE_SECRET`, `PREVIEW_SECRET`, `API_INTERNAL_URL` appear for Production and for the custom `staging` environment only, not for Preview; a signed call to a preview URL returns **401** (missing secret; ARCH-001 9.1) |
| - [ ] **V-22** | Razorpay path (6.3) | In the Razorpay dashboard note the webhook URL; run `curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<production-domain>/api/webhooks/razorpay` | The dashboard URL is the Railway host; the site returns **403** (FW-11) for the webhook path |
| - [ ] **V-23** | LOG-A9 | Cause one alert on staging, wait the expected delivery time | Alert arrives, or "manual only" recorded |

Production re-run (GATE) after the burn-in: V-03, V-04 (a, b, c), V-06 (valid only, one request), V-08(a, b), V-10(a, b), V-14, V-16, V-18, V-19, V-22.

---

## 12. Rollback

Principle: a Firewall or protection change is a live production control. If a rule blocks legitimate traffic, **disable that one rule first** (not everything), then fix the threshold. Never leave the site unprotected longer than needed, and never relax Deployment Protection on the staging environment to "get a test working".

| Id | Timing | Item |
|---|---|---|
| - [ ] **RB-01** | NOW | Keep section 4.1 and 13.2 up to date: they are the written source of truth for rule names, conditions and limits. After any dashboard change, update this document or 13.2 in the same sitting. Take a screenshot of the Firewall rule list before every change. |
| - [ ] **RB-02** | NOW | Find out how rule versions are managed on your plan: whether the dashboard keeps a history with restore, whether rules can be disabled without deleting, and how long a change takes to take effect (VERIFY; I believe changes take effect within seconds but have not confirmed). Write the answers in 13.2. |
| - [ ] **RB-03** | GATE | **False positive on a rate-limit rule (a real player is limited):** raise that rule's limit (or switch it to Log) and retest; do not delete the rule. The player sees the generic response, not the app's `RATE_LIMITED` copy; tell them to wait a minute. Record the cause for tuning (13.2). |
| - [ ] **RB-04** | GATE | **Revalidation is blocked** (FW-01, FW-15, FW-16 or ACM): switch FW-01 to Log or raise it; run V-06; if pages are stale, accept up to 15 minutes (ARCH-001 9.5), then trigger a missed publish by re-saving the entity in admin so the outbox sends a new event. As a last resort redeploy to refresh the ISR cache (TASK-108 runbook). |
| - [ ] **RB-05** | GATE | **A deny rule blocks a legitimate path** (FW-11, FW-12, FW-13): disable that rule, identify the path from the Firewall log, fix the rule condition, re-enable and rerun V-16. |
| - [ ] **RB-06** | EVENT | **Attack Challenge Mode left on or turned on by mistake:** disable it (ACM-01); confirm the dispatcher and a browser work (V-06, V-12). |
| - [ ] **RB-07** | NOW | **Deployment Protection locked out a tool or person:** use the bypass secret (DP-10). If the secret is lost, generate a new one, update CI and Railway staging, and delete the old one (DP-15). Do not turn protection off on `staging`; if a one-time exception is unavoidable, turn it off for the shortest time and re-enable it, then rotate the bypass secret. |
| - [ ] **RB-08** | NOW | **Secret rotation went wrong:** restore the old value as `REVALIDATE_SECRET` (and remove `REVALIDATE_SECRET_PREVIOUS`) on both Vercel and Railway, redeploy Vercel, rerun V-06. Because the outbox retries with the same event id, no content is lost. |
| - [ ] **RB-09** | NOW | **Vercel deployment rollback does not undo these settings.** "Instant rollback" to a previous deployment (ARCH-001 24) restores code, but Firewall rules, project-level protection settings and environment variables are separate (VERIFY: whether any of them roll back with a deployment). After a code rollback, re-check V-01, V-03 and V-06 and the Firewall rule list. |
| - [ ] **RB-10** | GATE | **Total exposure scenario:** if a secret leaks, rotate immediately per 7.3 (no grace period), enable temporary tighter rate limits through FW-01 (for example 30/min), search runtime logs for the abusive source, block it (SEC-08), and tell the backend owner. |

---

## 13. Summary for the owner

### 13.1 Counts

**127 checklist items** (every line with a checkbox), by prefix:

| Prefix | Count | Area |
|---|---|---|
| PRE | 6 | Prerequisites and questions |
| FW | 23 | Firewall rules (17 rule rows including one conditional and one negative item, plus 6 burn-in steps) |
| SEC | 16 | WAF, header, cache, IP trust, secrets scoping |
| DP | 15 | Deployment Protection and bypass |
| RT | 8 | Secret rotation (REVALIDATE_SECRET, PREVIEW_SECRET) |
| ACM | 7 | Attack Challenge Mode |
| REG | 8 | Region pinning |
| LOG | 11 | Logging and alerting |
| V | 23 | Verification checks |
| RB | 10 | Rollback |

Everything is performed by the owner (or the backend owner for PRE-03 and DP-13); nothing in this file can be done by an agent. The items that cannot run until code exists are the STAGING-tagged ones (route handlers from TASK-007, 111 and 114).

### 13.2 Record sheet (fill in as you go; do not write secret values)

| Field | Value |
|---|---|
| Vercel plan (PRE-01) | |
| Project, team, production domain, staging domain (PRE-02) | |
| Does `staging` share project-level Firewall and protection settings? | |
| Backend answers to PRE-03 (a) extra header, (b) static IP, (c) burst size, (d) Razorpay URL | |
| Venue headcount used (PRE-04) | |
| Preview mock opt-in variable and mock-only secret names (PRE-05) | |
| Rate-limit key options and longest window on this plan | |
| Rule list as published (copy name, condition, limit, mode, date) | |
| Observed peaks and false positives per rule (FW-20) | |
| ACM exemption option chosen (ACM-03) | |
| Alert delivery (automatic or manual) per LOG-A1 to A9 | |
| Log retention and drain decision (LOG-01) | |
| Region evidence (REG-01 to REG-05) | |
| Last rotation dates: REVALIDATE_SECRET (staging, prod), PREVIEW_SECRET, bypass secret | |
| Limits read from current Vercel docs: rewrite body size and timeout (REG-08) | |
| Verification date and result per V-item | |
| Owner sign-off for TASK-106 gate (name, date) | |

### 13.3 Things I could not confirm (VERIFY against current Vercel documentation)

I wrote this from the architecture documents and general knowledge of the Vercel Firewall and Deployment Protection. I did not have access to live Vercel documentation or an account. Please verify every item before relying on it.

1. Which Firewall features your plan includes: custom rules, rate limiting, the available **rate-limit keys** (IP, header, JA4, etc.), the **windows** and **limits** allowed, and the **number of custom rules**. Whether the rules in section 4.1 fit the plan.
2. Which **conditions and actions** exist (header present/absent, method, path prefix, case-insensitive, `contains`, Log, Deny, Challenge, Bypass, Rate limit), and their precedence when several rules match (FW-06 and FW-05 overlap on `password-reset`; FW-16 versus FW-01).
3. Whether rate-limit state is global and enforced before the function and the cache; how a request that is denied or rate limited is **billed**.
4. Whether the Firewall evaluates the raw or normalised path, and how trailing-slash or encoded variants (FW-12, FW-13, V-16) are treated.
5. Whether Firewall, Attack Challenge Mode and Deployment Protection settings are **project-wide or per environment**, and how the custom `staging` environment is treated by "preview" protection.
6. Deployment Protection options by plan (Vercel Authentication, password, trusted IPs, shareable links), the exact **Protection Bypass for Automation** mechanism (header name `x-vercel-protection-bypass`, optional cookie-setting header, query form, number of secrets), whether it also skips Firewall rules or ACM, and how unauthenticated machine requests to protected URLs are answered (401 versus redirect).
7. How **Attack Challenge Mode** exempts requests (path, IP, bypass rule), default duration, whether verified crawlers are excluded, and what API clients see during a challenge.
8. Whether the **promote-to-production** action can be disabled or restricted by role, and what governs auto-promotion (DP-05).
9. **Sensitive environment variable** behaviour and which plans offer it; environment variable scoping to a custom environment; that env changes need a redeploy (RT-02, RT-06).
10. Vercel's **alerting**, notification and **log drain** options and retention by plan (section 10); whether Firewall rule hits can alert.
11. Format and meaning of `x-vercel-id` (REG-03) and the `x-vercel-mitigated` header; what `vercel inspect` prints about function regions.
12. Whether a programmatic rate-limit check SDK exists, what it costs in plan terms and whether it is globally consistent (section 3, option 1).
13. Bot protection and managed rulesets: which plans, what Log versus Challenge does to `fetch` calls (SEC-02).
14. How quickly Firewall rule changes propagate, and whether the dashboard keeps rule history with restore (RB-02).
15. Limits applying to **rewrites** to an external origin (body size, timeout, header pass-through; ARCH-001 18.2 item 3 and REG-08).
16. Whether Railway offers a static egress IP on your plan (PRE-03(b)); whether the Railway dispatcher can add a custom header (PRE-03(a)).
17. Whether the Firewall, in your plan, runs ahead of a **Next.js `proxy.ts`** (it should, but confirm), so FW-12 sees a request before any app-level rewrite.

Pricing, quotas and per-plan numeric limits are intentionally absent from this document.

### 13.4 Follow-ups for other roles (not done here; this task edits only this file)

- **Plan / TASK-126 entry:** the task entry names the deliverable `ARCH-001-ops-checklist.md`; this file is `OPS-001-vercel-firewall-and-protection.md`. Align the plan wording, and give TASK-105 a dependency on this document.
- **Backend (contract 3.10 / 5.6, 2.10):** (1) allow the revalidation dispatcher to send one extra static header per environment (DP-13); (2) confirm which forwarded-IP header the backend trusts (SEC-05, V-17) and keep a test; (3) review the per-IP login/register limit of 10/min against a venue of tens of players sharing one IP at check-in (section 4.2) and consider keying on account or email plus IP; (4) allow `PREVIEW_SECRET` rotation with an overlap (RT-11); (5) list the real names of the health, docs and debug routes so FW-11 matches them (or confirm none exist under `/api`).
- **Frontend (TASK-114 / 111):** (1) V-07 and V-08(c): fix the status for an oversize body on `/api/revalidate` and `/api/csp-report` in the spec (ARCH-001 9.1 says 413; F-11 says always 204); (2) decide whether the draft entry is `GET` or `POST` (ARCH-001 8.4 versus SEC-001 F-06); the rules work either way; (3) the handlers must not log request headers (bypass and authorization) (section 10.1); (4) confirm the secret is used as a UTF-8 string key in the HMAC (V-06 helper).
- **Architect:** none of the above changes ARCH-001; items (1) and (2) of the frontend list may justify a one-line clarification in section 9.1 and 10.5.
