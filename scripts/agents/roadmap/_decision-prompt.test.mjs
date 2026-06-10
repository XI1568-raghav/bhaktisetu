import { describe, it, expect } from 'vitest';
import { DECISION_SYSTEM_PROMPT, DECISION_TOOLS, buildDecisionUserMessage } from './_decision-prompt.mjs';

describe('DECISION_SYSTEM_PROMPT', () => {
  it('is non-empty multi-line string', () => {
    expect(typeof DECISION_SYSTEM_PROMPT).toBe('string');
    expect(DECISION_SYSTEM_PROMPT.length).toBeGreaterThan(500);
    expect(DECISION_SYSTEM_PROMPT).toContain('Master Orchestrator');
    expect(DECISION_SYSTEM_PROMPT).toContain('Opus 4.7');
  });

  it('mentions all 12 sub-agent roles', () => {
    const roles = ['cto-agent', 'cfo-agent', 'cmo-agent', 'cpo-agent', 'sales-agent', 'talent-agent', 'cs-agent', 'legal-agent', 'it-agent', 'hr-agent', 'researcher', 'geo-agent'];
    for (const r of roles) expect(DECISION_SYSTEM_PROMPT).toContain(r);
  });

  it('cites free-tier budget doctrine', () => {
    expect(DECISION_SYSTEM_PROMPT).toMatch(/free-tier|CF 500|GH 2000/i);
  });

  it('cites founder-blocker discipline', () => {
    expect(DECISION_SYSTEM_PROMPT).toMatch(/founder.?blocker|founder_blocker/i);
  });
});

describe('DECISION_TOOLS', () => {
  it('has 4 tools', () => {
    expect(DECISION_TOOLS).toHaveLength(4);
    expect(DECISION_TOOLS.map(t => t.name).sort()).toEqual(['defer_to_founder', 'kill_item', 'spawn_subagent', 'write_decision_note']);
  });

  it('each tool has name + description + input_schema', () => {
    for (const t of DECISION_TOOLS) {
      expect(t.name).toBeDefined();
      expect(t.description).toBeDefined();
      expect(t.input_schema).toBeDefined();
      expect(t.input_schema.type).toBe('object');
      expect(t.input_schema.required).toBeDefined();
    }
  });

  it('spawn_subagent role enum has 12 values', () => {
    const tool = DECISION_TOOLS.find(t => t.name === 'spawn_subagent');
    expect(tool.input_schema.properties.role.enum).toHaveLength(12);
  });
});

describe('buildDecisionUserMessage', () => {
  it('compiles message with cycle ts + backlog summary + budget + queue', () => {
    const ctx = {
      cycle: { ts: '2026-06-10T18:17:00Z', dayOfMonth: 10, dayOfWeek: 3 },
      budget: { ghMinutesMonth: { pct: 30.6 }, cfBuildsMonth: { pct: 5.6 } },
      items: {
        totalCount: 283,
        byStatus: { planned: 223, in_progress: 8, shipped: 47, verified: 47, blocked: 3 },
        readyToShip: ['R-Q1-E-001', 'R-Q1-S-001'],
        founderBlocked: [{ itemId: 'R-Q1-E-001', blocker: 'U1', daysOpen: 47 }],
      },
      queue: { depth: 4, oldestAgeHours: 18, byRole: {} },
      firedTripwires: [{ id: 'T-001' }],
      kpis: {},
    };
    const msg = buildDecisionUserMessage(ctx);
    expect(msg).toContain('2026-06-10T18:17:00Z');
    expect(msg).toContain('283 total');
    expect(msg).toContain('GH 30.6%');
    expect(msg).toContain('CF 5.6%');
    expect(msg).toContain('R-Q1-E-001');
    expect(msg).toContain('T-001');
    expect(msg).toContain('U1');
    expect(msg).toContain('Decide what');
  });
});
