# apps\api\src\db\n-plus-one-detector.ts

- Scope · interface · L9-L11 — Holds the per-request map of normalized SQL template to execution count used to spot repeated queries.
- runWithRequestScope · function · L15-L17 — Starts a fresh per-request query-counting scope so N+1 detection is isolated to a single request's lifetime.
- normalizeSql · function · L22-L30 — Collapses SQL statements differing only in literal parameter values into one template so repeated queries with different IDs are counted together.
- recordQueryForNPlusOne · function · L32-L37 — Increments the per-request counter for the query's normalized template, silently skipping when no request scope is active.
- NPlusOneLogger · interface · L39-L44 — Defines the minimal warn-only logger contract the detector needs to report N+1 violations without depending on a concrete logger.
- getNPlusOneThreshold · function · L46-L51 — Resolves the N+1 warning threshold from the N_PLUS_ONE_THRESHOLD env var, falling back to the default of 5 when unset or invalid.
- reportNPlusOne · function · L53-L70 — Emits a warning for every SQL template whose per-request execution count exceeded the threshold, flagging likely N+1 query patterns on the route.
