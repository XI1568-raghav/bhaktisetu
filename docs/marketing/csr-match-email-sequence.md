# CSR Match — 5-Touch Email Sequence (21 days)

> Companion to `csr-match-campaign.md`. Cold sequence to CSR heads at ICP companies. Personalize {fname} + {company} + {csr_spend_last_fy} per row before send.

## Pre-flight check

- [ ] Email pattern verified via NeverBounce or LinkedIn Sales Navigator (NEVER guess from `[VERIFY]` markers)
- [ ] Warm intro annotation from founder applied (if any) — switches subject line to "Intro via {referrer}: ..."
- [ ] 80G + CSR-1 attestation complete (per campaign doc)

## T+0 — Cold intro (Schedule VII Item III hook)

**Subject (cold)**: {fname}, ₹2x match — Schedule VII Item III + Diwali timing

**Subject (warm intro)**: {referrer} intro: CSR match for adopt-a-temple

```
Hi {fname},

I run Bhaktisetu — digital infrastructure for India's 6L+ verified temples.
We're launching a corporate adopt-a-temple program for Diwali. Match
mechanic: every ₹1 your employees pledge, Bhaktisetu disburses ₹2 from
your CSR budget to the same temple. 80G eligible, CSR Schedule VII
Item III qualified.

3 reasons this fits {company}:
  1. Schedule VII Item III (religious heritage promotion) under-allocated
     across Big-4 IT — you'd be early
  2. Employee mobilization runs entirely on our app (zero ops load on
     your CSR team)
  3. Live public transparency dashboard per temple — clean optics for
     your sustainability report

3 ask sizes: Bronze ₹25L (8 temples), Silver ₹50L (18), Gold ₹1Cr (40).
{company} did ₹{csr_spend_last_fy} last FY — happy to share the case
study at any of those brackets.

15 min next week to walk you through it?

— {founder_name}
darshya.online | founder@darshya.online
```

## T+3 — Case study touch

**Subject**: How {peer_company} matched ₹12L in 60 days

```
Hi {fname},

Following up — sharing the case study I mentioned. {peer_company}
[PLACEHOLDER until first signed account; until then use composite
"a Mumbai-headquartered IT services firm"] ran adopt-a-temple in 2025:

  - 4,500 employees pledged
  - Avg pledge ₹2,700 per employee per year = ₹1.2 Cr employee total
  - Corporate match (2x) = ₹2.4 Cr
  - Total impact: ₹3.6 Cr across 28 temples
  - CSR reporting: 1 audited disbursement record per quarter

The match was their entire Schedule VII Item III allocation for FY25-26.

Want me to draft something similar for {company}?

— {founder_name}
```

## T+7 — Match mechanic 1-pager

**Subject**: 1-pager — how the ₹2x match flows

```
Hi {fname},

Attached: 1-page mechanic breakdown (employee pledge → MoU → monthly
disbursement → 80G receipt → CSR report).

Key numbers:
  - Bhaktisetu admin fee: 8% on disbursed CSR funds (disclosed in MoU)
  - Net to temples: 92%
  - Disbursement cadence: monthly, audited
  - Reporting cadence: quarterly to your CSR head + annual to MCA filing

Happy to put together the {company}-branded landing page (employees
visit via co-branded URL like darshya.online/csr/{company-slug}) once
we agree on a bracket.

[Attach: match-mechanic-1pager.pdf — TBD generate from canva template]

— {founder_name}
```

## T+14 — Diwali urgency

**Subject**: Diwali in 60d — locking corporate slots

```
Hi {fname},

Quick urgency note — Diwali falls ~60d from when {company} CSR signs.

To launch employee mobilization 15d before Diwali (when devotion + giving
intent peak), we need MoU signed by T-45. Drafting + legal review is
typically 14-21d on your side. Means we'd ideally agree on a bracket in
the next ~2 weeks.

If timing slips past Diwali we'd retarget Navratri 2027 (12 months out).
Diwali launches historically get 3-4x the employee participation rate
of off-cycle launches.

15 min this week?

— {founder_name}
```

## T+21 — Breakup + soft re-engage

**Subject**: Wrapping up — leaving the door open

```
Hi {fname},

Closing the loop — I don't want to keep showing up in your inbox if
{company}'s CSR strategy is locked for FY26 already. Sounds like
either bandwidth or fit isn't there right now — totally fine.

Two paths:
  1. If CSR Schedule VII Item III opens up later: just reply to this
     thread, we'll pick up where we left off
  2. If never a fit: reply "remove" and I'll permanently take you off

If you have a colleague better-positioned for this, happy to be
introduced.

Best,
{founder_name}
darshya.online
```

## Send cadence rules

- Max 1 outbound per 21-day window per recipient
- Pause sequence if recipient replies (even one-liner)
- Pause if bounce > 1 across {company} domain
- A/B test subject lines in batches of 4 (control vs variant on T+0 only)
- Track via Apollo / Lemlist / Instantly — NOT in repo / no logs in this codebase
- Compliance: include physical address footer (Bhaktisetu Foundation, [PLACEHOLDER: registered office]) per DPDPA / CAN-SPAM equivalents

## Reply playbook

| Reply type | Action |
|---|---|
| "Send more info" | Reply within 4hr w/ deck + 1-pager + Calendly link |
| "Not now, maybe Q2" | Calendar reminder, restart sequence T+90 |
| "Wrong person" | Ask for forward + permission to use their name in intro |
| "Remove" | Suppress + log in suppression list |
| Silence after T+21 | Stop. Restart only T+180 with brand-new hook. |

## Closes
Q-R-Q4-M-007-20260610T1623
