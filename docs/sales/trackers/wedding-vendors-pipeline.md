# Wedding Vendors Pipeline Tracker

> **Roadmap item**: R-Q4-S-009 (P2) · **Authored**: 2026-06-13
> **Source**: `wedding_vendors` table (Supabase) + `seeds/wedding-vendors-prospects.csv` (130 prospects)
> **Update cadence**: weekly by founder / sales-hire (Friday review)
> **Targets**: 30 photographers + 20 caterers + 15 decorators = 65 verified by month-11 close

## Status definitions

- **prospected** — in seed CSV / db row exists, no outreach yet
- **contacted** — first WhatsApp / DM sent
- **meeting** — call scheduled or completed
- **verified** — passed per-category verification rubric (see playbook)
- **onboarded** — commission agreement signed, listed on platform
- **rejected** — failed rubric, ghosted, or declined

---

## Photographers (target: 30 verified · pool: 60)

| Status | Count | Target | Gap |
|---|---|---|---|
| Prospected | 60 | 60 | 0 |
| Contacted | 0 | 60 | -60 |
| Meeting | 0 | 45 | -45 |
| Verified | 0 | 30 | -30 |
| Onboarded | 0 | 30 | -30 |
| Rejected | 0 | — | — |

### Prospect list by city

| City | Pool | Top tier (5L+ price point) | Notes |
|---|---|---|---|
| delhi-ncr | 12 | Stories By Joseph Radhik, Plush Affairs, Cupcake Productions | Punjabi weddings strong |
| mumbai | 12 | Israni, WeddingNama, Wedding Salad | Bollywood industry intros possible |
| bangalore | 10 | Pyaari, Vivek Krishnan, Picture Quotient | South Indian + tech crowd |
| pune | 8 | Through The Vibrant Lens, Frame On Wheels | Maharashtrian niche |
| hyderabad | 8 | Shobhit Sharma, Studio A | Hyderabadi royal style |
| kolkata | 6 | Sourav Das, The Wedding Story Calcutta | Bengali + Marwari |
| destination | 4 | (sub-distributed across cities) | Coorg / Goa overlap |

---

## Caterers (target: 20 verified · pool: 40)

| Status | Count | Target | Gap |
|---|---|---|---|
| Prospected | 40 | 40 | 0 |
| Contacted | 0 | 40 | -40 |
| Meeting | 0 | 30 | -30 |
| Verified | 0 | 20 | -20 |
| Onboarded | 0 | 20 | -20 |
| Rejected | 0 | — | — |

### Prospect list by cuisine

| Cuisine | Pool | Top tier | Notes |
|---|---|---|---|
| Marwari / Jain veg | 5 | Bhattad Caterers (Mum), Khandelwal (Delhi) | FSSAI clear |
| Punjabi / North Indian | 6 | Anand (Delhi), Foodlink (Mum) | 500-1000 pax |
| South Indian Brahmin | 6 | Iyer (Blr), Veera, Brahmin Wedding Caterers | Orthodox-kitchen |
| Bengali traditional | 5 | Aaheli, 6 Ballygunge, Bengali Sweets | Authentic Bengali |
| Maharashtrian | 4 | Chivda (Pune), Madhuras, Chitpavan | Marathi niche |
| Hyderabadi / Andhra | 5 | Paradise, Royal Hyd, Telangana | Biryani specialists |
| Multi-cuisine | 9 | Tamarind, Spice Route, Saffron | Premium tier |

---

## Decorators (target: 15 verified · pool: 30)

| Status | Count | Target | Gap |
|---|---|---|---|
| Prospected | 30 | 30 | 0 |
| Contacted | 0 | 30 | -30 |
| Meeting | 0 | 22 | -22 |
| Verified | 0 | 15 | -15 |
| Onboarded | 0 | 15 | -15 |
| Rejected | 0 | — | — |

### Prospect list by tier

| Tier | Pool | Top tier | Notes |
|---|---|---|---|
| Premium (20L+) | 6 | Devika Narain, Wedding Design Co, Royal | Celeb-aspirational |
| Mid-tier (8-20L) | 12 | Wedding Designers, Q Events, Mandap Co | Volume vendors |
| Floral-only | 5 | Floral Art (Mum), Floral Affairs (Pune) | Specialist sub-category |
| Boutique (5-12L) | 7 | Pune Boutique, Kolkata Boutique | First-time founders |

---

## Weekly review SOP (Friday cadence)

1. Pull latest `wedding_vendors` row counts grouped by status + vendor_type (KPI scraper auto-emits)
2. Update this tracker (counts table per category)
3. Identify gaps — which categories are tracking below the weekly run-rate?
4. Re-prioritize outreach for next week per gap signal
5. Update `_manual-kpis.yml` `wedding_vendors_verified` count if changed

## KPI collector entry

Add to `signal-context/kpi-collectors.yaml` (or `_manual-kpis.yml` until Supabase wiring complete):

```yaml
wedding_vendors_verified:
  source: supabase
  query: |
    SELECT COUNT(*) FROM wedding_vendors WHERE verification_status = 'verified';
  target: 65
  per_category_query: |
    SELECT vendor_type, COUNT(*)
    FROM wedding_vendors
    WHERE verification_status = 'verified'
    GROUP BY vendor_type;
  per_category_targets:
    photographer: 30
    caterer: 20
    decorator: 15
  emit_to: ops_dashboard
```

Founder-driven manual fallback in `_manual-kpis.yml` (until Supabase migration applied):

```yaml
wedding_vendors_verified: 0          # bump as rubric verifications complete
wedding_vendors_photog_verified: 0   # target 30
wedding_vendors_cater_verified: 0    # target 20
wedding_vendors_decor_verified: 0    # target 15
```

## Closes

R-Q4-S-009 — tracker + playbook + seed CSV + migration shipped. Founder/sales-hire drives outreach + status updates.
