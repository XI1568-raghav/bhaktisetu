# Support Macros — Darshya CS (Telugu v1)

> **Doctrine source**: `docs/company/07-cs.md` — verbatim: _"A devotee complaint is not a UX bug — it is a disrupted spiritual experience. We respond to the emotion first, the ticket second."_
>
> **Authoring date**: 2026-06-12 · **Translates from**: `docs/cs/macros-v1.md` (English source) · **Coverage**: top 5 macros (#1, #2, #3, #4, #6) · **Script**: Telugu + roman transliteration in (parentheses) per sentence
>
> **🚩 FOUNDER ACTION REQUIRED**: native-Telugu-fluent speaker must review translations before customer send. Telugu honorifics (`-garu`, `-andi`) shift tone significantly — must match relationship-respect register.

---

## Macro 1 — SLA-breach apology + immediate refund offer

- **Trigger**: PujaBooking in `priest_assigned` status for ≥7 days past `scheduledDate` with `videoProofUrl IS NULL`.
- **Tone note**: పూర్తి బాధ్యత స్వీకరణ, క్షమాపణ, ముందుగానే refund ఆఫర్.

**Reply text**:

> నమస్కారం {name} గారు,
>
> (Namaskaram {name} garu,)
>
> మీ పూజ ({puja_name}, {scheduledDate}) యొక్క వీడియో ఆధారం మాకు అందలేదు — ఇది మా బాధ్యత, మేము విఫలమయ్యాము. క్షమించండి.
>
> (Mee puja ({puja_name}, {scheduledDate}) yokka video aadhaaram maaku andaledu — idi maa baadhyatha, memu viphalamayyaamu. Kshaminchandi.)
>
> మీకు 3 ఎంపికలు ఉన్నాయి:
>
> (Meeku 3 empikalu unnayi:)
>
> 1. **పూర్తి refund** ₹{amountInr} — Razorpay rails ద్వారా 5-7 banking days లో తిరిగి వస్తుంది, లేదా
>    (Poorthi refund ₹{amountInr} — Razorpay rails dwaaraa 5-7 banking days lo thirigi vasthundi, lēdā)
> 2. **ఉచిత పునః-పూజ** అదే పండిత గారితో లేదా వేరే verified పండిత గారితో, లేదా
>    (Uchitha punah-puja adē panditha gaaritho lēdā vērē verified panditha gaaritho, lēdā)
> 3. **Wallet credit** ₹{amountInr × 1.25} (25% bonus, 90 రోజులు చెల్లుబాటు)
>    (Wallet credit ₹{amountInr × 1.25} — 25% bonus, 90 rōzulu chellubaatu)
>
> 1/2/3 లో ఏదైనా reply చేయండి. 24 గంటల్లో చర్య తీసుకుంటాము.
>
> (1/2/3 lo ēdainaa reply chēyandi. 24 gantallo charya theesukunṭāmu.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to founder action. Default to option 1 if no reply in 48h.

---

## Macro 2 — Priest no-show + reassignment

- **Trigger**: Devotee reports priest didn't appear OR was >30min late.
- **Tone note**: doctrine §1.1 — ఆధ్యాత్మిక అనుభవం అంతరాయం పడింది.

**Reply text**:

> నమస్కారం {name} గారు,
>
> (Namaskaram {name} garu,)
>
> మీరు ఎదురు చూశారు, కానీ పండిత గారు రాలేదు. ఇది మీ సమయానికి అవమానం — మా తప్పు.
>
> (Meeru eduru chooshaaru, kaani panditha garu raalēdu. Idi mee samayaaniki avamaanam — maa thappu.)
>
> ఈరోజే (48 గంటల లోపు) మీకు **వేరే verified పండిత గారిని** assign చేస్తున్నాము — అదే date/time slot, అదనపు fee లేదు. పండిత ID + WhatsApp 2 గంటల్లో పంపుతాము.
>
> (Eerojē 48 gantala lōpu meeku vērē verified panditha gaarini assign chēstunnaamu — adē date/time slot, adanapu fee lēdu. Panditha ID + WhatsApp 2 gantallo pampuṭaamu.)
>
> Reschedule సాధ్యం కాకపోతే → **పూర్తి refund** ₹{amountInr} 5-7 banking days లో.
>
> (Reschedule saadhyam kaakapotē → poorthi refund ₹{amountInr} 5-7 banking days lo.)
>
> మీ wallet లో **10% credit** (₹{amountInr × 0.10}) వేశాము. తదుపరి booking మీద auto-apply అవుతుంది.
>
> (Mee wallet lo 10% credit ₹{amountInr × 0.10} vēshaamu. Thadupari booking meeda auto-apply avuthundi.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: 2h to identify replacement, 48h to re-book.

---

## Macro 3 — Video proof delay (>72h)

- **Trigger**: Booking `confirmed`, `scheduledDate` passed >72h, `videoProofUrl IS NULL`.

**Reply text**:

> నమస్కారం {name} గారు,
>
> (Namaskaram {name} garu,)
>
> మీ పూజ ఖచ్చితంగా జరిగింది — పండిత గారి నుండి confirmation మాకు ఉంది. కానీ video 72 గంటల్లో మాకు అందలేదు, అది మీ హక్కు.
>
> (Mee puja kachchitanga jarigindi — panditha gaari nunchi confirmation maaku undi. Kaani video 72 gantallo maaku andaledu, adi mee hakku.)
>
> **ఈ రాత్రి లోపు** video మీ WhatsApp + email కి పంపుతాము.
>
> (Ee raathri lōpu video mee WhatsApp + email ki pampuṭaamu.)
>
> 96 గంటల్లో కూడా అందకపోతే → 25% credit (₹{amountInr × 0.25}) wallet లో, లేదా పూర్తి refund — మీరు ఎంచుకోండి.
>
> (96 gantallo kuda andakapotē → 25% credit ₹{amountInr × 0.25} wallet lo, lēdā poorthi refund — meeru enchukondi.)
>
> Booking ID: {BS-id}. పండిత ID: {priestId}.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to chase pandit. Day 4 → escalate + auto-credit.

---

## Macro 4 — Payment failed (Razorpay decline)

- **Trigger**: Payment `failed` OR Razorpay `payment.failed` webhook.

**Reply text**:

> నమస్కారం {name} గారు,
>
> (Namaskaram {name} garu,)
>
> మీ payment process కాలేదు — bank-side issue లాగుంది (network/limit/3DS).
>
> (Mee payment process kaalēdu — bank-side issue lāgundi — network/limit/3DS.)
>
> **రెండు మార్గాలు**:
>
> (Rendu maargaalu:)
>
> 1. **Retry link** (24h valid): {retry_link} — అదే Razorpay, వేరే method try చేయండి
>    (Retry link 24h valid: {retry_link} — adē Razorpay, vērē method try chēyandi)
> 2. **UPI direct**: `bhaktisetu@upi` కి ₹{amountInr} పంపండి + booking ID `{BS-id}` mention చేయండి. మేము manually 1h లో confirm చేస్తాము.
>    (UPI direct: bhaktisetu@upi ki ₹{amountInr} pampandi + booking ID {BS-id} mention chēyandi. Mēmu manually 1h lo confirm chēstaamu.)
>
> Money కట్ అయి "failed" చూపిస్తే → 2 గంటలు ఆగండి, auto-refund process అవుతుంది. రాకపోతే → ఇక్కడే reply చేయండి.
>
> (Money cut ayi "failed" choopistē → 2 gantalu āgandi, auto-refund process avuthundi. Raakapotē → ikkadē reply chēyandi.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: monitor 4h. Manual reach-out T+24h if silent.

---

## Macro 5 — Refund processed (post-action confirmation)

- **Trigger**: Razorpay refund API success.

**Reply text**:

> నమస్కారం {name} గారు,
>
> (Namaskaram {name} garu,)
>
> మీ refund **process అయింది**.
>
> (Mee refund process ayindi.)
>
> - మొత్తం: ₹{refundAmountInr}
> - Mode: {paymentMode} (UPI/Card/Netbanking)
> - Timeline: UPI → 1-3 రోజులు, Card/Netbanking → 5-7 banking days (bank-side delay, మా control లో లేదు)
>   (Timeline: UPI → 1-3 rōzulu, Card/Netbanking → 5-7 banking days bank-side delay, maa control lo lēdu)
> - Razorpay reference: `{refundId}`
>
> 7 banking days లో కూడా రాకపోతే → ఇక్కడే reply చేయండి, మేము bank ని follow up చేస్తాము.
>
> (7 banking days lo kuda raakapotē → ikkadē reply chēyandi, mēmu bank ni follow up chēstaamu.)
>
> ఈ అనుభవానికి క్షమించండి. మళ్ళీ try చేయాలనుకుంటే → support inbox ఎప్పుడూ తెరిచి ఉంటుంది.
>
> (Ee anubhavaaniki kshaminchandi. Mallee try chēyaalanukuntē → support inbox eppudoo therichi untundi.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: T+7d reminder to verify refund landed.

---

## Native-fluent review checklist (FOUNDER ACTION)

- [ ] Telugu script verified — sandhi (samasa, virama) joins correct
- [ ] `-garu` (గారు) honorific used consistently — never name without it for adult customers
- [ ] `-andi` ending in instructions/requests (పంపండి, చేయండి) — softens the imperative
- [ ] No mixing of literary Telugu with spoken — keep all in `vyavahaarika`
- [ ] `Namaskaram` (నమస్కారం) — NOT "Namaste" (Hindi loanword reads stilted in Telugu)
- [ ] `Panditha` (పండిత) with `-garu` honorific — never bare `Pandit`

## Out of scope

- Marathi / Gujarati / Punjabi (separate ticket)
- Hindi (`macros-v1-hi.md`)
- Tamil (`macros-v1-ta.md`)
- Bengali / Malayalam / Kannada (next version)
- WhatsApp Business template approval (Meta-side, U7 gate)

## Closes

Q-C-20260612T0503-R-Q1-CS-004 (Telugu slice)
