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
