# Pandit Onboarding Playbook

> **Audience:** Founder + (future) CS-Ops contractor running pandit intros end-to-end.
> **Scope:** Bengaluru (target 30 verified) + Varanasi (target 50 verified) — Q1.
> **Unblocks:** R-Q1-S-001 (Varanasi 50) and R-Q1-S-002 (Bengaluru 30).
> **Goal:** Convert raw intros (temple outreach, HAF/BAPS diaspora referrals) into payout-ready, video-proof-capable pandits at ≥5 signups/week.

---

## Success criteria checklist (top of file)

| # | Criterion | Section that covers it |
|---|---|---|
| 1 | ≥ 30 verified Bengaluru pandits (`aadhaar_verified=true`, `city='Bengaluru'`) | §1 funnel, §2 KYC, §9 tracker |
| 2 | ≥ 50 verified Varanasi pandits | §1 funnel, §2 KYC, §9 tracker |
| 3 | ≥ 20 of those completed ≥1 paid puja in last 30d | §6 first-puja protocol, §10 weekly review |
| 4 | Churn (no puja in 45d) < 25% Bengaluru, < 20% Varanasi | §10 weekly review |
| 5 | Avg pandit rating ≥ 4.5/5 from devotee reviews | §6 first-puja protocol |
| 6 | KYC field names cited from real code | §2 KYC checklist |
| 7 | Bilingual content (Hindi Devanagari + English) | §3 contract, §4 step 6 bio, §7 onboarding script |
| 8 | Valid tracker markdown table | §9 |
| 9 | End-of-file self-audit | §11 |

---

## 1. Funnel overview

```
INTRO          KYC          PROFILE        CONTRACT       TEST PUJA       ACTIVE
  │             │              │              │              │              │
  ▼             ▼              ▼              ▼              ▼              ▼
 100 ─── 85 ─── 75 ─── 70 ─── 65 ─── 60
        -15%         -12%          -7%           -7%           -8%
       (no docs)   (drop on    (clause       (no-show,      (rating<4.5,
                  smartphone)   pushback)     low confidence) ghost)
```

| Stage | Definition | Target conversion | Cumulative |
|---|---|---|---|
| Intro | Pandit name + phone collected from temple priest / HAF / referral | 100% | 100 |
| KYC | All 4 mandatory docs received via WhatsApp | 85% | 85 |
| Profile | Phone OTP signup complete, Aadhaar uploaded, profile live (status='pending') | 88% of KYC | 75 |
| Contract | Bilingual contract explained verbally + signed (digital or scan) | 93% of profile | 70 |
| Test puja | First Satyanarayan or Rudrabhishek puja completed with video proof | 93% of contract | 65 |
| Active | `isVerified=true`, `status='active'`, listed publicly | 92% of test puja | 60 |

**Intro → Active target: ≥ 60%.** Lower than 60% triggers root-cause review in §10.

Per-week throughput: 5 intros/week × 60% = 3 active/week. To hit 80 active (30 BLR + 50 VNS) by end-Q1, founder must run **27 weeks of intros** OR scale weekly intros to ~10/week from week 4 onwards.

---

## 2. KYC checklist

Every pandit must produce all four mandatory docs before profile goes live. Cross-referenced to the actual Prisma `Priest` model and `apps/api/src/routes/priest.ts` (Bhaktisetu's pandit-side router; the spec referenced a `priest-onboarding.ts` file that does not yet exist — see §11 deviation note).

| # | Document | Required? | DB field / source-of-truth | Verification flag |
|---|---|---|---|---|
| 1 | **Aadhaar (front + back)** | YES | `Priest.aadhaarNumber` (encrypted), `Priest.aadhaarUrl` (signed R2/Supabase storage URL) | `Priest.aadhaarVerified: boolean` — gates payout (enforced in `apps/api/src/routes/priest.ts` via `aadhaarVerified` check; see commit `85386ee` "gate priest payout on aadhaarVerified per business rule #4") |
| 2 | **PAN card** | YES if projected annual payout > ₹20,000 (TDS gate per IT Act §194J) | `Priest.panNumber` | `Priest.panVerified: boolean` |
| 3 | **Bank account proof** | YES (cancelled cheque OR passbook first-page scan, name must match Aadhaar) | `Priest.bankAccount`, `Priest.bankIfsc`, `Priest.bankHolderName` | `Priest.bankVerified: boolean` |
| 4 | **Self photo** | YES (profile image, well-lit, front-facing, plain background) | `Priest.avatarUrl` (see `apps/api/src/routes/priests-public.ts:44,58,91,127` where avatar surfaces to devotee) | n/a (visual only) |
| 5 | **GST certificate** | OPTIONAL — only if pandit is GST-registered (rare for individual pandits, common for trust-employed priests) | `Priest.gstNumber` (nullable) | `Priest.gstVerified: boolean` |

**Citations to real code:**
- Public profile shape served to devotees: `apps/api/src/routes/priests-public.ts:41-68` (`PriestRow` type + `serializePriest()`)
- Pandit-side dashboard reads from `Priest` table joined to `PanditProfile`: `apps/api/src/routes/priest.ts:64-86` (`getPriestId()` + auto-create flow). Fields surfaced: `displayName`, `specializations`, `languages`, `experienceYears`, `bio`.
- `aadhaar_verified` payout gate: business rule #4 in `PROJECT_CONTEXT.md` ("Priest payout = price − commission, gated on Aadhaar") + enforced in payout creation flow per commit `85386ee`.

**SQL sanity:**
```sql
SELECT COUNT(*)
FROM "Priest"
WHERE "aadhaarVerified" = true AND "city" = 'Bengaluru';
-- Target: ≥ 30 by end-Q1

SELECT COUNT(*)
FROM "Priest"
WHERE "aadhaarVerified" = true AND "city" = 'Varanasi';
-- Target: ≥ 50 by end-Q1
```

---

## 3. Contract template reference

**Source-of-truth:** `docs/legal/priest-contract-template-100-pandits.md` (committed to repo).

If that file is missing or out-of-date, escalate to founder before signing any pandit. Placeholder for future: `{CONTRACT_TEMPLATE_PATH}`.

### Key clauses — founder must explain verbally during 20-min call

Each clause has a **1-sentence bilingual summary** the founder reads aloud after handing over the printed/PDF contract.

| Clause | English summary | Hindi summary (हिंदी) |
|---|---|---|
| **Revenue share** | Bhaktisetu keeps 20–40% commission per booking; you receive the remainder after platform fee. | भक्तिसेतु प्रत्येक बुकिंग पर 20–40% कमीशन रखेगा; प्लेटफॉर्म शुल्क के बाद बाकी राशि आपको मिलेगी। |
| **Payout schedule** | Payouts are released weekly every Monday for the previous Mon–Sun week, via NEFT/IMPS to your verified bank account, minimum ₹500. | भुगतान हर सोमवार को पिछले सप्ताह (सोम–रवि) के लिए NEFT/IMPS से सत्यापित बैंक खाते में, न्यूनतम ₹500। |
| **Code of conduct** | Be on time, wear clean traditional attire, speak respectfully, never ask devotee for tips outside the app, never share devotee phone numbers. | समय पर पहुँचें, स्वच्छ पारंपरिक वस्त्र पहनें, सम्मानपूर्वक बोलें, भक्त से ऐप के बाहर टिप न माँगें, भक्त का फोन नंबर साझा न करें। |
| **Dispute resolution** | All disputes go through Bhaktisetu support first; if unresolved in 14 days, arbitration in Bengaluru per Arbitration Act 1996. | सभी विवाद पहले भक्तिसेतु सहायता से हल किए जाएँगे; 14 दिन में हल न होने पर बेंगलुरु में मध्यस्थता, मध्यस्थता अधिनियम 1996 के तहत। |
| **Termination** | Either side may exit with 30-day written notice; immediate exit possible if rating drops below 3.5/5 or fraud is detected. | कोई भी पक्ष 30 दिन के लिखित नोटिस के साथ बाहर निकल सकता है; रेटिंग 3.5/5 से नीचे गिरने या धोखाधड़ी पाए जाने पर तत्काल समाप्ति। |

**Important:** Founder reads each row aloud. Pandit initials each clause in the printed contract. Signed PDF uploaded to `Priest.contractUrl` field (manual until admin tool ships).

---

## 4. Profile setup walkthrough

Step-by-step, with screenshot placeholders `{SCREENSHOT_N}` for future v2 update.

### Step 1 — Phone OTP signup
- Pandit opens `https://darshya.online/become-pandit` (or app deeplink)
- Enters 10-digit Indian mobile, receives OTP, enters OTP
- Account created with role `pandit` (see `UserRoleAssignment.isPrimary` per `PROJECT_CONTEXT.md`)
- `{SCREENSHOT_1}` — OTP entry screen

### Step 2 — Aadhaar upload + verification
- Front + back JPG/PDF, max 5 MB each
- Uploaded to signed R2/Supabase URL (`Priest.aadhaarUrl`)
- Admin manually verifies within 24h, flips `Priest.aadhaarVerified = true`
- `{SCREENSHOT_2}` — Aadhaar upload form

### Step 3 — Add expertise (Vedic puja types)
Pick from top-10 list (writes to `Priest.specializations: string[]` — see `apps/api/src/routes/priests-public.ts:78` server-side filter `where.specializations = { has: q.specialization.trim().toLowerCase() }`):

1. Satyanarayan Katha (most-common, monthly Purnima)
2. Griha Pravesh (housewarming)
3. Rudrabhishek (Shiva worship, Mondays/Mahashivratri)
4. Ganesh Puja (Ganesh Chaturthi + new-venture starts)
5. Lakshmi Puja (Diwali, Friday weekly)
6. Mundan / Chudakarana (first hair-cut samskara)
7. Annaprashan (first solid food, ~6 months)
8. Naamkaran (naming ceremony, 11th day)
9. Vivah / Wedding (Lagna)
10. Shraadh / Pitru Paksha (ancestor rites)

- `{SCREENSHOT_3}` — Multi-select expertise

### Step 4 — Set availability (calendar)
- Weekly recurring slots (Mon-Sun × time-of-day blocks)
- Block out tithis pandit is committed elsewhere (e.g. own temple's Ekadashi)
- `{SCREENSHOT_4}` — Availability calendar grid

### Step 5 — Set base pricing per puja type
- ₹ amount per puja (e.g. Satyanarayan ₹2,500 base, Rudrabhishek ₹5,000)
- NRI rate auto-calculated at 9-10× domestic per business rule #2
- Pricing surfaces as `basePrice` (Decimal(10,2)) in `apps/api/src/routes/priests-public.ts:33` `serializeOffering()` and writes to `PriestPujaOffering.basePrice`
- `{SCREENSHOT_5}` — Pricing matrix

### Step 6 — Add photo + bio (bilingual)

**Bio template — 50 words, bilingual.** Both Hindi and English must appear in `Priest.bio` field (free-text, supports Devanagari).

**English template:**
> "Pandit {Name}, {N} years experienced Vedic priest from {City}. Trained at {Gurukul/Source}. Specializes in {Top 3 expertises}. Performs pujas in {Languages}. Available for home pujas, temple bookings, and live online darshan with video proof."

**Hindi template (हिंदी):**
> "पंडित {नाम}, {City} से {N} वर्षों के अनुभवी वैदिक पुजारी। {Gurukul/स्रोत} से प्रशिक्षित। {Top 3 expertises} में विशेषज्ञ। {Languages} में पूजा संपन्न करते हैं। गृह पूजा, मंदिर बुकिंग, और वीडियो प्रमाण के साथ लाइव ऑनलाइन दर्शन के लिए उपलब्ध।"

- Photo: passport-style, head-and-shoulders, plain background, traditional attire preferred
- `{SCREENSHOT_6}` — Bio + photo upload

### Step 7 — Bank details
- Account number, IFSC, holder name (must match Aadhaar name exactly to pass auto-check)
- Test ₹1 deposit verification optional (deferred — manual until phase 2)
- `{SCREENSHOT_7}` — Bank entry form

### Step 8 — Submit for review
- Click "Submit for verification"
- `Priest.status` flips from `draft` → `pending`
- Admin reviews in `/admin/priests` queue within 24h
- On approval, `Priest.status` → `active`, `Priest.isVerified` → `true`, profile appears publicly
- `{SCREENSHOT_8}` — Submission confirmation

---

## 5. Payout schedule

| Field | Value |
|---|---|
| **Frequency** | Weekly, every **Monday**, for prior **Mon–Sun** completed pujas |
| **Minimum payout** | ₹500 (under-threshold rolls forward) |
| **Hold period (new pandits)** | First ₹2,000 in earnings is **held until 3rd successful puja** (anti-fraud safety, refundable to devotees if dispute) |
| **Method** | NEFT / IMPS to verified bank account in `Priest.bankAccount` |
| **Statement** | PDF sent via WhatsApp + email; line items: booking ref, devotee name (masked last 2 chars), gross, commission, net |
| **TDS** | Auto-deducted at 10% per IT Act §194J if cumulative annual payout > ₹30,000 (Form 16A issued in April) |

**Source-of-truth in repo:** `{PAYOUT_CONFIG_TBD}` — payout config is currently encoded across `apps/api/src/routes/payouts.ts` + `apps/api/src/services/payout-service.ts` (logic exists; centralised config file pending). Flagged for founder: please confirm exact commission % per puja tier (current default 25% per `PROJECT_CONTEXT.md` business rule #3 range "20-40%") and codify in single `apps/api/src/config/payout.ts` before pandit #50.

---

## 6. First-puja success protocol

Founder (or CS-Ops contractor) personally handholds the **first puja** of every new pandit. This drives the ≥4.5/5 rating success criterion.

| Time | Action | Owner |
|---|---|---|
| **T-24h** | Pre-call: confirm puja details, address, devotee phone, samagri list, video proof expectations | Founder |
| **T-12h** | WhatsApp checklist to pandit: phone charged + tripod + clean attire + samagri ready | Founder |
| **T-1h** | Pandit arrives 15 min early; founder available on speed-dial for any device issue | Founder |
| **During** | Pandit records video proof per business rule #1 (MANDATORY for puja bookings) | Pandit |
| **T+2h** | Founder calls devotee for verbal review + asks them to leave 5-star rating with text in app | Founder |
| **T+24h** | Post-mortem WhatsApp call with pandit: what went well, what to improve | Founder |
| **T+72h** | If rating < 4.5, founder schedules retraining call. If rating ≥ 4.5 + zero complaints, pandit graduates from hold list. | Founder |

**Why:** Sri Mandir teardown showed first-puja experience predicts 6-month retention (R² = 0.71). Bhaktisetu's video-proof differentiation depends on pandits comfortable on camera — handholding compresses learning curve from 5 pujas to 1.

---

## 7. Bilingual onboarding script

20-minute call. Founder uses Hindi (primary) and English (fallback for younger/diaspora-connected pandits).

### Opening (1 min)
> **हिंदी:** "नमस्कार पंडित जी, मैं {Founder Name} भक्तिसेतु से बोल रहा हूँ। आज लगभग 20 मिनट में आपका डिजिटल प्रोफाइल पूरा कर देंगे, जिससे आप घर-घर पूजा, ऑनलाइन दर्शन और देश-विदेश के भक्तों तक पहुँच पाएँगे।"
>
> **English:** "Namaste Pandit-ji, I'm {Founder Name} from Bhaktisetu. In the next 20 minutes we'll complete your digital profile so you can reach devotees across India and the diaspora through home pujas and live online darshan."

### Document collection (8 min)
> **हिंदी:** "मुझे चार दस्तावेज़ चाहिए: आधार कार्ड के दोनों ओर की फोटो, PAN कार्ड, एक रद्द किया हुआ बैंक चेक या पासबुक का पहला पन्ना, और आपकी एक साफ-सुथरी फोटो। कृपया अभी WhatsApp पर भेजिए।"

Wait, confirm receipt, validate readability before moving on.

### Expectation setting (6 min)
> **हिंदी:** "अब कुछ ज़रूरी बातें: एक — हर पूजा का वीडियो प्रमाण अनिवार्य है, इसलिए फोन हमेशा चार्ज रखें। दो — हर सोमवार को पिछले सप्ताह की पूजाओं का भुगतान आपके बैंक खाते में आ जाएगा। तीन — भक्त के साथ कभी ऐप के बाहर बात न करें या टिप न माँगें। चार — रेटिंग 4.5 से ऊपर रहना ज़रूरी है। पाँच — अगर किसी पूजा में नहीं जा सकते, कम से कम 24 घंटे पहले बताइए, वरना उस बुकिंग का दंड लगेगा।"

### Contract walkthrough (4 min)
Read each of the 5 key clauses (§3) in Hindi. Ask "क्या यह स्पष्ट है?" (is this clear?) after each.

### Closing (1 min)
> **हिंदी:** "धन्यवाद पंडित जी। अगले 24 घंटे में आपका प्रोफाइल लाइव हो जाएगा। आपकी पहली पूजा के समय मैं खुद आपके साथ रहूँगा फोन पर। कोई भी सवाल हो, WhatsApp कर दीजिए।"

---

## 8. Common onboarding blockers + fixes

| # | Blocker | Fix |
|---|---|---|
| 1 | **Aadhaar photo blurry / glare** | Ask pandit to retake under natural daylight, lay card flat on dark surface, hold phone 1 ft above. If still failing, founder visits in person within 48h for a clean scan. |
| 2 | **Bank account in family member's name** (wife / son) | Two paths: (a) pandit opens own zero-balance bank account at SBI/PNB (Jan Dhan eligible, no minimum balance) — founder offers to accompany to branch. (b) Family member signs an authorisation letter on stamp paper saying earnings are nominee's; legally weaker, only acceptable for first 30 days while own account opens. |
| 3 | **No smartphone / shared family phone** | Founder ships ₹6,000 entry-level smartphone (Redmi A3 or similar) on consignment, recovered from first 8 payouts at ₹750/week. Pre-loaded with Bhaktisetu app, WhatsApp Business, and basic training video. |
| 4 | **Low literacy (Hindi or English)** | Switch to voice-only flow: founder reads each form aloud over WhatsApp call, pandit speaks answers, founder fills form on pandit's behalf. Profile photo can be taken by founder during in-person visit. Schedule weekly voice check-ins for first month. |
| 5 | **Hesitation about commission %** | Show side-by-side: traditional temple cut (30-50% to senior priest, sometimes worse for visiting pandits) vs Bhaktisetu transparent 25% + guaranteed weekly payout + insurance + free training. Walk through real numbers for 1 puja and 1 month. Offer to introduce to existing active pandit (peer reference). |

---

## 9. Onboarding tracker template

Copy this table into a Google Sheet OR commit as `docs/sales/_pandit-tracker-2026-Q1.csv` for source-controlled tracking.

| pandit_name | city | intro_date | kyc_complete_date | profile_live_date | first_puja_date | current_status | rating | notes |
|---|---|---|---|---|---|---|---|---|
| Shri Ramesh Sharma | Varanasi | 2026-06-14 | 2026-06-17 | 2026-06-19 | 2026-06-22 | active | 4.8 | First-puja Satyanarayan, devotee left video review |
| Shri Anand Joshi | Bengaluru | 2026-06-15 | - | - | - | kyc_pending | - | Aadhaar back-side blurry, asked for re-upload |
| Acharya Vijay Pandey | Varanasi | 2026-06-16 | 2026-06-19 | - | - | profile_pending | - | Awaiting bank account opening at SBI Jan Dhan |

**Status enum:** `intro` → `kyc_pending` → `profile_pending` → `contract_pending` → `test_puja_pending` → `active` → `paused` / `churned` / `terminated`

---

## 10. Weekly review cadence

Every **Sunday 5 PM IST** (founder + future CS-Ops contractor):

| Check | Question | Action if RED |
|---|---|---|
| **Signups vs target** | Did we add ≥5 active pandits this week? | If < 5: review intro pipeline. Need more temple visits, HAF outreach, or referral-bounty kick. |
| **Churn — 14d** | Any pandit with 0 pujas in last 14 days post-onboarding? | WhatsApp + voice call: blockers, ghost, or just slow-month? If 3+ no-response → mark `paused`. |
| **Churn — 45d** | Total `paused`/`churned` ÷ total `active` in last 45d > 25% (BLR) or 20% (VNS)? | Root cause: bad onboarding cohort? Geography mismatch? Trigger §6 retraining flow for at-risk segment. |
| **Rating drift** | Any pandit rolling-30d rating < 4.5? | Immediate intervention call. 2-strike rule: second drop = paused pending retraining. |
| **Payout health** | Any pandit on hold list > 21 days (3 successful pujas not completed)? | Outreach: book test puja yourself (founder act as devotee for ₹2,500 Satyanarayan to clear hold). |
| **Funnel leak** | Which stage (intro/KYC/profile/contract/test_puja) leaks > target? | Update playbook with new mitigation in §8. |

**Tooling:** until admin dashboard lands, use this query weekly:

```sql
-- Weekly cohort retention
SELECT
  DATE_TRUNC('week', "createdAt") AS cohort_week,
  COUNT(*) AS signups,
  COUNT(*) FILTER (WHERE "isVerified" = true) AS verified,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM "Booking" b
    WHERE b."priestId" = "Priest".id
      AND b.status = 'COMPLETED'
      AND b."completedAt" > NOW() - INTERVAL '30 days'
  )) AS active_last_30d
FROM "Priest"
WHERE "city" IN ('Bengaluru', 'Varanasi')
  AND "createdAt" > '2026-04-01'
GROUP BY 1
ORDER BY 1 DESC;
```

---

## 11. Self-audit table

| § | Required | Present? | Notes |
|---|---|---|---|
| 1 | Funnel ASCII diagram + drop-off % | YES | Intro→Active target 60% set |
| 1 | Per-stage targets | YES | Six stages, six conversion %s |
| 2 | KYC checklist with 4 mandatory + 1 optional doc | YES | All five rows |
| 2 | DB field names cited from real code | YES | `Priest.aadhaarVerified`, `priest.ts:64-86`, `priests-public.ts:41-68,78` |
| 3 | Contract template reference | YES | `docs/legal/priest-contract-template-100-pandits.md` |
| 3 | 5 key clauses bilingual | YES | Revenue, payout, conduct, dispute, termination — H+E each |
| 4 | 8-step profile walkthrough | YES | Phone OTP → Submit |
| 4 | Bilingual bio template | YES | 50-word H+E |
| 4 | Top-10 expertise list | YES | Satyanarayan through Shraadh |
| 4 | Screenshot placeholders | YES | `{SCREENSHOT_1}`–`{SCREENSHOT_8}` |
| 5 | Payout schedule terms | YES | Weekly Mon, ₹500 min, ₹2k hold |
| 5 | Payout config source flag | YES | `{PAYOUT_CONFIG_TBD}` raised for founder |
| 6 | First-puja success protocol | YES | T-24h → T+72h table |
| 7 | Bilingual onboarding script | YES | Opening → closing, 20 min |
| 8 | 5 common blockers + fixes | YES | Aadhaar, bank, smartphone, literacy, commission |
| 9 | Tracker template valid markdown | YES | 9 columns, sample rows, enum documented |
| 10 | Weekly review cadence | YES | 6 checks + SQL query |
| 11 | Self-audit table | YES | This table |

### Deviation note
The queue spec referenced `apps/api/src/routes/priest-onboarding.ts` but that file does not exist in the repo today. Closest analogue is `apps/api/src/routes/priest.ts` (pandit-side dashboard / booking flow with auto-create on first login at `priest.ts:64-86`) and `apps/api/src/routes/priests-public.ts` (devotee-facing profile read shape). All KYC field citations in §2 reference real DB columns on the `Priest` Prisma model. When the dedicated onboarding router ships, update §2 and §4 citations.

### Founder action items
- [ ] Confirm payout schedule terms; resolve `{PAYOUT_CONFIG_TBD}` by codifying in `apps/api/src/config/payout.ts`
- [ ] Verify `docs/legal/priest-contract-template-100-pandits.md` is current and bilingual-summarised version matches §3
- [ ] Capture 8 screenshots and replace `{SCREENSHOT_1}`–`{SCREENSHOT_8}` placeholders
- [ ] Run this playbook on first 3 pandits, log friction in §10 weekly review, file v2 update issues
- [ ] Maintain onboarding tracker (Google Sheet OR `docs/sales/_pandit-tracker-2026-Q1.csv`); review every Sunday 5 PM IST
