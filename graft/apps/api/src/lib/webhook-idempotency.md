# apps\api\src\lib\webhook-idempotency.ts

- WebhookProvider · type · L18-L18 — Union type restricting idempotency records to the two supported payment providers, Razorpay and Stripe.
- ensureTable · function · L22-L38 — Lazily creates the webhook_replay table (with a unique provider+event_id constraint) once per process so the module deploys without a Prisma migration.
- _resetTableEnsuredForTests · function · L41-L43 — Test helper that clears the module-level tableEnsured cache so setup can re-run between cases.
- IdempotencyResult · interface · L45-L47 — Result shape telling the webhook caller whether the event was already processed and must be skipped.
- checkAndRecord · function · L57-L76 — Atomically checks-and-records a webhook event via INSERT ... ON CONFLICT DO NOTHING RETURNING, reporting duplicates with no SELECT/INSERT race window.
- SweepResult · interface · L78-L82 — Result shape for the retention sweep, reporting rows deleted or a skip reason on failure.
- sweepOldRows · function · L88-L104 — Cron-driven retention job that deletes webhook_replay rows older than 30 days and degrades gracefully (skipped result) if the table or DB is unavailable.
