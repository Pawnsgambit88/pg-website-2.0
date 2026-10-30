# Product Scope

## North-star outcome

Move a person through this sequence with as little uncertainty as possible:

**discover PG → find a suitable game → register → arrive comfortably → get a good game → understand what happens next → return**

The public website, player account and admin system all support this one journey.

## Product areas

### 1. Public experience
Explains PG immediately, sells the social-chess proposition, makes newcomers feel safe, shows configurable upcoming events, retains a rich past-event archive and carries community stories.

### 2. Identity and onboarding
Email/password and Google sign-in. First authentication creates a basic profile. Profile completion is progressive: do not demand fields until they matter for event eligibility, rating or communication.

### 3. Event discovery and registration
Supports social play, rated tournaments, leagues, workshops and special formats. Free, fixed-price, member-discount and donation payment modes are configurable. Capacity, waitlist, registration windows, eligibility and first-timer support are event settings.

### 4. Player account
Next event, event room, check-in, pairings, standings, results, event history, separate rating pools, public-profile controls and useful return/rematch context.

### 5. Event operations
Registration desk, first-timer list, check-in, pairing generation, pairing publication, result collection, disputes, finalisation, ratings, communications, gallery and recap.

### 6. CMS
Structured content, not an unrestricted page builder. Editors can change content and media safely while the design system protects hierarchy and accessibility.

### 7. Admin
One Control Room for CMS, event operations, players, payments, settings and audit history.

## Explicitly not in initial launch

- generic social feed
- user-to-user direct messages
- addictive streak mechanics
- public phone/email directory
- arbitrary admin HTML injection
- official FIDE pairing claims unless an approved FIDE pairing integration is added
- card data collection on PG infrastructure

## Product principles

1. Give value before asking for data.
2. Rating is matching context, not social hierarchy.
3. Newcomer anxiety is a product problem, not a personality problem.
4. Human hosting is part of the product and must appear in the software workflow.
5. Public pages sell the room; signed-in screens run the next action.
6. Preserve history. Completed events become permanent community assets.
7. Admin UX should mirror staff jobs, not database tables.
