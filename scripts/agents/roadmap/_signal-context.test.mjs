import { describe, it, expect } from 'vitest';
import { buildSignalContext } from './_signal-context.mjs';

const ITEMS = [
  { id: 'R-Q1-E-001', status: 'planned', category: 'engineering', priority: 'P0', owner_role: 'cto',
    agent_assignable: true, founder_blocker: null, depends_on: [],
    kpi: { metric: 'foo', current: 0, target: 10 },
    revenue_impact: { amount_inr: 1000 }, est_hours: 4, created_at: '2026-06-01T00:00:00Z' },
  { id: 'R-Q1-S-001', status: 'shipped', category: 'supply', priority: 'P1', owner_role: 'cmo',
    agent_assignable: true, founder_blocker: null, depends_on: [],
    kpi: { metric: 'bar', current: 5, target: 10 },
    revenue_impact: { amount_inr: 5000 }, est_hours: 2, created_at: '2026-06-05T00:00:00Z' },
  { id: 'R-Q1-F-001', status: 'planned', category: 'finance', priority: 'P0', owner_role: 'cfo',
    agent_assignable: false, founder_blocker: 'U1', depends_on: [],
    kpi: { metric: 'baz', current: 0, target: 1 },
    revenue_impact: { amount_inr: 0 }, est_hours: 1, created_at: '2026-05-01T00:00:00Z' },
];

describe('buildSignalContext', () => {
  it('compresses items into byStatus/byCategory/byPriority counts', () => {
    const ctx = buildSignalContext({
      items: ITEMS, kpis: [], queue: [], tripwiresFired: [],
      budgets: { ghMinutesMonth: { used: 100, cap: 2000, pct: 5 } },
      now: new Date('2026-06-10T00:00:00Z').getTime(),
    });
    expect(ctx.items.byStatus).toEqual({ planned: 2, shipped: 1 });
    expect(ctx.items.byCategory).toEqual({ engineering: 1, supply: 1, finance: 1 });
    expect(ctx.items.byPriority).toEqual({ P0: 2, P1: 1 });
    expect(ctx.items.byOwnerRole).toEqual({ cto: 1, cmo: 1, cfo: 1 });
  });

  it('ranks readyToShip by revenue_impact_per_hour desc', () => {
    const ctx = buildSignalContext({
      items: ITEMS, kpis: [], queue: [], tripwiresFired: [],
      budgets: {},
      now: new Date('2026-06-10T00:00:00Z').getTime(),
    });
    expect(ctx.items.readyToShip).toEqual(['R-Q1-E-001']);
  });

  it('respects depends_on DAG (excludes items w/ unverified deps)', () => {
    const items = [
      { id: 'R-Q1-E-001', status: 'planned', category: 'engineering', priority: 'P0', owner_role: 'cto',
        agent_assignable: true, founder_blocker: null, depends_on: ['R-Q1-E-002'],
        kpi: {}, revenue_impact: { amount_inr: 100 }, est_hours: 1, created_at: '2026-06-01T00:00:00Z' },
      { id: 'R-Q1-E-002', status: 'shipped', category: 'engineering', priority: 'P0', owner_role: 'cto',
        agent_assignable: true, founder_blocker: null, depends_on: [],
        kpi: {}, revenue_impact: { amount_inr: 100 }, est_hours: 1, created_at: '2026-06-01T00:00:00Z' },
    ];
    const ctx = buildSignalContext({ items, kpis: [], queue: [], tripwiresFired: [], budgets: {}, now: Date.now() });
    expect(ctx.items.readyToShip).toEqual([]);
  });

  it('includes items w/ verified deps in readyToShip', () => {
    const items = [
      { id: 'R-Q1-E-001', status: 'planned', category: 'engineering', priority: 'P0', owner_role: 'cto',
        agent_assignable: true, founder_blocker: null, depends_on: ['R-Q1-E-002'],
        kpi: {}, revenue_impact: { amount_inr: 100 }, est_hours: 1, created_at: '2026-06-01T00:00:00Z' },
      { id: 'R-Q1-E-002', status: 'verified', category: 'engineering', priority: 'P0', owner_role: 'cto',
        agent_assignable: true, founder_blocker: null, depends_on: [],
        kpi: {}, revenue_impact: { amount_inr: 100 }, est_hours: 1, created_at: '2026-06-01T00:00:00Z' },
    ];
    const ctx = buildSignalContext({ items, kpis: [], queue: [], tripwiresFired: [], budgets: {}, now: Date.now() });
    expect(ctx.items.readyToShip).toEqual(['R-Q1-E-001']);
  });

  it('surfaces founderBlocked items with daysOpen', () => {
    const ctx = buildSignalContext({
      items: ITEMS, kpis: [], queue: [], tripwiresFired: [],
      budgets: {},
      now: new Date('2026-06-10T00:00:00Z').getTime(),
    });
    expect(ctx.items.founderBlocked).toEqual([
      { itemId: 'R-Q1-F-001', blocker: 'U1', daysOpen: 40 },
    ]);
  });

  it('reshapes kpis array to keyed object', () => {
    const ctx = buildSignalContext({
      items: ITEMS,
      kpis: [{ metric: 'foo', value: 42, stale: false }, { metric: 'bar', value: 99, stale: true }],
      queue: [], tripwiresFired: [], budgets: {}, now: Date.now(),
    });
    expect(ctx.kpis.foo).toMatchObject({ value: 42, stale: false });
    expect(ctx.kpis.bar).toMatchObject({ value: 99, stale: true });
  });

  it('computes queue depth + oldestAgeHours + byRole', () => {
    const ctx = buildSignalContext({
      items: ITEMS, kpis: [],
      queue: [
        { role: 'cto', emittedAt: '2026-06-09T00:00:00Z' },
        { role: 'cto', emittedAt: '2026-06-09T12:00:00Z' },
        { role: 'cmo', emittedAt: '2026-06-09T06:00:00Z' },
      ],
      tripwiresFired: [], budgets: {},
      now: new Date('2026-06-10T00:00:00Z').getTime(),
    });
    expect(ctx.queue.depth).toBe(3);
    expect(ctx.queue.oldestAgeHours).toBe(24);
    expect(ctx.queue.byRole).toEqual({ cto: 2, cmo: 1 });
  });

  it('sets cycle.dayOfMonth + dayOfWeek correctly', () => {
    const ctx = buildSignalContext({
      items: [], kpis: [], queue: [], tripwiresFired: [], budgets: {},
      now: new Date('2026-06-10T12:00:00Z').getTime(),
    });
    expect(ctx.cycle.dayOfMonth).toBe(10);
    // 2026-06-10 is a Wednesday (UTC day 3). Task spec comment said Tue=2 in error.
    expect(ctx.cycle.dayOfWeek).toBe(3);
    expect(ctx.cycle.ts).toMatch(/^2026-06-10T/);
  });

  it('passes firedTripwires through', () => {
    const fired = [{ id: 'T-001', firedAt: '2026-06-10T00:00:00Z' }];
    const ctx = buildSignalContext({
      items: [], kpis: [], queue: [], tripwiresFired: fired, budgets: {},
      now: Date.now(),
    });
    expect(ctx.firedTripwires).toEqual(fired);
  });
});
