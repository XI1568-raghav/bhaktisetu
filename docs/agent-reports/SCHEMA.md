# Fleet agent report schema (P4.20)

Shared JSON schema for the 9-agent fleet's structured handoffs. Lets agents
consume each other's output (e.g. leads-prospector → enricher → onboarding-nudge)
and lets the admin dashboard render reports uniformly. Sits alongside the
existing freeform `.md` reports — does NOT replace them.

## When to write a structured report

Any fleet agent run that produces actionable findings writes BOTH:
1. The existing `.md` report (human-readable, unchanged).
2. A `.json` report conforming to this schema (machine-readable).

State files (`_*-state.json`) are unchanged — those are per-agent persistence,
different purpose.

## Schema

See `fleet-report.schema.json`. A valid report:

```json
{
  "schemaVersion": "1.0",
  "agent": "leads-prospector",
  "runDate": "2026-07-10",
  "runTrigger": "agents-daily",
  "summary": "Found 12 new NRI leads from Canada pandit directories; 3 high-confidence.",
  "confidence": 0.82,
  "findings": [
    {
      "id": "lead-001",
      "title": "Dr. Rajesh K. — Toronto, Sindhi pandit",
      "severity": "high",
      "category": "lead",
      "detail": "Lists puja services on canadapandit.com/toronto. Phone + email public.",
      "source": "https://canadapandit.com/toronto#rajesh",
      "evidence": "GET returned 200; phone pattern +1-416-...",
      "actionable": true
    }
  ],
  "sources": [
    { "url": "https://canadapandit.com/toronto", "type": "directory", "accessedAt": "2026-07-10" }
  ],
  "nextActions": [
    "enrich top 5 leads with Apollo (email verify)",
    "queue onboarding-nudge for lead-001, lead-003, lead-007"
  ],
  "metrics": { "leadsFound": 12, "highConfidence": 3 },
  "errors": []
}
```

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | string | yes | `"1.0"` |
| `agent` | string | yes | kebab-case agent name, matches `scripts/agents/<name>.mjs` |
| `runDate` | string | yes | `YYYY-MM-DD` (UTC) |
| `runTrigger` | string | yes | `agents-daily` \| `agents-weekly` \| `manual` \| `pr-review` |
| `summary` | string | yes | 1-3 sentence human summary |
| `confidence` | number | no | 0.0-1.0 — how sure the agent is in its findings |
| `findings[]` | array | yes | can be empty `[]` (negative result is valid) |
| `findings[].id` | string | yes | stable id within this run, e.g. `lead-001` |
| `findings[].title` | string | yes | short label |
| `findings[].severity` | enum | no | `critical` \| `high` \| `medium` \| `low` \| `info` |
| `findings[].category` | string | no | `lead` \| `bug` \| `security` \| `content` \| `metric` \| `task` |
| `findings[].detail` | string | yes | what was found |
| `findings[].source` | string | no | URL or file:line |
| `findings[].evidence` | string | no | the proof (command output, HTTP status) — a finding without evidence is a hypothesis, flag it |
| `findings[].actionable` | boolean | no | default true |
| `sources[]` | array | no | provenance for citation/audit |
| `nextActions[]` | array | no | what a downstream agent or human should do next — this is the handoff |
| `metrics` | object | no | freeform numeric counters |
| `errors[]` | array | no | things that went wrong during the run |

## Validation

```bash
node scripts/agents/validate-fleet-report.mjs docs/agent-reports/2026-07-10-leads.json
```

Exits non-zero on schema violation. Wire into the agents-daily workflow before
the "Commit reports" step so malformed JSON never lands in the repo.
