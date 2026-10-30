---
id: PLAN-003
type: plan
feature_id: FEAT-001
architecture_id: ARCH-001
version: 1
status: draft
---

# PLAN-003: Event screens fidelity audit and plan

**Derived from:** `Frontend reference/screens/*.html` (design reference), `web/src` (verified by reading code on 2026-10-29), `PLAN-001`, `PLAN-002`, `ARCH-001-*`, `docs/architecture/pgapi-contract/ENDPOINTS-IMPLEMENTED.md`.
**Requested by the owner explicitly.** No FEAT/ARCH doc was authored for this plan; it reuses FEAT-001 / ARCH-001. No application code was changed.
**Scope:** every event-related reference screen. 57-design-system and 58-ui-states were checked for tokens/states only.
**Excluded (owner):** security review and testing tasks. **Execution:** strictly serial, one agent at a time.
**Rating scale:** DONE (structure, states and interactions match the reference), PARTIAL (gaps listed), NOT STARTED (placeholder or stub).

---

## 1. Result

32 event screens audited.

| Rating | Count | Screens |
|---|---|---|
| DONE | 10 | 02, 03, 04, 38, 40, 44, 45, 47, 48, 49 |
| PARTIAL | 18 | 05, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 37, 39, 41, 42, 43, 46 |
| NOT STARTED | 4 | 50, 51, 52, 53 (Control Room tabs, `makePlaceholder` in `features/event-control/tabs.tsx`) |

Notes on how the ratings were set:

- Screens 18 to 21 are PARTIAL, but their **action area is not built**. `SlotPanel.tsx` shows an info banner ("Online booking for this step is being finished") instead of the confirm, pay, join and accept actions. The shell, resolver and all ineligible states are done.
- The public event pages (03, 04) go beyond the reference (FAQ, logistics, JSON-LD, mobile action bar, archive gallery). They are rated DONE.
- PLAN-002 `[x]` markers were checked in code. FE-05, FE-25 to FE-33 are confirmed built. FE-06/07/08/18/19/34/35/36 are confirmed open.

### Top gaps

1. **Registration actions** (free confirm, success, waitlist join and accept-offer, paid flow with hold countdown and Razorpay checkout): all four registration screens have no working action. `createPaymentOrder` and `verifyPayment` exist in the real adapter, with no UI and no lazy Razorpay loader.
2. **Control Room Payments, Messages, Gallery and recap, Audit tabs** are placeholders. The DTOs, zod schemas and backend endpoints (C13, C14, C15, C16, C17) all exist. `exportAudit` in `real-admin.ts` still rejects ("not wired yet").
3. **Event Room** is missing the "What happens next" 4-step panel (Registration, Arrival, Pairing, Result) and the "Message event desk" action in every state.
4. **Builder steps** differ from the reference in presentation: Experience (mode cards, arrival promise, public tags), Payment (four mode cards), Game system (three mode cards), Media (preview tile, autoplay, per-image alt and focal point).
5. **Smaller gaps:** past-events type chips (05), admin events list Pairing column and chip filters (37), My Events thumbnails (23, needs a backend field), Control header Pairing tile and public-page link (46).

---

## 2. Audit tables

Backend endpoint IDs refer to `ENDPOINTS-IMPLEMENTED.md`. "Backend gaps: none" means the endpoint exists and parses with the web zod schemas.

### 2.1 Public event pages

| Screen | Route | Status | Gaps | Backend endpoints | Backend gaps | Task |
|---|---|---|---|---|---|---|
| 02-play (event listing) | `/play` | DONE | None. Filter chips (All games, Social, Beginner friendly, Rated, Free), event cards, availability badge, first-time band are all present. Search is an addition. | P02, P04 | none | none |
| 03-event-open | `/events/[slug]` | DONE | None material. Hero facts show Format instead of the reference "Availability"; availability is in the decision panel as a live island. This is a deliberate improvement. Also present: At a glance, experience, logistics, FAQ, sticky mobile bar. | P03, P04 | none | none |
| 04-event-completed | `/events/[slug]` (archive mode) | DONE | None. Hero facts (players, rounds, format, winner), final standings table, recap, gallery, next-game link. | P03, P05 | none | none |
| 05-past-events | `/past-events` | PARTIAL | Reference chips All / Social / Tournaments / Special formats are missing. Only a text search exists. `ArchiveItem.type` is already available, so no new data is needed. | P05 | none | EV-07 |

### 2.2 Registration (screens 18 to 21)

Route `/events/[slug]/register` (player area, `(auth)` layout, dynamic, noindex). Shared gaps for all four, closed in EV-02: the page title shows the event title where the reference shows "Save your board."; the side panel (`EventFacts`) lacks First-timers and Availability rows; there is no player summary card (name, PG rating).

| Screen | Status | Gaps | Backend endpoints | Backend gaps | Task |
|---|---|---|---|---|---|
| 18-register-paid | PARTIAL | Shell, resolver, `open_paid`, `hold_active`, `payment_confirming` states exist as text only. Missing: "YOUR PLACE / One last step." panel with Player, PG Rapid, Registration, Total rows; "Price and availability are rechecked server-side" note; "Continue to secure payment" action; reserve (R02), order (R04), lazy Razorpay checkout, verify (R05), hold countdown from `holdExpiresAt` and `serverNow`, confirming-payment polling (R06), `HOLD_EXPIRED` and `PAYMENT_MISMATCH` recovery UI. | R01, R02, R04, R05, R06, R07, W01 | none (R04/R05/W01 done in BE-03) | EV-04 |
| 19-register-free | PARTIAL | `open_free` shows text and a banner. Missing: "FREE EVENT / That one is on us." panel (Player, Fee Free, Membership, Total ₹0), "Confirm my place" action wired to R02 with an Idempotency-Key, double-submit guard, error states (`EVENT_FULL`, `ALREADY_REGISTERED`, `REGISTRATION_CLOSED`). | R01, R02 | none | EV-02 |
| 20-register-waitlist | PARTIAL | `waitlist_available`, `on_waitlist`, `offer_pending` exist as text only. Missing: "The room is full. You can still get in." panel with Current position, Payment Not taken, Next step; "Join waitlist" (R03); accept-offer (R08) with expiry countdown; leave waitlist (R07). | R01, R03, R07, R08 | none | EV-03 |
| 21-register-success | PARTIAL | `registered` shows "You are registered" only. Missing: CONFIRMED panel ("You're playing."), event summary card, "Open My PG" and "Back to event" actions, entry from payment success and free confirm (same panel). | R01, R06 | none | EV-02 (free path), EV-04 (paid path) |

### 2.3 Player area: My Events and Event Room

| Screen | Route | Status | Gaps | Backend endpoints | Backend gaps | Task |
|---|---|---|---|---|---|---|
| 23-my-events | `/app/events` | PARTIAL | Upcoming and History tabs, status badges (Confirmed, Payment pending, Waitlist, Cancelled, Refunded), resume payment, open room, cancel dialog all done. Missing the event thumbnail on each card. `MyRegistrationDto.event` has no cover. | M04, R07 | M04 rows carry no cover image | EV-01 (backend), EV-05 |
| 24-event-room-before-checkin | `/app/events/[id]` | PARTIAL | State panel, venue and check-in-opens facts, help panel present. Missing: "WHAT HAPPENS NEXT / Nothing to figure out." 4-step panel; "Message event desk" action; registration "Confirmed" badge in the header (header shows the room-state label instead). Help copy shortened versus the reference. | M05 | none | EV-06 |
| 25-event-room-checkin-open | same | PARTIAL | Check-in button ("I am at the venue"), hint, manual-desk variant, error banner done. Missing: What-happens-next panel, Message event desk action, copy exactness ("I'm at the venue →"). | M05, M06 | none | EV-06 |
| 26-event-room-pairing-pending | same | PARTIAL | Panel, Status "Ready to pair", checked-in time done. Missing: What-happens-next panel (step 2 ticked), Message event desk action. | M05 | none | EV-06 |
| 27-event-room-live | same | PARTIAL | Board card (board, colours, opponent, rating), result submit, confirm, dispute, bye state, standings done. Missing: What-happens-next panel (steps 1 and 2 ticked, 3 current), Message event desk action; "Pairing issue?" link target (check it points at the desk action). | M05, M07, M08, M09 | none | EV-06 |
| 28-event-room-between-rounds | same | PARTIAL | Panel, points, rounds, place, next round time, standings done. Reference score reads "1.5 / 2, Currently 8th": check the format. Missing: What-happens-next panel, Message event desk action. | M05 | none | EV-06 |
| 29-event-room-complete | same | PARTIAL | Final score and place, rating movement, rating link, archive link, standings done. Reference headline "Four games. Three new opponents. One rematch owed." is a summary line; the build has a generic headline. Missing: What-happens-next panel (all ticked), Message event desk action. | M05, M10 | none | EV-06 |

Event Room shared checks for EV-06: 320 / 390 / 1440 widths, polling-paused and offline banners, skeleton and error states, reduced motion, focus order, live-region announcements on state change.

### 2.4 Admin events and Builder steps

Builder shell (stepper, draft badge, mobile one-step mode, autosave, version conflict, blockers, preview sheet) is done.

| Screen | Route | Status | Gaps | Backend endpoints | Backend gaps | Task |
|---|---|---|---|---|---|---|
| 37-admin-events | `/admin/events` | PARTIAL | Table, search, state and type filters, pagination, empty state, New event done. Missing: Pairing column (the DTO already has `pairingMode`), area under the title, filter chips (All, Draft, Registration open, Live, Completed) instead of two selects (selects can stay under 480px), row opens Control Room. Check the capacity text format against "24/36". | E01 | none | EV-08 |
| 38-event-builder-basics | `/admin/events/new`, `/admin/events/[id]/edit` | DONE | Title, type, city, area, venue, address, starts, ends, summary, audience, slug with availability check. | E02, E04, E05, E06 | none | none |
| 39-event-builder-experience | edit step 2 | PARTIAL | Built: description, welcome label, heading and body, hosted arrival toggle, highlights, FAQ, logistics. Missing against the reference: mode cards (Hosted social, Competitive), "Arrival promise" textarea as a named field, Beginner friendly toggle placed here (it lives in Basics as audience), "Public tags". | E03, E04 | No tags field in the builder resource | EV-09 |
| 40-event-builder-registration | step 3 | DONE | Capacity (and unlimited), waitlist, opens, closes, minimum age, membership, first-timer question, server-authority hint. | E04 | none | none |
| 41-event-builder-payment | step 4 | PARTIAL | Built: price (INR), refund window, seat hold. Missing: four mode cards (Free, Fixed price, Member price, Invite or comp), Provider (Razorpay) read-only row. Member and comp pricing are excluded by OQ-09 (see section 6). | E04 | Member price and comp not in the contract | EV-10 |
| 42-event-builder-game-system | step 5 | PARTIAL | Built: rated, pool, pairing select, rounds, time control, locked-field hints. Missing: pairing mode as three described cards (Balanced social matching, Swiss tournament, Open play) instead of a Select; Rated shown as Yes/No choice. | E04 | none | EV-11 |
| 43-event-builder-media | step 6 | PARTIAL | Built: collection picker, display mode, inline new-collection panel (existing images only). Missing: hero/card preview tile with "Hero / card" label, Autoplay Off/On (collection setting), per-image alt text and focal point, upload from the builder. Upload and curation depend on the media library. | E04, S07-S12 | none | EV-12, EV-13, EV-14 |
| 44-event-builder-communications | step 7 | DONE | Five state-triggered toggles (confirmation, 24h reminder, check-in open, pairing published, post-event). Email only at launch; reference shows "In-app" for two triggers, which is out of launch scope (confirm in section 6). | E04, C15 | none | none |
| 45-event-builder-review | step 8 | DONE | Summary cards per step with links, publish blockers, SEO preview, public preview link, Save draft, Publish, Unpublish. | E03, E07, E08, PV01 | none | none |

### 2.5 Control Room tabs

Frame (header, status badge, summary strip, route-linked tabs, lifecycle actions, publish blockers) is done.

| Screen | Route | Status | Gaps | Backend endpoints | Backend gaps | Task |
|---|---|---|---|---|---|---|
| 46-event-control-overview | `/admin/events/[id]/overview` | PARTIAL | Next-up, arrivals, pairings, run of show done. Missing: Pairing tile in the summary strip (Balanced, unrated); "Edit public page" link is shown only for drafts (reference shows it for published events too, pointing to the public page or edit page as the owner decides); "Everything that can go wrong already has an owner." run-of-show heading and owner column, if C01 supplies an owner. | C01 | Run-of-show item owner/role not in C01 (verify in the DTO; ask the owner if wanted) | EV-15 |
| 47-event-control-registrations | `/admin/events/[id]/registrations` | DONE | Table with player, rating, first-timer, payment, status, actions menu. Extra columns (email, phone) are admin-only. | C02, C03 | none | none |
| 48-event-control-checkin | `/admin/events/[id]/check-in` | DONE | Counts (expected, checked in, first-timers, late), desk list, filters, undo, host queue with "Mark welcomed". | C04, C05, C03 | none | none |
| 49-event-control-pairings | `/admin/events/[id]/pairings` | DONE | Generate draft, edit boards, publish, start, results, finalise, post-publish reason, rating status, publishing warning. | C06-C12 | none | none |
| 50-event-control-payments | `/admin/events/[id]/payments` | NOT STARTED | Placeholder. Needs: table (player, amount, status, provider ID, updated), Reconcile now, refund with step-up, mismatch rows, empty and error states. `PaymentsAdminPage`, `RefundAction`, `payments-columns` from FE-17 can be reused. | C13, G05, G06 | none | EV-16 |
| 51-event-control-messages | `/admin/events/[id]/messages` | NOT STARTED | Placeholder. Needs: trigger toggles list (C15), "Send one-off message" dialog with audience and Idempotency-Key (C14, 202), message log with per-recipient state, Channel health (Email, WhatsApp, SMS). | C14, C15 | none | EV-17 |
| 52-event-control-gallery | `/admin/events/[id]/gallery` | NOT STARTED | Placeholder. Needs: gallery grid, "Upload event photos" (S07/S08 flow), alt text, recap text (4000 max), "Publish archive page" switch (disabled with reason unless completed), version conflict UX. | C16, S07-S12 | none | EV-18 |
| 53-event-control-audit | `/admin/events/[id]/audit` | NOT STARTED | Placeholder. Needs: time-ordered table (time, actor, action, object), pagination, "Export log" CSV. `real-admin.ts` `exportAudit` rejects today and needs a raw-body requester with step-up (`X-Step-Up-Token`). | C17 | none | EV-19 |

### 2.6 Tokens and states (57, 58)

- 57-design-system: palette (parchment, forest, copper), Newsreader / Anek Latin / Fragment Mono, controls (primary, secondary, consequential, status chips), spacing scale, 1440 max shell with 36 / 20 px gutters. Implemented in the token module and `components/ui`; the public and player surfaces use them. Admin uses the quiet `tone="admin"` surfaces, which matches "quiet and operational when signed in".
- 58-ui-states: loading, empty, payment pending, waitlist, pairing pending, error, permission, success. All eight exist as primitives (`Skeleton`, `EmptyState`, `Banner`, `ErrorState`, `PermissionState`). Every EV task must show the matching states for its screen. Tasks EV-02 to EV-04 specifically use "Your place is held for N minutes" with the exact expiry, "No payment taken" and "You're playing."

---

## 3. Mapping of PLAN-002 tasks (not duplicated)

| PLAN-002 task | Where it lands |
|---|---|
| FE-06 Registration free and success (19, 21) | EV-02 |
| FE-07 Registration waitlist (20) | EV-03 |
| FE-08 Registration paid flow (18) | EV-04 |
| FE-18 Media library (34 left) | EV-12 (scoped to what screens 43 and 52 need: list, upload with progress, alt text; the admin page itself stays one deliverable) |
| FE-19 Media collection editor (34 right) | EV-13 |
| FE-34 Control Payments tab (50) | EV-16 |
| FE-35 Control Messages tab (51) | EV-17 |
| FE-36 Control Gallery/recap and Audit (52, 53) | EV-18 and EV-19 |
| FE-09, FE-10, FE-11 | Not event screens. Stay in PLAN-002 |
| FE-20 to FE-24 (CMS, stories, testimonials, players, settings) | Not event screens. Stay in PLAN-002 |
| FE-37 to FE-39, FE-G, FINAL | Stay in PLAN-002 and run after this plan |

When an EV task is completed, tick the matching PLAN-002 row. FE-18 and FE-19 are one deliverable each across both plans; do not build them twice.

---

## 4. Ordered task list (serial)

Estimates: S under half a day, M about one day, L two to three days. Stage order: one backend task, then frontend tasks. Each frontend task depends on the previous one in the list unless stated, so no two tasks touch the same files at once.

| # | ID | Task | Agent | Est | Depends on | Screens |
|---|---|---|---|---|---|---|
| 1 | [x] EV-01 | Add a cover image summary to M04 `GET /me/registrations` rows (`event.cover`: src, width, height, alt, focal; `null` when none), update OpenAPI and `ENDPOINTS-IMPLEMENTED.md`, keep the envelope | backend-engineer | S | none | 23 |
| 2 | [x] EV-02 | Registration frame fidelity, free confirmation and success (= FE-06): "Save your board." title, `EventFacts` with First-timers and Availability, player summary card, free confirm action (R02), success panel with "Open My PG" and "Back to event" | frontend-engineer | M | EV-01 | 18-21 (frame), 19, 21 |
| 3 | [x] EV-03 | Waitlist join, leave and accept-offer with expiry countdown (= FE-07) | frontend-engineer | S | EV-02 | 20 |
| 4 | [x] EV-04 | Paid flow (= FE-08): reserve, hold countdown from `holdExpiresAt`/`serverNow`, order (R04), lazy Razorpay checkout, verify (R05), confirming-payment polling (R06), `HOLD_EXPIRED` / `PAYMENT_MISMATCH` / `PAYMENT_UNAVAILABLE` recovery, success hand-off to the EV-02 panel | frontend-engineer | L | EV-03 | 18, 21 |
| 5 | [x] EV-05 | My Events: event thumbnail on each card, responsive and reduced-motion check | frontend-engineer | S | EV-01, EV-04 | 23 |
| 6 | [x] EV-06 | Event Room fidelity: "What happens next" 4-step panel (state-aware ticks) and "Message event desk" action in all six states, registration badge in the header, copy match, 320/390/1440 checks | frontend-engineer | M | EV-05 | 24-29 |
| 7 | [x] EV-07 | Past events type chips (All, Social, Tournaments, Special formats) combined with the existing search, URL-hash state like Play | frontend-engineer | S | EV-06 | 05 |
| 8 | [x] EV-08 | Admin events list: Pairing column, area subtitle, state chips from 480px (selects below), row link check | frontend-engineer | S | EV-07 | 37 |
| 9 | [x] EV-09 | Builder Experience step: mode cards, "Arrival promise" field mapping, grouped like the reference. "Public tags" only after the owner answers Q3 | frontend-engineer | M | EV-08 | 39 |
| 10 | [x] EV-10 | Builder Payment step: Free and Fixed price cards over `pricePaise`, read-only Provider row, locked-field hints. Member price and Invite/comp stay out until Q1 is answered | frontend-engineer | S | EV-09 | 41 |
| 11 | [x] EV-11 | Builder Game system step: three pairing cards with descriptions, Rated Yes/No, locked-field handling | frontend-engineer | S | EV-10 | 42 |
| 12 | EV-12 | Media library core (= FE-18): grid, search, upload with progress via S07/S08, alt text and decorative flag, archive. Shared uploader component for EV-14 and EV-18 | frontend-engineer | M | EV-11 | 34 (left), 43, 52 |
| 13 | EV-13 | Media collection editor (= FE-19): static or carousel, order, alt, lazy focal-point picker | frontend-engineer | L | EV-12 | 34 (right), 43 |
| 14 | EV-14 | Builder Media step: hero/card preview tile, autoplay switch, per-image alt and focal point, upload via the shared uploader | frontend-engineer | M | EV-13 | 43 |
| 15 | EV-15 | Control Room header and Overview: Pairing tile, public-page link for published events, run-of-show owner column if C01 has it | frontend-engineer | S | EV-14 | 46 |
| 16 | EV-16 | Control Payments tab (= FE-34): event ledger, Reconcile now, refund with step-up, mismatch rows, states | frontend-engineer | S | EV-15 | 50 |
| 17 | EV-17 | Control Messages tab (= FE-35): triggers (C15), send one-off message (C14), message log and recipient state, channel health | frontend-engineer | M | EV-16 | 51 |
| 18 | EV-18 | Control Gallery and recap tab (= FE-36, part 1): gallery grid, upload via the shared uploader, recap text, publish-archive switch with disabled reason, version conflict UX | frontend-engineer | M | EV-17 | 52 |
| 19 | EV-19 | Control Audit tab (= FE-36, part 2): audit table, pagination, CSV export via a raw-body requester with step-up; replace the rejecting `exportAudit` stub | frontend-engineer | M | EV-18 | 53 |

Total: 19 tasks (1 backend, 18 frontend). Rough effort: 1 L (EV-04), 1 L (EV-13), 8 M, 9 S counting EV-01 as S.

### Dependency chain

```
EV-01 -> EV-02 -> EV-03 -> EV-04 -> EV-05 -> EV-06 -> EV-07 -> EV-08
      -> EV-09 -> EV-10 -> EV-11 -> EV-12 -> EV-13 -> EV-14
      -> EV-15 -> EV-16 -> EV-17 -> EV-18 -> EV-19
```

Critical path: EV-04 (payments UI) and EV-12 to EV-14 (media), because EV-18 reuses the uploader.

### Acceptance criteria for every EV frontend task

1. **Reference first.** The matching screen file was opened before building. Sections, states and key copy are listed in the task report (see section 5).
2. **Visual fidelity** to the reference screen at 320, 390 and 1440 px: layout, hierarchy, tokens, copy. No horizontal scroll at 320. Touch targets at least 44 px on player screens.
3. **All states of the screen:** loading (named skeleton), empty, error with retry, permission (admin), success, plus every state in the audit row for that screen (for example hold active, confirming, waitlist, offer).
4. **Real backend wiring.** Calls go through the real adapter (`NEXT_PUBLIC_USE_MOCKS=false` works end to end). No new mock data for admin screens (owner decision, FE-12). Money, price, capacity and eligibility come from the server only. Mutations send `Idempotency-Key` where `ENDPOINTS-IMPLEMENTED.md` marks it required, and `X-Step-Up-Token` where step-up applies.
5. **No admin code on public routes.** Admin features are lazy and never imported from `(public)` or `(app)` routes. The Razorpay script loads only on the paid step.
6. **Accessibility:** keyboard operable, visible focus, labelled controls, polite live regions for async state changes, state shown in words and not by colour alone.
7. **Quality gates:** `lint`, `typecheck` and the existing `vitest` suite are green. Dependency-cruiser rules M1 to M6 pass. (No new test-authoring or security-review work is in scope.)
8. **Report:** lists deliberate deviations from the reference, with the reason.

Task-specific additions:

- **EV-01 (backend):** `python manage.py check` and `makemigrations --check` clean; response keys camelCase; cover is `null` when the event has none; no PII added; OpenAPI and the endpoint table updated.
- **EV-02 to EV-04:** double-submit impossible; the exact hold expiry and "never mark paid until the server verifies" are shown; reload on any step restores the right screen from R01; the tab-hidden and offline cases do not break the countdown.
- **EV-04:** the browser never sends price or amount; the price shown is the server value; Razorpay checkout dismissal returns to the held state, not to an error.
- **EV-06:** the panel's ticks derive from `roomState` and `checkIn`, not from client guesses; "Message event desk" uses the configured public contact (P12) or `/contact`; it must work offline-safe (a plain link).
- **EV-12 to EV-14, EV-18:** upload obeys the allow-list (type and size), shows progress and a retry, and refuses publish without alt text or the decorative flag (`ALT_MISSING`). The `https` requirement for `uploadUrl` is documented for local runs (see ENDPOINTS-IMPLEMENTED, "Not conforming").
- **EV-17:** one-off send is 202 and shows per-recipient delivery state; the audience choice states how many people will receive it before send.
- **EV-19:** CSV export requires step-up; the Blob download is not parsed; empty log has a calm empty state.

---

## 5. Design reference rule for the frontend-engineer

The screens in `Frontend reference/screens/` are the **authoritative visual and behavioural reference for every event-related screen**. Before building or changing any event screen, the frontend-engineer must:

1. **Open the matching screen file** (`02`, `03`, `04`, `05`, `18` to `21`, `23` to `29`, `37` to `53`) and read it. Each file is a single-line minified HTML file: use targeted search (`rg -o` for headings, `class=` names, button text), or strip tags to read the visible text, rather than printing the whole file. Read `Frontend reference/assets/styles.css` for the classes the screen uses. Also read `57-design-system` and `58-ui-states` for tokens and states.
2. **List in the task report**, before coding: the sections in order, the content blocks, the states the screen shows or implies, the interactions (buttons, links, toggles, tabs), and the key copy strings.
3. **Reproduce them using the project's design tokens and components** (`components/ui`, `components/domain`, `components/admin`, Tailwind v4 tokens). Do not copy the reference CSS or inline styles; map each reference class to an existing component or token. Add a new shared component only when none fits.
4. **Cover states the static file cannot show** (loading, error, empty, permission, offline, version conflict, expired hold) using `58-ui-states` as the pattern.
5. **Check 320, 390 and 1440 px** against the reference layout.
6. **Call out any deliberate deviation** in the report ("Deviation: what, why, who decided"). A deviation that removes a reference element needs the owner's decision first (section 6). Better copy or behaviour than the reference is allowed only when reported.
7. Keep the existing rules: react-best-practices (server components by default, lazy admin and checkout code, no waterfalls), the web-frontend architecture rules, and the backend contract in `ENDPOINTS-IMPLEMENTED.md`.

A task is not complete if its report lacks the section and state list or the deviation list.

---

## 6. Open questions for the owner

| # | Question | Affects | Default if unanswered |
|---|---|---|---|
| Q1 | Member price and Invite/comp payment modes are in screen 41 but excluded by OQ-09. Keep them out, or add them (backend E04 fields, pricing rules, audit)? | 41, EV-10, new backend task | Keep out. Build Free and Fixed cards only |
| Q2 | Screen 44 shows "In-app" channels for check-in-open and pairing-published. Email is the only launch channel. Is in-app messaging wanted at launch? | 44, 51 | Email only; no change |
| Q3 | "Public tags" (screen 39) have no field in the builder resource. Add a tags field (backend and public cards), or drop it? | 39, EV-09 | Drop for launch |
| Q4 | "Message event desk" in the Event Room: is a link to the public contact (WhatsApp or phone from P12, or `/contact`) enough, or do you want an in-app message to hosts (new backend endpoint, inbox in the Control Room)? | 24-29, EV-06 | Link to public contact |
| Q5 | Registration page title: the reference says "Save your board." for every event; the build uses the event title. Use the reference wording, with the event title as the eyebrow? | 18-21, EV-02 | Use "Save your board." with the event title in the side panel |
| Q6 | Control header "Edit public page" for published events: open the public page, or the builder in read-only mode (locked fields)? | 46, EV-15 | Link to the public page and keep Edit for drafts |
| Q7 | Run of show owner column ("Host lead", "Admin"): wanted? It needs an owner field on C01 items. | 46, EV-15 | Skip |
| Q8 | E09 `notifyParticipants` is only recorded in the audit row; no email is sent on cancel. Build the cancellation email now (backend), or leave for later? | Control cancel, 51 | Leave for later; the button label should not promise an email |
| Q9 | "Past events" chips: map Tournaments to `rated_tournament` and `league`, Special formats to `workshop` and `special`? | 05, EV-07 | Use that mapping |
| Q10 | Event Room complete screen headline ("Four games. Three new opponents. One rematch owed."): derive from data (games played, new opponents, rematches) or keep a generic headline? | 29, EV-06 | Derive games and new opponents from the snapshot if available, else generic |

---

## 7. Blockers and risks

- None block EV-01 to EV-08. EV-04 depends on Razorpay test credentials and webhook configuration on the owner side (owner-run item from PLAN-002 Stage B exit).
- EV-12 to EV-14 and EV-18 depend on the web `httpsUrlSchema` accepting the dev `uploadUrl` (needs https origins or a web-side dev relaxation).
- EV-19 depends on adding a raw-body requester to the admin client (not present today).
- PLAN-002 front matter says admin adapter pages are "typecheck/lint only, not yet checked against the live backend". The first EV task that touches an admin screen should run it once against the live backend and report drift.
- Execution is serial: do not start EV-12 before EV-11 finishes even though they touch different files; the owner asked for a single agent at a time.
