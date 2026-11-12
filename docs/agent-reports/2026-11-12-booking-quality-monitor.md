# booking-quality-monitor — 2026-11-12

Polled `/api/v1/admin/ops/sla-overdue-bookings` for puja bookings past their scheduled date by ≥24h with no `videoProofUrl`.

## Result

- **2** breach(es)
- Cutoff: `2026-11-11T11:41:19.437Z`
- Filed GH issue #384: https://github.com/XI1568-raghav/bhaktisetu/issues/384

## Top breaches

| Booking | Scheduled | Status | ₹ | Priest |
|---|---|---|---|---|
| `BS-20261106-1T5Y2` | 2026-11-10 | priest_assigned | 1 | 6619d1fa |
| `BS-20261107-8E35C` | 2026-11-11 | priest_assigned | 1 | 6619d1fa |
