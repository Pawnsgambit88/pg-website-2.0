# SEC-001 Annex B: finding detail F-01 to F-10

Parent: `docs/reviews/SEC-001-arch-001-web-frontend.md`. Each entry: failure scenario, recommended fix, absorbing section or task.

**F-01 (high) Refresh token in localStorage vs XSS on public pages.**
Scenario: one injection on any public page (a compromised npm package, a future `SafeHtml` exception, a Next/React framework flaw) runs under `script-src 'unsafe-inline'`. It reads `pg:auth:v1`, navigates to `https://evil/?t=...` (CSP does not govern top-level navigation) and holds a 14-day session. For an admin that means the registrations export (PII of minors) and refunds; admin MFA is out of scope (FEAT-001 NG-10). The nonce CSP on client groups does not help because localStorage is shared per origin. Honest limit: an httpOnly cookie stops theft and persistence but not same-origin session riding while the victim is on the page.
Fix: launch target is a refresh token in `__Secure-pg_rt` (httpOnly, Secure, SameSite=Strict, Path=/api/auth; `__Host-` is impossible with a path scope) plus a custom-header CSRF check on refresh, using the single-origin rewrite already in 12.7. If the owner waives for launch, require all of: server reuse detection (F-02), admin session absolute lifetime of 12 h or less with admin refresh kept in memory or sessionStorage, step-up password re-entry for refund, role change and export, per-IP and per-account throttling, CSP Report-Only clean. Alternative worth costing: serve signed-in groups from a separate origin so public-page XSS cannot read its storage.
Absorb: ARCH-001 10.4, 12.1, 12.7, RISK-001, OD-01; TASK-004 contract; new task for cookie mode.

**F-02 (high) Refresh lifecycle unspecified; legacy has none.**
Scenario: legacy `token_refresh` calls `set_jti` and `set_exp` on the presented token but there is no `token_blacklist` app, so the old token still works. Expiry slides on every use, so an active stolen token never dies. The `role` claim is copied forward, so a demoted admin keeps admin until relogin. `logout` returns 200 and revokes nothing. ARCH-001 12.3 step 5 only clears local storage, so even a correct backend is never told.
Fix: contract must require: single-use rotation with family reuse detection (revoke the family) and a 10 to 30 s grace for the immediately previous token (lost response, tab killed by the OS at a venue); absolute session lifetime; role and status re-read from the database on each refresh; `auth.logout` revokes server-side before local clear; password change and reset revoke all families. Client: call logout with the refresh token, then clear.
Absorb: ARCH-001 12.1, 12.3, 23.3; TASK-004, 014, 022 conformance vectors.

**F-03 (high) Legacy backend defects not to be inherited.** See annex A section 5 for the verified list and file evidence. Fix: list each as a negative conformance test in the contract suite. Absorb: TASK-004 gap matrix, backend plan, TASK-092, TASK-101.

**F-04 (medium) Public nav island reads the token store.**
Scenario: 12.2 has the auth-aware nav link probe `pg:auth:v1` on public pages, which ships token-store code and a token read to the weakest-CSP class and contradicts "public pages do not know the session".
Fix: write a non-secret hint `pg:session-hint:v1` = `{role}` at sign-in; the public island reads only that; lint-ban imports of `lib/api/browser/tokens` from `(public)` (add to M3).
Absorb: ARCH-001 12.2, M3.

**F-05 (medium) CSP delivery is fail-open and can double-apply.**
Scenario: public CSP is a static header by path pattern and client CSP comes from the proxy matcher. A new route in neither gets no CSP. `/events/:slug/register` matches the public pattern and the proxy, so two policies intersect and the public `frame-src 'none'` blocks Razorpay; a developer then loosens the shared module under deadline. Also 8.4 step 5 relies on `proxy.ts` to add noindex and `no-store` to draft responses, but 10.3 says no proxy runs on public hits.
Fix: ship a default-deny baseline (`default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`) on `/:path*` and make public and client patterns mutually exclusive with an explicit exclusion for the register path. Add a Playwright crawl of every route in the build manifest asserting exactly one CSP header. Production must never run Report-Only. Settle draft headers via OD-02 (route handler or `(preview)` group sets them).
Absorb: ARCH-001 8.4, 10.3, 10.5; new task F-03 acceptance.

**F-06 (medium) Draft preview.**
Scenario: (a) `/api/draft?token=` is a state-changing GET; link unfurlers (WhatsApp, Slack) consume the single-use token, and the URL lands in request logs. (b) Next's `__prerender_bypass` value is per build, not per user, and has no 30 min lifetime (only `pg_preview` has Max-Age); bypass alone bypasses the ISR cache and multiplies backend load. (c) If `pg_preview` is missing or expired while the bypass cookie remains, a naive fetcher could still fetch draft data. (d) Exit is a same-origin POST with no Origin check.
Fix: prefer an admin-initiated `POST /api/draft` carrying the bearer token (same origin), which the handler validates against the backend; keep the GET token form only if non-admin sharing is a requirement, behind a confirm interstitial. Treat `__prerender_bypass` as non-authoritative: draft data only when `pg_preview` verifies, else published. Name the cookie `__Host-pg_preview`. Re-validate the redirect `path` with `safe-redirect` plus an allow-list (`/events/`, `/stories/`, site pages) even though it comes from the backend. Check `Origin` or `Sec-Fetch-Site` on exit. Required test: after a draft request for a slug, an anonymous request to the same URL returns published content or 404 (no ISR poisoning), and draft responses carry `noindex` and `private, no-store`.
Absorb: ARCH-001 8.4, OD-02; TASK-007, 111, new draft task.

**F-07 (medium) Revalidation handler spec gaps.**
Scenario: (a) `X-PG-Event-Id` is outside the HMAC, so a captured request replays with a fresh id and bypasses the dedupe. (b) `timingSafeEqual` throws on unequal lengths, so a short signature gives a 500, a free pre-auth crash and error-path oracle. (c) `Buffer.from(hex,'hex')` silently truncates malformed hex. (d) "413 beyond 16 KB" is only real if the stream is capped before `request.text()` buffers it. (e) 503 on missing secret tells an anonymous caller the deployment is misconfigured. (f) A legitimate backend retry with the same event id gets 401, which the backend may treat as permanent. (g) the `slug` flows into a tag name.
Fix: sign `timestamp + "." + eventId + "." + rawBody`; validate `^v1=[0-9a-f]{64}$` then compare equal-length digests; enforce a streaming size cap; return 401 for missing secret externally and alert internally; on a duplicate id return 202 no-op and record the id only after full validation; validate `slug` as `^[a-z0-9-]{1,100}$`; secret at least 32 random bytes, distinct per environment (preview too), verifier tries current and previous in constant time, documented rotation runbook; WAF rate limit on the path. Keep the invariant that the handler never fetches or writes from body content.
Absorb: ARCH-001 9.1, 9.2, 17.2; TASK-113, 114, 022 vectors.

**F-08 (medium) Route params interpolated into backend paths and tags.**
Scenario: `/events/[slug]` has `dynamicParams = true`; the decoded param can contain `/`, `..`, `?`, `#`. `serverGet('/events/' + slug)` then fetches an unintended unauthenticated backend path (legacy `profile?user_id=` and registrations GET are open) from the server. Random slugs also fill the ISR cache with 404 entries and generate backend load.
Fix: validate every param against `^[a-z0-9]+(?:-[a-z0-9]+)*$` (max 100) before any fetch and call `notFound()`; build backend paths only with `encodeURIComponent`; enforce the same regex in the DTO schema (also protects sitemap XML and tags); cap negative-cache TTL; WAF rate limit.
Absorb: ARCH-001 11.5, 7.3; add lint rule M13.

**F-09 (medium) Mock mode can reach production.**
Scenario: `guard-env` blocks only `VERCEL_ENV=production` builds. Preview builds are mock-on by design and Vercel can promote a preview deployment to production without rebuilding, so the guard never runs. Users then "register" and "pay" against fake data. Separately, 11.4 has `mockPublish` run in the browser store yet signs with a server secret; implemented literally the secret would be public, and a renamed `NEXT_PUBLIC_*` evades the name regex.
Fix: use an allow-list guard (mocks only if `VERCEL_ENV` is preview or local); disable promote-from-preview and restrict production to the protected branch; post-deploy smoke (TASK-109) asserts no sentinel and no mock banner; mock publish goes through a server route that exists only in mock builds with its own mock-only secret; keep the value-based bundle scan.
Absorb: ARCH-001 6.3, 11.3, 11.4, 18.1; TASK-007, 109, 105.

**F-10 (medium) Token-bearing URLs.**
Scenario: reset links (`/reset-password?token=`), OAuth `code` on `/auth/callback` and preview tokens hit Vercel logs, browser history and same-origin Referer, and `document-uri` in CSP reports. Legacy reset tokens are not single use.
Fix: put reset tokens in the URL fragment; callback uses a one-time code exchanged by POST then `history.replaceState`; set `Referrer-Policy: no-referrer` on those routes; strip query from logged and reported URLs; single-use short-lived reset tokens in the contract.
Absorb: ARCH-001 12.4, 12.6, 19.4; TASK-004.
