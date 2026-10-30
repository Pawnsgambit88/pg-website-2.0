# Deployment

## Environments
Use `local`, `staging`, `production`. Never point local development at production data.

## Frontend
Vite static build can deploy to Vercel. Configure SPA rewrite to `index.html` for client routes.

## Supabase
Apply migrations in order through Supabase CLI/CI. Do not manually change production schema without a committed follow-up migration.

## Edge function secrets
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- email provider key when enabled
- messaging provider credentials when enabled

## Frontend variables
Only publishable values:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_RAZORPAY_KEY_ID
- VITE_SITE_URL

## CI gates
1. install from lockfile
2. typecheck
3. lint
4. unit tests
5. production build
6. migration validation against disposable database
7. integration tests on staging for tagged releases

## Rollback
Frontend: redeploy previous immutable build.  
Database: prefer forward-fix migrations. Destructive migrations require an explicit backup and rollback script before production application.
