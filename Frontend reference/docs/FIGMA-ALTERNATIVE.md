# Coded Design Handoff

For this project, the production React routes are the visual handoff. The developer should not recreate screens from screenshots.

Why:
- exact responsive behavior is already encoded
- controls and states are interactive
- typography uses the actual web fonts
- player/admin role flows can be reviewed in mock mode
- CMS behavior is visible rather than represented as static rectangles
- backend integration can happen inside the same component tree

Use `/handoff` as the equivalent of a screen index and `/handoff/design-system` as the token/component reference.

`VISUAL-REFERENCE.html` remains the approved standalone homepage composition for quick no-build review.

If a separate design tool file is later created, it must mirror the coded tokens and must not silently become a second source of truth.
