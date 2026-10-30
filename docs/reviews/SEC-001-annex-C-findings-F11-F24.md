# SEC-001 Annex C: finding detail F-11 to F-24

Parent: `docs/reviews/SEC-001-arch-001-web-frontend.md`.

**F-11 (medium) `/api/csp-report` abuse and PII.**
Scenario: anonymous write endpoint. The "rate limit" in 10.5 and 19.4 can only be per-instance memory on serverless, so it does nothing; a script floods it to burn function invocations and log quota. Reports carry `document-uri`, `referrer`, `blocked-uri` and `script-sample`, which can include reset or OAuth query strings (F-10), preview tokens, emails typed into URLs.
Fix: Vercel Firewall rate rule on the path; streaming body cap of 8 KB; accept only `application/csp-report` and `application/reports+json`; always 204; drop query and fragment from every URL; never log `script-sample`; sample 1-in-N after a per-instance burst; escape log fields; send `Reporting-Endpoints` header since `report-to` needs it. Do not route it to the backend.
Absorb: ARCH-001 10.5, 19.4, F-05 task.

**F-12 (medium) `/api/*` rewrite.**
Scenario: destination host is fixed (`API_INTERNAL_URL` + `/api/:path*`), so this is not an open proxy and SSRF reach is limited to the backend's `/api` namespace. Residual issues: (a) the Railway origin is publicly reachable, so WAF, rate limits and TLS policy on Vercel are bypassable; legacy has none behind it. (b) Client-supplied headers pass through (`X-Request-ID`, `X-Forwarded-*`, `X-Preview-Key`, `Idempotency-Key`), so the backend must not trust forwarded IP or request-id blindly (log injection, rate-limit evasion, audit forgery). (c) Backend cookies and `Set-Cookie` pass to the site origin. (d) Path normalisation differences (`%2e%2e`, `//`, trailing slash) between Next and Django could reach an unintended backend route, and could shadow `/api/revalidate` variants. (e) Backend `/api/health`, docs or debug routes become world-visible.
Fix: backend limits and audits on its own; trusts only Vercel's overwritten `X-Forwarded-For` (verify in TASK-115) and validates request-id format; no unauthenticated debug or docs routes under `/api`; TASK-013 adds tests for encoded traversal and `/api/revalidate/` and `/api/draft/` variants; set `Cache-Control: no-store` on authenticated responses (contract) so the Vercel CDN never caches them.
Absorb: ARCH-001 12.7, 18.2 item 3; TASK-004, 013, 115.

**F-13 (medium) Razorpay trust boundary.**
Scenario: `checkout.js` executes in our origin on `/events/[slug]/register`, the same origin that holds the refresh token. If checkout.razorpay.com (or a hijacked DNS or tag) serves hostile JS, `strict-dynamic` lets it run with full storage access. SRI is not available (unversioned file). Loading only on intent narrows exposure but does not remove it. Client-side amount checks (TASK-057) are UX, not control.
Fix: accept with record; mitigated structurally by the cookie move (F-01). Meanwhile load only on the paid panel (already), never preload, keep `connect-src` Razorpay hosts on that path only (already), contract rule that the server confirms payment from the Razorpay webhook (signature over raw body, amount and currency compared with the order) and `verify` is only a hint, order creation requires a server-held hold and idempotency key, `Permissions-Policy payment=(self "https://checkout.razorpay.com")` verified in a real test. Browser never marks paid: the architecture is correct on this point.
Absorb: ARCH-001 10.3, 14.4, 17.1; TASK-057, backend plan.

**F-14 (medium) CMS rendering: sole control is the code.**
Scenario: because public CSP allows inline script, a stored XSS has no backstop and executes for every visitor, including admins. A compromised or careless admin account is the author of all content. Gaps in the spec: (a) link blocks are checked for scheme in prose only, not as a schema refinement; `javascript:` and `data:` must fail at DTO parse; (b) `focal` values must be numbers clamped 0..1 in zod, else `object-position` becomes a CSS injection vector under `style-src-attr 'unsafe-inline'`; (c) JSON-LD must be built by explicit field mapping, never by spreading a DTO or CMS object, and every URL in it must be `https`; (d) `og:image`, canonical and `alt` values come from content and must pass the same URL validator; (e) `target=_blank` gets `rel="noopener noreferrer"`; (f) the lint ban covers `dangerouslySetInnerHTML` but not `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `href={...}` with unvalidated strings, or `<script>`/`<iframe>` creation.
Fix: add those lint rules and DTO refinements; hostile-fixture tests for every block type; a unit test that every `href` and `src` in rendered fixtures matches an allow-list; consider Trusted Types in Report-Only on the client class (F-24).
Absorb: ARCH-001 8.2, 13.3, 17.1, M10; TASK-008, 047, 118.

**F-15 (medium) Privacy: opt-out and takedown do not propagate.**
Scenario: public pages show player names and results (past events). A player withdraws consent, or a parent asks for a minor's photo to go. The tag mapper has no `player`, `result` or `consent` type, so cached pages persist up to 15 min and, if regeneration fails, ISR keeps serving the old page indefinitely (FM-02). Vercel's image optimiser caches for 31 days (`minimumCacheTTL`), so a deleted photo keeps being served from `/_next/image`. Fixtures scan only emails and phones, not minors' names.
Fix: add `player` and `result` webhook types mapped to affected `event:*` and `past-events` tags; runbook for emergency purge including Vercel image cache invalidation; reduce image TTL or add versioned keys plus a delete path; contract rule that public identity fields are opt-in, default private, and minors display initials only unless guardian consent is recorded; EXIF stripping is a backend gate (already AR-5).
Absorb: ARCH-001 9.3, 9.4, 13.3, 17.3; TASK-004, 113, 115.

**F-16 (medium) Backend-supplied URLs and codes are trusted.**
Scenario: the legacy normaliser maps DRF `next` into `Page<T>`; if the client ever follows `next` with the `Authorization` header and the backend behind a proxy returns an absolute `http://internal-host/...`, the bearer token goes to that host. Same class: `createPreviewLink.url`, OAuth start URL, signed upload URLs, `Location` from OAuth callback.
Fix: browser client builds requests only from a relative path under `/api`, rejects absolute URLs and attaches `Authorization` only when the resolved origin equals `location.origin`; pagination uses page numbers or opaque cursors, never `next` URLs; preview link must resolve to `NEXT_PUBLIC_SITE_URL` origin and path `/api/draft`; upload URLs must match the Storage host. Unit tests with hostile fixtures.
Absorb: ARCH-001 11.2, 11.6, 8.4; TASK-014.

**F-17 (low) Observability scrubber is key-name based.**
Scenario: `scrub.ts` drops keys by name, but `error.message`, `ApiError.detail` (legacy `detail` strings such as "User x@y.com not found") and stack frames are values. Reports could carry PII.
Fix: `reportError` sends only `{code, status, area, action, requestId, route template}`; never `message`, `detail`, URL query or stack text until a provider is chosen; value-pattern redaction as second layer.
Absorb: ARCH-001 19.2, 19.4; F-05 task.

**F-18 (low) Header and cache details.**
Gaps: client-group HTML carries a nonce, so it must never be CDN-cached or the nonce repeats; no test that nonces differ per request. No `Cache-Control: no-store` rule for authenticated API responses. `Cross-Origin-Resource-Policy` and `X-Frame-Options` absent (frame-ancestors covers modern browsers; add XFO DENY for old ones, cheap). HSTS preload not decided. Preview deployments must be `noindex` and also protected (Vercel Deployment Protection) because mock builds expose admin UI shells and the mock banner is the only guard.
Fix: add tests and the above headers; enable Deployment Protection on previews.
Absorb: ARCH-001 10.3, 18.1; F-05 task.

**F-19 (low) Dependency and supply-chain controls are good but incomplete.**
Present: lockfile, `npm ci`, `ignore-scripts=true`, audit, gitleaks, Dependabot. Missing: severity policy (fail CI on high or critical in production dependencies; owner and SLA), pinned GitHub Actions by SHA, least-privilege CI tokens, Vercel env scoping (production secrets not exposed to preview builds), 2FA and branch protection on repo and Vercel, package provenance or minimum-age rule for new versions, and a rule that security releases of Next, React and Radix are applied within days despite RISK-010's "deliberate upgrades". `proxy.ts` is not a security boundary (the architecture agrees; keep it so).
Absorb: ARCH-001 17.1, RISK-010; TASK-007, 008, 101.

**F-20 (low) `returnTo` helper details.**
Scenario: "decode once then check" misses double-encoded forms and backslash/tab variants that browsers normalise (`/%09/evil.com`, `/%5Cevil.com`, `/\/evil.com`).
Fix: after decoding, reject any control or whitespace char; parse with `new URL(value, 'https://placeholder.invalid')`, require same origin and a path starting with a single `/`, then navigate using the parsed `pathname + search` only; allow-list route prefixes; include these vectors in the 10-vector test. Apply the same helper to preview `path`.
Absorb: ARCH-001 12.4, 8.4; TASK-023.

**F-21 (low) Public write endpoints (contact, registration, login) enable abuse.**
Scenario: contact form is an unauthenticated email relay and spam sink; a client-chosen `Idempotency-Key` can be rotated freely. No CAPTCHA is possible without a third-party script (AC-106).
Fix: backend rate limits per IP and per target, honeypot and time-to-submit check, header-injection-safe mail composition, no echo of user input in emails to third parties. Belongs to the backend plan; list in the contract.
Absorb: TASK-004; backend plan.

**F-22 (low) CSP least privilege.**
Public policy lists the Supabase host in `connect-src` and `img-src`, but the public site only talks to its own origin (images go through the optimiser; availability is same-origin), so these are unused exfiltration channels under XSS. `img-src blob:` on public is unneeded. `report-to` requires a `Reporting-Endpoints` header. Client class `connect-src` for Supabase is needed only on upload screens.
Fix: remove unused sources from `public`; scope Supabase `connect-src` to admin media routes; add `Reporting-Endpoints`.
Absorb: ARCH-001 10.3.

**F-23 (informational) Controls verified as adequate in the design.**
Route guards are UX only and the admin layout mounts data components only after `RequireRole`; no Server Actions; server secrets are `server-only` with a name guard; `serverGet` forwards no cookies or tokens; payment success only after server confirmation; Razorpay and Google scripts only where needed; self-hosted fonts and no third-party images; `remotePatterns` exact host and path; mock banner and sentinel scan exist; 404 for drafts; generic 401/202 responses. Residual risks are in the findings above, not here.

**F-24 (informational) Hardening options.**
(a) Add `search: ''` to the `remotePatterns` entry so only query-less object URLs optimise, and keep `dangerouslyAllowSVG` false. (b) Trial `require-trusted-types-for 'script'` Report-Only on the client class; it is the strongest practical defence against DOM XSS where tokens are used. (c) Consider serving signed-in groups from a separate origin if the cookie move slips. (d) Keep `AbortSignal.any` ban; irrelevant to security.
