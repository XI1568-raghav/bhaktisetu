import { describe, it, expect } from 'vitest';
import { buildIndex } from './_index-build.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const FIXTURE = 'docs/roadmap/_test-fixture';

describe('buildIndex', () => {
  it('parses items and emits compact array', () => {
    mkdirSync(`${FIXTURE}/items/Q1/engineering`, { recursive: true });
    writeFileSync(`${FIXTURE}/items/Q1/engineering/001-foo.md`, `---
id: R-Q1-E-001
title: Foo
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P1
status: planned
agent_assignable: true
depends_on: []
blocks: []
kpi: { metric: foo, current: 0, target: 1, unit: count, source: manual, query: "n/a" }
revenue_impact: { amount_inr: 0, confidence: low, basis: "test" }
est_hours: 1
est_cost_inr: 0
success_criteria: ["ok"]
agent_brief: { context_files: [], prompt_skeleton: "test" }
tags: []
created_at: 2026-06-10T00:00:00Z
updated_at: 2026-06-10T00:00:00Z
---
# body`);
    const idx = buildIndex(`${FIXTURE}/items`);
    expect(idx.items).toHaveLength(1);
    expect(idx.items[0].id).toBe('R-Q1-E-001');
    // body excluded, prompt_skeleton dropped from agent_brief
    expect(idx.items[0].agent_brief?.prompt_skeleton).toBeUndefined();
    rmSync(FIXTURE, { recursive: true });
  });
});
