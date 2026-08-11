# apps\api\src\db\slow-query-log.ts

- SlowQueryEntry · interface · L5-L11 — Shape of a single recorded slow-query occurrence, carrying the SQL, its duration, originating route, and timestamp for diagnostics.
- SlowQueryLogger · interface · L13-L15 — Minimal logger contract the module depends on so the warn sink can be swapped or mocked in tests.
- getSlowQueryThreshold · function · L23-L28 — Resolves the slow-query cutoff from the SLOW_QUERY_MS env var, falling back to 100ms when unset or invalid.
- RecordQueryInput · interface · L30-L36 — Input bundle for recording a query, pairing the executed SQL and timing with the route and the logger to notify.
- recordQuery · function · L38-L51 — Filters out fast queries, then stores each slow one in the bounded ring buffer and emits a structured 'slow_query' warning.
- resetSlowQueryLog · function · L53-L55 — Clears the in-memory ring buffer, primarily to isolate tests.
- __testGetEntries · function · L57-L59 — Test-only accessor exposing the live ring buffer contents for assertions.
- snapshotSlowQueries · function · L61-L63 — Returns a defensive copy of the retained slow queries for read-only surfaces like admin metrics.
