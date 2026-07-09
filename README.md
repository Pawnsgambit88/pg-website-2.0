# Pawn's Gambit — pgchess.in

Hyderabad's largest chess club website. Built with React + Vite, Supabase, Tailwind CSS, and Razorpay. Deployed on Vercel.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Auth & Database | Supabase (PostgreSQL + Auth + Storage) |
| Payments | Razorpay (UPI, cards, net banking) |
| Hosting | Vercel (free tier) |
| Domain | pgchess.in |

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd pawns-gambit
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:
- `VITE_SUPABASE_URL` — from your Supabase project Settings → API
- `VITE_SUPABASE_ANON_KEY` — from the same page
- `VITE_RAZORPAY_KEY_ID` — from your Razorpay Dashboard → API Keys

### 3. Set up the database

In your Supabase project, open the **SQL Editor** and run `supabase/schema.sql`. This creates all tables, RLS policies, and indexes.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:5173

---

## Deployment on Vercel

1. Push this repo to GitHub (under Aravind's account)
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Set the following **Environment Variables** in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RAZORPAY_KEY_ID`
4. Deploy — Vercel auto-detects Vite

### Custom domain (pgchess.in)

In Vercel → Project → Settings → Domains → Add `pgchess.in`. Follow Vercel's DNS instructions and add the CNAME/A records at your domain registrar.

---

## Supabase Setup

### Database
Run `supabase/schema.sql` in the SQL Editor once.

### Auth
In Supabase → Auth → Settings:
- Site URL: `https://pgchess.in`
- Redirect URLs: `https://pgchess.in/**, http://localhost:5173/**`

### Granting Admin Access
To make a user an admin, run this in the SQL Editor:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'admin@pgchess.in';
```

### Edge Functions (Razorpay)
The payment flow uses two Supabase Edge Functions. To deploy them:

```bash
# Install Supabase CLI if needed: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>

# Set secrets (these are server-side, never exposed to frontend)
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx
supabase secrets set RAZORPAY_KEY_SECRET=your_secret_key

# Deploy
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

---

## Razorpay Integration

1. Create a [Razorpay account](https://razorpay.com)
2. Get API keys from Dashboard → API Keys
3. Use **Test keys** during development (`rzp_test_...`) and **Live keys** in production
4. The integration flow:
   - Frontend calls `create-razorpay-order` Edge Function
   - Razorpay Checkout opens in the browser
   - On success, frontend calls `verify-razorpay-payment` Edge Function
   - Edge Function verifies HMAC signature and marks registration as `paid`

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Fixed top nav with auth state
│   ├── Footer.jsx          # Three-column footer
│   ├── Logo.jsx            # Chess pawn SVG icon mark
│   ├── TournamentCard.jsx  # Reusable tournament card
│   └── ProtectedRoute.jsx  # Auth guards for /profile and /admin
├── context/
│   └── AuthContext.jsx     # Global auth state, signUp/signIn/signOut
├── lib/
│   ├── supabase.js         # Supabase client
│   ├── glicko2.js          # Standard Glicko-2 rating algorithm
│   └── razorpay.js         # Razorpay checkout helper
└── pages/
    ├── Home.jsx             # Landing page
    ├── Tournaments.jsx      # Listings + Leaderboard tabs
    ├── TournamentRegister.jsx  # Registration + payment flow
    ├── TournamentResults.jsx   # Completed tournament results
    ├── Gallery.jsx          # Masonry photo gallery with lightbox
    ├── Login.jsx            # Login + forgot password
    ├── Signup.jsx           # Two-step signup with skill assessment
    ├── Profile.jsx          # User profile + tournament history
    └── Admin.jsx            # Admin panel (tournament management, pairings, ratings)

supabase/
├── schema.sql              # Full database schema — run once in SQL editor
└── functions/
    ├── create-razorpay-order/   # Creates Razorpay order server-side
    └── verify-razorpay-payment/ # Verifies payment HMAC + confirms registration
```

---

## Rating System

Pawn's Gambit uses the **standard Glicko-2 algorithm** (`src/lib/glicko2.js`). Key concepts:

- **Rating (r)**: Starts at a provisional value based on self-assessment (800–2200)
- **Rating Deviation (RD)**: Starts high (uncertainty), decreases with more games
- **Volatility (σ)**: Measures consistency of performance

**Rating update flow:**
1. Admin enters pairings and results for each round
2. Admin clicks "Update Ratings for Round N" in the admin panel
3. `computeRoundUpdates()` runs Glicko-2 for all players in that round
4. New ratings are written to the `ratings` table

**Aravind's modified algorithm** can be plugged into `src/lib/glicko2.js` when ready — the `updateRating()` function is the only thing that needs to change.

---

## Gallery

Photos are loaded from the `gallery_photos` Supabase table. To add photos:
1. Upload images to Supabase Storage → create a public bucket called `gallery`
2. Insert rows into `gallery_photos` with the public URL, event name, date, caption, and category

Categories: `tournament`, `coaching`, `event`

---

## Common Maintenance Tasks

### Add a tournament
Log in as admin → Admin Panel → "+ New Tournament"

### Update tournament status
Admin Panel → All Tournaments → change the status dropdown inline

### Enter round results
Admin Panel → Manage tournament → Add Round → Add Pairings → set result dropdowns → "Update Ratings"

### Add gallery photos
Insert into `gallery_photos` table via Supabase Table Editor or SQL.

### Export player list
Admin Panel → Manage tournament → "Export CSV"

---

## Running Costs

| Service | Expected Cost |
|---------|--------------|
| Vercel Hosting | Free (scales to ~$20/mo if >100GB bandwidth) |
| Supabase | Free tier (500MB DB, 1GB storage, 50k monthly active users) |
| Razorpay | 2% per successful transaction |
| Domain (pgchess.in) | Already owned (~₹800/year renewal) |
# PG_Website
# PG_Website
