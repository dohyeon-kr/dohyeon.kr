# Featured ranking

The homepage selects three published posts using:

`score = 10 * ln(1 + views7d + 8 * comments7d) + 20 * 2 ** (-ageDays / 3)`

- Views use daily statistics for today and the preceding six dates in Asia/Seoul; lifetime views are never used.
- Comments use the same window and exclude deleted and hidden comments. Anonymous comments currently have no reliable author identity, so author replies and repeated commenters cannot yet be excluded reliably. Names are not treated as identities.
- Age uses Ghost's `published_at`, not `updated_at`. Editing content does not refresh its bonus unless the publication date itself is changed in Ghost.
- Reactions are cached on the first request of each KST hour; publication age is evaluated at the hour boundary, clamped to zero for posts published during that hour. A service restart refreshes the snapshot. Existing pages keep their order until reload.
- Ties prefer the newer publication, then the slug alphabetically. Posts with zero views remain eligible.
- The API returns `score`, `reactionScore`, `freshnessScore`, counts and `computedAt` for inspection. These are initial tuning parameters, not an empirically validated model.

Published candidate slugs and timezone-qualified dates come from the public Ghost template. The request only changes the caller's returned selection: metadata is validated, never written to the database, and never used as a shared cache key. The sole cached snapshot contains server-side reaction counts.

The public heading is **지금 읽어볼 글**. The slide metadata shows recent views and comments. Swipe, autoplay and presentation do not depend on ranking calculations.

Validation: `python -m unittest discover -s services/visit-counter -v`; after deployment, `python scripts/check-live-carousel.py` verifies live assets, publication metadata and descending scores.
