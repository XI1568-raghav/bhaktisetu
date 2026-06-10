import { describe, it, expect } from 'vitest';
import { evalTripwires } from './_tripwire-eval.mjs';

const TRIPWIRES = [
  { id: 'T-A', name: 'CF over', condition: 'ctx.budget.cfBuildsMonth.pct > 60', action: 'defer_to_founder' },
  { id: 'T-B', name: 'Proxy block', condition: "ctx.external.lastAnthropicError && /403/.test(ctx.external.lastAnthropicError)", action: 'kill_workflow' },
  { id: 'T-EVIL-PROCESS', name: 'process exit', condition: "typeof process !== 'undefined' && process.exit(1)", action: 'noop' },
  { id: 'T-EVIL-REQUIRE', name: 'require fs', condition: "typeof require === 'function' && require('fs')", action: 'noop' },
  { id: 'T-EVIL-GLOBAL', name: 'global access', condition: "typeof globalThis.process !== 'undefined'", action: 'noop' },
  { id: 'T-EVIL-EVAL', name: 'nested eval', condition: "(new Function('return 1'))() === 1", action: 'noop' },
  { id: 'T-T009-RBALANCE', name: 'role over-spawn', condition: "ctx.queue.depth >= 5 && (Math.max(...Object.values(ctx.queue.byRole)) / ctx.queue.depth) > 0.6", action: 'rebalance' },
];

describe('evalTripwires', () => {
  it('fires matching tripwires', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 75 } }, external: {}, queue: { depth: 0, byRole: {} } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).toContain('T-A');
    expect(fired.map(f => f.id)).not.toContain('T-B');
  });

  it('does NOT fire on falsy condition', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 30 } }, external: { lastAnthropicError: '200 ok' }, queue: { depth: 0, byRole: {} } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).not.toContain('T-A');
    expect(fired.map(f => f.id)).not.toContain('T-B');
  });

  it('blocks process.exit sandbox escape', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 0 } }, external: {}, queue: { depth: 0, byRole: {} } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).not.toContain('T-EVIL-PROCESS');
    // If sandbox failed, this test would never execute (process killed)
  });

  it('blocks require sandbox escape', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 0 } }, external: {}, queue: { depth: 0, byRole: {} } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).not.toContain('T-EVIL-REQUIRE');
  });

  it('blocks global.process access', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 0 } }, external: {}, queue: { depth: 0, byRole: {} } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).not.toContain('T-EVIL-GLOBAL');
  });

  it('blocks nested Function constructor', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 0 } }, external: {}, queue: { depth: 0, byRole: {} } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).not.toContain('T-EVIL-EVAL');
  });

  it('handles Math.max in T-009 spread Object.values pattern', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 0 } }, external: {}, queue: { depth: 6, byRole: { cmo: 4, cto: 1, sales: 1 } } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).toContain('T-T009-RBALANCE'); // 4/6 = 0.67 > 0.6
  });

  it('returns parse-error markers instead of throwing on bad condition', () => {
    const bad = [{ id: 'T-BAD', condition: '))))', action: 'noop' }];
    const fired = evalTripwires(bad, {});
    expect(fired).toEqual([]); // silent skip + warn
  });

  it('adds firedAt timestamp to fired tripwires', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 75 } }, external: {}, queue: { depth: 0, byRole: {} } };
    const fired = evalTripwires(TRIPWIRES, ctx);
    const tA = fired.find(f => f.id === 'T-A');
    expect(tA.firedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('freezes ctx — mutations in condition don\'t leak', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 75 } }, external: {}, queue: { depth: 0, byRole: {} } };
    const mutateTw = [{ id: 'T-MUTATE', condition: 'ctx.budget.cfBuildsMonth.pct = 0, true', action: 'noop' }];
    evalTripwires(mutateTw, ctx);
    expect(ctx.budget.cfBuildsMonth.pct).toBe(75); // original unmutated
  });
});
