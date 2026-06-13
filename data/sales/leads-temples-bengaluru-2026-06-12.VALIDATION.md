# Validation checklist — leads-temples-bengaluru-2026-06-12.csv

Founder ticks before Phase 2 outreach send.

## Hard gates (per queue spec R-Q1-S-005)

1. [ ] Row count >= 25 (current: 28 data rows + 1 header = **29 lines**)
2. [ ] Every `website` value resolves HTTP 200. Run:

   ```bash
   xsv select website data/sales/leads-temples-bengaluru-2026-06-12.csv \
     | tail -n +2 \
     | grep -v UNKNOWN \
     | xargs -I{} curl -sI -o /dev/null -w "%{http_code} {}\n" {}
   ```

3. [ ] Every `phone_or_email` matches `^(\+91[- ]?\d{10}|[\w.-]+@[\w.-]+\.\w+)$` OR `UNKNOWN-RESEARCH-PENDING`. Current state: all rows marked UNKNOWN-RESEARCH-PENDING for primary_contact_name. 3 rows have verified email (ISKCON Bangalore, ISKCON Vasanthapura, Ragigudda). 25 require manual phone/email enrichment before send.
4. [ ] No duplicate `name` values. Run:

   ```bash
   xsv select name data/sales/leads-temples-bengaluru-2026-06-12.csv | tail -n +2 | sort | uniq -d
   # expect empty
   ```

5. [ ] At least 15 rows have non-null `primary_contact_name`. **CURRENTLY 0 — blocker.** Founder + sales-ops must enrich via:
   - Phone calls to temple office numbers (Karnataka tourism listings include landline)
   - LinkedIn search "temple manager Bengaluru" + temple name
   - Apollo.io / Hunter.io domain-email scrape for the 3 sites with confirmed domains
   - Walk-ins to nearby temples (free intel, no API quota)

## Soft gates (recommended before send)

6. [ ] Each website opens in browser + shows active content (not parked domain). Many KSTDC/karnatakatourism.org URLs are listing pages, not temple websites — verify each.
7. [ ] Spot-check 5 random rows: locality matches Google Maps + daily_footfall_estimate is in reasonable range (no fabricated 100k+ claims).
8. [ ] Cross-check `type` enum: ISKCON / Madhva / Smartha / Shaiva / Vaishnava / Ganapati / Devi / Ayyappa / Other only.

## Phase 2 unlock (founder-action-required)

- [ ] Founder approves CSV
- [ ] Founder approves outreach templates at `scripts/sales/outreach/temple-bengaluru-v1.md` (Kannada phrasing review)
- [ ] Founder sets `RESEND_API_KEY` + `ADMIN_OPS_TOKEN` env vars in Render
- [ ] Founder green-lights Phase 2 send via separate queue item

No outreach fires until ALL 4 above done.

## Hard rule (verbatim from queue spec)

> Zero fabrication, all temples must have verifiable public web presence.

Every row here references a verifiable Bengaluru temple. UNKNOWN-RESEARCH-PENDING markers are explicit — not fabricated names, addresses, or phone numbers. Daily-footfall estimates are order-of-magnitude guesses from public sources (karnatakatourism.org, temple Wikipedia entries, news articles about festival crowds); founder may revise before send.
