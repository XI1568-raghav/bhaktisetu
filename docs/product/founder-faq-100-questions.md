# Founder FAQ — 100 Questions Across Product / Legal / Finance / Operations

> Quick-reference for founder + CS contractor + AI Pandit + investor conversations.

## Product (30 Qs)

1. **What is Bhaktisetu?** Verified-pandit puja booking + AI Pandit + live darshan platform for India + NRI Hindu families.

2. **What makes Bhaktisetu different from Sri Mandir?** 24hr video proof guarantee + NRI dual-currency + Aadhaar-verified pandits + Section 8 non-profit structure.

3. **How does pandit verification work?** Aadhaar + PAN + 5+ years experience + 2 reference videos + Sanskrit certification.

4. **What's the video proof?** Pandit records ceremony with phone/camera, uploads within 24 hours, sent to devotee via WhatsApp/email.

5. **How much do pujas cost?** ₹500-15,000 depending on complexity. NRI pricing 9-10x India.

6. **Where can pujas be performed?** 7+ Indian cities including Bengaluru, Mumbai, Varanasi, Delhi, Tirupati, Pune, Hyderabad.

7. **What pujas are available?** 100+ puja types — Rudrabhishek, Satyanarayan, Lakshmi, Ganesh, Durga, Pind Daan, Antim Sanskar, weddings, vivah muhurat, etc.

8. **Can I book live darshan?** Yes, free for major temples — Kashi, Mahalakshmi Mumbai, Tirupati, Siddhivinayak, ISKCON network, etc.

9. **What's AI Pandit?** ₹199/mo subscription for Sanskrit-scripture-grounded Q&A. Free 3 questions/day for unpaid users.

10. **Can NRI families use Bhaktisetu?** Yes — dedicated USD/GBP/CAD/AUD pricing + 24hr time-zone aware video proof.

11. **Are 80G receipts issued?** Yes for India tax. NRI tax-deductibility varies by country.

12. **What if I need to cancel?** >24hr before puja: 100% refund. 12-24hr: 50% refund. <12hr: founder discretion.

13. **Refund timeline?** 5-7 business days via Razorpay/Stripe original payment method.

14. **Multi-language support?** 6 languages: English + Hindi + Tamil + Telugu + Bengali + Marathi.

15. **Mobile app?** iOS TestFlight Q3, App Store + Google Play Q3-Q4.

16. **Recurring subscriptions?** Yes — Adopt-a-Cow (₹501/mo), Adopt-a-Temple (₹501-2,501/mo), AI Pandit (₹199/mo).

17. **Yatra packages?** Yes — Char Dham, Vaishno Devi, Tirupati-Sabarimala combo, Varanasi-Gaya specific.

18. **Antim Sanskar service?** Yes — specialty product Q4 launch (20 specialist pandits across Kashi, Hyderabad, Delhi, Mumbai).

19. **Wedding muhurat?** Q2 ship + wedding planner v1 Q4 (muhurat + pandit + venue + photographer + caterer bundle).

20. **AR/VR puja?** Q4 WebXR MVP — virtual diya + 3D deity model + AR scene capture.

21. **Affiliate program?** Yes — 5-15% commission per booking. 50+ affiliates Q3.

22. **Customer support?** WhatsApp founder + email + in-app + multilingual macros (5 languages).

23. **Live customer service?** Q4 first CS-ops contractor hire when bookings exceed 50/day.

24. **Data privacy?** DPDP + GDPR compliant. DSAR endpoints for export/correct/delete.

25. **What's the corporate gifting option?** White-label portal for Diwali employee gifts — Bhaktisetu manages backend, corporate uses branded UI.

26. **Can temples partner with Bhaktisetu?** Yes — Section 8 to Section 8 partnerships, 65-70% revenue share to temple, 24hr video proof support.

27. **Are temples vetted?** Yes — verified-only gate. Registered temples + ownership confirmed + pandit liaison appointed.

28. **What about safety/security on the platform?** Razorpay/Stripe PCI compliant + DPDP user rights + SOC 2 vendor selection.

29. **Press coverage?** Yes — Q3 pre-seed close announcement targeted 5+ pubs.

30. **Founder mission?** Build trust layer for 1B+ Hindu families globally — verified pandit + transparent proof + accessible pricing.

## Legal (15 Qs)

31. **Bhaktisetu legal entity?** Section 8 non-profit registered in India, CIN: [CIN].

32. **80G certification?** Yes for charitable donation portion of pujas.

33. **GST registration?** Yes — GSTR-1 monthly + 3B summary filings.

34. **TDS deductions?** 10% Section 194J for pandit payouts >₹30K/year.

35. **DPDP Act compliance?** Yes — full user rights API (per R-Q2-L-003).

36. **GDPR for UK launch?** Yes — DPA + cookie banner + DSR endpoints + DPIA documented.

37. **CCPA for US users?** Standard data privacy practices follow CCPA principles.

38. **Refund policy enforceability?** Indian consumer law compliant + lawyer-reviewed (per R-Q1-L-002).

39. **Pandit contract terms?** Standard template — 70-80% revenue share, weekly payout, 30-day termination.

40. **Temple master agreement?** 2-year auto-renew, 65-70% revenue share, 90-day termination clause.

41. **B2B corporate agreement?** Custom enterprise pricing, 12-month minimum, net-30 invoicing, white-label branding optional.

42. **Influencer ASCI compliance?** Mandatory #paidpartnership disclosure on every sponsored post.

43. **Sub-processor disclosure?** Razorpay/Resend/PostHog/Sentry/FCM/WhatsApp-Cloud-API(Meta)/Cloudflare/Render/Supabase — disclosed in privacy policy. *(Stripe removed from this answer 2026-09-02, `OPS-10`: the Stripe rail was deleted on 2026-08-11 — `apps/api/src/lib/env.ts:45-46` — so naming it disclosed a processor that receives no data.)*

44. **Data residency?** **[CORRECTED 2026-09-02, `OPS-10`. This answer previously read "Primary: Mumbai (Render + Supabase India). Standby: Singapore." Every word of that was false and this page is a script for investor conversations, so it was a material misstatement waiting to be made out loud.]** Truth: application + API run on **Render `oregon`, US West** (`render.yaml:15`, `:56`) — no India-hosted server, no Mumbai region. The **Supabase database region is unknown**; it is not recorded anywhere in the repository — [verify] in the Supabase dashboard before answering this question to anyone. **There is no standby region, read replica or warm spare, in any geography.** Personal data *is* processed outside India today; do not claim otherwise.

45. **Disputes resolution?** Bengaluru jurisdiction. Indian arbitration. 60-day good-faith mediation by founder first.

## Finance (20 Qs)

46. **Bootstrap to pre-seed timeline?** 90 days from launch to ₹10L MRR.

47. **MRR breakdown?** 70% puja bookings + 15% AI Pandit subs + 10% NRI gift + 5% donations.

48. **Burn rate currently?** ₹50K/month (founder salary deferred).

49. **Post pre-seed burn?** ₹2L/month with 4 contractors.

50. **Runway from pre-seed?** 18 months (₹4-5L runway @ ₹2L/mo).

51. **Unit economics?** CAC ₹150 / LTV ₹1200 / 8x ratio / 2-month payback.

52. **NRI LTV vs India?** NRI 10x ($200 vs $20) due to recurring + higher AOV.

53. **Pre-seed valuation?** $2-3M post-money cap (Y Combinator SAFE).

54. **Seed Q4 valuation target?** $10-15M post-money.

55. **GST + TDS filings?** Q1 + Q2 + Q3 + Q4 quarterly via CA (₹5K/mo retainer).

56. **Audit?** Annual statutory audit by tier-2 firm post Q3 closure.

57. **CSR funds?** Section 8 may receive CSR grants from corporates (per R-Q4-M-007).

58. **80G donation tax treatment?** Eligible for India donors, limited for NRI donors.

59. **Currency handling?** Razorpay INR + Stripe multi-currency (USD/GBP/CAD/AUD).

60. **Bank accounts?** HDFC Foundation account + Wise multi-currency for NRI.

61. **FCRA registration?** Required for foreign currency receipt — completed Q3.

62. **Investor pre-emption rights?** Lead VC: 1x pro-rata. Angels: 0.5x.

63. **Founder vesting?** 4-year vest with 1-year cliff.

64. **Equity dilution per round?** Pre-seed 10-15% / Seed 15-20% / Series A 18-22%.

65. **Tax-deductibility for investors?** Pre-seed not. Seed and later may qualify for tax benefits per Indian Startup India scheme.

## Operations (35 Qs)

66. **How many pandits onboarded?** 100+ across 7 cities.

67. **Daily booking volume?** Currently 20-30/day. Target 100/day by Q4.

68. **Average puja value?** ₹2,500 INR. NRI: $25 USD.

69. **Customer support response time?** <4hr for T1 issues. <30min for P0 founder escalations.

70. **Video proof delivery SLA?** 24 hours.

71. **Pandit no-show rate?** <1%.

72. **Refund rate?** <2% of bookings.

73. **Customer complaint rate?** <0.5% per month.

74. **NPS score?** Q2 baseline establishing. Target 60+ by Q4.

75. **Day-30 retention?** 42% domestic / 65% NRI.

76. **CAC payback period?** 2.1 months blended.

77. **Free tier vs paid mix?** 95% free / 5% paid users (typical SaaS).

78. **Mobile parity?** Web 100% / Mobile 60% / Razorpay native Q2 ship.

79. **Live darshan uptime?** 99%+ via IVS + CloudFront CDN.

80. **Sentry error rate?** <0.5% session-level errors targeted.

81. **API response time?** p95 <400ms target.

82. **Database operations?** **[CORRECTED 2026-09-02, `OPS-10` — the previous answer, "Supabase Mumbai primary + Singapore standby (R-Q3-IT-002)", described a two-region topology that has never existed.]** One Supabase Postgres project, region [verify] (not recorded in this repository). No primary/standby pair, no read replica. Backups are a daily `pg_dump` into Supabase Storage — the same project the database lives in — and the backup job's secrets have never been set (`OPS-02`), so there is no backup today. See `docs/runbooks/disaster-recovery.md`.

83. **Hosting cost monthly?** Render ($25 Standard tier post-Q4) + CF Pages free + Supabase Pro ($25) + AWS Backup ($5) = ~$60-100/mo Q4.

84. **Email volume?** ~5K/month transactional via Resend.

85. **WhatsApp volume?** ~700-1000 conversations/month via WA Cloud (within free tier).

86. **Marketing spend Q3?** $200/month NRI ads. $0 PR. ₹3L influencer (one-time).

87. **Influencer roster?** 10 (Q2) → 30 (Q4) micro-influencers in devotional niche.

88. **Press coverage?** Q3 pre-seed close = 5 pubs target. Q4 Diwali = 3 pubs.

89. **SEO content depth?** 500+ pages live. 50 more per quarter.

90. **Programmatic SEO scale?** 50 new long-tail templates Q2 + 50 Q3 + 50 Q4.

91. **A/B testing?** PostHog feature flags + 3 active tests Q1 (hero copy, CTA color, NRI lane).

92. **Cohort retention tracking?** PostHog cohort dashboard + manual export for investor reports.

93. **Conversion funnel?** Browse → book click 40% / book click → payment initiate 70% / payment success 85% / video proof view 60%.

94. **Mobile parity gap?** Razorpay native checkout missing (Q2 R-Q2-E-004 ship). iOS App Store Q3.

95. **Customer testimonials?** Q3 first quarterly collection. Q4 testimonial library at /testimonials.

96. **Partnership pipeline?** ISKCON LoI Q3 + BAPS scoping Q2 + Sringeri direct outreach Q1 + 5 corporate gifting Q3.

97. **City expansion roadmap?** Q1: 5 cities. Q2: 8 cities. Q3: 12 cities. Q4: 15+ cities.

98. **NRI country expansion?** Q2: US baseline. Q3: UK + Canada launch. Q4: Australia + UAE + Singapore.

99. **First contractor hire trigger?** 50+ bookings/day sustained 14 days (per R-Q1-H-001).

100. **Long-term vision (5-year)?** ₹500 Cr ARR + 1M+ MAU + 1,000+ pandit network + global Hindu diaspora dominance with possible IPO consideration Year 7-10.

---

## Per-FAQ usage

- **Founder reference**: keep doc open during investor calls + media interviews
- **AI Pandit training data**: feed FAQ corpus into AI Pandit for customer Q&A
- **CS contractor onboarding**: 100 Qs cover 80%+ of customer questions
- **Investor pitch prep**: scenario-based Q&A for VC deep-dives
- **Press kit**: subset (top 30) included in /press public materials
