# Target Database Model

## Identity
`profiles` private user data and preferences.  
`user_roles` server-owned authorization.  
`player_public_profiles` deliberately public identity fields only.  
`memberships` optional member pricing/status.

## CMS
`cms_pages` → `cms_sections`  
`media_assets` → `media_collections` → `media_collection_items`  
`testimonials`  
`editorial_stories`  
`navigation_items`  
`site_settings`

## Event domain
`event_types` supplies configurable defaults.  
`events` is the unified master record for social/tournament/league/workshop/special.  
`venues`, `event_hosts`, `event_registrations`, `event_checkins`, `event_rounds`, `event_pairings`, `event_messages` cover operations.

## Money
`payment_orders` is PG's expected purchase.  
`payments` is provider-confirmed money state.  
`payment_webhook_events` provides replay protection and evidence.

## Rating
`rating_profiles` unique by `(user_id,pool)` for blitz/rapid/classical.  
`rating_transactions` is append-only history and creates auditability/rebuild potential.

## Audit/notification
`audit_log` records privileged mutations.  
`notifications` supports in-app notices independently of email/WhatsApp delivery.

## Current-system migration

Map the existing system deliberately rather than maintaining two live event models:
- existing `users` → `profiles` + `player_public_profiles` + `user_roles`
- existing `tournaments` → `events` with type `tournament`
- existing tournament registrations → `event_registrations`
- rounds/pairings → `event_rounds` / `event_pairings`
- existing ratings → `rating_profiles`, one row per time-control pool
- gallery photos → `media_assets`, then create collections by event

Preserve original IDs in temporary mapping tables or legacy columns until reconciliation is signed off. Run counts and spot checks before removing legacy structures.
