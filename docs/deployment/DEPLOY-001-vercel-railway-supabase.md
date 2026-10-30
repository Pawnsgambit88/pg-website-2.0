# Deployment Guide: Vercel + Railway + Supabase

**Stack:** Next.js 16 (Vercel) · Django 6.1 (Railway) · PostgreSQL + Storage (Supabase)  
**Domain:** pgchess.in  
**Region:** Singapore (`ap-southeast-1` / `sin1`) across all three platforms — Railway has no South Asia region yet

---

## Architecture

```
Browser → Vercel (Next.js)
             └─ /api/* rewrite ──► Railway web service (Django / Gunicorn)
                                        ├─ Supabase PostgreSQL  (DB)
                                        └─ Supabase Storage     (media)
Railway worker    → email delivery (comms)
Railway scheduler → holds, reminders, reconciliation, revalidation
```

---

## Step 1 — Supabase

### 1.1 Create project
- Region: **ap-southeast-1** (Singapore) — Railway's only Asia option is also Singapore; keep all three co-located
- Note the **project ref** (the slug in the URL, e.g. `hdzsugtkutpfvkfgtgwj`)

### 1.2 Database credentials
Go to **Project Settings → Database**:

| Variable | Value |
|---|---|
| `DB_HOST` | `db.<project-ref>.supabase.co` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | _(the password you set at project creation)_ |

> **Connection pooling:** for a high-traffic site use the Supabase connection pooler
> (`aws-0-ap-southeast-1.pooler.supabase.com`, port `6543`, mode `transaction`).
> Set `DB_CONN_MAX_AGE=0` in Django when using the pooler.

### 1.3 API keys
Go to **Project Settings → API**:

| Variable | Key name in Supabase |
|---|---|
| `SUPABASE_URL` | Project URL (e.g. `https://hdzsugtkutpfvkfgtgwj.supabase.co`) |
| `SUPABASE_PUBLISHABLE_KEY` | `anon` / `public` key |
| `SUPABASE_SECRET_KEY` | `service_role` key (**never expose to the browser**) |

`SUPABASE_JWKS_URL` is always:
`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`

### 1.4 Storage bucket
1. Go to **Storage → New bucket**
2. Name: `pg-media`
3. Toggle **Public bucket** ON (reads go through the CDN; writes use signed URLs from the backend only)

---

## Step 2 — Railway (3 services)

### 2.1 Create a Railway project
Connect your GitHub repo. Set the **Root Directory** to `backend/` for all three services.

### 2.2 Service 1 — `web` (API)
- **Start command** (or leave blank — `nixpacks.toml` default is used):
  `gunicorn pgchess.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- Enable **Public networking** → note the generated domain (e.g. `pg-api.up.railway.app`)

### 2.3 Service 2 — `worker` (email delivery)
- **Start command**: `python manage.py run_worker`
- No public networking needed

### 2.4 Service 3 — `scheduler` (background jobs)
- **Start command**: `python manage.py run_scheduler`
- No public networking needed

### 2.5 Environment variables (all 3 services share these)

```env
# Core Django
DJANGO_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(64))">
DEBUG=False
ALLOWED_HOSTS=<railway-domain>.up.railway.app,pgchess.in,www.pgchess.in
TRUSTED_PROXY_COUNT=1

# Database (Supabase)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<supabase db password>
DB_HOST=db.<project-ref>.supabase.co
DB_PORT=5432
DB_CONN_MAX_AGE=0

# Auth
AUTH_TOKEN_MODE=cookie
CORS_ALLOW_CREDENTIALS=True
CORS_ALLOWED_ORIGINS=https://pgchess.in,https://www.pgchess.in

# Supabase storage + JWKS
STORAGE_MODE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SECRET_KEY=<service_role key>
SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_MEDIA_BUCKET=pg-media

# Email (SendGrid)
SENDGRID_API_KEY=SG.<your-key>
EMAIL_ADAPTER=django
CONTACT_DESTINATION_EMAIL=<admin email>

# Frontend / preview
FRONTEND_URL=https://pgchess.in
PREVIEW_SECRET=<generate: python -c "import secrets; print(secrets.token_urlsafe(48))">

# Payments (Razorpay)
RAZORPAY_MODE=live
RAZORPAY_KEY_ID=rzp_live_<...>
RAZORPAY_KEY_SECRET=<...>
RAZORPAY_WEBHOOK_SECRET=<...>
RAZORPAY_API_BASE=https://api.razorpay.com/v1

# Security
SECURE_SSL_REDIRECT=False   # Railway terminates TLS before Django
```

### 2.6 One-time migration (run in Railway shell or a one-off deploy command)

```bash
python manage.py migrate
python manage.py check_rls --apply
```

**Do NOT run `seed_dev_accounts` on production.**

---

## Step 3 — Vercel (frontend)

### 3.1 Create project
1. Import the repo from GitHub
2. **Root Directory**: `web`
3. Framework: Next.js (auto-detected from `web/vercel.json`)

### 3.2 Environment variables

```env
# Public (inlined at build time — visible in browser)
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_SITE_URL=https://pgchess.in
NEXT_PUBLIC_AUTH_MODE=cookie
NEXT_PUBLIC_GOOGLE_AUTH=false
NEXT_PUBLIC_RAZORPAY_ENABLED=true
NEXT_PUBLIC_CONTACT_MODE=form
NEXT_PUBLIC_SUPABASE_STORAGE_HOST=<project-ref>.supabase.co
NEXT_PUBLIC_MEDIA_BASE_URL=https://<project-ref>.supabase.co/storage/v1/object/public
NEXT_PUBLIC_MEDIA_BUCKET=pg-media

# Server-only (never exposed to browser)
API_INTERNAL_URL=https://<railway-web-domain>.up.railway.app
REVALIDATE_SECRET=<generate: python -c "import secrets; print(secrets.token_hex(32))">
PREVIEW_SECRET=<same value as Railway PREVIEW_SECRET>
```

### 3.3 Custom domain
In Vercel **Project → Settings → Domains**, add `pgchess.in` and `www.pgchess.in`.  
Update your DNS registrar:
- `pgchess.in` → CNAME `cname.vercel-dns.com` (or A record if apex)
- `www.pgchess.in` → CNAME `cname.vercel-dns.com`

---

## Step 4 — Post-deploy wiring

### 4.1 Razorpay webhook
In the Razorpay dashboard → **Webhooks → Add new**:
- URL: `https://pgchess.in/api/webhooks/razorpay`
- Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`
- Copy the webhook secret → set as `RAZORPAY_WEBHOOK_SECRET` in Railway

### 4.2 SendGrid sender authentication
- Verify the sending domain `pgchess.in` in SendGrid → **Settings → Sender Authentication**
- This ensures email is not marked as spam

### 4.3 Smoke test
```
GET  https://pgchess.in/api/admin/ping          → 401 (backend alive, auth working)
GET  https://pgchess.in/                         → 200 (Next.js serving)
POST https://pgchess.in/api/auth/login           → attempt login
```

---

## Files created in this project

| File | Purpose |
|---|---|
| `backend/.python-version` | Tells Railway/Nixpacks to use Python 3.14 |
| `backend/nixpacks.toml` | Pins install phase and default start command |
| `backend/Procfile` | Already present: `web`, `worker`, `scheduler` |
| `web/vercel.json` | Already present: framework, region (`sin1`), build command |

---

## Checklist

- [ ] Supabase project created (ap-southeast-1)
- [ ] `pg-media` storage bucket created (public)
- [ ] Railway project created with 3 services
- [ ] `backend/.python-version` and `backend/nixpacks.toml` committed and pushed
- [ ] All Railway env vars set
- [ ] `migrate` + `check_rls --apply` run
- [ ] Vercel project created (root dir: `web/`)
- [ ] All Vercel env vars set
- [ ] Custom domain `pgchess.in` added in Vercel + DNS updated
- [ ] Railway `ALLOWED_HOSTS` includes `pgchess.in` and the Railway domain
- [ ] Razorpay webhook URL configured
- [ ] SendGrid sender domain verified
- [ ] Smoke tests pass
