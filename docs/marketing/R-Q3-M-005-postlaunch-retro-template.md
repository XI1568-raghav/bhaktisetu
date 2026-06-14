# R-Q3-M-005 App Store Launch — Post-launch Retro (T+30)

> Founder fills this in 30 days after iOS+Android GA. Ship to investor update + roadmap item KPI flip.

## Headline numbers

| Metric | Target | Actual | Delta |
|---|---|---|---|
| Combined installs (iOS+Android) | 15000 | TBD | TBD |
| iOS installs | ~6000 | TBD | TBD |
| Android installs | ~9000 | TBD | TBD |
| ASO keyword top-10 ranks (5 seed terms) | 5/5 | TBD | TBD |
| Influencer collabs shipped | 5 | TBD | TBD |
| Influencer combined reach | ≥500K | TBD | TBD |
| Blended paid CAC | ≤₹40 | TBD | TBD |
| D1 retention | ≥40% | TBD | TBD |
| D7 retention | ≥20% | TBD | TBD |
| D30 retention | ≥10% | TBD | TBD |

## Channel breakdown

| Channel | Spend | Installs | CAC | % of total |
|---|---|---|---|---|
| Organic (ASO) | ₹0 | TBD | ₹0 | TBD% |
| Meta UAC | TBD | TBD | TBD | TBD% |
| Google UAC | TBD | TBD | TBD | TBD% |
| Reddit promoted | TBD | TBD | TBD | TBD% |
| Influencer collabs | TBD | TBD | TBD | TBD% |
| Press (PR) | ₹0 | TBD | ₹0 | TBD% |
| Direct (founder network + WhatsApp blasts) | ₹0 | TBD | ₹0 | TBD% |

## Tripwire status

- [ ] Blended CAC stayed ≤ ₹40 for full 30 days → CONTINUE current SKU mix
- [ ] Blended CAC breached ₹40 for ≥ 2 consecutive weeks → FOLD to NRI-only SKU (USD pricing, 9-10× domestic)

If folded: explain decision + new monthly NRI install target.

## What worked

- TBD (founder fills 3-5 bullets after reviewing channel data)

## What didn't work

- TBD (3-5 bullets — be honest, this drives the next quarter)

## Top 3 surprises

- TBD
- TBD
- TBD

## Next 30 days plan

- Scale: which channels we DOUBLE
- Cut: which channels we KILL
- Test: 2-3 new hypotheses for next month

## Investor update copy (1 paragraph)

> Bhaktisetu shipped to iOS + Android on {{LAUNCH_DATE}}. {{INSTALLS}} installs in 30 days
> ({{IOS_INSTALLS}} iOS / {{ANDROID_INSTALLS}} Android). Blended CAC ₹{{CAC}}, well
> {{within|above}} the ₹40 ceiling. Top wins: {{TOP_3_WINS}}. Top miss: {{TOP_MISS}}.
> Next 30 days: {{NEXT_BETS}}.

## Append KPI to manual roll-up

```bash
# scripts/agents/_kpi-manual.mjs reads docs/roadmap/_manual-kpis.yml
# Add or update:
# total_app_installs:
#   value: <ACTUAL_NUMBER>
#   source: "Play Console + App Store Connect Sep 30 export"
#   updated_at: "<YYYY-MM-DD>"
```

Then flip `docs/roadmap/items/Q3/marketing/005-app-store-launch-campaign-aso-paid-installs-influe.md`:

- `status: in_progress` → `status: shipped` (only if installs ≥ 12000 — 80% of target)
- Add `shipped_at: <ISO_DATE>`
- Add `verified_at: <ISO_DATE>`
