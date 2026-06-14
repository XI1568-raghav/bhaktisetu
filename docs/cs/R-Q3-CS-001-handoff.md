# R-Q3-CS-001 — P50 first-response SLA <2h (handoff)

> Spec at `docs/roadmap/items/Q3/cs/001-p50-first-response-sla-2h-across-email-wa-chat-24x.md` was
> TBD-heavy (success_criteria, kpi.query, agent_brief.prompt_skeleton all "TBD-populate-before-orchestrator-go-live"). This
> handoff lays the measurement plumbing so the moment the inbound source is wired the
> KPI starts moving.

## What shipped (this batch)

- `scripts/agents/cs-sla-tracker.mjs` — daily agent. Reads `docs/agent-reports/_inbound-tickets.jsonl`,
  computes p50/p90 first-response minutes per channel (email/whatsapp/chat/other) on a
  7-day rolling window, writes `docs/agent-reports/_cs-sla-state.json` + a markdown
  report at `docs/agent-reports/YYYY-MM-DD-cs-sla-tracker.md`. Target hard-coded to
  120 minutes per the roadmap item.
- `scripts/agents/__tests__/cs-sla-tracker.test.mjs` — 10 vitest cases covering
  percentile math, channel-alias normalization, window cutoff, pending vs responded,
  bad-timestamp rejection, and the 120-minute SLA gate.
- The agent runs no-op-but-alive: zero crash on empty/missing JSONL, writes a verdict of
  `no-data` and a "Founder action required" block prompting one of three wiring options.

## What founder must do to populate the KPI

Pick ONE inbound source and append a JSON line per ticket to
`docs/agent-reports/_inbound-tickets.jsonl` (already consumed by `support-intent-triage`):

```json
{"id":"wa-001","text":"booking BS-20260614-00012 missing video","from":"+9198...","channel":"whatsapp","receivedAt":"2026-06-14T08:00:00Z","firstResponseAt":"2026-06-14T08:42:00Z"}
```

Required: `id`, `text`, `receivedAt` (ISO). Optional: `firstResponseAt` (ISO) — once set, the
ticket counts toward the SLA cohort. Until then it counts as pending.

Source options (priority order, all currently TBD):

1. **WhatsApp Cloud webhook** — gated on activation gate U7 (Meta KYC). Highest leverage.
2. **Resend inbound parse** — every email to `support@darshya.online` parsed → JSONL append.
   Closest to ready; only needs an inbound route wire.
3. **LiveChatWidget escalation** — fire on every "talk to human" click. Lowest volume but
   fastest to ship.

## How the KPI gets back into the roadmap

`docs/roadmap/_manual-kpis.yml` already tracks `cs_p50_response_minutes`. After founder
wires an inbound source AND a responder updates `firstResponseAt` on real tickets, the
nightly KPI refresher can read `overall.p50` out of `_cs-sla-state.json` and stamp it
into the manual-kpis ledger. (Refresher hook is a separate roadmap item — out of scope
for this batch.)

## Why it is not founder-action-required only

Without the inbound wire there is genuinely nothing to measure. The agent is the
measurement primitive. Shipping it now means the moment any of the three sources lights
up the SLA verdict goes live without a second engineering pass.

## Verification

```bash
pnpm vitest run scripts/agents/__tests__/cs-sla-tracker.test.mjs
CS_SLA_TRACKER_RUN=1 node scripts/agents/cs-sla-tracker.mjs
cat docs/agent-reports/_cs-sla-state.json | head -5
```

All three already pass locally.
