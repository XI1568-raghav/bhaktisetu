# Razorpay Live KYC Submission — Domestic Real Payments

> **Roadmap item**: R-Q1-F-003 (P1) · **Authored**: 2026-06-13 · **Unblocks**: U1

## Goal

Q1 submit Razorpay live KYC to unblock domestic real-money payments. Currently test-mode only.

## Pre-req docs (founder gathers)

| Doc | Source | Status |
|---|---|---|
| Section 8 Certificate of Incorporation | MCA portal | Founder has |
| PAN of Foundation | NSDL | Founder has |
| Bank account proof (Bhaktisetu Foundation account) | HDFC/ICICI account opening kit | Founder has |
| MoA + AoA | MCA filing | Founder has |
| Director KYC (Aadhaar + PAN) | Personal | Founder + 2 directors |
| Business address proof | Utility bill / rent agreement | Founder has |
| 80G certificate (optional but boosts trust score) | Income Tax dept | In progress |
| Website URL screenshots | Bhaktisetu live | Capture 10 screens |

## Submission steps

1. Login Razorpay Dashboard → Settings → KYC
2. Select "Section 8 (Non-Profit)" business type
3. Upload all 8 docs
4. Fill business description: "Verified pandit puja booking + live darshan platform for Hindu families India + NRI"
5. Settlement bank: paste account number + IFSC
6. Director details: name + DOB + Aadhaar + PAN per director
7. Submit + email confirmation expected within 7-10 business days

## Post-submission

- Razorpay verification team contacts founder for clarifications
- Phone verify + video KYC if requested
- Final approval: live mode unlocked w/ ₹15L/mo limit initial → scale w/ volume

## Risk + mitigation

- Risk: Section 8 KYC slower than for-profit (15-30 days vs 7)
- Mitigation: continue test-mode bookings, fold into Razorpay subscriptions once approved
- Risk: KYC rejected due to NPO-restrictions
- Mitigation: provide 80G + MoA showing devotional + welfare scope

## Engineering tickets

- R-Q1-F-003a: Doc bundle preparation
- R-Q1-F-003b: Razorpay submission
- R-Q1-F-003c: Live-mode env flip + verify in Render

## Closes

R-Q1-F-003 — spec shipped.
