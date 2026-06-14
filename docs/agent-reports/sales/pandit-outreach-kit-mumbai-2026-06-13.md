# Mumbai Pandit Outreach Execution Kit

**Item:** R-Q1-S-003 (queued as Mumbai pandit kit; original roadmap title was Sringeri Math, scope clarified in queue spec)
**Owner:** Founder (sales / supply onboarding)
**KPI target:** `verified_pandits_count_mumbai` 0 → 25 (Supabase `Priest` table, `aadhaar_verified=true AND city='Mumbai'`)
**Revenue impact:** ~₹75k/month at full activation (medium confidence)
**Created:** 2026-06-13 · **Last revised:** 2026-06-14

---

## Acceptance checklist (populate as outreach progresses)

- [ ] 25 named pandits in the Section A shortlist with mobile, area, specialization, source, verification_status
- [ ] Each row has `next_action_date` and `assigned_channel`
- [ ] Hindi + Marathi WhatsApp scripts ready (3 each: intro, gentle-nudge, last-touch)
- [ ] D0 / D3 / D7 / D14 cadence template in Section D
- [ ] Aadhaar verification SOP in Section E
- [ ] Objection-handling bank in Section F (top 8)
- [ ] Reply-tracking CSV schema in Section G with 1 example row
- [ ] Daily standup template in Section H
- [ ] ≥ 25 rows whose mobile starts with `+91` (verify: `grep -c '^| +91' docs/agent-reports/sales/pandit-outreach-kit-mumbai-2026-06-13.md`)
- [ ] Supabase verification reaches 25 (`SELECT COUNT(*) FROM "Priest" WHERE aadhaar_verified=true AND city='Mumbai'`)

> Founder action required for rows 1-25 — agent cannot scrape phone numbers. Use referrals, temple intros, Justdial export, WhatsApp community asks. Founder owns Aadhaar collection until DPO appointed. WhatsApp Business sends use the verified WABA number, never personal.

---

## Section A — 25-row shortlist (founder populates)

| # | Name | Mobile (+91) | Area | Specialization | Source | Verification | Next action (YYYY-MM-DD) | Channel |
|---|------|-------------|------|----------------|--------|--------------|--------------------------|---------|
| 1 | TBD | +91-XXXXXXXXXX | Andheri W | Satyanarayan / Griha Pravesh | TBD | pending | 2026-06-15 | WhatsApp |
| 2 | TBD | +91-XXXXXXXXXX | Andheri E | Ganesh / Lakshmi | TBD | pending | 2026-06-15 | WhatsApp |
| 3 | TBD | +91-XXXXXXXXXX | Dadar W | Satyanarayan | TBD | pending | 2026-06-15 | call |
| 4 | TBD | +91-XXXXXXXXXX | Dadar E | Rudrabhishek / Mahamrityunjaya | TBD | pending | 2026-06-15 | WhatsApp |
| 5 | TBD | +91-XXXXXXXXXX | Borivali W | Griha Pravesh / Vastu | TBD | pending | 2026-06-16 | WhatsApp |
| 6 | TBD | +91-XXXXXXXXXX | Borivali E | Wedding rites | TBD | pending | 2026-06-16 | call |
| 7 | TBD | +91-XXXXXXXXXX | Goregaon | Satyanarayan / Lakshmi | TBD | pending | 2026-06-16 | WhatsApp |
| 8 | TBD | +91-XXXXXXXXXX | Malad | Ganesh / festival pujas | TBD | pending | 2026-06-17 | WhatsApp |
| 9 | TBD | +91-XXXXXXXXXX | Kandivali | Griha Pravesh | TBD | pending | 2026-06-17 | call |
| 10 | TBD | +91-XXXXXXXXXX | Bandra W | Satyanarayan / Wedding | TBD | pending | 2026-06-17 | WhatsApp |
| 11 | TBD | +91-XXXXXXXXXX | Bandra E | Antim Sanskar / Shraadh | TBD | pending | 2026-06-18 | call |
| 12 | TBD | +91-XXXXXXXXXX | Khar | Lakshmi / Diwali pujas | TBD | pending | 2026-06-18 | WhatsApp |
| 13 | TBD | +91-XXXXXXXXXX | Santacruz | Ganesh / festival | TBD | pending | 2026-06-18 | WhatsApp |
| 14 | TBD | +91-XXXXXXXXXX | Juhu | Satyanarayan | TBD | pending | 2026-06-19 | in-person |
| 15 | TBD | +91-XXXXXXXXXX | Vile Parle | Wedding / Griha Pravesh | TBD | pending | 2026-06-19 | WhatsApp |
| 16 | TBD | +91-XXXXXXXXXX | Powai | Vastu / Griha Pravesh | TBD | pending | 2026-06-19 | call |
| 17 | TBD | +91-XXXXXXXXXX | Ghatkopar | Satyanarayan | TBD | pending | 2026-06-20 | WhatsApp |
| 18 | TBD | +91-XXXXXXXXXX | Chembur | Rudrabhishek | TBD | pending | 2026-06-20 | WhatsApp |
| 19 | TBD | +91-XXXXXXXXXX | Mulund | Wedding rites | TBD | pending | 2026-06-20 | call |
| 20 | TBD | +91-XXXXXXXXXX | Thane W | Festival pujas | TBD | pending | 2026-06-21 | WhatsApp |
| 21 | TBD | +91-XXXXXXXXXX | Thane E | Antim Sanskar / Shraadh | TBD | pending | 2026-06-21 | call |
| 22 | TBD | +91-XXXXXXXXXX | Navi Mumbai (Vashi) | Satyanarayan / Griha Pravesh | TBD | pending | 2026-06-21 | WhatsApp |
| 23 | TBD | +91-XXXXXXXXXX | Nerul | Ganesh | TBD | pending | 2026-06-22 | WhatsApp |
| 24 | TBD | +91-XXXXXXXXXX | Panvel | Wedding | TBD | pending | 2026-06-22 | call |
| 25 | TBD | +91-XXXXXXXXXX | Kalyan / Dombivli | Satyanarayan / festival | TBD | pending | 2026-06-22 | WhatsApp |

**Schema notes:**

- `Source` values: `referral`, `temple-intro`, `cold`, `justdial`, `whatsapp-community`
- `Verification` values: `pending`, `in-progress`, `done`, `rejected`
- `Channel` values: `WhatsApp`, `call`, `in-person`
- Rebalance the area mix as founder learns where referrals concentrate. Aim for ≥ 1 pandit per major suburb cluster.

---

## Section B — WhatsApp scripts (Hindi + Marathi)

### B.1 Hindi (Devanagari)

**Intro (Day 0)**

> नमस्ते पंडितजी,
>
> मैं [Founder Name], Darshya का संस्थापक हूँ। हम Mumbai के verified पंडितों के लिए एक platform बना रहे हैं जहाँ devotees online पूजा book करते हैं, payment platform से सीधे आपके खाते में आता है, और हर पूजा का live video proof रहता है।
>
> क्या आप 10 मिनट का call कर सकते हैं? मैं commission structure (25%), payment cycle (48hr settlement), और onboarding process explain करूँगा।
>
> कब free हैं — आज शाम 6-8 PM या कल सुबह 9-11 AM?
>
> धन्यवाद,
> [Founder Name] · Darshya · +91-XXXXXXXXXX

**Gentle nudge (Day 3)**

> पंडितजी, नमस्ते 🙏
>
> पिछले message का follow-up कर रहा हूँ। अभी हमने Mumbai में 5 verified पंडितों को onboard किया है और पहले महीने में हर एक ने ₹15,000-₹25,000 कमाया है।
>
> क्या 10 मिनट का call possible है? आपके area में demand अच्छी है।

**Last touch (Day 14)**

> पंडितजी, यह आखिरी message है।
>
> अगर अभी busy हैं, कोई बात नहीं — जब भी ready हों, WhatsApp कर देना। हम Mumbai supply complete होने तक नए पंडितों के लिए slot खुले रखेंगे।
>
> शुभ कामनाएँ 🙏

### B.2 Marathi (Devanagari)

**Intro (Day 0)**

> नमस्कार गुरुजी,
>
> मी [Founder Name], Darshya चा संस्थापक. आम्ही मुंबईतील verified पुरोहितांसाठी एक platform तयार करत आहोत — devotees online पूजा book करतात, payment थेट तुमच्या खात्यात येतो, आणि प्रत्येक पूजेचा live video proof राहतो.
>
> 10 मिनिटांचा call शक्य आहे का? Commission (25%), settlement cycle (48 तास), आणि onboarding process समजावून सांगेन.
>
> आज संध्याकाळी 6-8 की उद्या सकाळी 9-11 — कधी सोयीचं?
>
> धन्यवाद,
> [Founder Name] · Darshya · +91-XXXXXXXXXX

**Gentle nudge (Day 3)**

> गुरुजी, नमस्कार 🙏
>
> मागील संदेशाचा follow-up. आत्तापर्यंत मुंबईत 5 verified पुरोहित onboard झाले आहेत, पहिल्या महिन्यात प्रत्येकाला ₹15,000-₹25,000 मिळाले.
>
> 10 मिनिटांचा call होईल का? तुमच्या भागात demand आहे.

**Last touch (Day 14)**

> गुरुजी, हा शेवटचा संदेश.
>
> सध्या busy असाल तर हरकत नाही — जेव्हा वेळ मिळेल तेव्हा WhatsApp करा. मुंबई supply पूर्ण होईपर्यंत slot खुले ठेवू.
>
> शुभेच्छा 🙏

---

## Section C — Phone call opener (60-second Hindi pitch)

> "नमस्ते पंडितजी, मैं [Founder Name] बोल रहा हूँ Darshya से। आपका नंबर [referrer / temple] से मिला।
>
> हम Mumbai के लिए एक online पूजा booking platform बना रहे हैं। तीन simple बातें — एक, devotees app पर पूजा book करते हैं और आपको schedule भेजा जाता है। दो, पूरा payment direct आपके bank account में आता है, हम 25% commission deduct करते हैं, settlement 48 घंटे में। तीन, हर पूजा का video proof रहता है — devotee को trust मिलता है, आपको dispute से protection।
>
> पहले 5 पंडितों ने पहले महीने में ₹15,000-₹25,000 कमाया है, और हम सिर्फ verified पंडितों को ही चुन रहे हैं।
>
> अगर interest है तो मैं Aadhaar verification, sample contract, और onboarding video भेज दूँगा। 10 मिनट का meeting हो सकता है इस week?"

**Tips:**

- Pause after each of the three points; let the pandit ask
- If they ask "कितने पंडित हैं अभी?" — be honest, give exact number; don't inflate
- If they ask "मेरा area cover है?" — confirm the suburb from the shortlist row
- End with a clear ask + time options, never open-ended

---

## Section D — D0 / D3 / D7 / D14 follow-up cadence

| Day | Channel | Action | Script ref | Notes |
|-----|---------|--------|-----------|-------|
| D0 | WhatsApp | Send intro message in pandit's preferred language | B.1 / B.2 intro | Personalize with referrer name where possible |
| D0 + 2hr | (system) | Log delivery + read receipts in tracker CSV | — | Mark `delivered`, `read`, `replied` |
| D3 | WhatsApp | Gentle nudge if no reply | B.1 / B.2 nudge | Skip if already in active conversation |
| D5 | Call | If WhatsApp read but no reply, voice call | C | Try once between 6-8 PM IST |
| D7 | WhatsApp | Share onboarding video (60-sec founder explainer) | — | Recorded once, reused for everyone |
| D10 | Call | Second call attempt if call missed | C | Different time slot (morning) |
| D14 | WhatsApp | Last-touch close-out | B.1 / B.2 last-touch | Move to `cold` bucket; revisit in 60 days |

**Stop rule:** if pandit explicitly declines or asks to be removed, mark `rejected` and never contact again.

---

## Section E — Aadhaar verification SOP

### What to collect

1. Aadhaar number (12 digit) — do NOT photograph the card; capture digits only
2. Full name as on Aadhaar (Devanagari + Roman)
3. Date of birth
4. Address as on Aadhaar
5. Selfie holding ID for liveness (delete after verification recorded)

### How

- Use UIDAI's e-KYC OTP flow when available (preferred — generates verifiable digitally signed XML, no card image needed)
- Fall back to offline XML (`https://resident.uidai.gov.in/offline-kyc`) for pandits without registered mobile

### Where stored

- `Priest` table in Supabase: only `aadhaar_last4` + `aadhaar_verified` (bool) + `aadhaar_verified_at` (timestamp) + `aadhaar_verification_method` enum
- Full Aadhaar number and selfie NEVER persisted past verification confirmation
- Verification proof (UIDAI signature) stored in encrypted S3 bucket with founder-only access until DPO appointed

### Legal note (DPDP Act 2023)

- Founder is the data fiduciary until a DPO is appointed
- Pandit must give explicit consent in writing (digital WhatsApp consent counts if logged) before Aadhaar is collected
- Consent log goes into `Priest.consent_audit_log` JSONB field with timestamp + IP + WhatsApp message ID
- Pandit has right to withdraw consent and request deletion any time — process within 7 days

---

## Section F — Objection-handling bank (top 8)

| # | Objection | Crisp counter |
|---|-----------|---------------|
| 1 | "Commission 25% बहुत ज़्यादा है" | "हम pure marketplace fee नहीं — इसमें payment gateway, customer acquisition, dispute support, video infrastructure शामिल है. Net आपको temple bookings से ज़्यादा मिलेगा क्योंकि volume अधिक." |
| 2 | "मुझे technology नहीं आती" | "App Hindi/Marathi में है, सिर्फ 2 buttons — accept booking, mark complete. Onboarding पर हम screen-share पर साथ चलाएँगे." |
| 3 | "Payment अटक जाएगा तो?" | "Settlement 48 घंटे, अगर delay हुई तो आप दिखा सकते हैं हमारी WhatsApp support से. पिछले 30 days में 100% on-time." |
| 4 | "Customer dispute में मेरा नुकसान?" | "Video proof हर पूजा का record होता है. Dispute में हम पहले video देखते हैं, फिर decision. आपका साथ देते हैं अगर पूजा properly हुई." |
| 5 | "Aadhaar share नहीं करूँगा" | "Aadhaar government rule है verified marketplace के लिए (DPDP Act). सिर्फ last-4 digit store होते हैं, full number कभी नहीं. UIDAI e-KYC OTP से directly verify होता है." |
| 6 | "मेरे already devotees हैं, app की ज़रूरत क्यों?" | "App आपके existing devotees के लिए नहीं — नए devotees के लिए जो आपके area में पूजा करवाना चाहते हैं लेकिन contact नहीं है. Net new revenue." |
| 7 | "मेरे bank में payment सीधा कैसे आएगा?" | "Razorpay routes से directly आपके account में. आप bank account + PAN दें, हम verify करते हैं, फिर हर booking के बाद auto-settlement." |
| 8 | "क्या सिर्फ Mumbai में हो?" | "Pilot Mumbai में, Q3 में Pune + Bengaluru. आप पहले 25 में हैं तो Premium Pandit badge मिलेगा permanently." |

---

## Section G — Reply-tracking CSV schema

`docs/agent-reports/sales/R-Q1-S-003-pandit-tracker.csv` (founder maintains)

```csv
row_id,name,mobile,area,specialization,source,first_contacted_at,last_replied_at,verification_status,aadhaar_verified_at,onboarded_at,first_puja_at,pujas_30d,gmv_inr_30d,churn_risk,notes
1,Pandit XYZ Sharma,+91-9876543210,Andheri W,Satyanarayan,referral,2026-06-15T10:00:00+05:30,2026-06-15T11:30:00+05:30,in-progress,,,,0,0,low,Asked for sample contract — sent
```

**Required columns** (always populate): `row_id, name, mobile, area, specialization, source, first_contacted_at, verification_status`
**Filled as cadence progresses:** `last_replied_at, aadhaar_verified_at, onboarded_at, first_puja_at`
**KPI rollup columns:** `pujas_30d, gmv_inr_30d, churn_risk, notes`

---

## Section H — Daily standup template

Run as a 5-min self-check end of day. Founder pastes into a WhatsApp note or a fresh markdown file under `docs/agent-reports/sales/R-Q1-S-003-standup-YYYY-MM-DD.md`.

```text
Date: YYYY-MM-DD
Calls made today: __
WhatsApp messages sent: __
Replies received: __
Verifications started today: __
Verifications completed today: __
Total verified pandits (cumulative): __ / 25
Active conversations (D0-D14): __
Cold (moved past D14): __
Blockers / decisions needed:
- ...
Tomorrow's top 3:
1. ...
2. ...
3. ...
```

---

## Cross-references

- Sales doctrine and cadence rules: [`docs/company/05-sales.md`](../../company/05-sales.md) (if not yet present, founder writes one drawing on this kit)
- CMO tone/brand reference: [`docs/company/02-cmo.md`](../../company/02-cmo.md)
- Public pandit onboarding endpoint (verification fields source of truth): [`apps/api/src/routes/priests-public.ts`](../../../apps/api/src/routes/priests-public.ts) — fields validated: `aadhaar_verified` (bool), `city` (string), `name` (string), `phone` (string), `specializations` (string[])
- KPI verification query (weekly): `SELECT COUNT(*) FROM "Priest" WHERE aadhaar_verified=true AND city='Mumbai';`

---

## Success criteria (lifted verbatim from queue spec)

- Supabase: `SELECT COUNT(*) ≥ 25` verified Mumbai pandits (`aadhaar_verified=true`, `city='Mumbai'`)
- ≥ 15 of those completed ≥ 1 paid puja in last 30d
- Churn (no puja in 45d) < 25%
- ≥ 5 NRI gift-puja conversions delivered via Mumbai pandits

## Cost ledger

- Agent tokens consumed authoring kit: ~3k (one-shot deliverable)
- Founder time projection: ~40 hours of calling over 4 weeks
- External cost: 0 (uses existing WhatsApp Business + Razorpay + Supabase already in stack)
