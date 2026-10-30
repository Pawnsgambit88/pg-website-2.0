# Pawn's Gambit — Static HTML Screen Handoff

This folder is the developer-facing visual handoff for PG v2. **Each screen is an individual HTML file** and opens directly in a browser. No React build or local server is required for reviewing the visual system.

## Start

Open `index.html`. It links all **58** screen/state files.

## Design system

Canonical visual values are in:

- `screens/57-design-system.html`
- `assets/styles.css`
- `design-tokens.json`
- `docs/UI-SPECIFICATION.md`
- `docs/DESIGN-HANDOFF.md`

Typography:

- Newsreader — editorial/display
- Anek Latin — UI/body
- Fragment Mono — metadata, dates, boards, ratings and compact controls

Core palette:

- Warm Parchment `#F4EFE6`
- Deep Forest `#243228`
- Ink `#171614`
- Burnished Copper `#B86A3B`
- Sand `#E7DED0`

## How to use these files

The HTML screens are **visual/interaction contracts**. The backend developer should preserve their hierarchy, copy style, typography, responsive behavior and state semantics while wiring real Supabase/API data. The authoritative backend/data contracts remain in `/docs`.

## Important

Images and Google Fonts are referenced over HTTPS to keep the folder compact. An internet connection is required to see those external assets exactly as art-directed.

The static screens intentionally contain representative data. They are not a separate production data source.
