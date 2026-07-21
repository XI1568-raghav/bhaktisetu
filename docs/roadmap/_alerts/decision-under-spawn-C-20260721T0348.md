# Alert

# Decision Agent emitted no work

Cycle C-20260721T0348: 0 spawn, 0 defer, 0 kill. The Decision Agent (glm-5.2) returned no spawn_subagent / defer_to_founder / kill_item tool calls.

## Fired tripwires

[
  {
    "id": "T-010",
    "name": "Queue stale",
    "condition": "ctx.queue.oldestAgeHours > 72",
    "action": "defer_to_founder",
    "deferMessage": "Queue oldest item > 72h unconsumed. Triage.",
    "weight": 1,
    "firedAt": "2026-07-21T03:49:40.006Z"
  }
]

## Diagnosis

This is the dominant 0-queue-output failure mode (F2). Unlike the sub-agent 403/timeout case (F3, see subagent-zero-output-* alerts), here the Decision Agent itself produced no spawn plan, so no sub-agent was ever called. Likely causes:
- glm-5.2 under-spawns despite the prompt instructing 3-7 (capped 2-4) spawn_subagent calls per cycle.
- All candidate items were filtered out (already-shipped, already-in-queue, founder-blocked) leaving nothing the agent judged spawnable.
- A tripwire (e.g. T-010 queue-stale) caused a defer-only cycle — but that path records a deferral, so it would NOT trigger this alert.

## Action

Review _decision-prompt.mjs spawn instructions for glm-5.2 tool-calling reliability. If this fires repeatedly across cycles, the prompt needs tightening or a floor (>=1 spawn unless an explicit defer/kill tripwire fired).


Ts: 2026-07-21T03:53:34.876Z
