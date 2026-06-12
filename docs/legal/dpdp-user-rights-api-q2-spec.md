# DPDP User-Rights API — Export + Delete + Correct + Admin UI

> **Roadmap item**: R-Q2-L-003 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q3-L-001 DPDP DSAR audit (already shipped)

## Goal

Q2 (Aug 2026) ship the user-rights API endpoints implementing R-Q3-L-001 design.

## Endpoints (per R-Q3-L-001 spec)

| Endpoint | Verb | Auth | Action |
|---|---|---|---|
| /api/v1/me/privacy/export | GET | user | JSON dump |
| /api/v1/me/privacy/correct | PATCH | user | edit fields |
| /api/v1/me/privacy/erase | DELETE | user | start 30d cooldown |
| /api/v1/me/privacy/erasure/withdraw | POST | user | cancel cooldown |
| /api/v1/me/privacy/consent | GET | user | current consent state |
| /api/v1/me/privacy/consent | PATCH | user | update consent toggles |
| /api/v1/me/privacy/log | GET | user | consent audit log |
| /api/v1/admin/dsar/pending | GET | admin | SLA-tracked queue |

## Admin UI

`/admin/dsar/pending` — paginated table:
- Pending requests (per type: export / correct / erase)
- Days-since-request (red if >25 days, yellow >15)
- Action: complete / escalate / dismiss

## Engineering tickets

- R-Q2-L-003a: endpoint implementations (6 endpoints)
- R-Q2-L-003b: ConsentLog Prisma migration (per R-Q3-L-001 schema)
- R-Q2-L-003c: erasure cron (90d soft → hard)
- R-Q2-L-003d: admin DSAR queue UI

## Closes

R-Q2-L-003 — engineering spec shipped.
