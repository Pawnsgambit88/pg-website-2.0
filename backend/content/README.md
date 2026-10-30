# content app

Public content API (contract 3.1, 3.9, 3.10) plus its models, starter data and the revalidation outbox.

- Endpoints (all under `/api/`, unauthenticated): `site/{section}`, `events`, `events/{slug}`,
  `events/{slug}/availability` (no-store), `past-events`, `stories`, `stories/{slug}`, `testimonials`,
  `legal/{page}`, `sitemap-entries` (page_size up to 1000), `settings/public`, `POST contact` (202).
- Response shapes follow the zod schemas in `web/src/lib/api/types/`. JSON fields are validated on write
  (`validation.py`) and HTML is rejected. Site sections store media as `{"collection": "<key>"}` references,
  resolved to full collections on read.
- Availability is derived from `Event.capacity` and `Event.confirmed_count`. Registrations do not exist yet, so the
  registration slice must keep `confirmed_count` equal to the number of confirmed registrations.
- Every model has a monotonic BIGINT `version` (1 on insert, +1 on each save).
- `python manage.py seed_public_content`: idempotent upsert of the starter content. Event dates are relative to the
  first load; re-runs do not move them or bump versions.
- Revalidation (`revalidation.py`): call `emit(type, action, entity_id=..., slug=..., version=...)` inside the
  mutating transaction (types `event, story, testimonial, site, media, legal, player, result`; invalid type/action
  pairs and bad slugs raise `ValueError`; `player`/`result` ids are opaque uuids, one call per id). Signals emit for
  model saves/deletes (`VersionedModel.save` is atomic, so the row commits with the change). Queryset `update()`
  bypasses signals: call `emit()` yourself (see `registrations.services.adjust_confirmed`, which emits `event/updated`
  when the event flips sold out <-> places free). `emit_media_changed(asset_ids=..., collection_ids=...)` writes one
  row per referencing entity. Delivery: signed POST after commit when `REVALIDATE_URL` and `REVALIDATE_SECRET` are set;
  `python manage.py dispatch_revalidation [--limit N]` (scheduler, 30 s) claims due rows with `skip_locked` + a lease,
  so concurrent runs are safe. 5 attempts, backoff 2/5/15/45 s, same event id, fresh timestamp and signature, 202 =
  done, 400/413 fail at once; exhaustion logs `revalidate_exhausted` at ERROR (alert on it). Rows older than an
  already-delivered newer version of the same entity are marked `skipped`. No-op when the variables are unset.
- Contact: stored in `ContactMessage` (private). Honeypot `website` is dropped, `Idempotency-Key` replays return the
  original 202 with `Idempotent-Replay: true`, 5 stored messages per hour per IP, otherwise 429 `RATE_LIMITED`.
  Set `TRUST_X_FORWARDED_FOR=True` in settings only behind the trusted Vercel/Railway proxy chain.
