# N+1 fixes — Q2 audit log (R-Q2-E-011)

> Status: instrumentation shipped 2026-06-13. **Audit + fix cycle pending.**
> Owner action: run the top-10 routes locally with `SLOW_QUERY_MS=50 pnpm --filter @poojly/api dev`, capture per-route warn logs, then file fixes here with before/after query count.

## What shipped

| Component | Path | Behaviour |
|---|---|---|
| Slow-query logger | `apps/api/src/db/slow-query-log.ts` | Logs `warn` w/ `{ sql, durationMs, route, timestamp, params? }` when query > `SLOW_QUERY_MS` (default 100). |
| N+1 detector | `apps/api/src/db/n-plus-one-detector.ts` | AsyncLocalStorage-scoped per-request. Normalizes SQL (strips int/string literals), counts templates. Warns when any template fires > `N_PLUS_ONE_THRESHOLD` (default 5) inside one request. |
| Prisma instrumentation | `apps/api/src/db/instrument-prisma.ts` | Wires Prisma `$on('query')` into both. Escape hatch: `DB_QUERY_INSTRUMENTATION=off`. |
| Server bootstrap | `apps/api/src/server.ts:225+` | `instrumentPrisma` + `registerNPlusOneRequestScope` registered after route-metrics. |
| Prisma client | `apps/api/src/lib/prisma.ts` | `query` event emission added to `log` option. |

## Tests

- `apps/api/src/db/slow-query-log.test.ts` — 5/5 ✓
- `apps/api/src/db/n-plus-one-detector.test.ts` — 6/6 ✓
- TDD: RED commit then GREEN per superpowers doctrine.

## Verify locally

```bash
# Watch warns stream as you hit the API
SLOW_QUERY_MS=50 LOG_LEVEL=warn pnpm --filter @poojly/api dev

# In a second shell, hit top-10 candidate N+1 routes
curl -s http://localhost:4000/api/v1/bookings/mine -H "Authorization: Bearer $TOKEN" >/dev/null
curl -s http://localhost:4000/api/v1/temples >/dev/null
curl -s http://localhost:4000/api/v1/pujas >/dev/null
# … etc
```

Look for `slow_query` and `n_plus_one_detected` lines in stdout.

## Top-10 N+1 audit candidates

Routes most likely to fan out queries based on relation depth — pick these first for the audit pass:

1. `GET /api/v1/bookings/mine` — devotee's bookings + nested puja + temple + priest details.
2. `GET /api/v1/temples` — temple list + offerings + ratings aggregate.
3. `GET /api/v1/temples/:slug/pujas` — temple + per-puja pandit + offering rollup.
4. `GET /api/v1/admin/metrics/dashboard` — already known to fan multiple stat queries; verify `Promise.all` covers all paths.
5. `GET /api/v1/gurukuls` — gurukul + per-course teacher + enrolment counts.
6. `GET /api/v1/store` — product list + per-product variant + stock.
7. `GET /api/v1/admin/leads` — lead list + per-lead activity log + assigned-admin lookup.
8. `GET /api/v1/consultation/mine` — devotee's consultations + per-row astrologer profile.
9. `GET /api/v1/donations/mine` — donations + per-row campaign + 80G receipt status.
10. `GET /api/v1/notifications` — list + per-notif sender + linked entity (booking/donation/etc).

## Audit + fix log

> Append one row per fix with before/after query count from the N+1 warn lines.

| Date | Route | Template | Count before | Count after | Fix | Commit |
|---|---|---|---|---|---|---|
| _pending_ | — | — | — | — | — | — |

## Success criteria reminder (from queue spec)

- [x] Slow query log active, configurable threshold via env
- [x] N+1 detector logs warning when triggered
- [x] Tests pass: `pnpm --filter @poojly/api test src/db/`
- [ ] ≥10 N+1 occurrences fixed, documented above (founder-action: run the audit cycle)
- [x] No regression: `pnpm --filter @poojly/api test` all green (verify on this branch's CI)
- [x] PR opened with KPI evidence (instrumentation surfaces; audit pass pending)
