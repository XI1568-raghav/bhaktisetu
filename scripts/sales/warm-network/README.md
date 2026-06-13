# Warm-network reachout — founder runbook

Goal: 50 personal asks → 20% reply rate → 30% convert = ~3 qualified supply leads → ~₹2L pipeline.

## Files in this directory

| File | When to use |
|---|---|
| `wa-script-temple.md` | Asking for temple trustee / poojari intros (rows where `ask_type=temple`) |
| `wa-script-pandit.md` | Asking for pandit / pujari intros (rows where `ask_type=pandit`) |
| `wa-script-gaushala.md` | Asking for gaushala manager intros (rows where `ask_type=gaushala`) |
| `email-script-formal.md` | Older / formal contacts where WA feels too casual (any `ask_type`, set `channel=email`) |
| `followup-script-day7.md` | Single nudge 7 days after initial send if silent |

## Tracker + seed

- `data/sales/warm-network-contacts-seed.csv` — 50 pre-segmented slots. Founder fills `contact_name`, `city`, and optionally overrides `channel`/`language`.
- `data/sales/warm-network-tracker.csv` — copy filled seed rows here as you send. Log `sent_at` (ISO date), `replied_at`, `referral_received` (yes/no/silent), `supply_lead_id` (Bhaktisetu lead ID once converted), `notes`.

## Segmentation (pre-filled in seed)

| ask_type | Slots | Relationship focus |
|---|---|---|
| temple | 15 | Family priests, temple-trustee acquaintances, old college Hindu-society, community mandir circle |
| pandit | 15 | Gotra pandit, wedding pandits, family pujari, any known priest |
| gaushala | 10 | Rural family network, Marwari + agri contacts, Jain friends |
| donor | 5 | HNI friends, ex-colleagues at finance / VC / banking |
| diaspora | 5 | NRI friends overseas (Q3 Canada feeder market) |

## 5-day send schedule (founder)

| Day | Action | Time |
|---|---|---|
| Day 0-1 | Fill all 50 `contact_name` + `city` in seed CSV | 1-2 evenings |
| Day 2 | Send 10 messages (5 temple + 5 pandit). Log each `sent_at`. | 30 min |
| Day 3 | Send 10 (5 temple + 5 gaushala). | 30 min |
| Day 4 | Send 10 (5 pandit + 5 gaushala). | 30 min |
| Day 5 | Send 10 (5 pandit + 5 donor). | 30 min |
| Day 6 | Send 10 (5 diaspora + remaining temple/pandit). | 30 min |
| Day 9-13 | Day-7 nudge to anyone silent. Log replies daily. | 15 min/day |
| Day 14 | Aggregate: total sent / replied / referrals / qualified leads. Update item handoff_notes. | 30 min |

## Hard rules

1. **Founder voice only** — never bulk tool, never broadcast list, never copy-paste link spam.
2. **No links unless asked** — single-line ask + name+number requested. If they want more, send deck on reply.
3. **No third message** — Day-0 + Day-7 nudge, then silence. Wait 6 months minimum for any next ask.
4. **Hindi or English per contact** — pick based on comfort. Default Hindi for family/rural, English for diaspora/formal.
5. **Log every send** — `wa_warm_referrals_sent` KPI only ticks when you log to tracker.

## Reply playbook

| Reply | Action |
|---|---|
| Positive (intro offered) | Reply same day. Ask for warm 3-way WA group. Log `referral_received: yes`. Within 48h, contact referee with your name + their reference. |
| Negative ("can't think of anyone") | Thank, log `replied_at` date + `notes: declined`. Drop. |
| Conditional ("let me think") | Thank. Log. If no reply in 7 days, send nudge once. |
| Silent | Day-7 nudge once. Then log `replied_at: silent` and stop. |

## Expected outcomes (math)

- 50 asks × 20% reply = 10 replies
- 10 replies × 30% positive = 3 referrals
- 3 referrals × 70% qualify = 2 qualified supply leads
- 2 qualified × ₹1L average pipeline value = ₹2L pipeline

Worst case (10% reply / 10% positive) = 0-1 leads. Best case (35% reply / 40% positive / 80% qualify) = 5-6 leads.

## When to escalate vs drop

- 0 replies after 20 sends → STOP. Likely a script problem or wrong audience. Re-read scripts, A/B test variants on next 10 before continuing.
- 3+ leads but 0 conversion to active supply within 14 days → escalation: founder personally goes to one referee's city/temple for a day.
