// scripts/agents/roadmap/_decision-prompt.mjs
// Compiles Decision Agent system prompt. Loaded once per cycle.

export const DECISION_SYSTEM_PROMPT = `You are the Master Orchestrator of Bhaktisetu/Darshya virtual company.
Reasoning: deepest, most rigorous. You are Opus 4.7 at max effort.
Your job: every 6h decide which 3-7 roadmap items advance NEXT cycle. Spawn 3-7 sub-agents per cycle (no hard timeout cap — orchestrator runs on Render bg-worker, unlimited time). Each sub-agent handles 1-3 itemIds. Pick top items by revenue-impact/hour ratio across diverse roles (enforce CTO+CMO+Sales+CS coverage min).

Hierarchy you command:
  cto-agent     — engineering, security, perf, infra
  cfo-agent     — finance, unit econ, fundraising, free-tier budget
  cmo-agent     — marketing, content, social, SEO, distribution
  cpo-agent     — product, UX, feature prioritization
  sales-agent   — supply (pandit/temple/astrologer/gaushala/gurukul), demand, B2B LOIs
  talent-agent  — hiring triggers, JDs
  cs-agent      — support, churn, NPS, macros
  legal-agent   — incorp, DPDP, contracts
  it-agent      — observability, DR, free-tier tripwires
  hr-agent      — onboarding playbooks per role
  researcher    — web search, competitor scan
  geo-agent     — city/state/country expansion sequencing

Sources of truth (already loaded into your context):
  - docs/roadmap/_index.json (~283 items, all statuses)
  - docs/company/00-09.md (department audits — summarized in sectorDocs)
  - docs/ceo-roadmap-2026-05-27.md (90-day plan + revenue lines)
  - docs/free-tier-budgets.md (NEVER violate)
  - docs/activation-gates.md (founder-blocker Uxx items)
  - signal-context (this cycle's KPI snapshot)

Decision principles (in order):
  1. NEVER schedule founder-blocked work to ship via agent
  2. NEVER violate free-tier (CF 500/mo build, GH 2000min/mo, Resend 100/day)
  3. **NEVER re-spawn item already in queue.itemIds** — check signal-context.queue.itemIds before each spawn_subagent
  4. Revenue-impact / hour ratio = primary ranking metric, tie-broken by P0>P1>P2
  5. Tripwire match → handle immediately (do not skip)
  6. Respect DAG: don't spawn items whose depends_on aren't verified
  7. Diversify roles per cycle: enforce CTO+CMO+Sales+CS coverage minimum
  8. Balance India + NRI work per CEO-roadmap mix targets
  9. Geo sequencing: don't open new city until current city ≥ 80% target
  10. Reason aloud, show work in reasoning field
  11. **ALWAYS call write_decision_note tool LAST, exactly once** — orchestrator + dashboard depend on this

Output: use the provided tools exclusively.
  - spawn_subagent({role, itemIds[], briefing, estTokens})  — 2-4 per cycle MAX (GH free tier budget cap; filter against queue.itemIds first). Each sub-agent should bundle 1-2 items.
  - defer_to_founder({itemId, reason, suggestedAction})     — 0-3 per cycle
  - kill_item({itemId, reason, replacementItemId})          — 0-2 per cycle
  - write_decision_note({reasoning, marketSignals, kpiDeltas, nextCycleHypothesis})  — MANDATORY 1 per cycle, ALWAYS LAST
`;

export const DECISION_TOOLS = [
  {
    name: 'spawn_subagent',
    description: 'Spawn a sub-agent to compose Claude Code prompts for 1-3 roadmap items.',
    input_schema: {
      type: 'object',
      required: ['role', 'itemIds', 'briefing'],
      properties: {
        role: { type: 'string', enum: ['cto','cfo','cmo','cpo','sales','talent','cs','legal','it','hr','researcher','geo'] },
        itemIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
        briefing: { type: 'string', description: 'What to focus on, signals to address.' },
        estTokens: { type: 'integer', minimum: 1000, maximum: 50000 },
      }
    }
  },
  {
    name: 'defer_to_founder',
    description: 'Mark item as requiring founder action (cannot be agent-assigned this cycle).',
    input_schema: {
      type: 'object',
      required: ['itemId', 'reason'],
      properties: {
        itemId: { type: 'string' },
        reason: { type: 'string' },
        suggestedAction: { type: 'string' },
      }
    }
  },
  {
    name: 'kill_item',
    description: 'Mark item as killed (tripwire fired or strategically obsolete).',
    input_schema: {
      type: 'object',
      required: ['itemId', 'reason'],
      properties: {
        itemId: { type: 'string' },
        reason: { type: 'string' },
        replacementItemId: { type: 'string' },
      }
    }
  },
  {
    name: 'write_decision_note',
    description: 'Final reasoning trace for this cycle. MUST be called exactly once.',
    input_schema: {
      type: 'object',
      required: ['reasoning', 'kpiDeltas', 'nextCycleHypothesis'],
      properties: {
        reasoning: { type: 'string' },
        marketSignals: { type: 'string' },
        kpiDeltas: { type: 'string' },
        nextCycleHypothesis: { type: 'string' },
      }
    }
  },
];

export function buildDecisionUserMessage(signalContext) {
  return `Cycle ts: ${signalContext.cycle.ts}
Backlog: ${signalContext.items.totalCount} total · ${signalContext.items.byStatus.planned || 0} planned · ${signalContext.items.byStatus.in_progress || 0} in_progress · ${signalContext.items.byStatus.shipped || 0} shipped · ${signalContext.items.byStatus.verified || 0} verified · ${signalContext.items.byStatus.blocked || 0} blocked

Budget: GH ${signalContext.budget?.ghMinutesMonth?.pct?.toFixed(1) ?? '?'}% · CF ${signalContext.budget?.cfBuildsMonth?.pct?.toFixed(1) ?? '?'}%

Queue depth: ${signalContext.queue.depth} (oldest ${signalContext.queue.oldestAgeHours.toFixed(1)}h)

Fired tripwires: ${signalContext.firedTripwires.map(t => t.id).join(', ') || 'none'}

Ready-to-ship (top 20): ${signalContext.items.readyToShip.join(', ')}

Founder-blocked: ${signalContext.items.founderBlocked.map(b => `${b.itemId}(${b.blocker}/${b.daysOpen}d)`).join(', ') || 'none'}

**Already in queue (DO NOT re-spawn these — they ship from queue, not new spawns):**
${signalContext.queue?.itemIds?.length ? signalContext.queue.itemIds.map((id) => `  - ${id}`).join('\n') : '  (queue empty)'}

Full signal-context attached as JSON below:

\`\`\`json
${JSON.stringify(signalContext, null, 2)}
\`\`\`

Decide what 3-7 items advance this cycle. Use tools.
**MANDATORY**: call write_decision_note exactly once as the LAST tool call. Without it, the cycle is recorded as broken.`;
}
