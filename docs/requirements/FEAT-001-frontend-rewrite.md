# Requirement: Frontend Rewrite (Next.js web app, mock-first)

**ID:** FEAT-001
**Type:** requirement
**Version:** 2
**Status:** draft
**Owner:** PG Chess project owner (approval pending; no agent may self-approve)
**Date:** 2026-10-22

**Version 2 (2026-10-22):** ARCH-001 follow-ups applied. Owner approved FEAT-001 defaults on 2026-10-21 (OQ-01, 02, 03, 05, 09, 11, A-07); other open questions use proposed defaults. Status remains `draft` pending full owner document approval.

> Status is `draft` on purpose. It moves to `ready` after the schema check in the last section and to `approved` only on the owner's explicit approval. Inputs: `docs/plans/PLAN-001-frontend-rewrite.md` (TASK-001), `docs/requirements/FEAT-000-feature-inventory.md` (precursor feature list), and `Frontend reference/` (58 static screens plus docs). This document does not replace FEAT-000; it is the frontend-scoped subset with acceptance criteria.

---

## Goal

Deliver a new mobile-first Next.js + TypeScript + Tailwind web app in `web/` that implements all 58 reference screens plus a story detail page (59 total) and their states, prerenders every public page for search and sharing, and runs entirely against a typed `PgApi` contract with mocks so a separate future backend can be built to that contract.

## Problem

The current site is a client-rendered Vite SPA with hard-coded content, no CMS, no event-day experience, no slugs and no SEO surface. Search engines and link previews see an empty shell. The owner has commissioned a full rewrite (frontend and, separately, backend) to a complete design handoff covering public discovery, registration and payment, a live Event Room used on a phone at a physical event, and an admin Control Room. The backend does not exist yet, so the frontend must define what the backend has to provide and must be fully demonstrable and testable without it.

## Users

| Role | Description |
|------|-------------|
| Visitor / newcomer | Anyone not signed in, often a first-timer on a phone, arriving from search, a shared link or social media. Wants to understand PG, find a game and register with little friction. |
| Player | Signed-in account with role `player`. Registers, pays, checks in, sees pairings, submits results, views ratings, manages a private profile. Uses the Event Room on a phone at a venue, possibly on a poor network. |
| Admin / event operator | Signed-in account with role `admin`. Runs events, check-in, pairings, payments, messages, content, media and settings. Uses the check-in desk on a phone and the rest mostly on desktop. A separate host role is not assumed at launch (FEAT-000 section 3 and its OQ-02: admin-only is the default). |
| Content editor | An admin acting on website copy, stories, testimonials and media. Not a separate role in the software. |
| Search engine and social crawler | Non-human consumer of public pages. Needs real content in the first HTML response, metadata, structured data and a sitemap. |
| Backend implementer (future) | Developer or agent who will build the new backend. Consumes the exported `PgApi` contract and conformance suite produced by this feature. |
| Project owner | Approves this document, the dropped-feature list and the open-question defaults. |

## Scope and Decisions

### In scope

- The Next.js App Router web app in `web/` (React 19, TypeScript strict, Tailwind v4), all 59 screens and states (58 reference screens plus story detail), shells, guards and feedback states.
- Server prerendering (static and ISR) with on-demand revalidation for public pages, plus metadata, Open Graph, `Event` structured data, sitemap and robots.
- The `PgApi` TypeScript interface, zod schemas, a mock adapter that runs in server rendering and in the browser, mock fixtures and scenario switcher, and a contract export plus conformance suite as the backend hand-off.
- Mobile-first behaviour, WCAG 2.2 AA accessibility, a performance budget, and frontend security and privacy controls.
- The revalidation endpoint inside the web app.

### Decisions already made (recorded, not reopened)

| ID | Decision | Source | Effect on this feature |
|----|----------|--------|------------------------|
| D-01 | New app is Next.js (App Router) + TypeScript + Tailwind in `web/`. Old `src/` is not reused and is removed only at the gated cutover. | Owner / PLAN-001 v2 | Stack is fixed; ARCH-001 designs within it. |
| D-02 | Prerendering is required for public pages; Next.js was chosen for it. | Owner (plan Q7) | Public pages are static or ISR; signed-in areas are client-rendered. |
| D-03 | Event and story URLs use slugs. The backend supplies a unique `slug`, immutable once published. UUID stays internal. | Owner (plan Q4) | Slug rules in FR-03; closes FEAT-000 OQ-24 for the post-publish case (immutable). |
| D-04 | Refresh token in browser storage is accepted. Access token stays short-lived and in memory only. | Owner (plan Q2) | Token handling in FR-21; XSS controls in FR-52. |
| D-05 | Hosting: frontend on Vercel; backend on Railway (Singapore region); Supabase Postgres moving to Singapore (ap-southeast-1). | Owner, 2026-10-21 | Closes plan Q15 and FEAT-000 OQ-06 for the frontend host. Backend framework is not decided here. See constraints C-03 to C-05. |
| D-06 | Media is stored in Supabase Storage. | Owner, 2026-10-21 | Image host for `next/image` is the Supabase Storage origin (configured, not hard-coded). Closes the host part of plan Q16. |
| D-07 | Dropped: the old public Gallery page, the tournament leaderboard, and CSV export. The new per-event gallery and recap stay. | Owner (plan Q3) | Non-goals NG-01 to NG-03; AC-79. |
| D-08 | Mock-first delivery: `PgApi` plus mocks is the contract the new backend must satisfy. No task targets the current Django API. | Owner / PLAN-001 v2 | FR-53 to FR-56. |
| D-09 | Google sign-in is planned and feature-flagged. Email/password is required. | Owner / FEAT-000 | Live Google wiring is out of scope unless the flag is turned on with a backend (NG-08). |
| D-10 | Proposals P1 to P11 in the plan are approved except where Next.js supersedes them. | Owner (plan Q14) | Radix primitives, in-repo mock adapter, no GSAP, hand-rolled SVG chart, visibility-aware polling. |

Note for the plan owner: D-05 and D-06 resolve plan Q15 and part of Q16, which the plan still lists as open. This document does not edit the plan.

## Screen and Route Map (59)

Every `SCREEN-MAP.csv` row (1 to 58) is listed with its Next route, rendering mode and FEAT-000 feature IDs (from FEAT-000 Appendix A; cross-cutting F-NFR features apply to all rows and are not repeated). Several screens are states of one route. Row 59 (story detail) is a new addition (OQ-01 approved).

Rendering: **P** = prerendered (static or ISR, Server Components, volatile data in client islands); **C** = client-rendered behind auth, `noindex`; **N** = not-found handler; **D** = developer-only, disabled in production.
Tier is the FEAT-000 priority (MVP, Launch, Later). It is inferred and unconfirmed (OQ-16). All 59 are in scope of this feature; the tier guides ordering and what the backend must supply first.

| # | Screen / state | Route (Next) | Render | Tier | FEAT-000 features |
|---|----------------|--------------|--------|------|-------------------|
| 1 | Home | `/` | P | MVP | F-PUB-001, 009, 010, 011, 012; F-SEO-001, 002 |
| 2 | Play | `/play` | P | MVP | F-PUB-002, 011; F-SEO-001, 002; F-ANA-001 (not delivered, NG-12) |
| 3 | Event, open (modes: open, full, closed, sold out) | `/events/[slug]` | P (ISR) | MVP | F-PUB-003, 011, 012; F-SEO-001, 002, 003, 006; F-REG-001 |
| 4 | Event, completed (archive) | `/events/[slug]` | P (ISR) | Launch | F-PUB-004, 012; F-SEO-003, 006; F-EVT-015, 016; F-PROF-005 |
| 5 | Past events | `/past-events` | P | Launch | F-PUB-005, 011; F-SEO-001, 002; F-EVT-016 |
| 6 | Community | `/community` | P | Launch | F-PUB-006, 010, 012; F-SEO-001, 002 |
| 7 | Stories | `/stories` | P | Launch | F-PUB-007, 008 (conditional, OQ-01), 012; F-SEO-001, 002 |
| 8 | Contact | `/contact` | P (form island) | Launch | F-CON-001, 002 |
| 9 | Privacy policy | `/privacy` | P | MVP | F-LEG-001; F-SEO-001 |
| 10 | Terms of use | `/terms` | P | MVP | F-LEG-001; F-SEO-001 |
| 11 | Refund and cancellation policy | `/refund-policy` | P | MVP | F-LEG-001; F-PAY-008; F-SEO-001 |
| 12 | 404 | `not-found` (any unknown route or slug) | N | MVP | F-PUB-013 |
| 13 | Login | `/login` | C | MVP | F-AUTH-002, 003, 005, 006 |
| 14 | Create account | `/login?mode=signup` | C | MVP | F-AUTH-001, 005, 006, 008, 010; F-LEG-002 (not delivered) |
| 15 | OAuth callback (flagged) | `/auth/callback` | C | Launch | F-AUTH-005, 006 |
| 16 | Reset password (request and confirm) | `/reset-password` | C | MVP | F-AUTH-004 |
| 17 | First login / welcome | `/welcome` | C | Launch | F-PROF-001, 002; F-REG-010 |
| 18 | Registration, paid | `/events/[slug]/register` | C | MVP | F-REG-001, 003, 004, 008, 011; F-PAY-001, 002, 003, 006, 010; F-PROF-002; F-AUTH-006 |
| 19 | Registration, free | `/events/[slug]/register` | C | MVP | F-REG-001, 002, 008, 011; F-PROF-002; F-AUTH-006 |
| 20 | Registration, waitlist | `/events/[slug]/register` | C | Launch | F-REG-001, 005, 006; F-NOTI-005 (backend); F-AUTH-006 |
| 21 | Registration, success | `/events/[slug]/register` | C | MVP | F-REG-002, 004; F-PLY-005; F-COMM-001 (backend) |
| 22 | Player dashboard | `/app` | C | MVP | F-PLY-001, 003; F-PLY-004 (hidden, OQ-09); F-RATE-001, 005; F-PROF-005; F-EVT-003 |
| 23 | My events | `/app/events` | C | MVP | F-PLY-002, 005; F-REG-006, 007; F-PAY-008, 010; F-EVT-003 |
| 24 | Event room, before check-in | `/app/events/[id]` | C | MVP | F-EVT-003, 004, 013, 014 |
| 25 | Event room, check-in open | `/app/events/[id]` | C | MVP | F-EVT-003, 004, 013, 014 |
| 26 | Event room, pairing pending | `/app/events/[id]` | C | MVP | F-EVT-003, 008, 013, 014 |
| 27 | Event room, live round | `/app/events/[id]` | C | MVP | F-EVT-003, 008, 009, 010, 013, 014; F-PROF-005 |
| 28 | Event room, between rounds | `/app/events/[id]` | C | Launch | F-EVT-003, 011, 013, 014, 015 |
| 29 | Event room, complete | `/app/events/[id]` | C | Launch | F-EVT-003, 012, 013, 014, 015; F-RATE-003, 007 |
| 30 | Ratings | `/app/rating` | C | MVP | F-RATE-001, 003, 005, 006, 007 |
| 31 | Profile | `/app/profile` | C | MVP | F-PROF-003, 004; F-RATE-008; F-NFR-005 |
| 32 | Admin dashboard | `/admin` | C | Launch | F-ADEV-001; F-PAY-009; F-AADM-009 |
| 33 | Website CMS | `/admin/content` | C | Launch | F-ACMS-001, 002, 003, 004 |
| 34 | Media | `/admin/media` | C | MVP | F-ACMS-005, 006, 007, 008 |
| 35 | Stories admin | `/admin/stories` | C | Launch | F-ACMS-009; F-SEO-005, 006 |
| 36 | Testimonials admin | `/admin/testimonials` | C | Launch | F-ACMS-010 |
| 37 | Events admin | `/admin/events` | C | MVP | F-ADEV-002; F-EVT-001, 002 |
| 38 | Builder 1, Basics | `/admin/events/new` | C | MVP | F-ADEV-003, 004, 012, 013, 020; F-SEO-006 |
| 39 | Builder 2, Experience | `/admin/events/new` | C | MVP | F-ADEV-003, 005, 020 |
| 40 | Builder 3, Registration | `/admin/events/new` | C | MVP | F-ADEV-003, 006, 020; F-REG-010; F-REG-009 and F-LEG-003 (hidden, OQ-09) |
| 41 | Builder 4, Payment | `/admin/events/new` | C | MVP | F-ADEV-003, 007, 020; F-PAY-008; F-REG-009 (hidden, OQ-09) |
| 42 | Builder 5, Game system | `/admin/events/new` | C | MVP | F-ADEV-003, 008, 020; F-PAIR-004; F-RATE-006; F-PAIR-010 (Later) |
| 43 | Builder 6, Media | `/admin/events/new` | C | MVP | F-ADEV-003, 009; F-ACMS-006 |
| 44 | Builder 7, Communications | `/admin/events/new` | C | Launch | F-ADEV-003, 010; F-COMM-002 |
| 45 | Builder 8, Review and publish | `/admin/events/new` | C | MVP | F-ADEV-003, 011; F-EVT-001; F-SEO-005 |
| 46 | Control: Overview | `/admin/events/[id]/overview` | C | MVP | F-ADEV-014, 015; F-EVT-001, 006, 007; F-PAIR-003 |
| 47 | Control: Registrations | `/admin/events/[id]/registrations` | C | MVP | F-ADEV-016; F-EVT-007; F-REG-010; F-PAIR-009 |
| 48 | Control: Check-in desk | `/admin/events/[id]/check-in` | C | MVP | F-EVT-005, 006, 007 |
| 49 | Control: Pairings and rounds | `/admin/events/[id]/pairings` | C | MVP | F-PAIR-001, 002, 005, 006, 007, 008, 009; F-EVT-010; F-RATE-002 and 004 (backend) |
| 50 | Control: Payments | `/admin/events/[id]/payments` | C | MVP | F-PAY-005, 007, 009 |
| 51 | Control: Messages | `/admin/events/[id]/messages` | C | Launch | F-COMM-002, 003, 004, 005, 006; F-COMM-007 and 008 (hidden, OQ-09) |
| 52 | Control: Gallery and recap | `/admin/events/[id]/gallery` | C | Launch | F-ADEV-017; F-EVT-016; F-ACMS-006 |
| 53 | Control: Audit | `/admin/events/[id]/audit` | C | Launch | F-ADEV-018; F-AADM-008 |
| 54 | Players admin | `/admin/players` | C | Launch | F-AADM-001, 002; F-AUTH-007; F-EVT-017 |
| 55 | Payments admin | `/admin/payments` | C | MVP | F-AADM-004; F-PAY-005, 007, 009 |
| 56 | Settings admin | `/admin/settings` | C | Launch | F-AADM-005, 006; F-AUTH-007; F-COMM-006; F-CON-002 |
| 57 | Design system | `/handoff/design-system` | D | Later | F-NFR-014 |
| 58 | UI states | `/handoff/states` | D | Later | F-NFR-011, 014 |
| 59 | Story detail | `/stories/[slug]` | P | Launch | F-PUB-008 (OQ-01 approved); F-SEO-001, 006 |

Routes required but outside the 59:

| Route | Purpose | Render | Noindex |
|-------|---------|--------|---------|
| `/handoff` | Index of all routes and mock role entry (dev only) | D | yes |
| `/admin/events/[id]` | Redirects to `/admin/events/[id]/overview` | C | yes |
| `/admin/events/[id]/edit` | Edit an existing event in the builder (default for OQ-07) | C | yes |
| `/api/revalidate` | Signed on-demand revalidation endpoint (FR-10, AC-15) | server | – |
| `/api/draft` | Exchange backend preview token and enable draftMode | server | – |
| `/api/draft/exit` | Disable draftMode | server | – |
| `/api/csp-report` | Receive CSP violation reports (AC-101, AC-108) | server | – |
| `/sitemap.xml`, `/robots.txt` | Crawl surface (FR-09) | P | – |

Screen counts by area (sums to 59): public 13 (screens 1 to 12, plus 59 story detail), authentication 5 (13 to 17), registration states 4 (18 to 21), player dashboard and my events 2 (22, 23), Event Room states 6 (24 to 29), rating and profile 2 (30, 31), admin content and events 6 (32 to 37), builder steps 8 (38 to 45), Control Room tabs 8 (46 to 53), players, payments and settings 3 (54 to 56), developer handoff 2 (57, 58).

## User Stories

| ID | Statement | Priority |
|----|-----------|---------|
| US-01 | As a visitor, I want every public page to load with real content on a phone, so that I can decide whether to come without waiting for an app to start. | must |
| US-02 | As a visitor arriving from a search result or shared link, I want the page title, description and preview image to describe the event, so that I trust the link and can find the event. | must |
| US-03 | As a newcomer, I want to browse and filter upcoming games without signing in, so that I can find one that suits me. | must |
| US-04 | As a newcomer, I want to see what is expected, where, when, how much and how many places are left on one screen, so that I can register with confidence. | must |
| US-05 | As a visitor, I want to sign in only when I register and then continue exactly where I was, so that registering is not interrupted. | must |
| US-06 | As a player, I want free registration to confirm immediately and paid registration to hold my place while I pay, so that I never lose a place or pay twice. | must |
| US-07 | As a player, I want to see "confirming payment" rather than an error if my payment is captured but the page was interrupted, so that I do not pay again. | must |
| US-08 | As a player on the waitlist, I want to join without paying and see my position, so that a full event is not a dead end. | should |
| US-09 | As a player, I want one dashboard that tells me my next event, what to do and my latest result, so that I know what matters in five seconds. | must |
| US-10 | As a player at the venue, I want check-in, my board, opponent, colour, time control and result action on a 390px phone without menus or zooming, so that I can play without asking the host. | must |
| US-11 | As a player on a poor network, I want the Event Room to say when it is stale or offline and never claim a result was saved before the server confirmed it, so that I can trust what I see. | must |
| US-12 | As a player, I want to see my Blitz, Rapid and Classical ratings separately with a plain explanation of provisional ratings, so that I understand my rating. | should |
| US-13 | As a player, I want to control which of my details are public and keep email, phone and birthday private, so that I decide who sees what. | must |
| US-14 | As an admin, I want to create an event step by step, including a slug and a preview, and publish it, so that it appears on the public site without a developer. | must |
| US-15 | As an admin on a phone at the venue, I want a check-in desk that searches by name, phone or registration and checks a player in with one tap, so that arrivals are fast. | must |
| US-16 | As an admin, I want to generate, edit, publish and finalise rounds and see exactly what is blocked and why, so that I cannot publish or finalise by mistake. | must |
| US-17 | As an admin, I want payment mismatches shown and never silently fixed, so that money problems are visible. | must |
| US-18 | As a content editor, I want to edit home, community, stories, testimonials and media in structured fields with draft, preview and publish, so that I can update the site safely. | should |
| US-19 | As a content editor, I want a published change to appear on the public page promptly, so that corrections go live without a deploy. | must |
| US-20 | As an admin, I want testimonials that lack a quote, photo or consent to be impossible to publish, so that we never show someone without consent. | must |
| US-21 | As a visitor using a screen reader, keyboard, high zoom or reduced motion, I want every screen to work, so that I am not excluded. | must |
| US-22 | As a search engine, I want real HTML, canonical URLs, Event structured data and a sitemap, so that events are indexed and eligible for rich results. | must |
| US-23 | As a backend implementer, I want a typed contract, example payloads, error codes, slug rules, the revalidation webhook and a conformance suite, so that I can build the backend to match the frontend. | must |
| US-24 | As the project owner, I want the whole frontend demonstrable with mock data on a preview URL, so that I can review and approve it before any backend exists. | must |
| US-25 | As a player, I want to add a confirmed event to my calendar, so that I remember it. | could |

## Functional Requirements

Priority follows the schema (must, should, could).

### Routes, rendering and guards

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Implement all 59 screens and states (58 reference screens plus story detail) at the routes in the Screen and Route Map, faithful to `Frontend reference/screens/NN-*.html` at 1440 and 390px. | must |
| FR-02 | Route groups: `(public)` prerendered Server Components; `(auth)`, `(app)`, `(admin)` client-rendered behind auth with `noindex`; `(handoff)` developer-only and absent in production. | must |
| FR-03 | Slugs: public event and story URLs use `slug`. Slugs are lowercase URL-safe (letters, digits, single hyphens), unique and immutable once published; UUID never appears in public URLs. Builder suggests a slug from the title, checks uniqueness through the contract and makes it read-only after publish. | must |
| FR-04 | Unknown routes, unknown slugs and unpublished or draft slugs return an HTTP 404 with the designed not-found page. Route-level error pages offer retry and a way home. | must |
| FR-05 | Guards: unauthenticated access to `(app)`, `(admin)` and `/events/[slug]/register` goes to `/login` with a return-to intent; non-admin access to `(admin)` shows a permission state; the return-to target must be a same-origin relative path. UI guards are convenience only; the server stays authoritative. | must |

### Public site, SEO and prerendering

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-06 | Public pages (screens 1 to 11) contain their primary content and internal links in the first HTML response, with JavaScript disabled. | must |
| FR-07 | Each public page has a unique title, description, absolute canonical URL and Open Graph and Twitter card tags (event pages use the event image, title and date). | must |
| FR-08 | Event pages (open and completed) embed one valid schema.org `Event` JSON-LD block built from the event data, serialised safely. | must |
| FR-09 | `sitemap.xml` lists published public URLs with `lastmod`; `robots.txt` references it; non-public groups are `noindex` and not listed. | must |
| FR-10 | On-demand revalidation: a web endpoint accepts a signed request (HMAC-SHA256 over the body with a timestamp, 5-minute window, replay-safe) from the backend on publish, update, unpublish, cancel and complete of events, stories, testimonials, site content, media and legal pages, and revalidates the affected pages by cache tag. A finite time-based revalidation interval is the safety net. | must |
| FR-11 | Volatile data (places left, registration open or closed, waitlist state) is delivered by a small client island with reserved space and does not depend on the cached HTML being current. If the island fails, the page remains useful and the registration link still works. | must |
| FR-12 | Event detail has explicit modes: open, full with waitlist, full without waitlist (sold out, shows the next relevant event), registration closed, registration not yet open, completed (archive: standings, gallery, recap, no registration call to action) and cancelled (OQ-08). Decision essentials (promise, date and time, area, format, price, availability, action) come before long detail. | must |
| FR-13 | Play: search and filters All, Social, Beginner friendly, Rated, Free; cards show atmosphere, date, area, format, fee, first-timer signal, status and a direct action; empty result explains and offers reset. Lists are paginated through the contract. | must |
| FR-14 | Past events: permanent searchable archive; each entry keeps its public URL. Search covers the whole archive. | should |
| FR-15 | Media collections: 0 assets render a placeholder, 1 renders static with no controls, 2 or more render an accessible carousel (previous and next, pause, indicators, keyboard, swipe). Alt text, decorative flag and focal point from the data are honoured. The first slide is in server HTML. | must |
| FR-16 | Home, Community, navigation, footer, legal text and metadata come from published CMS content; upcoming cards come from published events. Testimonials: unpublished never render; 1 to 3 as a grid, 4 or more as an accessible carousel; none means the section is omitted. | must |
| FR-17 | Stories: featured story plus chronological grid. Story detail at `/stories/[slug]` with prerendered content and simple structured blocks (OQ-01 approved). | must |
| FR-18 | Contact: name, email, topic (joining an event, partnership, payment) and message with validation, success and service-error states. The destination is decided by the backend contract, not by the frontend. | should |
| FR-19 | Legal pages (privacy, terms, refund) render CMS text with an effective date, are linked from the footer and the payment step, and cannot ship with unapproved wording (OQ-04). | must |

### Authentication and session

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-20 | Login, create account (server field errors mapped to fields), logout, password reset request (neutral response) and confirm (token), first-login preferences (skippable, no rating exam), all preserving return-to intent. | must |
| FR-21 | Access token in memory only. Refresh token in versioned localStorage (D-04), used for silent single-flight refresh coordinated across tabs with Web Locks. Expired session sends the user to login and restores the original route. Logout clears tokens and signs out other open tabs. No token appears in URLs, logs or error messages. | must |
| FR-22 | Google sign-in: "Continue with Google" and the OAuth callback (processing, success redirect, failure recovery) render only when the feature flag is on. | should |

### Registration and payment

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-23 | One registration route resolves the state from the server (open free, open paid, full with waitlist, full without waitlist, closed, not yet open, already registered, ineligible). The browser never sends a price or currency. | must |
| FR-24 | Free: single confirmation call, success only after the server confirms. Waitlist: join without payment, show position. | must |
| FR-25 | Paid: server-created hold with an expiry countdown driven by server time, then Razorpay Standard Checkout. The Razorpay script loads only after the user starts payment. No card data touches PG pages. | must |
| FR-26 | Payment outcomes: success shows "confirming payment" until the server reports confirmed; failure or cancel keeps intent and offers retry; captured-but-uncertain polls until resolved; closing the tab and returning shows the correct state in My Events. Repeats (double tap, retry, back button) never create duplicate registrations (idempotency key on creating calls). | must |
| FR-27 | Progressive profile: ask only the fields an event requires, never a generic profile form after OAuth. | should |

### Player area

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-28 | Dashboard answers: next event, where and when, what to do, board and opponent if any, current rating, recent results. Sections load independently. | must |
| FR-29 | My Events: upcoming (confirmed, waitlist, payment pending with resume), history with a link to the archive, payment and refund states. Add to calendar is generated from event data. | must |
| FR-30 | Event Room renders six states from one server snapshot (before check-in, check-in open, checked in or pairing pending, live round, between rounds, complete), including manual-check-in-required, result awaiting confirmation and rating processing. Board, opponent, colour, time control and the result or host action come before standings and history. | must |
| FR-31 | Event Room stays current without a hard reload: visibility-aware polling that shares one request, manual refresh, a last-updated indicator and an offline banner. | must |
| FR-32 | Result submission and dispute follow the contract capability flags (OQ-02): the control appears only when the snapshot allows it, shows pending then submitted then final, keeps the choice on failure and routes "Pairing issue?" to the host. | must |
| FR-33 | Ratings: Blitz, Rapid, Classical pools; no-games state; provisional and rating-deviation explanation in plain language; no delta for unrated or social games; a trend chart with a text or table alternative; a game ledger. | should |
| FR-34 | Profile: private account fields and public chess identity separated; per-field public toggles; email read-only; unsaved-changes guard. Email, phone and birthday are never offered as public. | must |

### Admin area

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-35 | Admin shell: persistent sidebar on desktop, drawer below 960px, admin-only guard with a clear permission state. | must |
| FR-36 | Admin dashboard: today or next event, attention list (unreconciled payments, media without alt text, testimonial missing consent, capacity warning), and a no-upcoming-event state. | should |
| FR-37 | Website CMS: structured section editor (no free HTML) with states clean, dirty, validation blocked, saved-not-published, published and conflict; draft preview; publish triggers public revalidation. | should |
| FR-38 | Media: library with upload (type and size validation, progress), search, alt text or an explicit decorative flag, focal point, credit; collections (static or carousel, order, autoplay, interval); referenced assets cannot be deleted. | must |
| FR-39 | Stories admin and testimonials admin: stories with slug rules and publish; testimonials need quote, photo and consent before publish (also enforced by the server). | should |
| FR-40 | Events list with state filters; Event Builder with eight steps, per-step validation, server-side draft saving, public preview and a ready-to-publish check; edit of existing events (OQ-07). | must |
| FR-41 | Control Room: header, summary strip and eight route-linked tabs (overview, registrations, check-in, pairings and rounds, payments, messages, gallery and recap, audit). | must |
| FR-42 | Check-in desk is phone-first: search by name, phone or registration ID, one-tap check-in, first-timer marker and welcomed mark. | must |
| FR-43 | Pairings and rounds: draft generated but unpublished, edit, publish (confirmation), correction after publish creates a new version, result entry, finalise blocked until all results are final and safe against double submission. | must |
| FR-44 | Payments views (Control Room tab and global ledger): provider IDs, amount, status, mismatch flag, reconcile action and refund action with confirmation; mismatches are shown, never hidden. | must |
| FR-45 | Messages: audience selection, composer, per-recipient delivery state including partial failure, channel health. | should |
| FR-46 | Players admin: search and record detail limited to permitted fields; role assignment by admin only with confirmation. Settings: grouped sections and integration status, never showing or accepting secret values. Audit tab: filtered read and export of the audit log. | should |

### Cross-cutting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-47 | Mobile-first: primary widths 320 and 390; QA widths 1440, 1280, 1024, 768, 390, 320; reference breakpoints 1200, 960, 720, 480; touch targets, iOS input zoom, safe areas, mobile navigation, stacked admin tables below 720px, one-step builder on mobile, Event Room essentials at 390px. | must |
| FR-48 | UI states contract: loading, empty, error and disabled for every data-bearing screen, plus the registration, attendance, rating, CMS and admin-operation states in `UI-STATES.md`, all reachable through mock scenarios and the states page. | must |
| FR-49 | Accessibility to WCAG 2.2 AA. | must |
| FR-50 | Performance budget measured per route on a production build. | must |
| FR-51 | Formatting: times in IST (`Asia/Kolkata`) with explicit time zone, amounts in INR from integer paise, English only; identical output on server and client. | must |
| FR-52 | Security and privacy on the frontend: no secrets in client code, content rendered as inert text, safe JSON-LD, CSP and security headers, no private data on public pages, no third-party scripts beyond Razorpay (payment panel) and Google (flag), mocks absent from production. | must |
| FR-53 | Mock-first delivery: every screen reads and writes only through the typed `PgApi` interface; a mock adapter implements all of it. | must |
| FR-54 | Mock adapter works in server rendering and the browser, with deterministic fixtures, a scenario switcher and no mutable module-level request state. Fixtures use fictional people only. | must |
| FR-55 | Contract export: machine-readable schemas, example payloads per method, the stable error-code list, slug rules, envelope, and the revalidation webhook payload and signing scheme, traced to FEAT-000 feature IDs. | must |
| FR-56 | Conformance suite runs the same contract tests against the mock and, later, against a real base URL. | should |
| FR-57 | Error-code copy: every stable backend error code and transport failure maps to friendly copy in the frontend. | must |
| FR-58 | Feature flags: Google sign-in, Razorpay, contact mode and mocks; with a flag off, the related UI is absent or clearly unavailable, never broken. | must |
| FR-59 | Fonts (Newsreader, Anek Latin, Fragment Mono) are self-hosted and the design tokens come from `design-tokens.json`; images come from owned or licensed sources through the configured image host. No hot-linking of Google Fonts or Unsplash. | must |
| FR-60 | Hosting and environments: deployable to Vercel with preview environments; mocks allowed on preview and local, never on the production domain. | should |

## Acceptance Criteria

Verification terms: **PW** = Playwright against a production build in mock mode; **Unit** = Vitest and Testing Library; **Build** = `next build` output or script; **Manual** = documented human check. Tags like [FR-06] point to the requirement covered. Priority is must, should or could. IDs are stable; do not renumber.

### A. Routes, rendering, guards and slugs

| ID | Description | Verification | Priority |
|----|-------------|-------------|---------|
| AC-01 | Given the app in mock mode, when each of the 59 rows of the Screen and Route Map is visited at its route with the matching mock scenario, then it renders the designed content with no console errors. [FR-01] | PW matrix with one entry per screen number; report shows 59 of 59 passing. | must |
| AC-02 | Given a production build, when the build output is inspected, then every route in screens 1 to 11 is static or ISR and none is dynamically rendered per request. [FR-02] | Build output assertion script. | must |
| AC-03 | Given any route in `(auth)`, `(app)`, `(admin)` or `(handoff)`, when requested, then the response carries `noindex` (robots meta or `X-Robots-Tag`) and the URL is absent from `sitemap.xml`. [FR-02, FR-09] | PW header and meta check; sitemap parse. | must |
| AC-04 | Given a signed-out user, when they open `/app`, `/admin` or `/events/[slug]/register`, then they reach `/login` and, after login, land on the exact original URL with the registration intent intact. [FR-05] | PW for each of the three entry points. | must |
| AC-05 | Given a signed-in player, when they open any `/admin` route, then they see the permission state with a way back, and no admin data request is made. [FR-05, FR-35] | PW with request log assertion. | must |
| AC-06 | Given a login URL with a return-to value that is absolute (`https://evil.example`) or protocol-relative (`//evil.example`), when login succeeds, then the user goes to the default landing page, not the external address. [FR-05] | Unit on the redirect helper plus PW. | must |
| AC-07 | Given a published event or story, when its public URL is built, then it uses the slug and not the UUID; given an unknown, draft or unpublished slug, when requested, then the response is HTTP 404 with the designed not-found page. [FR-03, FR-04] | PW status and content check; unit on URL builders. | must |
| AC-08 | Given the builder before publish, when the title is entered, then a slug is suggested, editable, rejected inline for invalid characters, and checked for uniqueness with a "taken" message; given the event is published, then the slug field is read-only with an explanation. [FR-03] | PW builder test with mock slug-taken and published scenarios. | must |
| AC-09 | Given a route error, when it occurs, then an error page names what failed, offers retry and a link home, and shows no stack trace. [FR-04] | PW forcing a route error. | should |

### B. Prerendering, SEO and revalidation

| ID | Description | Verification | Priority |
|----|-------------|-------------|---------|
| AC-10 | Given JavaScript disabled, when any of screens 1 to 11 is fetched, then the HTML contains one `h1`, the page's primary text and its internal links; for event detail it includes title, date and time, area, price and the registration link. [FR-06] | PW with JS disabled raw-HTML assertions per route. | must |
| AC-11 | Given any public route, when its HTML head is read, then it has a unique title, a description, an absolute canonical URL, and Open Graph and Twitter tags; event titles are unique across published events. [FR-07] | PW head assertions; uniqueness check across fixtures. | must |
| AC-12 | Given a published event, when its page is fetched, then it contains exactly one JSON-LD `Event` with name, startDate and endDate (ISO 8601 with +05:30), eventStatus, eventAttendanceMode, location (Place with address), image, offers (price, priceCurrency INR, availability, url) and organizer; a free event has price 0; a cancelled event has eventStatus EventCancelled. [FR-08] | PW parse plus Google Rich Results test or schema.org validator with no errors. | must |
| AC-13 | Given CMS or event text containing `</script>`, `<` or HTML, when it is rendered in the page or in JSON-LD, then it is inert and cannot close the script tag or inject markup. [FR-08, FR-52] | Unit with hostile fixtures; PW raw-HTML check. | must |
| AC-14 | Given published and unpublished content in fixtures, when `sitemap.xml` is fetched, then it lists exactly the published events, public pages and (if OQ-01 approved) stories, each with an absolute URL and `lastmod`, and `robots.txt` points to it. [FR-09] | PW fetch and parse. | must |
| AC-15 | Given a revalidation request, when the signature is valid and the timestamp is within 5 minutes, then the tagged pages regenerate; when the signature is wrong or missing, the timestamp is older than 5 minutes, or the same request is replayed, then it is rejected and nothing regenerates. Replay protection is best-effort per server instance plus the 5-minute timestamp window, with idempotent operations, because Vercel instances do not share memory. [FR-10] | Unit on the handler plus PW with signed and tampered requests. | must |
| AC-16 | Given an admin publishes, updates or unpublishes an event, story, testimonial or CMS section in mock mode, when the mock publish trigger fires, then the public page's view-source shows the change within 5 seconds, and unpublished content returns 404. With the real backend the target is 60 seconds (OQ-11). [FR-10, US-19] | PW publish-to-visible test checking raw HTML. | must |
| AC-17 | Given the public pages, when the build output is inspected, then each declares a finite revalidation interval so that a missed webhook self-heals (interval set in ARCH-001; proposed 15 minutes for events and home). [FR-10] | Build output assertion. | must |
| AC-18 | Given the backend fails during revalidation, when the page is requested, then the previous good version is still served and no empty or error page replaces it. [FR-10] | PW with a mock failure scenario. | must |
| AC-19 | Given the event page, when it loads, then places left and registration state appear in a client island whose space is reserved (no layout shift above CLS 0.1); the cached HTML does not present availability as live; if the live read fails, the page still shows event details and a working registration link with a message that availability could not be loaded. [FR-11] | PW with throttled and failing availability responses; layout shift measurement. | must |
| AC-20 | Given each event mode (open, full with waitlist, full without waitlist, closed, not yet open, completed, cancelled), when the page renders, then it shows the correct headline state and call to action (or none), sold-out shows the next relevant event, and completed shows standings, gallery and recap with no registration call to action. A cached "open" page whose registration window has since closed shows closed once the island resolves. [FR-12] | PW scenario matrix. | must |
| AC-21 | Given the Play list, when a filter or search is applied, then results update without a full reload; combined filters and search work together; an empty result states what is absent and offers reset; with JavaScript disabled the unfiltered list is present. [FR-13] | PW and raw-HTML test. | must |
| AC-22 | Given more events than one page, when Play or Past events is used, then pagination works and Past events search finds an event that is not on the first page. [FR-13, FR-14] | PW with a paginated fixture of more than one page. | should |
| AC-23 | Given media collections of 0, 1, 2 and 5 assets, when rendered, then 0 shows a placeholder, 1 is static with no controls, 2 or more has working previous, next, indicators, pause, keyboard and swipe, the first slide is in raw HTML, alt text and focal point are applied, and a failed image falls back to a placeholder. [FR-15] | PW and unit. | must |
| AC-24 | Given 0, 2, 3, 4 and 6 published testimonials plus unpublished ones, when the home page renders, then 0 omits the section, 1 to 3 show a grid, 4 or more show an accessible carousel, and unpublished text never appears in the HTML. [FR-16] | Raw-HTML and PW checks. | must |
| AC-25 | Given a published CMS change to nav, footer, home or community text, when revalidation runs, then the new text appears on all pages that use it. [FR-16] | PW with mock publish. | should |
| AC-26 | Given the contact form, when fields are invalid, then field errors appear and are linked to the fields; when the submission succeeds, a success state replaces the form; when the service fails, the entries are kept with a retry; a second tap while sending does nothing. [FR-18] | PW with success, validation and failure scenarios. | should |
| AC-27 | Given the legal pages, when rendered, then each shows title, effective date and readable structured text, is linked from the footer and the payment step, and when legal content is unavailable shows a clear notice rather than a blank page. [FR-19] | PW. | must |
| AC-28 | Given stories with a featured one, when Stories renders, then the featured story is distinct, the rest are chronological, and each card's link goes to its slug page (OQ-01 approved). [FR-17] | PW. | must |
| AC-28a | Given a published story, when its detail page is fetched at `/stories/[slug]`, then it is prerendered with the story title, body in structured blocks (paragraph, heading, quote, image, list only), open-graph metadata, JSON-LD Article schema, and a link back to the stories list. [FR-17] | PW and raw-HTML check. | must |
| AC-28b | Given unpublished or invalid story slugs, when requested at `/stories/[slug]`, then the response is HTTP 404 with the designed not-found page. [FR-04, FR-17] | PW. | must |

### C. Authentication and registration

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-29 | Given wrong credentials, when login is submitted, then a clear invalid email or password message appears without revealing whether the account exists, and entered email is kept. [FR-20] | PW. | must |
| AC-30 | Given the server returns field errors on sign-up, when they arrive, then each is shown next to its field, linked with `aria-describedby`, and focus moves to the first error; password rules shown come from the contract; the password field is cleared. [FR-20] | PW and unit. | must |
| AC-31 | Given a registered and an unregistered email, when password reset is requested, then the response text is identical; given an expired or invalid reset token, then the user sees a clear message with a path to request again. [FR-20] | PW. | must |
| AC-32 | Given the first-login screen, when the user skips, then they continue to their original destination; preferences are optional and no rating question is asked. [FR-20] | PW. | should |
| AC-33 | Given the Google flag off, when login or sign-up renders, then there is no Google button and no Google script request; given it is on, the button is at least 44px high, the callback shows processing, success redirect, and failure with recovery (try again or use email) that keeps the return-to intent. [FR-22] | PW with flag on and off; request log. | should |
| AC-33a | Given a draft preview link from the backend issued through `/api/draft`, when the link is followed, then the page shows a persistent banner indicating draft mode, renders unpublished content with a noindex tag, is not cached publicly, and `/api/draft/exit` disables the mode. [OQ-03] | PW with draft token and noindex check. | must |
| AC-34 | Given a session, when the page reloads, then the session is restored by refresh; given concurrent 401 responses, then exactly one refresh request is made; given an expired refresh token, then the user goes to login and returns to the original route; given logout in one tab, then other open tabs sign out; at no time does a token appear in a URL, console output or error message, and the access token is never written to storage. Cross-tab refresh is coordinated with Web Locks for single-flight guarantee. [FR-21] | PW with mock token expiry and rotation; storage and log inspection. | must |
| AC-35 | Given each server state (open free, open paid, full with waitlist, full without waitlist, closed, not yet open, already registered, ineligible), when the registration route loads, then the matching panel shows (already registered links to My Events or the Event Room), and no request body contains a price or currency. [FR-23] | PW scenario matrix; request body assertion. | must |
| AC-36 | Given a free event, when the user confirms, then the button shows pending and is disabled, success appears only after the server response, and a second tap creates no second registration. [FR-24] | PW with delayed mock response. | must |
| AC-37 | Given a paid event, when registration starts, then a hold is created first, the countdown follows the server expiry (correct even if the device clock is wrong), at expiry a "hold expired" state offers to start again, and the Razorpay script is requested only after the user starts payment (never on event detail or other public routes). [FR-25] | PW with skewed clock; network log. | must |
| AC-38 | Given payment outcomes success, failure, user cancel, captured-but-uncertain and tab closed, when the player returns, then success shows "confirming payment" until the server says confirmed; failure and cancel keep the intent and offer retry with no paid state shown; uncertain polls and then gives a "still confirming, check My Events" message; double tap, retry and browser Back never produce two registrations. [FR-26] | PW payment scenario suite (every registration state in `UI-STATES.md`). | must |
| AC-39 | Given a full event with waitlist, when the player joins, then no payment UI appears, the position is shown, and a full event without waitlist shows sold out with the next event. [FR-24] | PW. | should |

### D. Player area

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-40 | Given a player with an upcoming event, when the dashboard loads, then the next-action hero states event, place, time and what to do; sections load independently so one slow or failed section does not block or blank the others; a new player sees an empty state with a link to Play. [FR-28] | PW with delayed and failing sections. | must |
| AC-41 | Given registrations of every state, when My Events renders, then confirmed, waitlist, payment pending (with resume), history (with archive link), refund pending and refunded are each distinct and correct. [FR-29] | PW scenario matrix. | must |
| AC-42 | Given a confirmed event, when "Add to calendar" is used, then a calendar entry with correct title, IST start, end and venue is produced. [FR-29, US-25] | Unit on the generator; PW download. | could |
| AC-43 | Given each Event Room state (before check-in, check-in open, checked in or pairing pending, live round, between rounds, complete) and sub-states (manual check-in required, result awaiting confirmation, rating processing), when the snapshot changes, then the correct content and actions appear and the check-in action exists only while the server allows it. [FR-30] | PW scenario matrix for screens 24 to 29. | must |
| AC-44 | Given the live-round state at 390px, when the page loads, then board number, opponent, colour, time control and the result action are visible before standings and history, require no menu and no zoom, and cause no horizontal scroll. [FR-30, FR-47] | PW at 390 and 320; DOM order assertion. | must |
| AC-45 | Given an open Event Room, when the server state changes, then the page updates without reload within the polling interval (no more than 30 seconds while visible; ARCH-001 may set lower); polling pauses when the tab is hidden and refreshes immediately when visible again; only one snapshot request is in flight however many components read it; manual refresh works; a last-updated time is shown; going offline shows a banner. [FR-31] | PW with fake timers and request log. | must |
| AC-46 | Given the result control, when the snapshot does not allow submission, then it is absent; when allowed, submission shows pending, then submitted, then final, a failure keeps the chosen result with retry, a double tap submits once, and "Pairing issue?" reaches the host contact. [FR-32] | PW scenarios. | must |
| AC-47 | Given the event is complete, when ratings are not yet processed, then the screen shows "rating processing" and no delta; once processed it shows the delta and a link to the rating page, and a processed round never shows a changed value on refresh. [FR-30, FR-33] | PW scenarios. | should |
| AC-48 | Given the rating page, when rendered, then each pool shows its own rating, deviation and games; a pool with no games shows an empty state; provisional ratings carry a plain-language explanation; unrated or social games show "no rating change"; the trend chart has a table alternative; a 1,000-row ledger fixture scrolls and filters with interactions at or below 200 ms. [FR-33] | PW and unit; performance trace. | should |
| AC-49 | Given the profile, when edited, then private and public sections are separate, email is read-only, email, phone and birthday have no public toggle, leaving with unsaved changes asks for confirmation, and save success and failure are both shown. [FR-34] | PW and unit. | must |

### E. Admin area

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-50 | Given an admin at widths below 960px, when the shell loads, then navigation is a keyboard-operable drawer with focus trap, Escape to close and focus return; at 960px and above a persistent sidebar shows. [FR-35] | PW at 390 and 1440. | must |
| AC-51 | Given the admin dashboard with no upcoming event, when it loads, then an explanatory state with a "create event" action appears; each attention item links to where it is fixed. [FR-36] | PW. | should |
| AC-52 | Given the CMS, when sections are edited, then states clean, dirty, validation blocked, saved-not-published, published and conflict are each shown; leaving with dirty changes warns; a conflict offers to see the other version and never silently overwrites; only text fields are accepted (no HTML); draft preview shows unpublished content and is not indexable or cached publicly; publishing triggers AC-16. [FR-37] | PW with mock conflict scenario. | should |
| AC-53 | Given an upload, when the file has a disallowed type or is over the size limit, then the error appears before upload; uploads show progress and a retry on failure; each asset requires alt text or an explicit decorative choice; an asset used in a collection cannot be deleted and offers archive. [FR-38] | PW and unit. | must |
| AC-54 | Given the focal point picker, collection reordering and carousel swipe, when used, then each has a single-pointer or keyboard alternative (numeric or arrow-key adjustment, move up and down buttons) and works by touch at 390px. [FR-38, FR-49] | PW touch and keyboard tests. | must |
| AC-55 | Given a collection with 0 or 1 items, when saved, then it behaves as a static media block with no broken carousel controls. [FR-38] | Unit and PW. | must |
| AC-56 | Given a testimonial missing quote, photo or consent, when the admin tries to publish, then publish is disabled with the missing items listed; the consent timestamp is shown; if the server still rejects, the error is shown without losing the form. [FR-39] | PW. | must |
| AC-57 | Given stories admin, when a slug is entered, then it follows FR-03 rules with uniqueness feedback and is read-only after publish. [FR-39] | PW. | should |
| AC-58 | Given the events list, when a state filter is chosen, then the list, counts and URL reflect it, and below 720px rows are stacked and labelled. [FR-40] | PW. | must |
| AC-59 | Given the builder, when used, then there are eight steps; Next is blocked by per-step validation with messages; the draft saves to the server with a visible saved or failed indicator; leaving with unsaved changes warns; at 390px only one step shows at a time and the preview is an explicit action; at 1440px steps, editor and preview show together. [FR-40] | PW at 390, 768 and 1440. | must |
| AC-60 | Given the review step, when opened, then a ready-to-publish checklist includes the fields needed for search and sharing (title, summary, date, venue address, price, image with alt text) and a search and share preview; publish is available only when it passes. [FR-40, FR-08] | PW. | must |
| AC-61 | Given an existing event, when edited, then fields the server reports as locked are read-only with the reason shown, and editing keeps the slug unchanged if the event is published. [FR-40] | PW (default route per OQ-07). | should |
| AC-62 | Given the Control Room, when opened, then the header and summary strip show confirmed, first-timers, checked-in and pairing; eight tabs are separate routes that can be deep-linked, Back works, and the active tab is indicated by more than colour. [FR-41] | PW. | must |
| AC-63 | Given the check-in desk at 390px, when a name, phone or registration ID is searched, then matches show, one tap checks a player in with immediate confirmation, first-timers are marked, "welcomed" can be set, and targets are at least 48px. [FR-42] | PW at 390 and 320. | must |
| AC-64 | Given pairings, when a draft is generated, then it is labelled unpublished; publishing asks for confirmation showing the number of boards; edits after publish are labelled as a new version; finalise is disabled with the reason until all results are final; a double click on finalise sends one request; the result is shown including rating processing. [FR-43] | PW scenario suite. | must |
| AC-65 | Given a payment mismatch, when payments are viewed, then the row is flagged with an explanation and is never hidden or auto-corrected; reconcile shows pending then outcome; refund requires confirmation showing amount, and refund pending and refunded are distinct states. [FR-44] | PW. | must |
| AC-66 | Given messages, when composed, then the audience and recipient count show before sending, sending asks for confirmation, and delivery state per recipient is visible; a partly failed send shows the failed count. [FR-45] | PW. | should |
| AC-67 | Given the audit tab is unavailable, when the admin works, then read-only operations remain usable and sensitive mutations are disabled with a reason if the contract says audit is required; the audit log can be filtered and exported. [FR-46] | PW with mock audit-down scenario. | should |
| AC-68 | Given players admin, when searched and opened, then only contract-permitted fields appear; a role change requires confirmation and shows its result. Given settings, then integration status is shown and no secret value is displayed or editable (only "configured" or "not configured"). [FR-46] | PW; DOM scan for secret fixtures. | should |
| AC-69 | Given any admin table at widths below 720px, when rendered, then each row is stacked with every value labelled and no horizontal page scroll; at 720px and above it is a semantic table with headers. [FR-47] | PW at 390, 720 and 1440. | must |

### F. Mobile and responsive

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-70 | Given every route and every state variant, when rendered at 320, 390, 768, 1024, 1280 and 1440px wide, then the document has no horizontal scroll (`scrollWidth` does not exceed `clientWidth`), including with very long names and titles. [FR-47] | PW responsive matrix. | must |
| AC-71 | Given any interactive element at 390px, when measured, then its target is at least 44 by 44 CSS px and form controls are 48px high; inline links within running text are exempt. [FR-47] | PW bounding-box check across routes. | must |
| AC-72 | Given any input, select or textarea, when computed at any width, then its font size is at least 16px so iOS Safari does not zoom on focus, and the viewport does not disable user zoom (no `maximum-scale=1` or `user-scalable=no`). [FR-47] | PW computed-style scan; viewport meta check; Manual on a physical iPhone. | must |
| AC-73 | Given fixed or sticky bars (event detail call to action, builder save bar, mobile menu), when rendered on a device with safe-area insets, then padding uses `env(safe-area-inset-*)`, the viewport uses `viewport-fit=cover`, and nothing important sits under a notch or home indicator. [FR-47] | Style assertion; Manual on a physical iPhone. | must |
| AC-74 | Given the public header at 390px, when used, then a compact brand and a menu trigger of at least 44px show; the menu opens and closes by touch and keyboard, closes on Escape and route change, returns focus, and the primary action stays reachable. [FR-47] | PW. | must |
| AC-75 | Given the event page at 390px, when scrolled, then decision essentials sit directly below the hero, the sticky bottom action never covers content, the footer or a focused control, and the last content can scroll fully into view. [FR-12, FR-47] | PW with scroll and focus tests. | must |
| AC-76 | Given the home page at 390px, when read in order, then the sequence is brand promise, supporting copy, primary action or proof, hero media, upcoming events; the hero is not a mandatory full-screen gate and no layout depends on `100vh`. [FR-47] | PW DOM order and viewport-height change test. | should |
| AC-77 | Given the player shell at 390px, when used, then a compact top bar and menu show and live-event essentials never require the menu. [FR-47] | PW. | must |
| AC-78 | Given images, when rendered, then they use responsive `sizes`, reserved aspect ratio and the focal point, the largest above-the-fold image has priority and others are lazy, with no layout shift. [FR-47, FR-50] | PW layout-shift measurement; unit. | must |

### G. Scope exclusions

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-79 | Given the app, when routes, navigation and controls are inspected, then there is no public Gallery page, no leaderboard and no CSV export control for players or tournaments; per-event gallery and recap exist on screens 4 and 52; the audit log export (screen 53) is the only export. [D-07] | Route manifest check; navigation scan; code search. | must |

### H. UI states

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-80 | Given any data-bearing screen, when its data is loading, empty, failed or present, then a layout-matching skeleton, an empty state that says what is absent and offers a next action, an error that names the failed action (never "something went wrong"), and the data each appear; secondary requests never block the page. [FR-48] | PW using mock scenarios; every screen has all four. | must |
| AC-81 | Given an error, when shown, then entered data and intent are preserved, retry appears only where retrying is safe, and no stack trace, provider detail or secret appears. [FR-48] | PW and unit. | must |
| AC-82 | Given the 49 states listed in `UI-STATES.md` (Authentication 6, Event registration 10, Event attendance 10, Player ratings 5, CMS 9, Admin operations 9), when the mock scenario for each is selected, then the matching UI appears and an automated test exists for it; the same states are shown on `/handoff/states`. [FR-48] | Scenario catalogue count equals 49 with one test each; PW. | must |
| AC-83 | Given a poor network or offline, when a result, payment or admin mutation is made, then pending is shown, success is shown only after server confirmation, and failure keeps the user's input; an offline banner appears. [FR-48, US-11] | PW with network throttling and offline. | must |
| AC-84 | Given a disabled control for an important action, when shown, then a visible text reason accompanies it (not only a tooltip). [FR-48] | PW and axe. | should |
| AC-85 | Given the stable backend error codes in the contract export, when the copy map is checked, then every code has friendly copy, and an unknown code or network failure uses the fallback copy. [FR-57] | Unit comparing the map to the exported code list. | must |

### I. Accessibility

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-86 | Given every route and state at 390 and 1440, when axe runs, then there are zero serious or critical violations. [FR-49] | PW with axe over the matrix in AC-01. | must |
| AC-87 | Given keyboard only, when any screen is used, then every action is operable in a logical order, focus is always visible and never hidden behind a sticky bar, and the skip link is the first focusable element and moves focus to main content. [FR-49] | PW keyboard tests; Manual. | must |
| AC-88 | Given forms, when errors occur, then each control has a label, errors are linked to controls (`aria-describedby`, `aria-invalid`), required fields are not marked by colour alone and focus moves to the first error. [FR-49] | Unit and PW. | must |
| AC-89 | Given dialogs, drawers and sheets, when opened, then focus is trapped, Escape closes, background is inert, and focus returns to the trigger. [FR-49] | Unit and PW. | must |
| AC-90 | Given dynamic updates (toasts, hold countdown, polling changes, save status), when they occur, then they are announced politely through live regions without announcing every second of a countdown or every poll. [FR-49] | Unit; Manual with screen reader. | must |
| AC-91 | Given the design tokens, when checked, then text contrast is at least 4.5:1, interactive component and focus contrast at least 3:1, and no state relies on copper or green alone. [FR-49] | Token contrast script; axe; Manual. | must |
| AC-92 | Given carousels and motion, when `prefers-reduced-motion` is set, then autoplay and parallax are off; autoplay content has a pause control and no essential information advances automatically. [FR-49, FR-15] | PW with emulated reduced motion. | must |
| AC-93 | Given the page structure, when inspected, then headings are in order, landmarks exist, each page has a unique title, and `lang` is set. [FR-49] | axe and unit. | must |
| AC-94 | Given the charts, when the rating trend renders, then a table or text alternative conveys the same data. [FR-33, FR-49] | PW. | should |
| AC-95 | Given the release candidate, when audited by hand, then keyboard-only, VoiceOver with Safari, NVDA with Firefox or Chrome, 200% zoom and a 320px layout are tested on the public, registration, Event Room and admin builder paths with no blocking issue left open. [FR-49] | Manual audit report. | must |

### J. Performance

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-96 | Given the production build in mock mode, when Lighthouse runs with its default mobile profile on Home, Play, Event detail, Past events, Stories, Community and Contact, then LCP is at most 2.5 s, CLS at most 0.1, total blocking time at most 200 ms, and the Performance score at least 90 (targets proposed, OQ-11). [FR-50] | Lighthouse CI report attached to the QA task. | must |
| AC-97 | Given a Playwright trace on Play filtering, the mobile menu and Event Room refresh, when interactions run, then interaction latency is at most 200 ms. Field INP is measured only after cutover. [FR-50] | PW performance trace. | should |
| AC-98 | Given `next build`, when First Load JS per route is read, then each route is within the numeric budget set in ARCH-001 (from the empty-app baseline) and CI fails on regression; public routes contain no admin, authenticated-area, chart, editor, carousel implementation beyond what the first view needs, or Razorpay code. [FR-50] | Build size check; bundle analyzer assertion. | must |
| AC-99 | Given any route, when the network log is read, then requests go only to: first-party URLs, Supabase Storage (media host), Razorpay (payment panel on paid registration only), and Google (when the flag is on for OAuth). No requests to Google Fonts, Unsplash or other third-party font or image hosts. Fonts come from the app with fallback metrics. [FR-59, AC-106] | PW request log; layout shift measurement. | must |

### K. Security and privacy

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-100 | Given the built client bundles, when scanned, then they contain no server-only secrets or internal API URLs (revalidation secret, provider API secrets), only environment variables prefixed `NEXT_PUBLIC_`. Third-party hosts allowed are Razorpay (payment) and Google (auth flag). [FR-52] | Build-time bundle scan. | must |
| AC-101 | Given any route, when its headers are read, then a Content-Security-Policy is present: client groups `(auth)`, `(app)`, `(admin)` use a nonce-based CSP without `unsafe-inline` scripts; public static pages use a static CSP without `unsafe-eval`. All routes carry `X-Content-Type-Options`, Referrer-Policy and Permissions-Policy; public routes remain static or ISR. [FR-52] | PW header assertions; AC-02. | must |
| AC-102 | Given CMS, story, testimonial, legal and event text with HTML or script content, when rendered, then it displays as inert text and no unsanitised HTML injection is used. [FR-52] | Lint rule banning raw HTML injection; unit with hostile fixtures. | must |
| AC-103 | Given mock data that includes private fields (email, phone, registration ID, provider IDs) in non-public records, when public routes and public API responses are scanned, then none of those values appears. [FR-52] | Fixture-based scan of raw HTML and network responses. | must |
| AC-104 | Given a production build with mocks off, when inspected, then mock code and fixtures are absent from the bundle and `/handoff` returns 404; given mocks on, a persistent "mock data" indicator is visible and `/api/draft` is inactive; a production-environment deployment configured with mocks on fails the build. [FR-52, FR-60] | Bundle analysis; PW; build check. | must |
| AC-105 | Given a mid-session 401 or 403 (`AUTH_REQUIRED`, `ADMIN_REQUIRED`), when received, then the app shows login or the permission state and discards cached private data. [FR-05] | PW with mock role change. | must |
| AC-106 | Given any route, when scripts are listed, then the only third-party scripts are Razorpay (payment panel) and Google (when the flag is on). [FR-52] | PW request log. | must |
| AC-107 | Given mock fixtures, when reviewed, then they contain only fictional people and no real names, emails or phone numbers; the real testimonial records pending consent are not used. [FR-54] | Fixture review. | must |
| AC-108 | Given the revalidation secret, when the endpoint runs, then the secret is read only on the server and the endpoint response reveals nothing about why a request failed beyond a generic rejection. [FR-10] | Unit and security review. | must |

### L. Mock-first and contract

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-109 | Given the code, when searched, then no component or page calls the network or imports the mock directly; all data goes through `PgApi`; switching to a real adapter needs configuration (API base URL) and no component changes. [FR-53] | Lint rule; code search; architect review. | must |
| AC-110 | Given the mock adapter, when two concurrent server requests use different scenarios, then neither sees the other's state; the adapter works in server rendering and in the browser; fixtures are deterministic. [FR-54] | Unit concurrency test. | must |
| AC-111 | Given the contract export, when reviewed, then it contains schemas, an example payload per method, the error-code list, slug rules, the envelope, and the revalidation webhook payload and signing scheme. [FR-55] | Export folder review against a checklist. | must |
| AC-112 | Given FEAT-000, when the contract export is cross-checked, then every feature with a screen in the 59 total (58 reference plus story detail) maps to at least one `PgApi` method or is marked backend-only or no-UI. [FR-55] | Traceability table review by the architect. | must |
| AC-113 | Given the conformance suite, when run against the mock, then every `PgApi` method passes; the same suite can run against a configured base URL. [FR-56] | Suite run in CI. | should |

### M. Formatting, flags, assets and hosting

| ID | Description | Verification | Priority |
|----|-------------|----------|--------|
| AC-114 | Given a timestamp, when rendered on the server and in the browser under different system time zones (UTC and America/New_York), then the visible text is identical, shows IST explicitly, and produces no hydration warning. [FR-51] | Unit and PW under two TZ values. | must |
| AC-115 | Given integer paise, when formatted, then 0 shows "Free", 50000 shows the rupee amount without decimals (assumption A-07), 150050 shows two decimals, and amounts over one lakh use Indian digit grouping. [FR-51] | Unit. | must |
| AC-116 | Given each feature flag (Google, Razorpay, contact mode, mocks), when switched off, then the related UI is absent or shows a clear unavailable state with no broken control (Razorpay off: paid registration shows that online payment is unavailable and attempts no payment). [FR-58] | PW with flags. | must |
| AC-117 | Given design tokens, when linted, then no raw colours or off-scale spacing appear in components, and visual QA at 1440 and 390 against the reference screens and `VISUAL-QA.md` shows no unapproved deviation. [FR-01, FR-59] | Lint; Manual visual QA report. | should |
| AC-118 | Given media in Supabase Storage, when rendered, then images load through `next/image` from a host allow-listed by configuration; no project URL is hard-coded; an image from a non-allow-listed host does not render. [D-06, FR-59] | Config review; PW. | must |
| AC-119 | Given the supported browser floor (OQ-05), when the public, registration and Event Room paths run in each, then they work without layout breakage. [FR-47] | PW projects or Manual on devices. | should |
| AC-120 | Given a Vercel preview deployment in mock mode, when opened, then all 59 screens (58 reference plus story detail) are reachable and revalidation works; production-domain configuration cannot enable mocks. [FR-60, D-05] | Deployment smoke test (blocked until hosting is provisioned). | should |

## Edge Cases

Each edge case is covered by the acceptance criterion shown.

| ID | Edge case | Expected behaviour | Covered by |
|----|-----------|--------------------|-----------|
| EC-01 | Backend down or returns empty during revalidation | Previous good page keeps serving; empty data never replaces a page. | AC-18 |
| EC-02 | Event published with missing venue address or image | Builder blocks publish for search-critical fields; JSON-LD omits fields rather than emitting invalid values. | AC-60, AC-12 |
| EC-03 | Two admins pick the same slug | Server rejects; builder shows "taken" and suggests another. | AC-08 |
| EC-04 | Cached event page says open but registration closed or filled since | Island and registration route use live state; page updates to closed or full. | AC-19, AC-20 |
| EC-05 | Hold expires while the payment sheet is open, or payment lands after expiry | UI shows only what the server reports (hold expired, confirmed, or refund pending). The business rule is a backend decision (OQ-17). | AC-37, AC-38 |
| EC-06 | Double tap, two tabs or Back button during any mutation | One effect only; idempotency key on creating calls; pending state locks the control. | AC-36, AC-38, AC-46, AC-64 |
| EC-07 | Session expires while editing in CMS or builder | Unsaved edits are not lost; user re-authenticates and continues (mechanism set in ARCH-001). | AC-34, AC-52, AC-59 |
| EC-08 | Device clock wrong | Countdown, hold and check-in window use server time. | AC-37, AC-45 |
| EC-09 | Phone sleeps or loses signal for minutes at a venue | On return, the Event Room refreshes at once and shows last-updated and offline states. | AC-45, AC-83 |
| EC-10 | Very long event titles, player names or venue names | Text wraps; no overflow at 320px. | AC-70 |
| EC-11 | Thousands of past events or ledger rows | Pagination or deferred rendering; interactions stay fast. | AC-22, AC-48 |
| EC-12 | JavaScript disabled or fails | Public content and links remain readable; interactive features need JavaScript (accepted). | AC-10, AC-21 |
| EC-13 | No published events at all | Home and Play show an explanatory empty state and a next action (for example past events or Community). | AC-80 |
| EC-14 | Content unpublished while a visitor is on the page | Next navigation to it returns 404. | AC-07, AC-16 |
| EC-15 | Admin role removed while signed in | Next request returns 403; UI shows the permission state. | AC-105 |
| EC-16 | Image missing, broken or slow | Placeholder shown; no layout shift. | AC-23, AC-78 |
| EC-17 | Carousel with one slide or reduced motion on | Static or paused; no broken controls. | AC-23, AC-55, AC-92 |
| EC-18 | Visitor outside India | Times are labelled IST. | AC-114 |
| EC-19 | Mobile browser toolbar shows or hides | No layout relies on `100vh`; fixed bars stay usable. | AC-73, AC-76 |
| EC-20 | Mock mode reached on the production domain | Build refuses it; scenario switcher and handoff routes absent. | AC-104 |
| EC-21 | Slug published by mistake | Slug cannot be changed after publish; correction path is a backend or support matter (OQ-15). | AC-08 |
| EC-22 | Missing alt text on a media asset | Flagged as needing attention; enforcement level per OQ-12. | AC-53, AC-51 |

## Non-Goals

- **NG-01** Old public Gallery page (D-07). Per-event gallery and recap stay.
- **NG-02** Tournament leaderboard (global rating table). Per-event standings stay.
- **NG-03** CSV export of players or tournaments. The audit log export is a different feature and stays.
- **NG-04** Backend implementation: API, database, migration to Singapore, Railway deployment, Razorpay server code, webhook sender, rating and pairing engines, email and messaging, scheduled jobs, audit storage. These belong to a separate backend plan; this feature only defines the contract.
- **NG-05** Legacy data migration (F-NFR-008).
- **NG-06** Cutover to production and deleting legacy `src/`. These are gated by the owner's explicit approval and blocked on the backend plan (PLAN-001 Phase 8).
- **NG-07** Reusing any legacy frontend code, including the 3D pawn, shader rings and background blobs.
- **NG-08** Live Google sign-in wiring (real OAuth client, backend account linking). The UI is flagged and testable against mocks only.
- **NG-09** Controls for features that are undecided or Later (rematch requests, member, comp and donation pricing, WhatsApp and SMS channels, event waivers) are hidden by default (OQ-09).
- **NG-10** Public player profile page (FEAT-000 OQ-26), in-app notification inbox or bell (OQ-28), contact preference and consent screens, host or organiser role screens, admin MFA screens.
- **NG-11** League and workshop engines, and realtime (websocket) updates; polling is used.
- **NG-12** Analytics: no funnel events and no third-party analytics script in this feature (plan Q12; OQ-10).
- **NG-13** Internationalisation: English only.
- **NG-14** Installable PWA is optional and late (PLAN-001 TASK-103); not required for approval.
- **NG-15** Generic social feed, direct messages, streak mechanics, arbitrary HTML injection, claims of FIDE pairing, and any card data collection on PG pages (PRODUCT-SCOPE).

## Constraints

- **C-01** Stack: Next.js App Router, React 19, TypeScript strict, Tailwind v4 with tokens from `design-tokens.json`, TanStack Query in client areas only, react-hook-form with zod. Static export is not possible (ISR and revalidation need a server).
- **C-02** Governing React standard: the `react-best-practices` skill (server-side rules apply). Server Components by default; client code only for interaction; no mutable module-level request state, including in mocks; Server Actions only if ARCH-001 justifies them.
- **C-03** Hosting is Vercel (frontend) and Railway Singapore (backend) with Supabase Postgres moving to Singapore (D-05). The architect chooses the Vercel function region; default Singapore, to keep server-to-backend latency low for Indian users.
- **C-04** The revalidation endpoint must be publicly reachable by the backend over HTTPS with a per-environment secret; CORS, API base URLs and the secret are environment configuration.
- **C-05** Media comes from Supabase Storage (D-06). The Supabase host changes with the Singapore move, so the image host is configuration, never hard-coded.
- **C-06** ✓ **Resolved** (DEC-005, ARCH-001 section 10): Split CSP by route class. Public pages use a static CSP (`script-src 'self' 'unsafe-inline'`); client groups use nonce-based CSP. Public pages stay static or ISR.
- **C-07** Browser floor is driven by Tailwind v4 (Safari 16.4+, Chrome 111+ as stated in the plan); the supported list is OQ-05.
- **C-08** Times use IST, currency INR in integer paise, English copy.
- **C-09** The server owns price, capacity, holds, payment state, roles and slug uniqueness. The frontend never decides them and never trusts the browser for them.
- **C-10** All API responses use the unified envelope (`success`, `data`, `error`, `meta`) and the stable error codes; copy for codes lives in the frontend.
- **C-11** Reference docs describe a Supabase and Vite implementation; they are design intent for behaviour, not mechanism (FEAT-000 caution). The reference HTML screens are the visual source of truth.
- **C-12** Old `src/` is untouched until the gated cutover task.
- **C-13** Mock mode is never enabled on the production domain; mock fixtures contain no real personal data.
- **C-14** The reference hot-links Google Fonts and Unsplash; production uses self-hosted fonts and licensed or owned imagery only.

## Dependencies

| Name | Type | Required | Notes |
|------|------|----------|-------|
| PLAN-001 (frontend rewrite plan) | document | true | |
| ARCH-001 (Next.js architecture; to be written after this document is approved) | document | true | |
| FEAT-000 feature inventory | document | true | |
| `Frontend reference/` (screens, docs, design tokens) | document | true | |
| New backend plan and implementation (separate, not yet written) | team | false | Required for cutover; optional for the build |
| Asset inventory (TASK-005): fonts, licensed imagery, brand mark, image host | document | true | |
| Final logo and licensed photography from the owner | external | false | Placeholders acceptable for the build; required for launch |
| Approved legal wording and a named approver (OQ-04) | external | false | Required for launch; not for the build |
| Vercel project, Railway and Supabase Singapore accounts | external | false | Required for staging; optional for local build |
| Google OAuth client and Razorpay test credentials | external | false | Only for real wiring; not required for mock-mode build |

## Assumptions

- **A-01** Numeric budgets (First Load JS per route, polling interval, revalidation intervals) are set in ARCH-001 after measuring the empty app; the targets in this document are proposals the owner confirms (OQ-11).
- **A-02** Tiers (MVP, Launch, Later) come from FEAT-000 and are unconfirmed (OQ-16).
- **A-03** Roles at launch are `player` and `admin` only; the guard design allows more later.
- **A-04** The Event Room state is derived from one server snapshot and the capability flags in it; the frontend does not decide who may submit results.
- **A-05** List endpoints are paginated by the contract; page sizes come from the contract.
- **A-06** `next/image` optimisation is done by the host (Vercel) from Supabase Storage originals; ARCH-001 may substitute.
- **A-07** ✓ **DECIDED** (owner, 2026-10-21) Money display: whole rupees without decimals, otherwise two decimals, Indian digit grouping, "Free" for zero (AC-115). Owner approved this as the standard formatting.
- **A-08** Reference screens that use placeholder people and photos stay placeholders until owner content arrives.
- **A-09** Page and event times display in the 12-hour format used by the reference screens, with IST named explicitly.
- **A-10** Supabase Storage serves published media from a public-read location; unpublished media is visible only in admin (OQ-14).

## Open Questions

"Proposed default" is what the team will use if the owner does not answer; it is not a decision. Blocking is `true` only if the work cannot reasonably start without an answer. Where a question only blocks launch or cutover, not the build, it is `false` and the question text says so.

| ID | Question | Blocking | Owner | Proposed default |
|----|----------|---------|-------|------------------|
| OQ-01 | ✓ **DECIDED** (owner, 2026-10-21) | – | Project owner (with designer) | **Approved default:** Yes: story detail page at `/stories/[slug]`, prerendered with simple structured blocks (closed block model), in the sitemap. Row 59 in the screen map. |
| OQ-02 | ✓ **DECIDED** (owner, 2026-10-21) | – | Project owner | **Approved default:** Either player submits; opponent or host confirms; admin resolves disputes. The UI follows capability flags in the snapshot (FR-32). |
| OQ-03 | ✓ **DECIDED** (owner, 2026-10-21) | – | Architect | **Approved default:** Next.js `draftMode` in real mode with a short-lived backend-issued preview token (endpoints `/api/draft`, `/api/draft/exit`); a mock-only preview route in mock mode. Always `noindex`, never cached publicly. |
| OQ-04 | Who owns and approves the privacy, terms and refund wording (and tax or invoice text)? Blocks launch, not the build. | false | Project owner | Owner names an approver before the cutover gate; pages show a clear notice, not placeholder legal text, until wording is approved. |
| OQ-05 | ✓ **DECIDED** (owner, 2026-10-21) | – | Project owner | **Approved default:** Last two versions of Chrome, Edge, Firefox and Safari, plus iOS Safari 16.4+ and Chrome Android 111+; older browsers see readable public content without styling guarantees. |
| OQ-06 | Do the signed-in routes use the event UUID, the registration ID or the slug in `/app/events/[id]` and `/admin/events/[id]`? | false | Architect | Event UUID (internal ID) for signed-in and admin routes; slugs for public routes and `/events/[slug]/register`. |
| OQ-07 | Editing an existing event: reuse the builder at an edit URL, persist drafts server-side, and which fields lock once registrations or payments exist? (plan Q6; FEAT-000 OQ-22) | false | Project owner | Reuse the builder at `/admin/events/[id]/edit`; drafts persist server-side; the server reports locked fields (default: price, capacity reduction and game system after registrations exist). |
| OQ-08 | How is a cancelled event shown publicly? The reference has no cancelled mode. | false | Project owner | Page stays at its URL with a clear cancelled notice, no registration action, JSON-LD EventCancelled, and removed from the Play list. |
| OQ-09 | ✓ **DECIDED** (owner, 2026-10-21) | – | Project owner | **Approved default:** Hide all controls for rematch, member/comp/donation pricing, WhatsApp/SMS and waivers; email is the only notification channel (FR-45). |
| OQ-10 | Contact form destination and analytics approach. (plan Q12; FEAT-000 OQ-05, OQ-19) | false | Project owner | Form posts to a contract endpoint, destination from settings; no analytics in this feature. |
| OQ-11 | ✓ **DECIDED** (owner, 2026-10-21) | – | Project owner (with architect) | **Approved default:** LCP 2.5 s, CLS 0.1, TBT 200 ms, Lighthouse Performance 90 on mobile; publish to visible within 60 seconds with real backend; safety-net revalidation every 15 minutes (AC-17). |
| OQ-12 | Missing alt text on a media asset: warn or block publish? | false | Project owner | Warn and list it in the dashboard attention list; does not block. Decorative must be an explicit choice. |
| OQ-13 | Redirects from legacy public URLs (old Tournaments and Gallery pages) at cutover. Affects cutover only. | false | Project owner | Redirect the old tournament list and Gallery URLs to `/play` and `/past-events`; legacy per-event UUID URLs go to `/play` because slugs cannot be derived. |
| OQ-14 | Media visibility in Supabase Storage: public-read for published media, signed URLs for unpublished? | false | Architect | Public-read for published media; signed URLs for drafts in admin. |
| OQ-15 | Is any path needed to correct a mistaken slug after publish, given slugs are immutable? (FEAT-000 OQ-24) | false | Project owner | None in the UI; create a corrected event or have the backend team change it. |
| OQ-16 | Confirm the MVP, Launch and Later tiers inferred in FEAT-000. | false | Project owner | Use FEAT-000 tiers for ordering; all 59 screens (58 reference plus story detail) are still built. |
| OQ-17 | What does the player see and who resolves it when payment is captured after the hold expired or the event filled? This is a backend rule; the frontend renders the reported state. | false | Project owner (with backend plan) | The server decides: confirm if capacity allows, otherwise automatic refund with a visible refund-pending state and a support link. |
| OQ-18 | Is the audit log export on screen 53 retained? It is distinct from the dropped CSV export. | false | Project owner | Retain. |

## Success Metrics

| Metric | Target |
|--------|--------|
| Screens and states reachable and passing in mock mode | 59 of 59 |
| axe serious or critical violations across all routes and states at 390 and 1440 | 0 |
| Horizontal scroll defects at 320 and 390 across the responsive matrix | 0 |
| Public routes (screens 1 to 11) with primary content in raw HTML | 11 of 11 |
| Event pages with valid `Event` structured data (no errors in the rich results test) | 100% |
| Lighthouse mobile on the seven public pages in AC-96: LCP / CLS / TBT / Performance score | at most 2.5 s / at most 0.1 / at most 200 ms / at least 90 (proposed) |
| Publish-to-visible latency, mock mode / real backend | within 5 s / within 60 s (proposed) |
| First Load JS per route versus the ARCH-001 budget | within budget, enforced in CI |
| `PgApi` methods passing the conformance suite against the mock | 100% |
| FEAT-000 features with a screen traced to a contract method or marked backend-only | 100% |
| Requests to third-party font or image hosts | 0 |
| Interaction latency on Play filtering, mobile menu and Event Room refresh | at most 200 ms |

## FEAT-000 Coverage

How each FEAT-000 feature group is treated by this feature. "UI" means the screen and client behaviour are delivered here and the capability is a contract method; "backend only" means it appears only as a contract requirement and in the exported contract.

| Treatment | Features |
|-----------|----------|
| UI delivered | F-PUB-001 to 008 (story detail approved), 009 to 013; F-SEO-001 to 006 (frontend side: render, metadata, JSON-LD, sitemap, revalidation endpoint, slug use); F-AUTH-001 to 004, 006, 007 (role-aware UI and role assignment on Players admin); F-PROF-001, 002, 003, 004, 005; F-PLY-001, 002, 003, 005; F-REG-001 to 008, 010, 011 (idempotency key sent); F-PAY-001 to 003, 005, 007 to 010 (checkout handoff and admin views); F-EVT-001 to 017; F-PAIR-001 to 009 (UI and result entry; engines are backend); F-RATE-001, 003, 005 to 008 (display); F-ADEV-001 to 018, 020; F-ACMS-001 to 010; F-AADM-001, 002, 004 to 006, 008, 009; F-COMM-002 to 006; F-CON-001, 002; F-LEG-001; F-NFR-001, 002, 003, 004 (frontend part), 005 (frontend part), 007, 009, 011, 012, 014 |
| UI conditional on a decision | F-AUTH-005 Google sign-in (flag, NG-08); F-EVT-009 and 010 result submission and dispute (capability flags, OQ-02) |
| Hidden by default | F-PLY-004 rematch; F-REG-009 member, comp, donation pricing; F-COMM-007, 008 WhatsApp and SMS; F-LEG-003 waiver (OQ-09); F-PAIR-010 league and workshop engines |
| Backend only (contract entry, no frontend work beyond calling it) | F-AUTH-008; F-REG-011 server side; F-PAY-004, 006, 011; F-RATE-002, 004, 009; F-AADM-007; F-COMM-001; F-NOTI-001 to 006; F-NFR-006, 008, 010, 013 |
| Not delivered | F-AUTH-009 admin MFA; F-AUTH-010 email verification (rendered only if the contract returns that state); F-ADEV-019 venues and hosts; F-AADM-003 event-scoped host permissions; F-COMM-009 consent preferences; F-CON-003 contact inbox; F-LEG-002, 004; F-ANA-001 to 003 (NG-12) |

## Schema Conformance

Checked by hand against `schemas/requirement.schema.yaml` on 2026-10-21. No validator was run (this agent has no execution tool); please run one on a parsed copy before moving status to `ready`.

| Schema property | Where it is in this document | Result |
|-----------------|-------------------------------|--------|
| `id` (pattern `^FEAT-[0-9]{3,}$`) | Header: FEAT-001 | Pass |
| `type` (const `requirement`) | Header | Pass |
| `version` (integer, at least 1) | Header: 2 | Pass |
| `status` (enum) | Header: `draft` | Pass |
| `title` | Document title | Pass |
| `goal` | Goal section, one sentence | Pass |
| `problem`, `users` (role, description) | Problem, Users | Pass |
| `user_stories` (id, statement, priority in must, should, could) | US-01 to US-25 | Pass |
| `functional_requirements` (id, description, priority) | FR-01 to FR-60 | Pass |
| `acceptance_criteria` (at least 1; id, description, verification required) | AC-01 to AC-120 plus AC-28a, AC-28b, AC-33a (123 total); every row has all three; priorities are must, should or could | Pass |
| `non_goals` | NG-01 to NG-15 | Pass |
| `constraints` | C-01 to C-14 | Pass |
| `dependencies` (name required) | Dependencies table | Pass |
| `assumptions` | A-01 to A-10 | Pass |
| `open_questions` (id, question; blocking boolean) | OQ-01 to OQ-18; Blocking column holds plain `true` or `false` only | Pass |
| `success_metrics` (metric required) | Success Metrics table | Pass |
| `owner` | Header | Pass |

Notes for the validator step:
- `templates/requirement.md` has no YAML front matter, so this document follows the template's headings. A validator needs the tables parsed into the schema's object form first. The schema does not forbid extra properties, so added columns (Owner, Proposed default, Notes) and added sections (Scope and Decisions, Screen and Route Map, Edge Cases, FEAT-000 Coverage) are allowed.
- The Dependencies table now has a plain boolean `required` column and a `notes` column for context. When converting to schema, extract the boolean and discard the notes or map them separately.
- Path conflict: `.claude/rules/10-requirements.mdc` and the requirements skill say `docs/requirements/YYYY-MM-DD-<slug>.md`; the product-manager agent and the task say `docs/requirements/<feature-id>.md`; FEAT-000 set the precedent of `FEAT-000-feature-inventory.md`. This file follows the task: `FEAT-001-frontend-rewrite.md`. PLAN-001 TASKS-P0-P2 refers to `docs/requirements/FEAT-001.md` and should be updated to this path.
