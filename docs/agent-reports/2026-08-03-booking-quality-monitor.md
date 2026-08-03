# booking-quality-monitor — 2026-08-03

Polled `/api/v1/admin/ops/sla-overdue-bookings` for puja bookings past their scheduled date by ≥24h with no `videoProofUrl`.

## Result

- **5** breach(es)
- Cutoff: `2026-08-02T06:46:36.567Z`
- _Existing open issue covers this signal: https://github.com/XI1568-raghav/bhaktisetu/issues/179_

## Top breaches

| Booking | Scheduled | Status | ₹ | Priest |
|---|---|---|---|---|
| `BS-20260427-K3HSD` | 2026-05-04 | priest_assigned | 501 | cf18e924 |
| `BS-20260427-43U88` | 2026-05-04 | priest_assigned | 501 | 821edbe5 |
| `BS-20260427-H5FSK` | 2026-05-04 | priest_assigned | 501 | 821edbe5 |
| `BS-20260427-I3O05` | 2026-05-04 | priest_assigned | 501 | 821edbe5 |
| `BS-20260427-03BS5` | 2026-05-04 | priest_assigned | 501 | 821edbe5 |
