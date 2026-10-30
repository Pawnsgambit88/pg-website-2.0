# CMS Specification

## Philosophy

Use a structured CMS inside Supabase. Do not give editors an unrestricted WYSIWYG page builder. The front end owns layouts; the CMS owns content, order, visibility and media.

## Editable public content

- navigation labels/links/order
- page metadata
- hero eyebrow/title lines/lead/supporting copy/proof points/actions
- upcoming-games intro
- hospitality content
- PG principles
- testimonial section
- story/about strip
- final CTA
- footer
- community/about copy
- editorial stories
- event public copy
- event logistics/FAQ

## Media

Every major image surface points to a media collection. A collection supports:
- `static` or `carousel`
- autoplay on/off
- interval
- ordering
- asset-level alt text
- focal X/Y
- credit
- archive state

The same collection can be reused. Deleting an asset that is referenced should be blocked; archive instead.

## Testimonials

Fields: member name, descriptor, exact approved quote, portrait asset, consent timestamp, sort order, publish state.

Rules:
- 1–3 published: grid
- 4+: accessible carousel
- quote + photo + consent required to publish
- no automatic rewriting of quotes

## Event CMS/operations boundary

Public copy and media belong to event editorial configuration. Capacity, payment, pairing, eligibility and rating configuration are operational fields with stronger permissions and audit.

## Publishing

Recommended states: draft → published. Every mutation records actor/time/before/after in audit. Preview reads draft under admin authentication; public reads published only.

## Homepage photographic slots

The approved homepage has five CMS-controlled photographic surfaces:

1. `hero`
2. `hospitality`
3. `community`
4. `story`
5. `final_cta`

Each `cms_sections.media_collection_id` points to a reusable `media_collections` record. Every collection supports `static` or `carousel`, autoplay control, interval, ordered assets, alt text and focal points. The frontend reads these collections independently of section copy.

Upcoming cards do not use a homepage-specific gallery. Each card uses the media collection attached to its Event record, so the Admin Event Builder is the source of truth for upcoming-event photography.
