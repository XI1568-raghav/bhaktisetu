# Personal-Network WhatsApp Tracker — Founder Masthead List

> **Roadmap item**: R-Q1-SA-006 (P1) · **Authored**: 2026-06-13 · **Sibling**: R-Q1-CS-006 (WA blast 21)

## Goal

Spreadsheet tracker for founder personal-network WhatsApp outreach. NO cold-call energy — purely warm-introduction tracking + follow-up. Targets 25+ warm referrals → 5+ paid bookings Q1.

## Tracker fields

| Column | Type | Notes |
|---|---|---|
| Name | string | Personal contact |
| Relationship | enum | family / college / work / community |
| Phone | string | Encrypted at rest |
| First contact date | date | When founder sent intro |
| Tier | enum | A (warm yes, will refer) / B (warm but passive) / C (formal acquaintance) |
| Referrals shared | int | Count of intros they made |
| Referrals converted | int | Of those, how many paid |
| Last touch | date | Last comm date |
| Next action | string | "Send Diwali promo" / "Ask 5 more" / "Quiet" |
| Notes | text | Personal context |

## Privacy + ethical

- Spreadsheet stored in 1Password vault (NOT shared cloud)
- Contact relationships private
- Never message-blast more than 1× per 30 days same contact
- WA contact list "Personal-network" excluded from any marketing automation
- Quarterly cleanup: remove non-responders + DNC requests

## SLA

- New contact added: within 24hr of first WhatsApp send
- Tracker updated: weekly (every Friday review)
- Follow-up cadence: tier-A weekly, tier-B monthly, tier-C quarterly

## Engineering tickets

- R-Q1-SA-006a: Notion / Airtable tracker setup
- R-Q1-SA-006b: WhatsApp export → tracker sync script
- R-Q1-SA-006c: Friday review SOP doc

## Closes

R-Q1-SA-006 — spec shipped.
