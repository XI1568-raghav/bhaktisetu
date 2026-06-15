# Hyderabad Temple Onboarding — +5 Verified

> **Roadmap item**: R-Q2-S-008 (P1) · **Status**: in_progress (founder action required) · **Authored**: 2026-06-13 · **Expanded**: 2026-06-15 (R4)

## Goal

Q2 onboard 5 verified temples in Hyderabad serving Telugu devotional core + Telugu NRI diaspora. Spec ships scaffold; status flips to `shipped` only when founder confirms 5/5 institutional MoUs signed.

## 5 target temples

| # | Temple | Distinct angle | Public contact (verified) |
|---|---|---|---|
| 1 | **Birla Mandir Hyderabad** | Naubat Pahad white-marble hilltop; Telugu NRI emotional anchor | Public domain: trust office at temple premises, Hill Fort Road, Khairtabad |
| 2 | **Chilkur Balaji** | "Visa temple"; students + IT migrants pilgrim flow (high NRI search volume) | Public domain: Chilkur village, Moinabad mandal (off ORR Exit 4) |
| 3 | **Yadagirigutta Narasimha** | Lord Narasimha pilgrimage; 60km Hyderabad; state-managed Devasthanam | Public domain: Sri Lakshmi Narasimha Swamy Devasthanam, Yadadri-Bhuvanagiri district |
| 4 | **Karmanghat Hanuman** | Hanuman seva; large Telugu devotee base; daily 5K+ visitors | Public domain: Karmanghat, Hyderabad 500079 |
| 5 | **Jagannath Mandir Hyderabad** | Puri-affiliated Jagannath darshan; Banjara Hills | Public domain: Banjara Hills Road No. 12 |

> All contact data above is public-domain institutional. **NO individual phone/email fabricated.** Founder to obtain trustee/admin emails via in-person visits or institutional letterheads. Use `[VERIFY-FOUNDER]` token in CRM until obtained.

## Telugu-first onboarding

- All 5 temple admin docs translated to **Telugu (te-IN)** — ships DRAFT-tier per multilingual content rule, NEVER auto-published without native Telugu review
- Local pandit recruitment via **Telangana Brahmin Welfare Association** (institutional contact)
- Telugu UI bundle reuses R-Q1-CS-003 Telugu macro library
- Founder/community-lead delegation: Hyderabad-resident Telugu speaker required for trustee meetings

## Founder action checklist (BLOCKING for status=shipped)

| # | Action | Owner | Status | Notes |
|---|---|---|---|---|
| F1 | Schedule in-person visit Birla Mandir trust office | Founder | [ ] | Best slot: weekday post-aarti (10am-12pm) |
| F2 | Visit Chilkur Balaji + meet head priest | Founder | [ ] | Approach via village panchayat office introduction |
| F3 | Approach Yadagirigutta Devasthanam Executive Officer (state-appointed) | Founder | [ ] | Govt-managed — formal letter on Bhaktisetu letterhead required |
| F4 | Karmanghat Hanuman temple management committee meeting | Founder | [ ] | Local trust managed; weekend meeting |
| F5 | Jagannath Mandir Banjara Hills trustee meeting | Founder | [ ] | Odia-Telugu bridge community contact |
| F6 | Draft + sign MoU template (per `docs/legal/temple-mou-template.md` if exists, else create) | Founder + Legal | [ ] | Revenue share 20-40% per `PROJECT_CONTEXT.md` business rule #3 |
| F7 | DPDP §6 consent collection for temple admin staff (recording, PII) | Founder | [ ] | Rule 7 of DPDP Rules 2025 — 72h breach SLA |
| F8 | Provide Android phone (per delhi-spec pattern) + WiFi stipend confirmation | Ops | [ ] | Capex per temple ~₹15K |

## Per-temple onboarding plan (parallel, 8 weeks)

| Week | Action |
|---|---|
| W1 | Founder/delegate temple visit + trustee meeting |
| W2 | Verification: temple registration (Society / Section 25 / state Devasthanam Act) + GSTN + property deed copy |
| W3 | Pandit roster confirmation (2-3 per temple, attached to temple); Aadhaar KYC pre-payout |
| W4 | Tech setup: IVS streaming dry-run + booking integration + Telugu UI sanity |
| W5-W8 | First-30-booking pilot per temple + feedback loop + first live darshan/week |

## Tech / engineering scaffold

- **R-Q2-S-008a**: 5 temple profile pages at `apps/web/app/temples/[slug]/` — slugs: `birla-mandir-hyderabad`, `chilkur-balaji`, `yadagirigutta-narasimha`, `karmanghat-hanuman`, `jagannath-mandir-hyderabad`
- **R-Q2-S-008b**: Per-temple IVS channel provisioned via AWS (existing pattern); env-or-noop if AWS keys absent
- **R-Q2-S-008c**: Telugu temple-portal docs at `docs/supply/telugu/` (DRAFT-tier; native reviewer required)
- **R-Q2-S-008d**: Chilkur "visa temple" content cluster targeting "chilkur visa temple", "balaji visa temple online puja" long-tail NRI keywords (high search volume)
- **R-Q2-S-008e**: CRM seed rows for 5 temples w/ `[VERIFY-FOUNDER]` tokens for trustee contacts

## KPI (manual; founder-attested)

| Metric | Target | Current | Verification |
|---|---|---|---|
| Verified temples Hyderabad (signed MoU) | 5 | 0 | Manual founder confirmation |
| First-30-bookings per temple | 30 | 0 | DB query post-launch |
| Live darshan per temple per week | 1+ | 0 | IVS session log |

## Compliance / legal notes

- **RBI Master Direction FEMA 20(R)**: NRI donation routing via Razorpay (Routes) — Bhaktisetu never custodies funds directly
- **DPDP §6 + Rule 7 (2025)**: Recording consent from temple staff + pilgrims; 72h breach SLA; grievance officer per DPDP §8(10)
- **TDS §194-O**: Applicable on commission to pandits (TDS 1% deducted at source)
- **GST**: 18% on platform commission (not on temple donation principal)
- **State Devasthanam Act (Telangana)**: Yadagirigutta is state-managed; expect formal letter + 30-60 day Executive Officer approval window

## Risk register

| Risk | Mitigation |
|---|---|
| Yadagirigutta Devasthanam bureaucratic delay (state-managed) | Start F3 letter in W1; parallel-track 4 other temples |
| Telugu-translation native review delay → DRAFT-tier blocks publish | Recruit native Telugu reviewer pre-W3 |
| Trustee meetings require Telugu-speaking delegate | Founder identifies Hyderabad community lead pre-W1 |
| Birla Mandir trust may refuse video recording (orthodox stance) | Pre-meeting brief: video proof is to devotee not public; private-link option |

## Q2 success metric (status=shipped gate)

- 5/5 temples live with signed MoU
- 30+ first bookings per temple
- 1+ live darshan per temple per week
- Telugu UI passes native review

## Closes

R-Q2-S-008 scaffold + founder-action checklist + verified institutional contacts shipped. **Status remains `in_progress`** until founder confirms 5/5 MoUs signed per KNOWN PITFALLS doctrine (no auto-claim on KPIs requiring founder action).
