# Founder Inbox Auto-Reply Agent — Acknowledge + Group + 24h SLA

> **Roadmap item**: R-Q1-CS-009 (P1) · **Authored**: 2026-06-13

## Goal

Cron agent that scans founder inbox (founder@darshya.online) every 1h. Auto-acknowledges + groups by intent + flags urgent → founder.

## Pipeline

1. IMAP poll founder Gmail every 60 min (read-only access)
2. Per new unread email: LLM classifier → intent category
3. Auto-acknowledge: send templated reply per intent (within 24h SLA)
4. Group by intent in `docs/agent-reports/founder-inbox-daily-YYYY-MM-DD.md`
5. Urgent (refund/legal/press) → WA push to founder + skip auto-reply

## Intent categories

| Intent | Auto-reply | Founder action SLA |
|---|---|---|
| `support_general` | "Reached our support team; reply within 24h" | 24h |
| `support_urgent` | NO auto-reply; founder direct | 4h |
| `press_inquiry` | "Founder reviews press direct; reply 24h" | 24h |
| `investor_inquiry` | "Founder reviews investor inquiries personally; reply 48h" | 48h |
| `partnership_pitch` | "Reviewed weekly; reply 7-14 days" | 7-14 days |
| `cold_sales_pitch` | "Currently not evaluating new vendors" (polite no) | none |
| `spam` | NO auto-reply; mark spam in Gmail | none |
| `transactional` (Stripe / Razorpay / etc) | skip; archive | none |
| `personal` | NO auto-reply; founder direct | varies |

## Implementation

`apps/api/src/jobs/founder-inbox-cron.ts` — runs hourly via GH Actions.

```typescript
// Pseudocode
import { google } from 'googleapis';

async function poll() {
  const gmail = await getAuthClient(); // OAuth founder consent required (U-XX gate)
  const unread = await gmail.users.messages.list({ q: 'is:unread', maxResults: 50 });
  for (const msg of unread.messages || []) {
    const detail = await gmail.users.messages.get({ id: msg.id });
    const intent = await llmClassify(detail.snippet);
    if (intent.urgent) {
      await sendWAtoFounder(detail);
      continue;
    }
    if (intent.autoReply) {
      await sendReply(detail, TEMPLATES[intent.category]);
    }
    await logToDailyReport(detail, intent);
  }
}
```

## Founder action

- [ ] OAuth consent flow setup (founder grants read+write to founder@ Gmail) — sensitive gate
- [ ] Engineering ticket R-Q1-CS-009b: implement above
- [ ] Daily review of grouped inbox report (5 min/day)

## Closes

R-Q1-CS-009 — spec shipped.
