# R-Q4-P-001 founder questions — verify pass 2026-06-12

> **Status**: spec shipped 2026-06-11 at `docs/product/specs/antim-sanskar-v1.md` (455 LOC, 13 H2 sections, lint GREEN). Engineering build (R-Q4-E-009) is BLOCKED until these 10 questions get founder decisions.
>
> **Verify run output**:
> - `test -f docs/product/specs/antim-sanskar-v1.md` → **OK**
> - `test -f scripts/lint-product-specs.mjs` → **OK**
> - `wc -l docs/product/specs/antim-sanskar-v1.md` → **455** (expected ~455)
> - `grep -c '^## '` → **13** (expected 13)
> - `pnpm lint:specs` → **PASS**
>
> Spec verification PASSED. No re-author needed. Cycle re-emission was correct call — these blockers are stale because no decisions logged.

## The 10 questions (from spec §Open questions, verbatim)

Each Q below has 3 columns: **decision needed**, **why it blocks**, **suggested default** (so founder can rubber-stamp the default instead of writing an essay).

---

### Q1. Pricing tiers

- **Decision needed**: Confirm/revise the ₹5,100 / ₹11,000 / ₹21,000 tiers AND the 15%-or-₹1,500-capped coordination fee.
- **Blocks**: invoice generation. Engineering can't ship `POST /api/v1/antyeshti/booking` until tiers are locked because schema needs `tier_amount_inr` enum constraints.
- **Suggested default**: SHIP AS-IS for v1. Three tiers fit the bear/base/bull pricing in `docs/marketing/csr-match-revenue-model.md`. Fee cap at ₹1,500 keeps high tier predictable.

### Q2. Pandit network capacity

- **Decision needed**: do we have last-rites-certified pandits in top-10 launch cities? If not, which cities are v1 and which are v2?
- **Blocks**: city allowlist in geo-filter. Otherwise we sell pujas we can't service.
- **Suggested default**: v1 = Mumbai + Delhi + Bengaluru (the 3 cities with the most existing Bhaktisetu pandits). v2 = +Pune, Chennai, Hyderabad, Kolkata. Wait on Tier-2 cities until pandit roster ≥ 3 per city.

### Q3. Cremation ground partnerships

- **Decision needed**: pandit-dispatch only OR pandit + cremation-ground coordinator?
- **Blocks**: legal exposure under municipal cremation regs + possible HRCE Act registration in some states. Counsel needed if going beyond pandit-dispatch.
- **Suggested default**: pandit-dispatch ONLY for v1. Cremation ground = family arranges. We provide pandit + samagri + video proof. v2 may add cremation-ground partnerships once 50 bookings completed and we know operational reality.

### Q4. Senior pandit reviewer

- **Decision needed**: name the senior pandit who signs off on grief-copy checklist + every subsequent copy change.
- **Blocks**: copy can't go live without signoff. Risk of culturally insensitive wording in production.
- **Suggested default**: Recruit 1 Foundation advisor with ≥20 years' antyeshti experience. Pay honorarium ₹10K/month retainer + ₹2K per copy review. **Founder must identify the person** (this is a personal network ask, not a job board posting).

### Q5. Bad-debt tolerance

- **Decision needed**: 5% bad-debt ceiling acceptable? What triggers escalation review?
- **Blocks**: founder/Foundation-board calibration for finance forecasting.
- **Suggested default**: ACCEPT 5%. Trigger escalation review at 2 consecutive months >7% OR any single month >10%. Document in `docs/finance/bad-debt-policy.md`.

### Q6. WhatsApp Business API entitlement (U7)

- **Decision needed**: do we have an approved `MESSAGE_TEMPLATE` for post-service invoice messages + reminders?
- **Blocks**: outbound WA — currently behind activation gate U7 (`docs/activation-gates.md` line 19). Approval cycle is 5-10 business days.
- **Suggested default**: APPLY THIS WEEK. Antyeshti use case is the simplest WhatsApp Business approval case (transactional template, no marketing). Founder submits via Meta Business Manager. Until approved, fall back to email + SMS via Resend + Twilio.

### Q7. Language coverage

- **Decision needed**: add Marathi/Tamil/Telugu/Bengali in v1 or v2?
- **Blocks**: translation effort + senior-pandit review per language. Each language adds ~₹20K one-time + ongoing review.
- **Suggested default**: v1 = Hindi + English (baseline). v2 = +Marathi + Tamil + Telugu (covers 70% of antyeshti demand by region). v3 = +Bengali. Note: this aligns with the Hi/Ta/Te macro translations we just shipped for CS (`docs/cs/macros-v1-hi.md`, `-ta.md`, `-te.md`).

### Q8. Asthi visarjan as v1.1 feature

- **Decision needed**: should 7-day post-service window also offer to book the asthi visarjan trip (Hardwar/Prayagraj)?
- **Blocks**: violates "no upsell" rule unless framed as ritual continuation within same booking.
- **Suggested default**: DEFER to v1.1 (3-6 months post v1 ship). Frame as "Continue the rites — Asthi visarjan booking" under the SAME parent booking ID, not a new SKU. No commercial verbs in copy.

### Q9. Out-of-network fallback

- **Decision needed**: if no Bhaktisetu pandit within 50km within 30min, do we partner-refer or hold family and try harder?
- **Blocks**: dispatch SLA + family communication script.
- **Suggested default**: REFER + call ops human within 5 min. Partner directories: local Brahmin samajs by city, pre-vetted in v1 launch cities. Explicit script: "We could not find a Bhaktisetu pandit nearby in time. We've contacted [samaj name] who has [N] vetted pandits and they will call you within 30 minutes. Your booking remains open — if they can't help, return to us and we will hold the rites with our best alternative."

### Q10. DPDPA data retention beyond 90 days

- **Decision needed**: counsel to confirm retention timeline for deceased data (DPDPA Section 11 special handling).
- **Blocks**: data pipeline + audit trail. Affects which fields anonymise vs delete.
- **Suggested default**: 90 days post-service → anonymise PII (name, phone, address) but RETAIN structural fields (city, tier, pandit_id, completion_status) for analytics. Permanent delete after 7 years (statutory tax record limit). Counsel signoff required — file in `docs/legal/dpdpa-deceased-retention.md`.

---

## Recommended decision path (≤30min founder time)

1. **Rubber-stamp 5 defaults** (Q1, Q5, Q7, Q8, Q9) — these are clear technical/operational calls, defaults are sane.
2. **Decide 2 questions w/ effort** (Q3 dispatch scope, Q4 senior pandit identity) — needs ~10min thinking each.
3. **Kick off 3 multi-week processes** (Q2 pandit verification, Q6 WhatsApp template, Q10 counsel review) — each is a non-blocking parallel track founder can fire-and-forget.

After founder updates this doc with decisions, agent will:
- Update spec §Open questions → § Resolved decisions (with founder-Q timestamps)
- File 3 new tickets for parallel tracks (Q2/Q6/Q10)
- Flip R-Q4-P-001 status from `shipped` → `verified` once all 10 land
- Notify R-Q4-E-009 engineering item to unblock

## Closes

Q-C-20260612T0503-R-Q4-P-001 — verify pass. Spec valid, lint clean, 10 founder Qs surfaced w/ recommended defaults.
