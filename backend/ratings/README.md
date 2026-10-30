# ratings app (contract 3.4 M10-M12, 5.4)

- `glicko2.py` pure Glicko-2 (no Django). `models.py` PoolRating, RatingLedgerEntry (append-only: model guards, queryset
  guards, PostgreSQL trigger in migration 0002), RatingRun (idempotency marker, unique round_id).
- `services.process_round(round_id, payload)`: one transaction, idempotent on RatingRun, one pre-round snapshot,
  ledger first then PoolRating. Dev entry: `manage.py rate_round --json file.json [--round-id UUID]`.
- Endpoints (player only, owner only, no-store): `GET /api/me/ratings`, `/api/me/ratings/{pool}/ledger?page=&page_size=`,
  `/api/me/ratings/{pool}/trend?days=` (7..365, default 90).
- Defaults: new player 1500 / RD 350 / vol 0.06. State: `unrated` (0 rated games), `provisional` (< settings
  `RATING_PROVISIONAL_GAMES`, default 10), `established`. RD is capped at 700, ratings clamped 0..4000.
- Unrated/social games: ledger row with rated=false and NULL before/after/delta; PoolRating untouched; these rows are
  not listed by the rating ledger endpoint (its DTO needs a numeric delta).
- For accounts' `/auth/me`: `ratings.selectors.ratings_summary_for(user)` returns `{pool: summary}` (M10 shape);
  map to `{pool, rating, games, provisional}` for pools whose state is not `unrated`. The old `accounts.Rating`
  table is NOT updated by this app; point `me_dto` at the selector to stay consistent.
- `seed_dev_ratings` (DEBUG only) seeds player@example.test like the frontend mock.
