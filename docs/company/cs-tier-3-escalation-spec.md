# CS Tier-3 Automated Escalation Spec

> **Roadmap item**: R-Q4-CS-002 (P0) · **Authored**: 2026-06-13

## Goal

Automated triage + escalation routing: Tier-1 (auto-bot) → Tier-2 (CS hire) → Tier-3 (specialist OR founder).

## Triage rules (LLM classifier)

Inbound ticket → LLM classifies into:

| Category | Tier-1 auto-handle? | Tier-2 (CS) | Tier-3 (specialist/founder) |
|---|---|---|---|
| General FAQ | ✓ (KB self-serve) | — | — |
| Booking inquiry | partial (CTA → /me/bookings) | ✓ | — |
| Refund <₹5K | bot + auto-process | ✓ | — |
| Refund ≥₹5K | — | ✓ | founder approval |
| Pandit no-show | — | ✓ | — |
| Video proof complaint | — | ✓ | tech-specialist if recurring |
| Payment dispute | — | ✓ | finance/CA specialist |
| DPDP / DSAR | — | — | DPO (founder Q1, external Q3+) |
| Legal threat | — | — | founder + counsel immediate |
| Founder-direct (CEO escalation) | — | — | founder personally |
| Press / journalist inquiry | — | — | founder personally |

## LLM prompt (classifier)

```
You are Bhaktisetu CS triage classifier. Given a customer support
message, output ONE category: "general_faq", "booking", "refund_small",
"refund_large", "pandit_noshow", "video_proof", "payment", "dpdp",
"legal_threat", "founder_direct", "press". If unsure, "general_faq".

Use Hindi/English/regional language understanding.
```

Free tier LLM: Groq llama-3.3-70b (already wired per R-Q2-E-001). Cost ~₹0/classification.

## Routing engine

```typescript
// apps/api/src/services/cs/triage.service.ts
export async function classifyAndRoute(ticket: SupportTicket): Promise<{
  tier: 1 | 2 | 3;
  assignTo: 'auto_bot' | 'cs_queue' | 'founder' | 'dpo' | 'finance_specialist';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}> {
  const category = await llmClassify(ticket.body);
  return ROUTING_TABLE[category];
}
```

## Escalation audit log

Every triage decision logged: `(ticket_id, category_predicted, tier, route, latency_ms, classifier_confidence)`. Weekly review by founder to catch misroutes.

## Tickets

- R-Q4-CS-002a: LLM classifier endpoint
- R-Q4-CS-002b: routing engine + audit log
- R-Q4-CS-002c: admin override UI

## Closes

R-Q4-CS-002 — spec shipped.
