# apps\api\src\jobs\daily-panchang-compute-cron.ts

- ComputeResult · interface · L17-L21 — Tally of rows written, skipped, and errored during a cron run, returned for observability of the batch job.
- runDailyPanchangCompute · function · L23-L78 — Iterates the 7-day horizon from UTC midnight today, computing panchang per day and idempotently upserting each date row while isolating per-day failures into an error count.
