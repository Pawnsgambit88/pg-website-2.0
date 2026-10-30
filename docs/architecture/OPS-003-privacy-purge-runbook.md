# Ops runbook: privacy opt-out, takedown and emergency purge

**ID:** OPS-003 (ops runbook; not an architecture artifact, so `schemas/architecture.schema.yaml` does not apply)
**Type:** ops-runbook
**Feature:** FEAT-001
**Plan task:** PLAN-002 BE-00 = PLAN-001 TASK-127 (SEC-001 F-15)
**Version:** 1
**Status:** ready for owner review (nothing here has been executed against live systems)
**Date:** 2026-10-27
**Author:** architect

**Companions:** `ARCH-001-backend-contract.md` 3.10 and 5.6 (webhook types), `ARCH-001-isr-revalidation.md` section 6, `ARCH-001-web-frontend.md` 13.3, `OPS-001-vercel-firewall-and-protection.md`.

**Markers.** **PROPOSAL** = a value derived by reasoning, to be tuned. **VERIFY** = a Vercel or Supabase behaviour believed to exist but not confirmed against current vendor documentation; confirm before relying on it (section 9).

---

## 1. Why this exists (F-15)

1. Public pages show player names and results. After an opt-out or takedown, ISR may keep serving the old page for up to 15 minutes, and indefinitely if regeneration fails (FM-02).
2. The Vercel image optimiser caches derivatives for up to 31 days (`minimumCacheTTL`), so deleting a Storage object does not remove the photo from `/_next/image`.
3. Fixture scans catch emails and phones, not minors' names.

## 2. Standing rules (apply always, not only in an incident)

| ID | Rule |
|---|---|
| PR-01 | Public identity fields (display name, photo, results visibility) are opt-in and default private. |
| PR-02 | A player under 18 is shown as **initials only** on every public surface (standings, results, past events, stories, testimonials, Avatar) unless guardian consent is recorded on the profile. Photos of minors are never shown without recorded guardian consent. |
| PR-03 | Withdrawing consent (player or guardian) takes effect as a `privacy_updated` change and must propagate by the procedure below. |
| PR-04 | Public DTOs never contain private fields; the public API applies PR-02 server-side, not in the browser. |
| PR-05 | EXIF is stripped on upload (backend gate, BE-07). |
| PR-06 | Storage object keys for any person-related image are versioned (section 3). Keys are never reused. |
| PR-07 | `images.minimumCacheTTL` is reduced from 31 days. **PROPOSAL:** 86400 s (1 day) as the ceiling for person images, so the worst case without purge is bounded. Record the chosen value in `next.config`. |

## 3. Supabase Storage version-key strategy

- Object key: `players/{playerId}/{purpose}-{contentHash8}-v{n}.{ext}`; the public URL is query-less (F-24: only query-less URLs are optimised). `n` increments on every replacement; the DTO returns the current URL and `version`.
- A changed image is a new key, so the optimiser sees a new source URL and never serves the old derivative to new HTML. Old key is deleted after the new HTML is live (not before, to avoid a broken image during regeneration).
- **Takedown (no replacement):** delete the object and set the DTO image to null; the page falls back to initials. Because the old URL may remain in the optimiser cache until expiry, also run section 6.
- The bucket is public-read only for the exact `remotePatterns` host and path; no signed-URL query strings on public images.

## 4. Roles and authority

| Role | May do |
|---|---|
| Requester | Player, guardian, or legal/regulatory contact. Raises the request through support/contact. Does not touch systems. |
| Privacy owner (the site owner) | Validates the request, authorises standard and emergency purges, owns the log. |
| Authorised admin | Holds the admin role and a fresh step-up; executes section 5 or 6. |
| Ops operator (Vercel/Supabase access) | Executes section 6 steps 4 to 5 (Vercel dashboard or CLI). May be the same person as the privacy owner. |

Admins cannot self-authorise an emergency purge of data they have a personal interest in; the privacy owner must approve in writing (message or ticket reference recorded in the audit reason).

## 5. Standard opt-out or takedown (within 72 hours; PROPOSAL)

Use when a player withdraws consent, changes privacy settings, a result is withdrawn, or a guardian removes consent, and there is no safety or legal urgency.

1. **Verify identity.** Confirm the requester is the player or the guardian of record (match email on the account; for guardian requests, check the guardian email on file). Record the request id.
2. **Apply the change in the admin area** (or player self-service): set the profile privacy flags, or remove the photo, or withdraw the result (`result` `deleted`).
3. **Backend effect (automatic, one transaction):** change committed, `audit_log` row written (actor, reason, request id), and outbox rows written: `player` / `privacy_updated` (or `deleted`) per player id, `result` / `deleted` per result id, plus `event` / `updated` for each affected published event (contract 5.6).
4. **Dispatch.** Within about a minute the dispatcher posts signed calls to `{SITE}/api/revalidate`; the web app expires the tags in the contract 5.6 table.
5. **Verify** (section 7). Close the request and note the verification result in the log.

## 6. Emergency purge (immediate; minors, safety, legal order)

**Who:** the privacy owner authorises; an authorised admin with a fresh step-up executes; an ops operator performs the Vercel steps.
**When:** a guardian or legal request demands immediate removal of a minor's data or image; a safety concern (harassment, stalking, custody order); a published image or name that must not be public. Target: public removal within **1 hour** of authorisation (PROPOSAL).

**Procedure**

1. **Authorise and record.** Privacy owner approves; note request id and reason. Capture player id(s), and the affected event slugs and image URLs from the admin area. Do not paste personal data into chat or tickets beyond ids.
2. **Execute the admin purge action** (step-up protected, not exposed in the customer UI). In one transaction the backend: sets the player's public fields private / withdraws consent; deletes or anonymises the specified data (name to initials, results unlinked as requested); deletes the Storage object(s) (or replaces with a new versioned key if a replacement is wanted); writes the audit row; writes `player` / `emergency_purge` outbox rows, **one per player id**, plus `result` / `deleted` and dependent `event` / `updated` rows. If the transaction fails nothing is purged and nothing is announced; retry.
3. **Confirm webhooks delivered.** Check the dispatcher/outbox for `delivered`; for any row exhausted after 5 attempts, treat it as an incident: fix the cause (secret, URL, firewall `429`; see OPS-001) and re-send with the same event id.
4. **Purge the web caches (ops operator).**
   a. Page cache: delivered webhooks have already expired the tags. If delivery cannot be confirmed within 10 minutes, redeploy the production deployment (a new deployment starts with an empty ISR output only if nothing is carried over; **VERIFY**) or use the Vercel dashboard / CLI cache purge for the affected paths and tags (**VERIFY** the available command and plan tier).
   b. Image optimiser cache: invalidate the optimiser entries for each removed image URL (**VERIFY**: Vercel's image cache invalidation by source URL or tag, or a data-cache purge). Fallback if no targeted purge exists: rely on the versioned key (new URL, old derivative unreachable from new HTML) and on PR-07 TTL as the upper bound, and tell the privacy owner the residual window.
   c. CDN: confirm the old image URL itself returns `404` from Supabase after deletion.
5. **Verify** (section 7). Record times: request, authorisation, backend commit, delivery, caches purged, verified.
6. **Notify** the requester once verified, without personal detail. Update the privacy log.

## 7. Verification checklist

- [ ] Public API `GET` for the affected event/players returns initials only, or omits the data (PR-02).
- [ ] The affected pages (event page, past events, home, stories) fetched anonymously, with `Cache-Control: no-cache`, show no name or photo; check raw HTML (view source), not only the rendered page.
- [ ] The old image URL returns `404`; `/_next/image?url=<old>&w=...&q=75` returns `404` or a new/blank response, not the photo.
- [ ] Sitemap and any JSON-LD no longer include the removed person.
- [ ] Outbox shows `delivered` for every `player` / `result` / `event` row, none exhausted.
- [ ] Audit log contains the entry with request id, actor, and approver.
- [ ] Search engine removal requested if the page was indexed (manual; outside our control).

## 8. Failure modes

| Failure | Effect | Response |
|---|---|---|
| Revalidation delivery fails | Old page persists up to 15 min; indefinitely if regeneration also fails (FM-02) | Section 6 step 4a; redeploy as last resort |
| Web handler still answers `400` for `player`/`result` | Tags not expired | The tag rows in contract 5.6 are not yet implemented web-side; use step 4a manually until they are |
| Optimiser cache still serves the image | Photo reachable up to the TTL | 4b; versioned key; PR-07 bounds it |
| Backend transaction fails midway | Nothing changes | Retry; no partial public state |
| Data also in backups/logs | Not purged by this runbook | Privacy owner decides on backup retention handling; logs must not hold PII (contract 6.6) |

## 9. Open items and VERIFY list

| ID | Item |
|---|---|
| V-1 | Exact Vercel mechanism to purge the `next/image` cache for a specific source URL, and plan tier required |
| V-2 | Whether a new deployment resets ISR/data cache for production |
| V-3 | Vercel CLI or dashboard command for cache purge by tag or path |
| D-2 | Owner decision: adopt the `player`/`result` tag proposal in `ARCH-001-isr-revalidation.md` section 6 and `ARCH-001-web-frontend.md` 9.4 (web handler must stop returning `400` for these types). Not changed here (docs scope: contract and runbook only). |
| D-3 | Owner decision: confirm PR-07 TTL (1 day proposed) and the 72 h / 1 h targets |
| D-4 | Owner decision: how guardian consent is evidenced and stored (field, date, evidence reference) |
