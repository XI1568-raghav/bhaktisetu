# Antim Sanskar Pandit Pipeline

> Spec: R-Q4-S-007 — target 20 verified by month 10 close
> Source seed: `seeds/antim-pandits-prospects.csv` (60 prospects)
> Playbook: `docs/sales/playbooks/antim-pandit-onboarding.md`
> KPI source: `signal-context/kpi-collectors.yaml` (metric `antim_specialist_pandits`)

## Counter

```
PROSPECTED  CONTACTED  MEETING  VERIFIED  ONBOARDED  REJECTED
    60          0         0         0         0          0
```

(Update by founder weekly. Bump VERIFIED → ONBOARDED only after first paid booking is processed.)

## Kanban

### Prospected (60)

See `seeds/antim-pandits-prospects.csv`. Each row carries `lead_origin` (ghat directory source) and `notes` (`founder-collect-onsite` flag when phone not public).

### Contacted (0)

| Name | Ghat | Phone | Date contacted | Channel | Response |
|---|---|---|---|---|---|

### Meeting scheduled (0)

| Name | Ghat | Date | Mode | Notes |
|---|---|---|---|---|

### Verified (0)

| Name | Ghat | Verification date | Aadhaar | Ghat permit | References | Audio sample |
|---|---|---|---|---|---|---|

### Onboarded (0)

| Name | Ghat | First booking date | Booking ref | Payout |
|---|---|---|---|---|

### Rejected (0)

| Name | Ghat | Reason |
|---|---|---|

## Weekly cadence (founder)

- Mon: review last week column moves, set this week's call list (target 10 dials/week)
- Wed: ghat visit (1 per week, rotate Kashi → Haridwar → Prayagraj)
- Sat: in-person verification of week's meetings
- Sun: update this tracker + KPI count in Supabase

## Funnel math

- 60 prospects -> ~40 contactable (post phone-collection)
- 40 contacted -> ~20 meeting -> 20 verified -> 20 onboarded
- Conversion ratios assume Garuda Purana literacy filter at meeting stage drops half
