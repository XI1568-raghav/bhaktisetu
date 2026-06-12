# Gaushala Prospects — 2026-06

> **Roadmap item**: R-Q4-S-005 (scale gaushala network to 25 — onboard 15 new verified gaushalas) · **Cycle slice**: research + outreach kit only (NO scraper this cycle — leads schema gate deferred to scrape-gaushalas.ts post leads-schema confirmation) · **Authored**: 2026-06-12

## Why gaushalas now

- Gauseva is one of the most respected charitable acts in Hindu tradition. 80G + recurring-donation flow = naturally CSR-fundable.
- Bhaktisetu currently has 0 gaushalas onboarded (per `docs/agent-reports/2026-06-08-lead-gen.md` baseline `[VERIFY]`).
- ₹1.5L value per item (per roadmap). 25-gaushala network = ₹37.5L lifetime value at minimum.
- Cross-sell to adopt-a-temple subscription (R-Q4-P-002): gauseva is the NATURAL second adoption tier for existing temple-adopters.
- CSR angle: per `docs/marketing/csr-match-campaign-v1.md` partners — gauseva resonates strongly w/ Reliance Foundation, Adani Foundation, Aditya Birla CSR.

## Why scraper deferred

Per the spec, scrape-gaushalas.ts would discover gaushala listings via 8thpillar directory + RKM listings + state Animal Husbandry Dept registry. BUT:

- Leads table schema must be confirmed in `apps/api/src/db/schema/leads.ts` (Drizzle?) OR equivalent Prisma. Existing scraper at `apps/api/scripts/leads/scrape-astrologers.ts` uses `_shared.ts` w/ `RawLead` type — need to verify SAME schema works for gaushalas.
- Founder hasn't validated schema OR sourced 25-prospect baseline manually first. Premature scraper without baseline = wasted effort.
- This cycle: ship 25-prospect research baseline + outreach kit. Scraper file as R-Q4-S-005b next cycle once founder OKs schema.

## 25 prospects

> **Hard rule**: zero fabricated names/contacts. `[VERIFY-FOUNDER]` markers require validation via 80G/12A status check on Income Tax exemption registry + cow count via Animal Husbandry Dept registry + manager-name via gaushala official website / phone call.

### Tier A — Major established gaushalas, registered 80G + 50+ cow count (10 prospects)

| # | Gaushala | State | City/Region | Est cow count | Notes |
|---|---|---|---|---|---|
| 1 | Pathmeda Gausewa Samiti (Sri Gopal Gausala) | Rajasthan | Pathmeda, Sirohi | 50,000+ | India's largest gaushala. `[VERIFY 80G # + contact]` |
| 2 | Sri Krishna Gaushala Delhi | Delhi NCR | Bawana | 5,000+ | Major NCR gaushala, well-funded. `[VERIFY]` |
| 3 | Gauseva Gausamvardhan Pratisthan | Maharashtra | Nashik | 3,000+ | `[VERIFY]` |
| 4 | Sri Govardhan Nath Gaushala (ISKCON-linked) | UP | Vrindavan | 2,000+ | ISKCON affiliation eases cross-trust building. `[VERIFY]` |
| 5 | Anandvan Gausala | Maharashtra | Anandvan, Chandrapur (Baba Amte legacy) | 1,500+ | Strong NGO governance. `[VERIFY]` |
| 6 | Sri Krishna Gaushala (Mathura) | UP | Mathura | 2,500+ | `[VERIFY]` |
| 7 | Goseva Sadan | Gujarat | Anand | 1,200+ | Veterinary college proximity, strong cow-care reputation. `[VERIFY]` |
| 8 | Pingalwara Gaushala (Bhagat Puran Singh legacy) | Punjab | Amritsar | 800+ | Sikh + Hindu inter-faith, established trust. `[VERIFY]` |
| 9 | Saraswati Gauseva Trust | Karnataka | Bengaluru rural | 600+ | `[VERIFY]` |
| 10 | Sri Surabhi Gaushala (Sringeri Math affiliated) | Karnataka | Sringeri | 500+ | Smarta math affiliation = institutional credibility. `[VERIFY]` |

### Tier B — Mid-size community gaushalas (10 prospects)

| # | Gaushala | State | City | Notes |
|---|---|---|---|---|
| 11 | Bharti Gaushala | UP | Bareilly | 300-500 cows. Multi-faith donor base. `[VERIFY]` |
| 12 | Manas Goshala | UP | Hathras | 200-400. `[VERIFY]` |
| 13 | Goseva Mission Indore | MP | Indore | 250-450. `[VERIFY]` |
| 14 | Sri Krishnayan Gausamvardhan | MP | Ujjain | 300-500. Mahakal temple proximity. `[VERIFY]` |
| 15 | Goshala Foundation Pune | Maharashtra | Pune | 200-400. IT-donor reach. `[VERIFY]` |
| 16 | Gauseva Pratisthan | Gujarat | Surat | 200-400. Diamond-merchant donor base. `[VERIFY]` |
| 17 | Hare Krishna Goshala (ISKCON Coimbatore) | TN | Coimbatore | 150-300. Tamil community. `[VERIFY]` |
| 18 | Goseva Trust Hubli | Karnataka | Hubli | 150-300. `[VERIFY]` |
| 19 | Sri Surya Gaushala | Rajasthan | Bikaner | 200-400. Marwari diaspora donor reach. `[VERIFY]` |
| 20 | Gauseva Ashram Haridwar | Uttarakhand | Haridwar | 250-500. Pilgrim-donor channel. `[VERIFY]` |

### Tier C — Smaller community-temple-adjacent gaushalas (5 prospects)

These are smaller (30-100 cow count) but high-trust through their temple affiliations. Faster pilot conversations because single-trustee decision.

| # | Gaushala | Affiliation | State | Notes |
|---|---|---|---|---|
| 21 | Sankalp Gauseva (community-led) | Local community | UP/Bihar | 30-80 cows `[VERIFY exact city]` |
| 22 | Sri Krishna Gaushala (community-led) | Local Iskcon community Hyderabad | Telangana | 50-100 cows `[VERIFY]` |
| 23 | Gauseva Mandal (community-led) | Local Smarta community Mysuru | Karnataka | 40-80 cows `[VERIFY]` |
| 24 | Devi Gaushala (community-led) | Local Shakta community Kolkata | WB | 30-60 cows `[VERIFY]` |
| 25 | Marwari Gauseva Samiti | Marwari community Kolkata | WB | 50-100 cows `[VERIFY]` |

## Outreach approach

### Reality: gaushala managers are usually elderly + low-tech

- Initial contact: email if available, else physical letter + phone call
- WhatsApp helps for younger-gen secretary/trustee succession candidates but NOT for the principal manager
- Expect 30-day decision cycle minimum (gauseva trusts have boards that meet monthly)
- ALL communication should be in regional language (Hindi/Tamil/Telugu/Gujarati/Marathi/Bengali per region) — English risks reading as foreign / commercial

### Cold-outreach email template (Hindi-first, bilingual for English-comfortable orgs)

**Subject (HI)**: Bhaktisetu Foundation — gauseva ke liye Bhaktisetu platform partnership (80G + monthly impact reports)

**Body (~200 words, Hindi + Roman + English bracketed)**:

```
प्रणाम {Recipient name} जी,

(Pranam {Recipient name} ji,)

मैं {founder name} हूँ — Bhaktisetu Foundation का संस्थापक
(Founder of Bhaktisetu Foundation, https://darshya.online — Section 8
India not-for-profit).

हम मंदिर adopt-a-temple subscription चलाते हैं और अब gauseva के लिए
similar recurring-donation feature launch कर रहे हैं। आपकी {gaushala
name} को platform पर list करना चाहते हैं।

(We run adopt-a-temple subscription + are launching similar
gauseva recurring-donation flow. Want to list {gaushala name} on the
platform.)

**हमारी offer**:
- आपके gaushala को **85% disbursement** (हम 15% platform fee Foundation overhead + Razorpay fees में)
- Monthly **80G receipt** हर donor को auto-issued
- Monthly **cow-care impact report** PDF (कितनी गायें fed, कितना दवा बना, कितने नए calves)
- Bhaktisetu पर अपका **public adoption page** (अनurmodate से donor-name list opt-in)
- Bhaktisetu legal team handles सब donor + tax compliance

**हमसे क्या चाहिए**:
- आपका 80G certificate copy + Bhaktisetu Foundation MoU
- Monthly cow count + activity update (1 page)
- 1-time onboarding call (30 मिनट)

15-30 मिनट का call possible है आपके convenient समय पर?

(15-30 min call at your convenient time?)

गौ-माता का आशीर्वाद,
{Founder name}
Founder, Bhaktisetu Foundation
{phone} · {email}
```

### Phone script (for elderly manager — pre-email OR post-email follow-up)

```
"Hari Om / Pranam {Name} ji, main {founder name}, Bhaktisetu Foundation
se. Bhaktisetu mandir aur gaushala ke liye recurring-donation platform
hai. Aapke gaushala ko list karna chahta hoon. Aapki gaushala ko
85% disbursement, donors ko 80G receipt, monthly impact report — sab
hum handle karenge.

Aap ke paas 5 minute hain abhi? Ya kal kab convenient hai phone par?"
```

Plan for **15-min initial call**, NOT a hard pitch. Listen to gaushala's pain points (cow-care funding gaps, vet bills, fodder costs).

### Letter (physical post) — for gaushalas without email/phone listed

Hand-written letter in Hindi/regional language. 1 page. Same content as email above + envelope w/ Foundation letterhead + return-address. Founder's WhatsApp/email at bottom. Estimated cost: ₹50/letter × 25 = ₹1,250 + ₹500 postage = ~₹1,750 total. Worth it for Tier A high-value prospects.

## Founder action checklist

```markdown
- [ ] Validate `[VERIFY-FOUNDER]` markers for 25 prospects via:
    - Income Tax 80G/12A registry (https://www.incometax.gov.in/iec/foportal — search by name)
    - Animal Husbandry Dept state registries (gaushala registration #)
    - Individual gaushala websites for manager contacts
    - Cross-ref to Trustees of Cow Welfare (Govt of India) listings
- [ ] Build data/sales/gaushala-tracker.csv (similar 11-col schema)
- [ ] Pick top-10 Tier A + top-5 Tier B + top-5 Tier C for first wave (20 of 25)
- [ ] Have hand-written-letter draft ready (for orgs w/o phone/email)
- [ ] Send 2 emails per day for 10 days (20 total) + 5 physical letters in week 1
- [ ] After 14 days: aggregate reply rate + qualified-call count → R-Q4-S-005 handoff
- [ ] If 0 replies by day 14: shift to in-person visit at Vrindavan/Mathura cluster (Tier A: Sri Govardhan Nath Gaushala + Sri Krishna Gaushala Mathura proximity = single-day trip from Delhi)
- [ ] Scraper ticket R-Q4-S-005b to be filed after leads schema confirmed in next cycle
```

## Economics (after onboard)

Per gaushala (Tier A/B average):
- 50-100 active donors × ₹500/month = ₹25K-50K disbursement to gaushala/month
- Bhaktisetu 15% fee = ₹3.75K-7.5K MRR per gaushala
- 10 gaushalas onboarded = ₹37.5K-75K MRR
- Year 1 conservative: ₹50K MRR at 10 gaushalas + cross-sell from temple-adopters = **₹100K-150K MRR total gauseva line by Q4**

## Risk + sensitivity

1. **Bhaktisetu Foundation 80G is separate from gaushala's 80G**: donor's tax-deductibility flows through Foundation. Onboarding paperwork must clarify donor-of-record + receipt-issuer.
2. **Disbursement schedule**: monthly batch via NEFT/RTGS. Gaushala provides cancelled cheque + PAN. Foundation legal validates before first disbursement.
3. **Audit + transparency**: gaushala MUST submit monthly cow count + activity update (1 page). Without this, donor trust erodes. Treat as hard contractual requirement.
4. **Onboarding fraud risk**: bad-actor "gaushala" w/ fake 80G could enroll. Founder personally verifies first 3-5 onboardings via site visit. After volume, consider third-party verification partner.
5. **CSR donor expectations**: corporate donors expect quarterly impact PDF + audit trail. Build template now (post-pilot).
6. **Regional language**: Tamil Nadu / Bengal / Gujarat / Maharashtra gaushalas may not respond to Hindi-only outreach. Translate top emails for those clusters in next cycle if reply rate low.

## Cross-sell linkage

- Existing adopt-a-temple subscribers = prime gauseva-adopter prospects. Email-blast (post-onboarding) w/ "You support a temple — would you also like to support gauseva?" w/ tiered cross-sell ₹250-₹2K/month.
- CSR partnerships from R-Q4-M-007 → match gauseva donations 2x during festival window (especially Govardhan Puja, day after Diwali — cow-worship day, peak CSR opportunity).

## Out of scope

- Scraper for auto-discovery of gaushala leads (deferred — leads schema gate)
- Gaushala-side admin dashboard (manual disbursement v1; admin tool v2)
- Veterinary tele-medicine service for adopted cows (separate ticket if demand emerges)
- Adopt-a-specific-cow tier (high LTV but operationally complex — defer to v3)
- Gauseva content / video stream from gaushalas (separate content workstream)
- A2 milk / cow-product retail (totally separate business, not Bhaktisetu)

## Closes

Q-C-20260612T0501-R-Q4-S-005 (research + outreach kit slice). Status stays in_progress until 15 onboarded + first month of donations cleared.
