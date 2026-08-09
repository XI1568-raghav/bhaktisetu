# apps\api\scripts\backfill-embeddings.ts

- backfillTable · function · L54-L97 — Embeds a table's pending rows in 64-text Cohere batches and writes each resulting vector back via a raw UPDATE, tallying filled/skipped/failed so one bad row never poisons the batch.
- main · function · L99-L187 — Orchestrates the backfill: verifies COHERE_API_KEY with a live probe call that surfaces auth/rate-limit errors, then selects and backfills each of the three tables where embedding IS NULL.
