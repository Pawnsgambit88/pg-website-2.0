# PG Chess — Static HTML Handoff: Start Here

This package exists so implementation can proceed without interpreting React components or asking for separate Figma screens.

## 1. Open this first

Open `index.html` directly in any browser.

It is the complete screen gallery. Every visual screen/state is an individual HTML file under `/screens`.

No Node, Vite, build step or local server is required to review the screen designs.

## 2. Canonical visual sources

Use these as source of truth, in this order:

1. `/screens/*.html` — screen composition, content hierarchy and states
2. `/assets/styles.css` — exact implementation styling
3. `/screens/57-design-system.html` — visual design-system reference
4. `/design-tokens.json` — machine-readable tokens
5. `/docs/UI-SPECIFICATION.md` — detailed UI rules
6. `/docs/RESPONSIVE-BEHAVIOR.md` — responsive rules
7. `/docs/ACCESSIBILITY.md` — accessibility requirements

Do not invent a parallel visual language.

## 3. Canonical brand system

- Display: Newsreader
- UI/body: Anek Latin
- Metadata: Fragment Mono
- Warm Parchment: #F4EFE6
- Deep Forest: #243228
- Ink: #171614
- Burnished Copper: #B86A3B
- Sand: #E7DED0

## 4. Screen coverage

The package includes 58 individual screens/states across:

- Public discovery
- Authentication
- Registration/payment/waitlist
- First-login onboarding
- Player dashboard and profile
- All live Event Room states
- Ratings
- Admin Control Room
- Website CMS
- Media library
- Stories
- Testimonials
- Events
- All 8 Event Builder steps
- All 8 Event Control Room tabs
- Players
- Payments
- Settings
- Design system
- Canonical UI states

See `SCREEN-MAP.csv` for the full file list.

## 5. Backend implementation

The HTML files are visual contracts. Do not treat the representative screen data as a new data source.

Wire the final application using the backend contracts under `/docs`, especially:

- `BACKEND-CONTRACT.md`
- `FRONTEND-BACKEND-INTEGRATION.md`
- `BACKEND-WIRING-CHECKLIST.md`
- `DATABASE-SCHEMA.md`
- `AUTH-SECURITY.md`
- `EVENT-ENGINE.md`
- `PAYMENTS.md`
- `CMS-SPEC.md`

## 6. Images and fonts

Google Fonts and editorial photographs use external HTTPS URLs. Internet access is required for the exact art-directed appearance.

## 7. What should not be changed casually

- Homepage copy hierarchy
- Warm Parchment / Forest / Copper palette
- Newsreader / Anek Latin / Fragment Mono roles
- Newcomer-first hospitality language
- Editorial public-site composition
- Operational density of signed-in/admin surfaces
- Server ownership of payment/rating/pairing state
- Privacy separation between private account and public chess identity
