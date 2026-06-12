# ₹5L MRR Milestone — Tracking Cadence + Lane Breakdown

> **Roadmap item**: R-Q2-F-003 · **Authored**: 2026-06-12 · **Owner**: founder (until CFO hire). **Review cadence**: weekly Friday 4 PM IST. **Quarterly review**: end of Q1/Q2/Q3/Q4 (founder + Foundation board).

## Goal

Hit ₹5,00,000 (5L) Monthly Recurring Revenue by end of Q2 (December 2026). Track weekly to detect lane-level drift early. Each revenue lane has explicit owner + KPI + escalation threshold.

This doc is operational: founder reviews every Friday, updates the lane table, flags drift, escalates if any lane misses target 2 weeks running.

## Revenue lanes (5 total)

| Lane | Q2 MRR target | Q4 MRR target | Owner | Primary product |
|---|---|---|---|---|
| **L1: Puja bookings** | ₹1,50,000 | ₹3,50,000 | Sales/CS (founder + first CS hire) | Pay-per-puja (PujaBooking model) |
| **L2: Adopt-a-Temple subscriptions** | ₹1,20,000 | ₹3,00,000 | Product (founder + first PM) | Recurring sub via R-Q4-P-002 spec |
| **L3: CSR donation match** | ₹1,00,000 | ₹2,50,000 | Founder (direct enterprise sales) | R-Q4-M-007 corporate match |
| **L4: B2B white-label SaaS** | ₹80,000 | ₹2,00,000 | Founder + first BD hire | R-Q4-P-006 embed SDK |
| **L5: Affiliate / cross-channel** | ₹50,000 | ₹1,50,000 | Marketing (founder) | R-Q3-E-009 affiliate tracking (deferred — conflict w/ /refer) |
| **TOTAL Q2** | **₹5,00,000** | **₹12,50,000** | | |

Q4 totals show the trajectory — ₹12.5L MRR end of FY27 = ₹1.5Cr ARR.

## Weekly Friday review template

Founder pastes into `docs/finance/mrr-snapshots/YYYY-MM-DD.md` every Friday by 5 PM IST.

```markdown
# MRR Snapshot — YYYY-MM-DD (week N of Q2/Q3/Q4)

## Aggregate
- This week MRR: ₹X,XX,XXX
- Last week MRR: ₹X,XX,XXX
- WoW change: ±X.X%
- Target this week (linear to Q2 goal): ₹X,XX,XXX
- Variance vs target: ±X.X% (status: on-track / behind / ahead)

## Lane breakdown
| Lane | This week MRR | Last week | WoW Δ | Target this week | Variance | Owner notes |
|---|---|---|---|---|---|---|
| L1 Puja bookings | ₹X | ₹X | ±X% | ₹X | ±X% | (1 line) |
| L2 Adopt-temple sub | ₹X | ₹X | ±X% | ₹X | ±X% | (1 line) |
| L3 CSR match | ₹X | ₹X | ±X% | ₹X | ±X% | (1 line) |
| L4 B2B white-label | ₹X | ₹X | ±X% | ₹X | ±X% | (1 line) |
| L5 Affiliate | ₹X | ₹X | ±X% | ₹X | ±X% | (1 line) |

## Notes / decisions this week
- (1 paragraph max — what changed, what we tried, what we'll try next week)

## Tripwires fired this week
- (list any KPI breach per `_tripwires-global.yml`)

## Founder ask of board (if any)
- (concrete decision needed at next board call, or NONE)
```

## Lane-specific KPIs + dashboard query SQL

### L1: Puja bookings

```sql
-- Current MRR run-rate from puja bookings (last 30 days × 12)
SELECT
  ROUND(SUM(price_amount) * 12.0 / 30.0, 2) AS mrr_run_rate_inr,
  COUNT(*) AS bookings_last_30d,
  ROUND(AVG(price_amount), 2) AS avg_booking_inr
FROM puja_bookings
WHERE status IN ('confirmed', 'in_progress', 'completed', 'video_uploaded', 'delivered')
  AND created_at >= NOW() - INTERVAL '30 days';
```

KPI thresholds:
- **Target**: ₹1.5L MRR by week 12 of Q2 (linear ramp = ₹12.5K MRR added per week)
- **Yellow flag**: 2 consecutive weeks behind target by >15%
- **Red flag (escalate to board)**: 3 consecutive weeks behind target by >25%

### L2: Adopt-a-Temple subscriptions

```sql
-- Active subscription MRR (post R-Q4-P-002 ship)
SELECT
  ROUND(SUM(monthly_amount_inr), 2) AS active_mrr_inr,
  COUNT(*) AS active_subscriptions,
  COUNT(DISTINCT user_id) AS unique_subscribers,
  ROUND(AVG(monthly_amount_inr), 2) AS avg_subscription_inr
FROM temple_subscription
WHERE status = 'active';
```

KPI thresholds:
- **Target**: ₹1.2L MRR by week 12 of Q2 (= 240 active Bronze ₹500 OR 60 Silver ₹2K OR 24 Gold ₹5K)
- **Yellow flag**: <50% target by week 6 (mid-quarter check)
- **Red flag**: <30% target by week 10

### L3: CSR donation match

```sql
-- CSR partner aggregate match revenue (manual entry until R-Q4-M-007 partners signed)
-- Tracked in docs/marketing/csr-match-revenue-actuals.csv
-- Format: month, partner_name, match_committed_inr, match_received_inr, notes
```

KPI thresholds:
- **Target Q2**: ₹1L MRR = 2 Silver-tier partners (₹50K/mo each) OR 1 Gold + 1 Silver
- **Yellow flag**: 0 signed by week 6
- **Red flag**: 0 signed by week 10 → fold CSR strategy review

### L4: B2B white-label SaaS

```sql
-- Per R-Q4-P-006 b2b_booking_attribution table
SELECT
  bt.display_name AS partner,
  ROUND(SUM(bba.bhaktisetu_share_inr), 2) AS last_30d_inr,
  ROUND(SUM(bba.bhaktisetu_share_inr) * 12.0 / 30.0, 2) AS mrr_run_rate_inr
FROM b2b_booking_attribution bba
JOIN b2b_tenant bt ON bt.id = bba.tenant_id
WHERE bba.created_at >= NOW() - INTERVAL '30 days'
GROUP BY bt.display_name;
```

KPI thresholds:
- **Target Q2**: ₹80K MRR from 2-3 active tenants
- **Yellow flag**: 0 tenants live by week 8
- **Red flag**: 0 tenants by week 12 → consider B2B-pivot strategy review

### L5: Affiliate / cross-channel (R-Q3-E-009 deferred — defer L5 to Q3)

For Q2: L5 tracked as ₹0 baseline. Re-introduce in Q3 once R-Q3-E-009 affiliate tracking ships post-conflict-resolution.

## Escalation thresholds

| Threshold | Trigger | Action |
|---|---|---|
| **Y1 (Yellow lane)** | 1 lane behind target 2 consecutive weeks | Founder spends 4h this Friday on root-cause + ships 1 mitigation by next Monday |
| **Y2 (Yellow aggregate)** | Aggregate MRR behind 15% of weekly linear target 2 weeks | Re-review demand-side assumptions; tactical fix sprint |
| **R1 (Red lane)** | 1 lane behind target 25%+ for 3 weeks | Board notification + lane-strategy review w/ written 1-pager |
| **R2 (Red aggregate)** | Aggregate behind 25% for 3 weeks | Strategic review — possibly fold a lane and re-allocate effort |
| **CRITICAL** | Aggregate behind 40% for 4 weeks | Board emergency review + cash-runway re-projection |

## Tripwires integration

Each lane has 1+ tripwire defined in `docs/roadmap/_tripwires-global.yml`. Tripwire fire → automatic alert in next orchestrator cycle. Founder sees in `/admin/roadmap` dashboard.

Specific tripwires to add (next cycle):

- `mrr_l1_pujas_behind_2w` — fires if L1 MRR <85% of linear target for 2 consecutive weeks
- `mrr_l2_subs_below_30pct_w10` — fires if L2 MRR <30% of target by week 10
- `mrr_aggregate_red_3w` — fires if total MRR <75% of target for 3 consecutive weeks
- `mrr_aggregate_critical_4w` — fires if total MRR <60% of target for 4 consecutive weeks

## Cash runway implication

If MRR hits ₹5L by end of Q2 + costs stay <₹2L/mo (current free-tier-discipline model + 1 hire), Foundation breaks even by start of Q3. Every week MRR runs behind target extends the cash-runway risk linearly.

Founder responsibility: pause discretionary spend (new hires, new SaaS tools, paid ads) the moment lane-yellow fires unless explicitly board-approved.

## Quarterly review template

End of Q1/Q2/Q3/Q4 — founder writes single-page summary at `docs/finance/quarterly-reviews/QX-YYYY.md`:

```markdown
# Q{X} {YYYY} MRR Review

## Aggregate
- End-of-quarter MRR: ₹X,XX,XXX
- Quarter target: ₹X,XX,XXX
- Variance: ±X.X%

## Lane scorecard
| Lane | End-Q MRR | Q Target | Variance | Verdict |
|---|---|---|---|---|

## Lessons + decisions
- (3-5 bullets max)

## Next quarter focus
- (1 paragraph)
```

## Founder action

```markdown
- [ ] Create directory structure: mkdir -p docs/finance/mrr-snapshots docs/finance/quarterly-reviews
- [ ] Set weekly Friday 4 PM IST recurring calendar reminder
- [ ] Write first snapshot at docs/finance/mrr-snapshots/2026-06-14.md (this Friday)
- [ ] File 4 new tripwire definitions in _tripwires-global.yml per "Tripwires integration" section above
- [ ] Configure /admin/roadmap dashboard to surface aggregate MRR + lane-level breakdown (engineering ticket — next cycle)
- [ ] After 4 weekly snapshots, review trajectory: are we on track to ₹5L by Q2-end?
```

## Out of scope (this doc)

- Operational expense tracking (separate ledger — `docs/finance/opex-snapshots/`)
- Cash runway forecasting (separate doc once 4+ MRR snapshots stack)
- Investor update generation (separate template — `docs/finance/investor-updates/`)
- Cap table / equity management (Foundation = Section 8, no equity — N/A)

## Closes

Q-C-20260612T1153-R-Q2-F-003 — tracking doc shipped. Status flips when first snapshot lands at docs/finance/mrr-snapshots/2026-06-14.md.
