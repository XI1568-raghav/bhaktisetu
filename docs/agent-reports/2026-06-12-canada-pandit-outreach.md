# Canada pandit outreach — 2026-06-12 agent report

> R-Q3-S-007 cycle slice. Shipped per queue Q-C-20260612T0001-R-Q3-S-007.

## Methodology

Open-source temple-directory scrape (public roster pages only) for 5 cities:
Toronto, Brampton, Mississauga, Vancouver, Surrey. Hindu Federation of Canada,
ISKCON, BAPS, VHP Canada, Hindu Sabha umbrella sources. No paid Apollo / paid
LinkedIn. Google Maps Places API used in `--dry` mode only this cycle (real
mode preserves the curated CSV if present — see scope-note).

Rate limit honored at 2s/request, robots.txt checked for every host before
fetch. User-Agent identifies the bot per polite-crawl rules:
`Bhaktisetu-supply-research/0.1 (+contact@bhaktisetu.com)`.

## Source list

| Source                                          | URL                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ISKCON Toronto                                  | https://www.iskcontoronto.com/                                                                 |
| ISKCON Vancouver                                | https://iskconvancouver.com/                                                                   |
| BAPS Toronto                                    | https://www.baps.org/Global-Network/North-America/Toronto.aspx                                 |
| Hindu Sabha Mississauga/Brampton                | https://hindusabha.com/                                                                        |
| Hindu Heritage Centre Mississauga               | https://hhc.ca/                                                                                |
| Vishva Hindu Parishad Canada                    | https://vhp-canada.org/                                                                        |
| Hindu Federation of Canada                      | https://hindufederation.ca/                                                                    |
| Multiple sampradaya temples (50+ rows in CSV)   | See `data/leads/canada-pandits-2026-06.csv`                                                    |

## Lead-quality assessment

- **52 prospects** harvested across the 5 cities.
- **City distribution:** Toronto 21, Brampton 9, Mississauga 6, Vancouver 11,
  Surrey 5. Meets the spec floors (Toronto ≥ 20, Vancouver ≥ 10, Brampton ≥ 5).
- **Every row carries a `[VERIFY]` prefix in the name field.** Founder must
  cross-check temple website + LinkedIn before personalising and sending.
  Direct pandit names are intentionally not auto-extracted to avoid scrape
  errors and to keep the bot side strictly directory-only.
- **First 10 rows are `outreach_status=queued`.** Founder sends batch 1 across
  4 days at 3 sends/day pace (with 2 buffer swaps).
- **Sampradaya mix:** Gaudiya Vaishnava (ISKCON 4 chapters), Swaminarayan
  (BAPS), Shaiva, Shakta, Tamil Saiva, Sai bhakta, Vaishnava, mission/federation
  umbrellas. Coverage approximates the Canadian Hindu diaspora mix.

## Founder runbook (post-cycle)

See `scripts/sales/canada-pandit/README.md` — pre-flight, KYC checklist,
templates, follow-up cadence, mailing-address requirement (CASL), and
Vulnerable Sector Check policy decision.

## KPI dashboard query

```sql
-- verified_pandits_count_canada (target 10 by Aug 31)
SELECT COUNT(*)
FROM priests p
JOIN users u ON p.user_id = u.id
WHERE p.kyc_status = 'approved'
  AND u.location_country = 'CA'
  AND u.location_city IN ('Toronto', 'Vancouver', 'Brampton');
```

Founder runs this weekly via Supabase SQL editor. Target: 10 by 2026-08-31.

## What is NOT in this cycle

- Actual 10 onboards (founder follow-up over multi-week)
- KYC docs collected per pandit (founder reviews)
- 3+ puja SKUs live per pandit (depends on CAD Stripe rail, R-Q2-G-007)
- Pre-req R-Q2-G-007 Canada landing + Stripe CAD (separate roadmap item)

## Risks

- **CASL.** Outreach cannot legally send until founder acquires Canadian
  postal address. Templates currently say `[address TBD]`.
- **Vulnerable Sector Check.** Decision (mandatory for all vs child-adjacent
  only) gates onboarding speed.
- **BAPS sampradaya cycle** historically 30+ days for permission to list
  pandits externally.
- **Federation orgs** (Hindu Federation Canada, VHP Canada) are 3-6 month
  cycle but the highest leverage — single referral can replace 10 cold sends.

## Closes

- Queue: `Q-C-20260612T0001-R-Q3-S-007` (cycle-slice partial — research +
  infra + 10 emails queued; full onboard target stays in_progress).
