# Launch Checklist

## Infrastructure
- [ ] Production Supabase project created from committed migrations
- [ ] Staging is separate from production
- [ ] Storage bucket policies reviewed
- [ ] Vercel/custom host environment variables set
- [ ] Production domain + HTTPS verified
- [ ] Backups/PITR policy confirmed

## Authentication
- [ ] Email login/reset tested
- [ ] Google OAuth configured for all environments
- [ ] Admin accounts identified
- [ ] Admin MFA decision implemented
- [ ] redirect URLs exact and HTTPS in production

## Security
- [ ] RLS automated tests pass
- [ ] no service-role key in frontend bundle
- [ ] role escalation test fails as intended
- [ ] payment-state forgery test fails as intended
- [ ] CSP/security headers deployed
- [ ] rate limits on privileged functions
- [ ] dependency/security scan reviewed

## Payment
- [ ] Razorpay test-mode complete
- [ ] amount/currency/order validation verified
- [ ] webhook signature + replay test passed
- [ ] failure/abandon/retry flows tested
- [ ] refund policy approved and linked
- [ ] live keys switched only after sign-off

## Events
- [ ] free, paid, sold-out and waitlist flows tested
- [ ] check-in tested
- [ ] social-balanced pairing reviewed on realistic data
- [ ] Swiss pairing reviewed for intended PG use
- [ ] rating finalisation idempotency proven
- [ ] past-event transition and archive tested

## CMS
- [ ] all homepage text editable
- [ ] event public content editable
- [ ] media static/carousel switch tested
- [ ] alt/focal/order controls tested
- [ ] testimonial publication validation tested
- [ ] draft vs published isolation tested
- [ ] audit records visible to admins

## Content
- [ ] real PG photography uploaded
- [ ] every published testimonial is approved by member
- [ ] event venue/logistics correct
- [ ] no placeholder claims/statistics
- [ ] privacy/terms/refund/cancellation content reviewed

## UX/accessibility
- [ ] keyboard pass
- [ ] screen reader pass
- [ ] reduced-motion pass
- [ ] 200% zoom pass
- [ ] mobile device pass
- [ ] empty/loading/error/sold-out states reviewed

## Operations
- [ ] named owner for payment exceptions
- [ ] named event-day admin/host process
- [ ] incident contact list
- [ ] database backup/recovery drill documented
- [ ] rollback plan tested
