# apps\api\src\lib\route-metrics.ts

- Sample · type · L6-L6 — Aliases a latency sample as a plain number of milliseconds for readability.
- recordLatency · function · L13-L21 — Appends a response-time sample to a route's ring buffer, evicting the oldest sample so memory stays bounded at 200 entries per route.
- percentile · function · L23-L27 — Computes a percentile from a sorted sample array using nearest-rank indexing clamped to the array bounds.
- RouteStat · interface · L29-L36 — Defines the reported shape of a route's latency summary: sample count plus p50/p95/p99 and max.
- snapshotStats · function · L38-L54 — Builds per-route latency summaries (p50/p95/p99/max) from the ring buffers and ranks routes worst-first by p95 so the slowest endpoints surface in reports.
- startMetricsReporter · function · L58-L67 — Starts a singleton 5-minute interval that logs the top 20 routes by p95 latency, unref'd so metric logging never keeps the process alive.
- stopMetricsReporter · function · L69-L74 — Stops the periodic metrics reporter by clearing the interval and resetting the singleton timer.
