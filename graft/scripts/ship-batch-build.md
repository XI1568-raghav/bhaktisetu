# scripts\ship-batch-build.mjs

Builds the round-4 40-item ship batch JSON by deduping dry-run queue specs against 121 already-shipped/rejected IDs, ranking survivors by priority and effort, interleaving categories, and topping up from in_progress roadmap items.

- extractId · function · L51-L54 — Pulls the canonical roadmap ID (R-Qx, SIDE-FIX, or META pattern) out of a queue filename so entries can be deduped and excluded.
- parseFrontmatter · function · L56-L70 — Converts a markdown file's YAML frontmatter block into a key/value object, normalizing quotes and nulls, so item metadata drives batch selection.
- parseEstHours · function · L72-L75 — Extracts the est_hours estimate from item text, defaulting to 999 so unestimated work sorts last in the batch ranking.
- parseStatus · function · L77-L80 — Reads an item's status field so already-shipped work can be filtered out of the batch.
- parsePriority · function · L82-L85 — Reads an item's priority label, defaulting to P3 so unprioritized work ranks lowest in selection.
- parseCategory · function · L87-L90 — Reads an item's category with a caller-supplied fallback so the round-robin interleave always has a bucket.
- priorityRank · function · L92-L97 — Maps P0/P1/P2 priority labels to numeric ranks so sorting ships the most urgent items first.
- roundRobin · function · L147-L162 — Interleaves items across category buckets so the 40-item batch is functionally diverse instead of clustering one department back-to-back.
- walk · function · L169-L198 — Recursively scans the roadmap items tree for in_progress items not already queued or excluded, collecting them as top-up candidates to fill the batch to 40.
