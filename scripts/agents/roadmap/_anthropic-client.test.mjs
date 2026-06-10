import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callOpus47, ModelRejectedError } from './_anthropic-client.mjs';

describe('callOpus47', () => {
  const _origModel = process.env.ANTHROPIC_MODEL;
  beforeEach(() => { delete process.env.ANTHROPIC_MODEL; }); // isolate from host env (default = opus-4-7)
  afterEach(() => { if (_origModel !== undefined) process.env.ANTHROPIC_MODEL = _origModel; });

  it('throws ModelRejectedError on 403 Free tier reject (never silent-swaps)', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(Object.assign(new Error('Free tier users do not have access'), { status: 403 }))
      }
    };
    await expect(callOpus47({ messages: [], maxTokens: 100, client: mockClient }))
      .rejects.toThrow(ModelRejectedError);
    expect(mockClient.messages.create).toHaveBeenCalledOnce(); // no retry on 403
  });

  it('retries 3x on 5xx + succeeds', async () => {
    const mockClient = {
      messages: {
        create: vi.fn()
          .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
          .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 503 }))
          .mockResolvedValueOnce({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 10, output_tokens: 2 } })
      }
    };
    const res = await callOpus47({ messages: [], maxTokens: 100, client: mockClient, retryDelayMs: 1 });
    expect(res.content[0].text).toBe('ok');
    expect(mockClient.messages.create).toHaveBeenCalledTimes(3);
  });

  it('never falls back to non-Opus-4.7 model', async () => {
    const mockClient = { messages: { create: vi.fn().mockResolvedValue({ content: [], usage: {} }) } };
    await callOpus47({ messages: [], maxTokens: 100, client: mockClient });
    const callArgs = mockClient.messages.create.mock.calls[0][0];
    expect(callArgs.model).toMatch(/opus-4[\.-]7/);
  });
});
