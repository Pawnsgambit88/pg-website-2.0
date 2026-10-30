# Design System

## Character

Indian modern editorial warmth, not ornamental “Indian” motifs. The identity should feel at home in Hyderabad now and remain credible in Bengaluru, Mumbai, Delhi, Pune or Chennai later.

## Palette

- Parchment `#F4EFE6`: dominant public surface
- Deep Forest `#243228`: structural dark, trust, signed-in navigation
- Ink `#171614`: text and admin dark
- Burnished Copper `#B86A3B`: scarce action/accent color
- Sand `#E7DED0`: secondary surface

Copper is an accent, not a background habit. Red is not a master brand color.

## Typography

- Newsreader: large editorial headlines, quotes and emotional copy
- Anek Latin: navigation, body, controls and dense UI
- Fragment Mono: dates, ratings, event metadata, board numbers and tiny labels

Use variable axes where supported. No Inter/Roboto substitution unless fonts fail to load.

## Composition

Public pages use long editorial lines, border-based grouping and photography. Avoid collections of rounded SaaS cards. Signed-in/admin pages increase density but retain the same tokens.

## Photography

Real PG people, real cafes/venues, real expressions, clocks, hands, scoresheets, conversation. Avoid generic isolated chess pieces as the dominant image language. CMS focal points protect responsive crops.

## Motion

GSAP motion is restrained:
- opening copy reveal
- one-time section reveal
- subtle image scale/parallax where performance allows
- carousel fades/slides

No motion gates access to information. Respect `prefers-reduced-motion` completely.

## Copy rules

- Human before clever.
- One chess metaphor is enough.
- Do not write “where passion meets strategy”, “vibrant community”, “checkmate boredom”, or similar category filler.
- Explain hospitality operationally: host, introduction, board, pairing, what happens next.
- Public CTAs state the user's goal: “Find my next game”, “Save my place”, “Join waitlist”.
