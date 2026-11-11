# booking-quality-monitor — 2026-11-11

Polled `/api/v1/admin/ops/sla-overdue-bookings` for puja bookings past their scheduled date by ≥24h with no `videoProofUrl`.

## Result

- **1** breach(es)
- Cutoff: `2026-11-10T11:21:58.315Z`
- Filed GH issue #383: https://github.com/XI1568-raghav/bhaktisetu/issues/383

## Top breaches

| Booking | Scheduled | Status | ₹ | Priest |
|---|---|---|---|---|
| `BS-20261106-1T5Y2` | 2026-11-10 | priest_assigned | 1 | 6619d1fa |
