# CS-008 — MAX_CONTACT_COUNT verify + 14d follow-up template

> **Roadmap item**: R-Q1-CS-008 (P0) · **Authored**: 2026-06-12 · **Status**: PARTIAL SHIPPED already — code change present, template pending.

## What was supposed to ship

Original spec: bump `MAX_CONTACT_COUNT` from 3 → 5 + add 14d follow-up template.

## Code-side: already shipped

`apps/api/src/jobs/outreach-cron.ts:51`:

```typescript
const MAX_CONTACT_COUNT = 5;
```

Verified in code today. Usage at lines 264 + 282 enforces `contactCount: { lt: MAX_CONTACT_COUNT }` — leads w/ ≥5 contacts get skipped by cron.

## What's still missing — 14d follow-up template

Outreach cron sends, but doesn't have an explicit "14-day follow-up" copy variant. Recommended addition: template-set selection logic in outreach service based on `contactCount`:

| contact_count | Template variant |
|---|---|
| 0 | Cold first-touch (per existing outreach templates) |
| 1 | 7-day soft follow-up "did this reach you?" |
| 2 | 14-day value-add follow-up — provides NEW info since last contact |
| 3 | 21-day final-attempt — clear close + opt-out |
| 4 | 30-day deep-cold — last graceful exit |
| 5+ | STOP (cron caps via MAX_CONTACT_COUNT=5) |

## 14-day template draft (variant #3 above)

**Subject**: `{Name} ji — quick {role-specific} update from Bhaktisetu Foundation`

**Body** (~150 words):

```
Pranam {Name} ji,

Bhaktisetu Foundation se {founder name}. Maine aapko 2 weeks pehle
contact kiya tha {channel}. Possible hai pehle email/WA dekha nahi —
ek concrete update share karne ke liye ek aur attempt:

Since last contact ({weeks_ago} weeks ago):
- {1 concrete Bhaktisetu metric/milestone — e.g.
  "First 5 BLR temple pilots agreed" / "Wallet credit feature ship for
  referral program" / "10 verified pandit prospects onboarded"}
- Active 80G + CSR-1 maintained
- 0 marketing spend — pure organic + word-of-mouth growth

Aapka {temple/pandit/gaushala/astrologer} list hone se kya value milta:
- {1 sentence specific to role}

15-min call possible is hafte?
Calendly: {founder Calendly URL}

Nahi interested → reply mein "remove" likh dein, hata dunga aur dobara
contact nahi karunga.

Pranam,
{Founder name}
```

## Template-set selection logic (proposed addition to outreach service)

```typescript
// apps/api/src/services/outreach.service.ts (proposed extension)
export function selectTemplateForLead(lead: Lead): TemplateKey {
  if (lead.contactCount === 0) return 'cold-first-touch';
  if (lead.contactCount === 1) return 'followup-7d-soft';
  if (lead.contactCount === 2) return 'followup-14d-update';
  if (lead.contactCount === 3) return 'followup-21d-final';
  if (lead.contactCount === 4) return 'followup-30d-graceful-exit';
  return 'none'; // caps at MAX_CONTACT_COUNT
}
```

This is a code change to file as separate ticket R-Q1-CS-008b. The template TEXT is the deliverable of THIS cycle slice.

## Pass criteria

- [ ] Verified `MAX_CONTACT_COUNT = 5` in outreach-cron.ts
- [ ] 14-day follow-up template drafted (above)
- [ ] Per-contactCount template-set table documented
- [ ] R-Q1-CS-008b ticket filed for code wire-up (separate cycle)
- [ ] Founder reviews template before any production use

## What this unblocks

- Outreach cron stops at 5 attempts (no infinite contact spam)
- Multi-touch sequence has graduated tone (cold → soft → value-add → final → graceful exit)
- Lead lifecycle becomes predictable; founder can stop checking individual leads

## Out of scope

- Code wire-up of selectTemplateForLead (file R-Q1-CS-008b)
- Per-language template variants (Hindi/Tamil/Telugu cross-ref existing macros-v1-{hi,ta,te}.md)
- A/B test of follow-up cadence (defer to M-014 personalized outreach v2)
- WhatsApp template versions (requires U7 — Meta approval)

## Closes

R-Q1-CS-008 — code already shipped (MAX_CONTACT_COUNT=5); 14-day template authored here. Status flips to shipped after R-Q1-CS-008b code wire-up.
