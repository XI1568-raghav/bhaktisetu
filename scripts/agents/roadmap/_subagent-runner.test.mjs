import { describe, it, expect, vi } from 'vitest';
import { runSubagent } from './_subagent-runner.mjs';

const SAMPLE_ITEM = {
  id: 'R-Q1-E-001', title: 'Test item', category: 'engineering',
  agent_brief: { context_files: ['apps/web/file.ts'], prompt_skeleton: 'do thing' }
};

describe('runSubagent', () => {
  it('returns queueFiles[] from valid Opus response w/ single chunk', async () => {
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: `---\nqueueId: Q-test-001\nitemId: R-Q1-E-001\nrole: cto\nemittedAt: 2026-06-10T00:00:00Z\n---\n# Prompt body\nHello.` }],
      usage: { input_tokens: 100, output_tokens: 50 }
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 'test', items: [SAMPLE_ITEM], cycleId: 'C-test', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(1);
    expect(res.queueFiles[0].frontmatter.itemId).toBe('R-Q1-E-001');
    expect(res.queueFiles[0].frontmatter.queueId).toBe('Q-test-001');
    expect(res.queueFiles[0].body).toContain('Hello.');
    expect(res.errors).toHaveLength(0);
    expect(res.usage.input_tokens).toBe(100);
  });

  it('parses multiple chunks separated by ---END-QUEUE-FILE---', async () => {
    const text = `---\nqueueId: Q-1\nitemId: R-Q1-E-001\nrole: cto\nemittedAt: t\n---\n# Body 1\n---END-QUEUE-FILE---\n---\nqueueId: Q-2\nitemId: R-Q1-E-002\nrole: cto\nemittedAt: t\n---\n# Body 2`;
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text }],
      usage: {}
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001', 'R-Q1-E-002'], briefing: 't', items: [SAMPLE_ITEM, { ...SAMPLE_ITEM, id: 'R-Q1-E-002' }], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(2);
    expect(res.queueFiles[0].frontmatter.queueId).toBe('Q-1');
    expect(res.queueFiles[1].frontmatter.queueId).toBe('Q-2');
  });

  it('returns empty queueFiles + error on malformed YAML chunk', async () => {
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'not valid yaml frontmatter' }],
      usage: {}
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 't', items: [SAMPLE_ITEM], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(0);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/malformed/);
  });

  it('drops chunks missing queueId or itemId', async () => {
    const text = `---\nrole: cto\nemittedAt: t\n---\n# body w/ no queueId or itemId`;
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text }],
      usage: {}
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 't', items: [SAMPLE_ITEM], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(0);
    expect(res.errors[0]).toMatch(/missing queueId or itemId/);
  });

  it('catches Opus throw + returns empty queueFiles w/ error', async () => {
    const fakeOpus = vi.fn().mockRejectedValue(new Error('proxy 403'));
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 't', items: [SAMPLE_ITEM], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(0);
    expect(res.errors).toEqual(['proxy 403']);
    expect(res.usage).toBeNull();
  });

  it('filters items to only itemIds requested', async () => {
    const items = [SAMPLE_ITEM, { ...SAMPLE_ITEM, id: 'R-Q1-E-099' }];
    let capturedUserMsg = '';
    const fakeOpus = vi.fn().mockImplementation(({ messages }) => {
      capturedUserMsg = messages[0].content;
      return Promise.resolve({ content: [{ type: 'text', text: '' }], usage: {} });
    });
    await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 't', items, cycleId: 'C-t', opusFn: fakeOpus });
    expect(capturedUserMsg).toContain('R-Q1-E-001');
    expect(capturedUserMsg).not.toContain('R-Q1-E-099');
  });
});

// ── 0-queue-write fix (2026-07-31): write_queue tool_use output ─────────────
// glm-5.2 does not reliably emit ---END-QUEUE-FILE--- + YAML-frontmatter text,
// so sub-agents returned rich briefings that evaporated into "0 queue files".
// Fix: sub-agents emit each queue file via a write_queue tool_use block (the
// structured-output mechanism the Decision Agent already uses).
describe('runSubagent — write_queue tool_use output (0-queue-write fix)', () => {
  const FM = {
    queueId: 'Q-C-t-R-Q1-E-001', itemId: 'R-Q1-E-001', role: 'cto',
    emittedAt: '2026-07-31T00:00:00Z', cycle: 'C-t', priority: 'P1',
    estTokens: 5000, estMinutes: 60,
    consumedAt: null, consumedBy: null, consumedInSessionId: null,
  };

  it('parses a write_queue tool_use block even when text is non-conforming', async () => {
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [
        { type: 'text', text: 'Here is the queue file — no end-marker needed.' },
        { type: 'tool_use', name: 'write_queue', input: { ...FM, body: '## Do the thing\n\n1. Step one.' } },
      ],
      usage: {},
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 't', items: [SAMPLE_ITEM], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.errors).toHaveLength(0);
    expect(res.queueFiles).toHaveLength(1);
    expect(res.queueFiles[0].frontmatter.itemId).toBe('R-Q1-E-001');
    expect(res.queueFiles[0].body).toContain('Do the thing');
  });

  it('collects multiple write_queue blocks (one per item)', async () => {
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [
        { type: 'tool_use', name: 'write_queue', input: { ...FM, body: 'body 1' } },
        { type: 'tool_use', name: 'write_queue', input: { ...FM, queueId: 'Q-C-t-R-Q1-E-002', itemId: 'R-Q1-E-002', body: 'body 2' } },
      ],
      usage: {},
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001', 'R-Q1-E-002'], briefing: 't', items: [SAMPLE_ITEM, { ...SAMPLE_ITEM, id: 'R-Q1-E-002' }], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(2);
    expect(res.queueFiles.map((q) => q.frontmatter.itemId)).toEqual(['R-Q1-E-001', 'R-Q1-E-002']);
  });

  it('flags a write_queue block missing queueId/itemId as an error', async () => {
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [{ type: 'tool_use', name: 'write_queue', input: { role: 'cto', body: 'x' } }],
      usage: {},
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 't', items: [SAMPLE_ITEM], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(0);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('still falls back to legacy text parsing when no tool_use present', async () => {
    const legacy = `---\nqueueId: Q-C-t-R-Q1-E-001\nitemId: R-Q1-E-001\nrole: cto\nemittedAt: t\n---\nlegacy body`;
    const fakeOpus = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: legacy }], usage: {} });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 't', items: [SAMPLE_ITEM], cycleId: 'C-t', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(1);
    expect(res.queueFiles[0].body).toContain('legacy body');
  });
});
