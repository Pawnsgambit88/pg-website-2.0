# Designer Handoff


## Coded screen set

The complete public/auth/player/admin/CMS screen set is implemented in `src/pages`. Run with mock mode and open `/handoff`; do not reconstruct these screens from written notes. `/handoff/design-system` is the live token/component reference and `/handoff/states` is the canonical production-state reference.

## The brief in one sentence

Make it feel easier to walk into a room of chess players you do not know—and make existing players proud that this is their club.

## First viewport

Desktop opening must show, without scrolling on common laptop displays:
- PG identity/navigation
- `Good games. Better company.` intact on its own lines as designed
- supporting message
- newcomer reassurance
- hero photography
- a visible set/strip of upcoming games

Do not return to a full-screen hero. The site earns immersion after it proves usefulness.

## Public hierarchy

1. Promise
2. Next games
3. Hospitality proof
4. What PG stands for
5. Member voices if published
6. Conversion

## Photography direction

Cafe/club/community context, not monuments or generic chess-piece still life. Prefer moments between people: hello, clock, reaction, discussion, rematch, coffee, post-game analysis. Hyderabad should be present through real places and people, not a Charminar motif.

## Hospitality design

The user must understand PG will actively take care of the awkward parts:
- a host knows they are new
- introduction is offered
- the user gets a board/opponent
- pairing aims for a good experience
- the event room says exactly what to do next

This is not abstract “community” copy. It is service design.

## Event cards

Must communicate in this order:
1. what kind of evening/game
2. event name
3. date/time + area
4. time control when relevant
5. newcomer/social proof when useful
6. price
7. action

Avoid dense tournament admin data on discovery cards.

## Player account

No gamified casino dashboard. Rating is quiet. The most visually prominent object is what the player needs next: event, check-in, board/pairing or result.

## Admin

Admin design optimizes for scan speed, state visibility and safe action. Use confirmations for destructive/irreversible actions. Pairing publication and round finalisation must feel consequential.

## Responsive

Mobile navigation is compact. Upcoming cards scroll horizontally only when it improves discovery. Admin tables may become horizontal scroll only after key mobile summary information remains visible. Test real long event names and Indian names.

## Accessibility

Do not rely on editorial minimalism as an excuse for low contrast or tiny text. Copper is never the only state indicator. Carousels need explicit controls. Every CMS image needs alt/decorative status and focal point.

## Approved homepage reference — do not reinterpret

`VISUAL-REFERENCE.html` + `VISUAL-REFERENCE.css` are the approved public-home visual baseline.
The production React homepage in `src/pages/public/HomePage.tsx` has been aligned to that reference.

Preserve these structural decisions unless product research explicitly changes them:

- compact editorial hero, not a full-screen splash;
- `Good games. Better company.` remains the opening headline hierarchy;
- the hero and upcoming games coexist in the opening experience on desktop;
- upcoming cards are image-led and show date, event positioning, audience, concise summary, time/city and one clear action;
- the first-visit section is a photo + hospitality promise + four concrete service commitments;
- `What PG stands for` uses the dark forest field, community photography and three principles;
- approved testimonial content may appear between community and story; it should not displace the core homepage narrative;
- `More than a game` is an editorial image/copy split;
- the final CTA is photographic with restrained scrim, not a generic coloured banner.

The CMS may change copy and media, but must not allow routine editors to break this layout hierarchy.
