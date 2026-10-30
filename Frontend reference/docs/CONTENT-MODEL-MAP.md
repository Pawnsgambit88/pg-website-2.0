# Content Model Map

The CMS makes content configurable while protecting composition.

## Homepage

| Visual section | CMS ownership | Media behavior |
|---|---|---|
| Hero | eyebrow, headline line 1/accent, lead, body, proof points, CTA labels/targets | independent collection: static/carousel, order, autoplay, interval, focal point |
| Upcoming games | section eyebrow/title/intro; cards come from published events | card image comes from event media collection |
| First visit | eyebrow, headline, body, CTA, four promise title/body pairs | independent collection |
| What PG stands for | eyebrow, headline, body, three principles | independent collection |
| More than a game | eyebrow, headline, body, CTA | independent collection |
| Final CTA | eyebrow, headline, body, CTA | independent collection |
| Navigation/footer | labels/targets/social URLs approved through structured settings | logo/brand system not free-form |

## Event

Configurable fields include:
- type, title, slug, eyebrow, one-line promise, long description
- starts/ends, city, area, venue
- capacity, registration window, cancellation/waitlist behavior
- free/fixed/member pricing as configured
- beginner/solo/hosted-arrival settings
- rated/unrated, pool, time control, round/pairing mode
- primary event media collection
- public logistics/accessibility notes
- communication templates/toggles
- archive recap/gallery once complete

Event Builder controls event card content for Upcoming Games; the homepage editor does not duplicate event records.

## Media library

Asset fields:
- storage/external URL
- alt text
- decorative flag where appropriate
- focal X/Y
- credit/rights note as required

Collection fields:
- name
- display mode `static|carousel`
- autoplay boolean
- interval
- ordered asset relation

0 assets = graceful placeholder/fallback; 1 asset = static regardless of carousel setting; 2+ enables carousel controls if selected.

## Testimonials/member voices

Fields:
- photo asset
- name
- descriptor/role
- exact approved quote
- consent captured at/date
- sort order
- published

Publishing is blocked without quote + photo + consent. Public render: 1–3 grid; 4+ carousel.

Keerthy Ganta and Parth Thakkar records remain unpublished until exact approved quote and photo are entered. No quote is to be invented.

## Stories

Fields:
- type/kind
- slug
- eyebrow
- title
- dek/summary
- body/content structure as implemented
- publication date
- reading time
- featured flag
- media collection
- published state

## Legal

Privacy, terms and refund/cancellation content must be supplied/approved by PG/legal counsel before production publish. Design and route are provided; placeholder legal wording must not be treated as legal approval.
