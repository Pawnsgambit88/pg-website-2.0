# Owner/Operations Inputs Required at Launch

These are external business credentials/content, not missing design or engineering requirements. Development can proceed without repeatedly requesting them; collect them during staging/launch configuration.

## Credentials / platform access

- Production Supabase project access and current production schema/data export
- Google OAuth Web Client ID + secret configured in Google/Supabase
- Razorpay production/test credentials and webhook secret
- Vercel/deployment access and production domain/DNS access
- Email delivery provider credentials if transactional email is enabled
- WhatsApp/SMS provider credentials only if those channels are enabled

Never place private keys/secrets in frontend environment variables or Git.

## Brand/content

- Final production logo/brand assets if different from current wordmark treatment
- Real PG photographs with rights/permission
- Approved Keerthy Ganta quote/photo/consent if publishing
- Approved Parth Thakkar quote/photo/consent if publishing
- Any additional testimonial exact quotes/photos/consent
- Real venue addresses/map links for events
- Public social/contact URLs

The system is intentionally usable before testimonials exist; unpublished testimonial records do not render publicly.

## Legal/business approval

- Privacy policy
- Terms
- Refund/cancellation policy
- Event-specific waiver/conduct language if PG chooses to require it
- Tax/invoice wording if applicable

Routes and presentation exist; final legal wording requires owner/legal approval.

## Launch operating choices

- Initial admin identities
- Which users, if any, need event-scoped host/organiser access
- Default check-in window
- Default event cancellation/refund window
- Whether PG ratings launch immediately for all rated event formats
- Initial supported city/cities

Defaults exist in the implementation; these choices can be finalized in staging without redesigning screens.
