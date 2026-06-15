# Unit Economics Refresh — CAC + LTV + Payback per Channel (NRI/Domestic)

> **Roadmap item**: R-Q2-F-002 (P1) · **Authored**: 2026-06-13 · **Refreshed**: 2026-06-15 (R-Q2-F-002 R4) · **Extends**: R-Q3-F-002 unit econ M9 audit template

## Goal

Q2-end (Aug 2026) snapshot of unit econ per acquisition channel. Used to allocate Q4 paid-spend budget intelligently.

## Deliverables (R4)

1. **Channel data scaffold** — `docs/finance/unit-econ-channel-data.json`
   Machine-readable per-channel CAC/LTV/payback targets keyed by acquisition channel + side (domestic/NRI). Powers future `/admin/unit-econ` dashboard. Status flags (`target` / `actual`) + confidence (`low` / `medium` / `high`) so consumers know what is projection vs measured.
2. **Refresh script** — `scripts/finance/unit-econ-refresh.mjs`
   Env-or-noop (per CLAUDE.md): if `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` present, fetches real cohort attribution; otherwise prints baseline projections and flags snapshot as `stale: true`. Writes timestamped snapshots to `docs/agent-reports/unit-econ/` under `--write`. Exits 2 on tripwire breach.
3. **Tripwires wired to ROADMAP.md** — blended NRI CAC > $40 or blended domestic payback > 3 mo => snapshot flags breach + non-zero exit.
4. **Handoff doc** — `docs/finance/R-Q2-F-002-handoff.md` describes founder action to promote `unit_econ_dashboard_live` from 0 to 1.

## Per-channel breakdown (baseline projections — refresh w/ real PostHog cohort data)

| Channel | CAC (India) | CAC (NRI) | LTV (India) | LTV (NRI) | Payback months |
|---|---|---|---|---|---|
| Organic SEO | ₹0 | $0 | ₹500 | $50 | 0 |
| Twitter build-in-public | ₹0 | $0 | ₹400 | $40 | 0 |
| Reddit r/india + r/bangalore | ₹0 | $0 | ₹350 | $30 | 0 |
| WhatsApp warm-network | ₹50 (founder time) | $1 | ₹600 | $60 | 1 |
| Referral program (R-Q2-M-011) | ₹100 (wallet credit) | $10 | ₹500 | $50 | 2 |
| Instagram | ₹0 | $0 | ₹400 | $40 | 0 |
| Telegram | ₹0 | $0 | ₹300 | $30 | 0 |
| **Blended (weighted)** | **~₹21** | **~$1.65** | **~₹480** | **~$46** | **1** |

Blended values are computed by `unit-econ-refresh.mjs` from `unit-econ-channel-data.json` using `monthly_acquired_target` as weight. Above = Q2 projections; refresh w/ real PostHog cohort attribution.

## Calculations

Per channel:
- CAC = (founder hours × ₹500/hr OR paid spend) / customers acquired this channel
- LTV = avg revenue per acquired customer over 12 months × gross margin (per offering type — puja 25%, darshan 80%, astrology 35%, store 18%, yatra 12%, donation 90%)
- Payback = CAC / monthly contribution per customer (in months)

Blended formula (per side: domestic | nri):

```
blended_cac = Σ(channel_cac × monthly_acquired) / Σ(monthly_acquired)
blended_ltv = Σ(channel_ltv × monthly_acquired) / Σ(monthly_acquired)
```

## Attribution sources

| Channel | Attribution source |
|---|---|
| Organic SEO | PostHog `utm_source=google|bing|duckduckgo`; fallback referrer empty |
| Twitter | PostHog `utm_source=twitter|t.co` |
| Reddit | PostHog `utm_source=reddit|old.reddit.com` |
| WhatsApp | PostHog `utm_source=whatsapp` + first-touch `share_link` event |
| Referral | Supabase `referral_claims.referrer_id` join `referral_codes.code` |
| Instagram | PostHog `utm_source=instagram|ig|l.instagram.com` |
| Telegram | PostHog `utm_source=telegram|t.me` |

Founder must ensure share/CTA links carry the matching `utm_source` query param. Existing referral-capture cookie (`darshya_ref`) closes the gap for in-product referrals.

## Refresh cadence

| Cadence | When | Owner | Action |
|---|---|---|---|
| Daily (automated) | 03:00 UTC via roadmap-loop signal-context | agent | `unit-econ-refresh.mjs` runs noop in dry mode if env missing |
| Weekly | Mon 09:00 IST | founder | run `node scripts/finance/unit-econ-refresh.mjs --write` w/ env populated, review snapshot diff |
| Quarterly | Aug 31 (Q2), Nov 30 (Q3), Feb 28 (Q4) | founder + CA | sit-down review, update pitch deck Slide 8, set baseline for next quarter |

## Tripwires

Snapshot writer exits 2 (non-zero) and prints WARN when:

- Blended NRI CAC > $40 (per ROADMAP.md tripwire — folds to NRI-only SKU if breached two weeks in a row)
- Blended domestic payback > 3 months

Founder reviews any breach within 48h, decides: (a) pause underperforming channel, (b) re-weight `monthly_acquired_target`, or (c) accept w/ documented rationale.

## KPI promotion (`unit_econ_dashboard_live` 0 → 1)

Promotes when **all** of:

1. PostHog `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` env populated on founder workstation and `roadmap-loop` GH secrets
2. First non-stale snapshot written to `docs/agent-reports/unit-econ/YYYY-MM-DD-unit-econ-refresh.json` (`stale: false`)
3. `docs/roadmap/_manual-kpis.yml` flips `unit_econ_dashboard_live: 1`
4. Optional: `/admin/unit-econ` Next.js page reads latest snapshot (out-of-scope this PR — separate Q3 engineering item)

## Founder action

- [ ] Set `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` in `.env.local` AND in repo GH Actions secrets (already on ARE Phase 6 founder-action list)
- [ ] Tag all outbound share links / pitch-deck CTAs with `utm_source` per attribution table above
- [ ] Confirm referral-program ledger (`referral_claims`) populated post `R-Q2-M-011` ship
- [ ] Run weekly: `node scripts/finance/unit-econ-refresh.mjs --write` after Mon ops review
- [ ] Cross-ref `docs/finance/unit-economics-m9-audit-template.md`
- [ ] Update pitch deck Slide 8 w/ blended numbers
- [ ] Flip `unit_econ_dashboard_live: 1` after first non-stale snapshot

## Closes

R-Q2-F-002 — spec + data scaffold + refresh script + handoff shipped. KPI stays `in_progress` until founder action populates env + first non-stale snapshot lands.
