# SALES Advisory — 2026-W39

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 92
- Planned: 0
- In progress: 68
- Shipped: 23
- Verified: 0
- Blocked: 1

## Top 5 ready-to-ship (revenue/hour desc)
_None ready (DAG blocked or all in progress)_

## Founder-blocked
- R-Q1-SA-001 blocked by founder_must_send_whatsapp_to_5_priests: DM 5 ISKCON Bengaluru priests Tactic A WhatsApp template
- R-Q1-SA-006 blocked by true: Personal-network WhatsApp tracker — founder masthead-list (NO cold-call automation per founder)
- R-Q1-S-008 blocked by Founder must dial T1 gaushala prospects per outreach kit in docs/agent-reports/sales/R-Q1-S-008-*. Agent artifacts shipped.: Onboard 5 gaushalas (Pathmeda + Vrindavan + Haryana)
- R-Q1-S-013 blocked by GOOGLE_PLACES_API_KEY missing in Render env — see docs/supply/R-Q1-S-013-handoff.md: Real Google Maps scrape — verified emails+phones for 100 NEW BLR temple leads
- R-Q2-G-006 blocked by U2: US NRI soft launch — landing page + Stripe USD + first 100 paid users
- R-Q3-G-001 blocked by U2: UK launch — landing page + Stripe GBP + 1.5K paid NRI users (London/Birmingham/Leicester)
- R-Q3-G-002 blocked by U2: Canada launch — landing page + Stripe CAD + 1K paid NRI users (Toronto/Vancouver/Brampton)
- R-Q3-SA-001 blocked by U6: Anchor temple chain LOI — ISKCON OR BAPS OR Sringeri signed (B2B SaaS)
- R-Q3-SA-003 blocked by U4: First seed VC meetings — 8 tier-1 funds (Blume+Lightspeed+Accel+Matrix+Nexus+Stellaris+Elevation+SaaS)
- R-Q3-SA-004 blocked by U4: AngelList syndicate launch — first $100K committed by 20 angels
- R-Q3-S-002 blocked by Recruitment + KYC of 25 humans is founder/sales-ops execution; agent ships structured handoff only.: Onboard 25 verified pandits in Kolkata (new city — east expansion)
- R-Q4-SA-001 blocked by U6: Anchor temple chain master agreement signed — 50+ temple commit + revenue share
- R-Q4-SA-003 blocked by U4: Seed VC close meetings — 6 tier-1 funds + 2 term sheets received

## Live KPIs (this role)
- supabase:verified_astrologers_count: undefined (STALE)

## Dept doctrine (top 30 lines of 05-sales.md)
```
# Darshya — Sales & BD Playbook

> Author: Head of Sales / BD
> Date: 2026-04-27
> Budget context: $0. Founder is solo. Every tactic must be free or near-free.

> **Correction 2026-09-02 (`OPS-10`).** Two outbound-facing claims in this playbook were false and must not be sent to a prospect. The temple cold-email template (§ below) said **"we already process Stripe for US/UK cards"** — we do not: the Stripe rail was deleted from the codebase on **2026-08-11** (`apps/api/src/lib/env.ts:45-46`), **Razorpay is the only live rail and it settles INR only**, and no replacement international processor has been chosen. The partner/acquirer draft said the platform is **"built fully on free-tier infra (Cloudflare, Render, Supabase, Groq)"** — Cloudflare is DNS + edge proxy only (the web tier is the Render Docker service `darshya-web`, `render.yaml:52-60`), and Render's 750 free instance-hours are **per account, not per service**, so the two always-on services need ~1,488 h and **the account was suspended for exactly this on 2026-08-17**. Both lines are corrected in place below. Do not restore either claim without a `[verify]`-cleared fact.

> **Research note**: WebSearch and most external WebFetch endpoints were unreachable during the drafting session (API 400 / 403 / 404). Numbers below labeled "ASSUMPTION (training data, ~2024)" need a 5-minute verification pass against Inc42, Entrackr, YourStory, Crunchbase before any of this leaves the founder's machine.

---

## 1. Supply-side acquisition — first 20 priests, free

The marketplace cold-start asymmetry is real: priests will not sign up for an empty platform, and devotees will not stay on a platform with no priests. Solve supply first. The bar for the first 20 priests is **not** "best priest in India" — it is "willing to pilot, has a smartphone, has WhatsApp, completes one bookable puja with video proof."

### Tactic A — ISKCON / temple-volunteer infiltration (highest leverage)

ISKCON, Chinmaya Mission, Art of Living, and most large maths run **WhatsApp seva groups** for local volunteers. Many young priests-in-training (brahmacharis, archaka students) sit in these groups looking for ways to monetize part-time without leaving the parampara. They are the ideal first cohort: tech-fluent, English-comfortable, already trust-building inside a known sampradaya.

- Find 3 such groups via the founder's existing temple contacts in Bengaluru (per About page, team includes archaka families — use that)
- Do **not** spam the group. Instead, post **one** message offering free listing + a Rs. 500 sign-on bonus paid out of the founder's pocket on first completed puja with video proof.
- Convert via 1:1 DM, not group thread.

### Tactic B — Cold WhatsApp to priests already running Instagram pages

Search Instagram for `#pandit`, `#purohit`, `#archaka`, `#vedicpriest` — there are easily 200+ priests in Karnataka/TN/Maharashtra running personal pages with bookings done via DM. They already accept the "online lead -> offline ritual" model. Pitch them on Darshya as a free CRM + payments rail (Razorpay handles compliance, they don't), not as a marketplace.

This is the highest-converting cohort because they have **proven willingness-to-list** elsewhere already.

```

## Recommended next-cycle prompts for Decision Agent
_Defer to founder — all SALES items either in flight or blocked_
