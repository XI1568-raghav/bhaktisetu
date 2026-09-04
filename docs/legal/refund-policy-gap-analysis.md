# Refund Policy v1 — Gap Analysis (12 Stress Scenarios)

> Roadmap: R-Q1-L-002. Reviewer: Bengaluru counsel TBD. Status: draft for lawyer hand-off.

> **Correction 2026-09-02 (`OPS-10`).** This analysis was written while Stripe was
> assumed to be the NRI/USD payment rail. **Stripe was removed from the codebase on
> 2026-08-11** — every remaining mention in `apps/api/src` is a removal note
> (`lib/env.ts:45-46`, `services/payment.service.ts:2506-2517`,
> `routes/payments.ts:304`, `routes/subscriptions.ts:274`). Razorpay is the only live
> rail and it settles **INR only**. No replacement international processor has been
> chosen. The scenarios below that turn on a foreign-currency rail are still valid
> *questions*, but the processor named in them is not. Each is marked `[verify]`
> rather than rewritten, because inventing a substitute processor would be a worse
> error than the one being corrected.

## Source

Current policy lives at `apps/web/app/refunds/page.tsx` (298 LOC). v1 was authored in-house 2026-05-02. Never lawyer-reviewed. SLA monitor flagged 5 breached bookings recently — policy lacks guidance for ops on those failure modes.

## 12 real-world failure scenarios — does v1 cover?

| # | Scenario | v1 says | Gap | Severity |
|---|---|---|---|---|
| 1 | Devotee books puja, pays, temple priest no-shows, video proof never uploaded within 48h | "Full refund or reschedule option" (clause 2 row 5) | ✓ Covered. But: timeline to issue refund unstated. Devotee complaint timing unclear. | LOW |
| 2 | Devotee receives video proof on time but video is blurry / wrong temple / wrong puja | NOT COVERED | NO mechanism for proof-quality disputes. Devotee left dependent on email-based grievance which response SLA = 15 business days (clause 10). | **HIGH** |
| 3 | Devotee cancels 7 hours before puja (sliding into "less-than-24h-50%" window) but temple confirms preparation NOT yet started | Strict 50% per clause 2 | NO discretion clause. Lose goodwill on edge cases where temple admits prep hadn't started. | MEDIUM |
| 4 | Puja booked through Bhaktisetu, paid in USD via an international rail **[verify — Stripe removed 2026-08-11; no replacement chosen]** by NRI, temple cancels for natural disaster | "Full refund + 10% credit" (clause 2 row 4) | Currency conversion loss not addressed. NRI pays $X at exchange rate R1, refund issued at rate R2 = devotee loses if INR strengthens. | MEDIUM |
| 5 | Devotee booking cancelled by Bhaktisetu fraud team (suspicious payment, KYC mismatch) | NOT COVERED | NO clause for platform-initiated cancellation. Razorpay (and whichever international processor is eventually chosen — **[verify]**) might capture funds; if Bhaktisetu fraud cancels, refund liability unclear. | **HIGH** |
| 6 | Subscription (adopt-a-temple monthly) — devotee cancels mid-month | NOT COVERED | Subscription model entirely absent from v1. With CSR campaign (R-Q4-M-007) introducing real subscriptions, this is a near-term blocker. | **HIGH** |
| 7 | Store order — book ships to wrong address due to devotee typo | NOT COVERED (only damaged/wrong items addressed in clause 3) | Customer-fault address typo — return-shipping costs vague. Risk: small-claims arbitration if courier marks delivered but devotee disputes. | LOW |
| 8 | Store order — perishable prasad consumed before notice, devotee claims poisoning | "Non-returnable for hygiene/sanctity" (clause 3) | Product-liability exposure NOT ring-fenced. Hygiene clause says no refund, but consumer-protection law may override; need explicit liability cap. | **HIGH** |
| 9 | Astrology session — astrologer joins late by 12 minutes (under 15-min threshold) | NOT COVERED explicitly — only "fails to join within 15 minutes" (clause 4) gives refund | Partial-delay grey zone. If session is 30 min, losing 12 min = 40% of session. Devotee may demand partial refund despite policy. | MEDIUM |
| 10 | Donation made to wrong gaushala due to UI confusion; devotee notices within 24h | Clause 5: "we will review the request on a case-by-case basis" within 7 days | Vague. No appeal mechanism if reviewer denies. Donation-reversal optics bad if 80G receipt already auto-issued. | MEDIUM |
| 11 | Chargeback initiated by devotee bank without contacting Bhaktisetu first | NOT COVERED | NO clause on chargeback handling, dispute fees, repeat-offender suspension. Razorpay (and any future international processor — **[verify]**) fees per chargeback can swallow margin on small bookings. | **HIGH** |
| 12 | Devotee dies before scheduled puja, family member requests refund w/o original booking ID | NOT COVERED | NO bereavement / next-of-kin clause. Edge case, but emotionally loaded → reputational risk if mishandled. | MEDIUM |

## Cross-cutting v1 deficiencies

1. **No jurisdiction clause** — current policy doesn't state which Indian court has jurisdiction. Bhaktisetu Foundation registered office in [PLACEHOLDER — founder confirms Bengaluru]. Default = consumer-forum + buyer's location → unpredictable.
2. **No arbitration clause** — every dispute defaults to consumer court. Each case costs ~₹15K+ legal fees. Arbitration clause (e.g. SAMA or PressClaim or MCIA fast-track) could cap costs.
3. **No grievance officer named** — only `grievance@darshya.online` email. DPDPA + Consumer Protection (E-commerce) Rules 2020 require named Grievance Officer with phone number + physical address. Currently non-compliant.
4. **Subscriptions absent** — entire model missing from v1.
5. **No force-majeure carve-out** — pandemic-style temple closures, government bans, civil unrest unaddressed.
6. **"Platform credit" issuance unbounded** — clause 2 row 4 says "+10% platform credit" w/o defining credit validity, transferability, expiry. Accounting liability.
7. **Refund cost allocation between Bhaktisetu and temple unclear** — if temple no-shows, who absorbs the 100% refund? Currently Bhaktisetu front-loads, then disputes w/ temple — process undocumented.
8. **GST handling on refunds** — refunding gross including GST? Net of GST? Indian GST regime varies for services vs goods. Not addressed.
9. **Cross-border refunds (NRI foreign currency)** — processor `[verify]` (Stripe removed 2026-08-11, no replacement chosen); no language about FX rate fixing, gateway fees, repatriation.
10. **Repeat-refund abuse** — no clause to suspend devotees with N refund requests in M days.

## Severity summary

- **HIGH**: 5 gaps (scenarios 2, 5, 6, 8, 11)
- **MEDIUM**: 5 gaps (3, 4, 9, 10, 12)
- **LOW**: 2 gaps (1, 7)

HIGH gaps block: subscription launch, NRI scaling, ops scalability. Recommend v2 addresses ALL 5 HIGH before publishing.

## v2 design principles

1. **Tier the policy by service line**: Puja / Subscription / Store / Astrology / Donation / Chadhava / Darshan. Each gets a dedicated section with its own escalation matrix.
2. **Add Force Majeure umbrella** at top — applies across all service lines.
3. **Name Grievance Officer** with phone + physical address (DPDPA + CP Rules compliance).
4. **Add arbitration clause** — pre-litigation mandatory arbitration via SAMA / MCIA fast-track within 30 days of grievance filing.
5. **Jurisdiction = Bengaluru** courts (founder's registered office; lower cost vs Delhi/Mumbai).
6. **Bilingual** — English primary, Hindi notarized translation per Consumer Protection Act 2019 (regional language requirement for marketing-targeted regions).
7. **Refund cost allocation matrix** — internal doc, but ops needs it (separate from public policy).

See companion files:
- `refund-policy-v2-english.md` — public-facing English v2
- `refund-policy-v2-hindi.md` — Hindi mirror
- `refund-policy-v2-lawyer-brief.md` — 1-page handoff for counsel

## Closes
Q-R-Q1-L-002-cycle
