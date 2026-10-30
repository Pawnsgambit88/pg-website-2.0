# Authentication and Security

## Sign-in

Support:
- email/password through Supabase Auth
- Google OAuth through Supabase Auth PKCE

Google setup requires a Google Auth Platform web OAuth client and Supabase Google provider configuration. Configure localhost, staging and production origins/redirects explicitly.

## On first sign-in

Database trigger creates:
- private `profiles` row
- server-owned `user_roles` row with `player`
- deliberately non-sensitive `player_public_profiles` row

Profile completion is progressive. Do not block basic browsing/dashboard access for optional fields.

## Authorization

Role is not stored in an editable profile. `user_roles` has no client write policy. Admin role changes go through `admin-set-role`; server also mirrors role to Auth `app_metadata` for middleware/UI convenience. Database authorization remains authoritative.

## RLS rules

- private profile: self/admin only
- public player profile: intentionally public fields only
- payment/rating ledgers: self/admin read; server-owned writes
- registrations: self/admin read; server function creates/confirms
- published CMS/event content: public read
- CMS/event writes: admin only

## Security headers

Deployment must set at least:
- Content-Security-Policy appropriate to Supabase, Razorpay, Google Fonts and approved analytics
- HSTS on production
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy limiting camera/mic/geolocation unless explicitly used
- frame-ancestors via CSP

## Sensitive data

Never log auth tokens, Razorpay secrets, raw payment credentials, full phone lists or service-role keys. Keep secrets in Supabase/Vercel environment secrets.

## Admin hardening

Before launch, enable MFA requirement for admin accounts if operationally feasible. Rate-limit privileged Edge Functions and store request IDs in audit logs.
