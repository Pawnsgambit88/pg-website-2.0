# SEC-001 Annex A: threat model and legacy backend defects

Parent: `docs/reviews/SEC-001-arch-001-web-frontend.md`.

## 1. Assets
- Refresh token (14-day class) in localStorage `pg:auth:v1`; in-memory access token.
- Admin capability: registration export, payment status, refunds, role assignment, publish.
- Player PII: email, phone, birthday, city, chess ids; minors' names and photos; payment and order ids.
- Integrity of public pages (SEO, trust, payment CTA) and the ISR cache.
- Secrets: `REVALIDATE_SECRET`, `PREVIEW_SECRET`, Razorpay key secret (backend only), signed upload URLs.
- Availability of the backend behind the rewrite and of the revalidation path.

## 2. Actors
Anonymous visitor, crawler and link unfurler; registered player (incl. malicious player); venue player on poor network; admin (semi-trusted, can author content); compromised admin account; backend service (signs webhooks); third parties (Razorpay, Supabase, npm packages, Vercel); attacker with a captured webhook or preview link.

## 3. Trust boundaries
1. Browser to Vercel edge (public CDN vs dynamic shells; two CSP classes).
2. Browser to Railway through the rewrite (one origin; backend is the only authority).
3. Vercel server to Railway (`serverGet`, no credentials, build-time and ISR-time).
4. Railway to Vercel (`/api/revalidate`, shared HMAC secret; `/api/draft` exchange with `PREVIEW_SECRET`).
5. Razorpay checkout script and iframe inside the authenticated register route.
6. Admin-authored content to public render (closed block model, JSON-LD).
7. Same-origin storage shared by public and signed-in pages (localStorage).

## 4. Attack surfaces and plausible threats
Public pages and islands (XSS to token theft), `/api/revalidate`, `/api/draft` and exit, `/api/csp-report`, the `/api/*` rewrite, route params (`slug`), `returnTo`, OAuth callback and reset URLs, Razorpay script, image optimiser, build and CI supply chain, preview and mock builds, logs and error reports.

| ID | Threat | Mitigation in ARCH-001 | Residual |
|----|--------|-----------------------|----------|
| T-01 | XSS on public page steals refresh token | Inert rendering, lint ban, nonce CSP on client groups | High until cookie move or waiver (F-01) |
| T-02 | Stolen refresh token used indefinitely | Rotation only (backend decides) | High, no reuse detection specified (F-02) |
| T-03 | Forged or replayed revalidation | HMAC, window, dedupe | Medium, spec gaps (F-07) |
| T-04 | Draft content cached or served to the public | draftMode, noindex | Medium (F-06) |
| T-05 | Open redirect via returnTo or preview path | safe-redirect, backend path | Low if allow-list added |
| T-06 | Mock build serves production | Build guard on production env only | Medium (F-09) |
| T-07 | Private data on public pages | Separate DTOs, fixture scan | Medium, stale cache after opt-out (F-15) |
| T-08 | Token leaked to wrong host or log | No tokens in logs | Medium (F-10, F-16) |
| T-09 | Third-party script (Razorpay) reads token | Panel-only load, nonce CSP | Medium (F-13) |
| T-10 | Backend abuse through rewrite or report endpoint | Rate limit on csp-report | Medium (F-11, F-12) |

## 5. Legacy backend defects that must not be inherited (verified in `backend/`)

| # | Defect | Evidence | Required in new contract |
|---|--------|----------|--------------------------|
| L-1 | Registrations list readable without auth; returns email, Razorpay order and payment ids | `tournaments/views.py` `registration_list` has no permission decorator; default is `IsAuthenticatedOrReadOnly`; `RegistrationSerializer` includes `user_email`, `razorpay_*` | Public DTOs only; registrations are admin or own-record |
| L-2 | Public profile by `user_id` returns the full user (email, phone, birthday) | `views.py` `profile` is `AllowAny` and uses `UserSerializer` | Separate public identity DTO, opt-in, default private |
| L-3 | Refresh not revoked: no blacklist app, `logout` is a no-op, expiry slides, role claim copied | `accounts/views.py` `token_refresh`, `logout`; `settings.py` INSTALLED_APPS | See F-02 |
| L-4 | Role trusted from JWT claim, not re-read | `permissions.py` reads `payload['role']` | Role from database each request or refresh |
| L-5 | Insecure `SECRET_KEY` fallback | `settings.py` line 11 | Fail to start when unset |
| L-6 | No throttling on login, register, reset, contact | no `DEFAULT_THROTTLE_CLASSES` | Per-IP and per-account limits, generic errors |
| L-7 | Account enumeration on register | returns "This email is already registered." | Neutral response or accepted and documented |
| L-8 | Reset token stateless and reusable within 1 h; no session revoke | `password_reset_confirm` uses `signing.loads` only | Single use; revoke refresh families on reset |
| L-9 | Password minimum 6, no breach check | `register`, `password_reset_confirm` | Backend policy (Q5) |
| L-10 | No Razorpay webhook; payment marked only by browser call | no webhook route in any `urls.py`; `verify_payment` | Server webhook is source of truth (FM-14); browser never marks paid |
| L-11 | No outbound timeout; no hold or capacity check on order | `requests.post` without `timeout` | Timeouts, idempotency, holds |
| L-12 | CSV export: formula injection and header injection | `export_csv` writes names unescaped; `filename` from `tournament.name` | Prefix `'` on `= + - @`; sanitise filename |
| L-13 | CORS with credentials | `CORS_ALLOW_CREDENTIALS = True` | No CORS at all (same origin); no cookies on CORS |
| L-14 | No HSTS, secure cookie or proxy SSL settings behind Railway | `settings.py` has no `SECURE_*` | Set explicitly |
| L-15 | Admin writes arbitrary `payment_status` and `score` with no audit | `registration_detail` | Audit log, constrained transitions |
| L-16 | Legacy DRF `next` absolute URLs and flat error shapes | normaliser in 11.2 | Never follow `next` with a bearer token (F-16) |
