---
id: SEC-001
type: security-review
feature_id: FEAT-001
reviewer: security-reviewer
status: changes_requested
assets:
  - "Refresh token (localStorage pg:auth:v1) and in-memory access token"
  - "Admin capability (exports, payments, role changes, publish)"
  - "Player PII and minors' data; payment and order ids"
  - "Public page integrity and ISR cache"
  - "REVALIDATE_SECRET, PREVIEW_SECRET, signed upload URLs"
actors:
  - "Anonymous visitor, crawler, link unfurler"
  - "Player (possibly malicious), admin (possibly compromised)"
  - "Backend service, Razorpay, Supabase, npm supply chain"
trust_boundaries:
  - "Browser to Vercel (two CSP classes)"
  - "Browser to Railway via /api rewrite"
  - "Railway to Vercel (/api/revalidate, /api/draft exchange)"
  - "Razorpay checkout inside the authenticated register route"
  - "Admin-authored content to public render"
  - "Same-origin localStorage shared by public and signed-in pages"
attack_surfaces:
  - "Public pages and islands"
  - "/api/revalidate, /api/draft, /api/draft/exit, /api/csp-report"
  - "/api/* rewrite"
  - "Route params (slug), returnTo, reset and OAuth URLs"
  - "Preview and mock builds; CI and npm supply chain"
threats:
  - {id: T-01, threat: "XSS on public page steals refresh token", mitigation: "Inert rendering, lint ban, nonce CSP on client groups", residual_risk: "High until cookie move or waiver (F-01)"}
  - {id: T-02, threat: "Stolen refresh token reused indefinitely", mitigation: "Rotation (backend decides)", residual_risk: "High, no reuse detection specified (F-02)"}
  - {id: T-03, threat: "Forged or replayed revalidation", mitigation: "HMAC, 300 s window, dedupe", residual_risk: "Medium, spec gaps (F-07)"}
  - {id: T-04, threat: "Draft content cached or served publicly", mitigation: "draftMode, noindex", residual_risk: "Medium (F-06)"}
  - {id: T-06, threat: "Mock build reaches production", mitigation: "Guard on VERCEL_ENV=production only", residual_risk: "Medium (F-09)"}
  - {id: T-07, threat: "Private data persists on public pages after opt-out", mitigation: "Separate DTOs", residual_risk: "Medium (F-15)"}
findings:
  - {id: F-01, severity: high, title: "Refresh token in localStorage with script-capable public CSP", location: "ARCH-001 10.4, 12.1, RISK-001, OD-01", description: "One XSS on any public page reads pg:auth:v1 and navigates away with it; an admin token exposes PII exports and refunds. Nonce CSP on client groups does not protect shared-origin storage.", recommendation: "Launch target httpOnly Secure SameSite=Strict refresh cookie on /api/auth with CSRF header; else documented owner waiver with compensating controls.", blocking: true}
  - {id: F-02, severity: high, title: "Refresh-token lifecycle unspecified; legacy has no revocation", location: "ARCH-001 12.3, 23.3; backend/accounts/views.py", description: "No reuse detection, absolute lifetime, server-side logout or role re-read specified; legacy has no blacklist and logout is a no-op.", recommendation: "Contract: single-use rotation with family reuse detection and grace, absolute lifetime, role re-read, server logout, revoke on password change.", blocking: true}
  - {id: F-03, severity: high, title: "Legacy backend defects must be negative conformance tests", location: "backend/tournaments/views.py, accounts, payments, settings.py", description: "Unauthenticated registrations list leaks emails and payment ids, public profile leaks PII, no throttling, insecure SECRET_KEY fallback, no payment webhook, CSV formula injection (annex A, L-1 to L-16).", recommendation: "Encode each as a contract conformance test; backend plan must not reuse these views.", blocking: true}
  - {id: F-04, severity: medium, title: "Public nav island reads the token store", location: "ARCH-001 12.2, M3", description: "Ships token-store code and a token read into the weakest-CSP class.", recommendation: "Non-secret session hint key; lint-ban tokens module in (public).", blocking: false}
  - {id: F-05, severity: medium, title: "CSP delivery is fail-open and may double-apply", location: "ARCH-001 8.4, 10.3, 10.5", description: "Unmatched routes get no CSP; /events/:slug/register matches both mechanisms; draft header duty assigned to a proxy that does not run on public hits.", recommendation: "Default-deny baseline, mutually exclusive patterns, per-route single-header crawl test.", blocking: false}
  - {id: F-06, severity: medium, title: "Draft preview token exchange, cookie and cache poisoning risks", location: "ARCH-001 8.4", description: "State-changing GET consumed by link unfurlers; bypass cookie is per-build and not user-bound; exit lacks Origin check; redirect path trusted without re-validation.", recommendation: "POST with bearer, __Host- cookie, draft data only if pg_preview verifies, safe-redirect on path, anonymous-after-draft test.", blocking: false}
  - {id: F-07, severity: medium, title: "Revalidation handler specification gaps", location: "ARCH-001 9.1, 9.2, 17.2", description: "Event id outside HMAC, timingSafeEqual length throw, hex truncation, body cap, 503 oracle, retry 401, slug into tag.", recommendation: "Sign timestamp.eventId.body, strict format checks, streaming cap, 202 on duplicate, slug regex, key rotation runbook.", blocking: false}
  - {id: F-08, severity: medium, title: "Route params interpolated into backend paths and tags", location: "ARCH-001 7.1, 11.5", description: "dynamicParams slug can carry path or query characters into serverGet and fill the ISR cache with 404s.", recommendation: "Regex-validate before fetch, encodeURIComponent, cap negative caching.", blocking: false}
  - {id: F-09, severity: medium, title: "Mock mode can reach production", location: "ARCH-001 6.3, 11.3, 11.4, 18.1", description: "Guard only blocks VERCEL_ENV=production builds; promoted previews skip it; mockPublish implies a signing secret in the browser.", recommendation: "Allow-list guard, no promote-from-preview, post-deploy sentinel smoke, server-only mock publish route.", blocking: false}
  - {id: F-10, severity: medium, title: "Tokens in URLs (reset, OAuth, preview)", location: "ARCH-001 12.4, 12.6, 19.4", description: "Reset, callback and preview tokens reach logs, history, Referer and CSP reports.", recommendation: "Fragment tokens, POST exchange plus replaceState, no-referrer, strip queries from logs.", blocking: false}
  - {id: F-11, severity: medium, title: "/api/csp-report abuse and PII", location: "ARCH-001 10.5, 19.4", description: "In-memory rate limit is ineffective on serverless; reports include URLs with tokens and script samples.", recommendation: "Firewall rate rule, body cap, always 204, strip query, no script-sample, Reporting-Endpoints.", blocking: false}
  - {id: F-12, severity: medium, title: "/api/* rewrite residual risks", location: "ARCH-001 12.7, 18.2", description: "Not an open proxy, but Railway origin is directly reachable, client headers pass through, path normalisation can differ, backend debug routes become public.", recommendation: "Backend self-protection, trusted forwarded headers only, traversal tests, no-store on authenticated responses.", blocking: false}
  - {id: F-13, severity: medium, title: "Razorpay script runs in the token-bearing origin", location: "ARCH-001 10.3, 14.4, 17.1", description: "checkout.js under strict-dynamic has full storage access; no SRI possible.", recommendation: "Accept with record; cookie move removes impact; server webhook is source of truth.", blocking: false}
  - {id: F-14, severity: medium, title: "CMS rendering: only the code stands between content and XSS", location: "ARCH-001 8.2, 13.3, 17.1, M10", description: "Link scheme, focal, JSON-LD field mapping and non-React sinks lack schema-level or lint enforcement.", recommendation: "DTO refinements, wider lint bans, hostile fixtures per block, Trusted Types report-only.", blocking: false}
  - {id: F-15, severity: medium, title: "Privacy opt-out and takedown do not propagate", location: "ARCH-001 9.3, 9.4, 13.3, 17.3", description: "No player/result webhook type; 31-day image cache; ISR may serve old page if regeneration fails.", recommendation: "Add webhook types, emergency purge runbook, minors initials-only rule, shorter image TTL or versioned keys.", blocking: false}
  - {id: F-16, severity: medium, title: "Backend-supplied URLs trusted with bearer token", location: "ARCH-001 11.2, 11.6, 8.4", description: "Following DRF next or absolute URLs could send Authorization to another host.", recommendation: "Relative /api paths only, same-origin check before attaching token, no next URLs.", blocking: false}
  - {id: F-17, severity: low, title: "Observability scrubber is key-name based", location: "ARCH-001 19.2, 19.4", description: "Error message and detail values can hold PII.", recommendation: "Report codes and ids only; value-pattern redaction second.", blocking: false}
  - {id: F-18, severity: low, title: "Header and cache gaps", location: "ARCH-001 10.3, 18.1", description: "Nonce pages must not be CDN-cached; no no-store rule for authenticated API; no XFO; previews unprotected.", recommendation: "Tests, headers, Deployment Protection on previews.", blocking: false}
  - {id: F-19, severity: low, title: "Supply-chain controls incomplete", location: "ARCH-001 17.1, RISK-010", description: "No severity gate, action pinning, env scoping, 2FA or patch SLA.", recommendation: "Add policy to TASK-007/008 and TASK-101 checklist.", blocking: false}
  - {id: F-20, severity: low, title: "returnTo helper edge cases", location: "ARCH-001 12.4", description: "Decode-once check misses tab, backslash and double-encoded variants.", recommendation: "URL-parse based check, same helper for preview path, extra vectors.", blocking: false}
  - {id: F-21, severity: low, title: "Public write endpoints enable abuse", location: "ARCH-001 11.1, 23.2", description: "Contact and auth endpoints need throttling and mail-safety; no CAPTCHA possible.", recommendation: "Backend rate limits, honeypot, safe mail composition.", blocking: false}
  - {id: F-22, severity: low, title: "CSP least privilege", location: "ARCH-001 10.3", description: "Public policy allows unused Supabase and blob sources; report-to needs Reporting-Endpoints.", recommendation: "Remove unused sources, scope to admin media routes.", blocking: false}
  - {id: F-23, severity: informational, title: "Controls verified adequate in design", location: "ARCH-001 12.5, 17, 11.5", description: "Guards UX-only, no Server Actions, server-only secrets, no forwarded cookies, payment confirmed by server, exact remotePatterns.", recommendation: "Keep as test-backed invariants.", blocking: false}
  - {id: F-24, severity: informational, title: "Hardening options", location: "ARCH-001 10.4, 13.3", description: "remotePatterns search empty, Trusted Types report-only, separate origin for signed-in groups.", recommendation: "Consider at scaffold.", blocking: false}
residual_risk:
  - "Per-instance webhook replay dedupe (accepted: idempotent, 300 s window)"
  - "Razorpay and framework supply-chain code run in the origin holding the refresh token until the cookie move"
  - "Admin MFA out of scope (FEAT-001 NG-10) while admins hold bulk-PII capability"
---

# Security Review: ARCH-001 Web frontend (design review, TASK-006)

**ID:** SEC-001 | **Type:** security-review | **Feature:** FEAT-001 | **Reviewer:** security-reviewer | **Status:** changes_requested
**Verdict: APPROVE WITH CONDITIONS** (design may proceed to TASK-007 once the scaffold conditions below are accepted into ARCH-001; the three high findings block cutover and TASK-101 sign-off, not the mock-backed build).

Method: design review of ARCH-001 v1 against FEAT-001 and the asset inventory, plus verification of the legacy `backend/` code (annex A). No `web/` code exists, so no implementation behaviour was verified; every control below is a design claim to be tested at TASK-007 and TASK-101. Detail files: `SEC-001-annex-A-threat-model-and-legacy.md` (assets, boundaries, threats, legacy defects L-1 to L-16), `SEC-001-annex-B-findings-F01-F10.md`, `SEC-001-annex-C-findings-F11-F24.md` (scenario, fix, absorbing section per finding).

## Count by severity
critical 0, high 3 (F-01, F-02, F-03), medium 13 (F-04 to F-16), low 6 (F-17 to F-22), informational 2 (F-23, F-24). Total 24.

## Assessment of the specific questions
- **Token storage / CSP split:** the split is the right trade for ISR and puts the strict policy where tokens are used, but the premise fails because localStorage is shared origin-wide; the public policy is therefore the effective protection for the token. Acceptable only as a time-boxed, owner-recorded waiver with compensating controls (F-01, F-02, F-04). Web Locks design is sound; add the server grace window for lost rotation responses (F-02).
- **Revalidate HMAC:** construction, raw-body signing and window are good; fix the details in F-07. Per-instance replay is acceptable because the operation is idempotent.
- **draftMode:** viable, but harden exchange, cookies and cache isolation (F-06) and do not rely on a proxy that does not run on public routes (F-05).
- **CMS and JSON-LD:** closed block model is the correct design; make it enforceable at the schema and lint level (F-14).
- **Rewrite, env, mock:** fixed destination, no open proxy (F-12); env separation adequate; mock guard is too narrow (F-09).
- **Razorpay:** browser never marks paid is correct; script-in-origin risk remains (F-13); legacy has no webhook (L-10).
- **Privacy, images, headers, observability:** F-15, F-22, F-18, F-17. Image `remotePatterns` design is good (exact host and path).

## OWASP Top 10 checklist
- [x] A01 Broken Access Control: guards UX-only is correct; legacy L-1, L-2, L-4 must not carry over (F-03)
- [x] A02 Cryptographic Failures: HMAC construction good; F-07; legacy L-5
- [x] A03 Injection: React text rendering; F-14 (CMS), F-08 (path), L-12 (CSV)
- [x] A04 Insecure Design: F-01, F-02, F-15
- [x] A05 Security Misconfiguration: F-05, F-09, F-18, F-22; legacy L-13, L-14
- [x] A06 Vulnerable Components: F-19 (policy present, gate missing)
- [x] A07 Auth Failures: F-01, F-02, F-10, F-21; legacy L-3, L-6 to L-9
- [x] A08 Software/Data Integrity: F-07, F-13, F-19
- [x] A09 Logging Failures: F-11, F-17
- [x] A10 SSRF: F-12, F-16 (no open proxy or SSRF found; fixed destination)

## Conditions
**Before TASK-007 scaffold (fold into ARCH-001 v2 or an addendum, then TASK-003/F-03):**
1. Specify the default-deny CSP baseline, mutually exclusive path patterns and the one-header-per-route crawl test (F-05); production never Report-Only.
2. Revalidation spec changes: event id inside the signature, strict signature format and equal-length compare, streaming body cap, slug regex, duplicate returns 202, rotation runbook (F-07). Slug regex everywhere before any fetch (F-08).
3. Allow-list mock guard and no promote-from-preview (F-09); `mockPublish` server-only (F-09).
4. Lint and schema rules: tokens module banned from `(public)`, wider sink bans, URL-scheme refinement, numeric clamp for `focal` (F-04, F-14).
5. Record F-01 and F-02 in ARCH-001 as accepted-with-conditions or scheduled, and add a contract task for cookie mode.

**Before launch / cutover (TASK-101 gate):**
6. Owner decision on OD-01 below; high findings F-01, F-02, F-03 closed or explicitly waived in writing.
7. Backend contract encodes annex A L-1 to L-16 as negative conformance tests; Razorpay server webhook confirmed as source of truth.
8. Draft preview hardening and the anonymous-after-draft cache test (F-06); privacy purge runbook and webhook types (F-15).
9. Real-browser verification of both CSP classes and Report-Only clean run on staging (OD-03); Firewall rate rules on `/api/csp-report` and `/api/revalidate`; Deployment Protection on previews.
10. Dependency gate (high/critical audit fails CI), pinned CI actions, 2FA, env scoping (F-19).

## OD-01 recommendation
Do not accept unconditionally. Accept for the mock-backed build only (no real tokens exist). For launch, **require the httpOnly cookie refresh token** (Secure, SameSite=Strict, Path=/api/auth, CSRF header on refresh) as the target design and have TASK-004 specify both modes so the frontend change stays inside `browser/tokens.ts`. If the owner prefers to launch on localStorage, the waiver must be written and carry: server reuse detection and absolute lifetime (F-02), admin refresh not persisted in localStorage and 12 h admin cap, step-up re-authentication for refund, role change and export, Report-Only clean CSP, and a dated commitment to move to cookies. Residual limit to tell the owner: a cookie stops token theft but not same-origin session riding during an XSS, so inert rendering and lint controls stay mandatory.

## OD-06 recommendation
Accept per-instance dedupe; do not require a global nonce store. Replay is bounded by the 300 s window and the operation (tag expiry) is idempotent, so a replay yields at most extra regenerations. Make it stronger cheaply: put the event id inside the HMAC, treat a duplicate as 202, add a Vercel Firewall rate limit, and keep timestamps tight (60 s forward). Ask the backend only for monotonic `version` per entity so a stale replay is a no-op; amend AC-15 wording as ARCH-001 section 31 proposes. Revisit only if revalidation ever triggers non-idempotent work.

## Residual risk
See front matter. The design is otherwise sound: no critical issue, guards are correctly treated as UX, payments are server-confirmed by design, and the mock and secret separation is structurally right.
