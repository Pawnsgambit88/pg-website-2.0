# Architecture Decisions

## ADR-01: Supabase remains the backend platform
Reason: the current product already uses it; Auth/Postgres/Storage/RLS/Edge Functions cover PG's needs without a second backend framework.

## ADR-02: `events` replaces tournament-only mental model
Reason: social nights, workshops and tournaments need shared discovery, registration, media and attendance while allowing different game engines.

## ADR-03: Structured CMS inside the same database
Reason: one source of truth, one admin identity, no duplicate media/content system.

## ADR-04: Custom CSS over a visible component-library aesthetic
Reason: public brand quality requires editorial composition; admin density can still reuse tokens/components without looking generic.

## ADR-05: Public discovery before login
Reason: identity is not needed to understand the club or choose an event. Authentication is introduced at registration/history moments.

## ADR-06: Roles and payment/rating state are server-owned
Reason: security and auditability. UI hiding is not authorization.

## ADR-07: Past events remain public
Reason: archive, trust, community memory, SEO and social proof.
