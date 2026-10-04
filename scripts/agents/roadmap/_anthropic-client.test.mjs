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

  it('defaults to claude-opus-4-7 whatever ANTHROPIC_BASE_URL says', async () => {
    // The base URL used to pick the model (a gateway host meant a gateway
    // model). It no longer has any say in it.
    const _savedBase = process.env.ANTHROPIC_BASE_URL;
    try {
      for (const base of [undefined, '', 'https://api.anthropic.com', 'https://proxy.example.test/v1']) {
        if (base === undefined) delete process.env.ANTHROPIC_BASE_URL;
        else process.env.ANTHROPIC_BASE_URL = base;
        const mockClient = { messages: { create: vi.fn().mockResolvedValue({ content: [], usage: {} }) } };
        await callOpus47({ messages: [], maxTokens: 100, client: mockClient });
        expect(mockClient.messages.create.mock.calls[0][0].model).toBe('claude-opus-4-7');
      }
    } finally {
      if (_savedBase === undefined) delete process.env.ANTHROPIC_BASE_URL;
      else process.env.ANTHROPIC_BASE_URL = _savedBase;
    }
  });

  it('throws ModelRejectedError on a non-Claude ANTHROPIC_MODEL, before any request', async () => {
    // No silent swap to another provider's model: a stray variable naming one
    // must stop the run, not redirect it.
    for (const bad of ['gpt-4o', 'vendor/some-model', 'claude', 'claude-', ' claude-opus-4-7', 'x-claude-opus-4-7']) {
      process.env.ANTHROPIC_MODEL = bad;
      const mockClient = { messages: { create: vi.fn() } };
      try {
        await expect(callOpus47({ messages: [], maxTokens: 100, client: mockClient }), bad)
          .rejects.toThrow(ModelRejectedError);
      } finally {
        delete process.env.ANTHROPIC_MODEL;
      }
      expect(mockClient.messages.create, bad).not.toHaveBeenCalled();
    }
  });

  it('accepts an explicit ANTHROPIC_MODEL that names a Claude model', async () => {
    for (const good of ['claude-sonnet-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4.7']) {
      process.env.ANTHROPIC_MODEL = good;
      const mockClient = { messages: { create: vi.fn().mockResolvedValue({ content: [], usage: {} }) } };
      try {
        await callOpus47({ messages: [], maxTokens: 100, client: mockClient });
        expect(mockClient.messages.create.mock.calls[0][0].model).toBe(good);
      } finally {
        delete process.env.ANTHROPIC_MODEL;
      }
    }
  });

  it('403 with "open-source models" message → ModelRejectedError (no retry)', async () => {
    // A provider's "open-source models only" rejection must be caught as a
    // ModelRejectedError (the old regex only matched "Free tier/forbidden/access").
    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(
          Object.assign(new Error('Only open-source models are supported'), { status: 403 }),
        ),
      },
    };
    await expect(callOpus47({ messages: [], maxTokens: 100, client: mockClient }))
      .rejects.toThrow(ModelRejectedError);
    expect(mockClient.messages.create).toHaveBeenCalledOnce(); // no retry on 403
  });

  describe('streaming auto-switch', () => {
    function makeStreamMock(events) {
      // Build async iterable yielding events in order
      return {
        async *[Symbol.asyncIterator]() {
          for (const e of events) yield e;
        },
      };
    }

    it('uses messages.create() when maxTokens < 8192 (no stream)', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'short' }], usage: {} }),
          stream: vi.fn(),
        },
      };
      await callOpus47({ messages: [], maxTokens: 4000, client: mockClient });
      expect(mockClient.messages.create).toHaveBeenCalledOnce();
      expect(mockClient.messages.stream).not.toHaveBeenCalled();
    });

    it('auto-switches to messages.stream() when maxTokens >= 8192', async () => {
      const events = [
        { type: 'message_start', message: { id: 'msg_1', model: 'claude-opus-4-7', role: 'assistant', usage: { input_tokens: 100 } } },
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hello ' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'world' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } },
        { type: 'message_stop' },
      ];
      const mockClient = {
        messages: {
          create: vi.fn(),
          stream: vi.fn().mockReturnValue(makeStreamMock(events)),
        },
      };
      const res = await callOpus47({ messages: [], maxTokens: 32000, client: mockClient });
      expect(mockClient.messages.stream).toHaveBeenCalledOnce();
      expect(mockClient.messages.create).not.toHaveBeenCalled();
      expect(res.content).toEqual([{ type: 'text', text: 'hello world' }]);
      expect(res.stop_reason).toBe('end_turn');
      expect(res.usage.output_tokens).toBe(5);
    });

    it('reconstructs tool_use blocks from streaming partial_json deltas', async () => {
      const events = [
        { type: 'message_start', message: { id: 'msg_2', model: 'claude-opus-4-7', role: 'assistant', usage: {} } },
        { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'spawn_subagent', input: {} } },
        { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"role":"cto",' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '"itemIds":["R-Q1-E-001"]}' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 10 } },
        { type: 'message_stop' },
      ];
      const mockClient = {
        messages: {
          create: vi.fn(),
          stream: vi.fn().mockReturnValue(makeStreamMock(events)),
        },
      };
      const res = await callOpus47({ messages: [], maxTokens: 16000, client: mockClient });
      expect(res.content).toEqual([
        { type: 'tool_use', id: 'tu_1', name: 'spawn_subagent', input: { role: 'cto', itemIds: ['R-Q1-E-001'] } },
      ]);
      expect(res.stop_reason).toBe('tool_use');
    });

    it('explicit stream:true forces streaming even below threshold', async () => {
      const events = [{ type: 'message_stop' }];
      const mockClient = {
        messages: {
          create: vi.fn(),
          stream: vi.fn().mockReturnValue(makeStreamMock(events)),
        },
      };
      await callOpus47({ messages: [], maxTokens: 100, client: mockClient, stream: true });
      expect(mockClient.messages.stream).toHaveBeenCalledOnce();
      expect(mockClient.messages.create).not.toHaveBeenCalled();
    });
  });

  describe('apiKey fallback resolution', () => {
    const ENV_KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_API_KEY'];
    const _saved = {};
    beforeEach(() => {
      for (const k of ENV_KEYS) { _saved[k] = process.env[k]; delete process.env[k]; }
    });
    afterEach(() => {
      for (const k of ENV_KEYS) {
        if (_saved[k] === undefined) delete process.env[k];
        else process.env[k] = _saved[k];
      }
    });

    it('side-mirrors ANTHROPIC_AUTH_TOKEN → ANTHROPIC_API_KEY when latter unset', async () => {
      process.env.ANTHROPIC_AUTH_TOKEN = 'sk-test-fallback';
      const mockClient = { messages: { create: vi.fn().mockResolvedValue({ content: [], usage: {} }) } };
      await callOpus47({ messages: [], maxTokens: 100, client: mockClient });
      expect(process.env.ANTHROPIC_API_KEY).toBe('sk-test-fallback');
    });

    it('does NOT overwrite existing ANTHROPIC_API_KEY', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-primary';
      process.env.ANTHROPIC_AUTH_TOKEN = 'sk-secondary';
      const mockClient = { messages: { create: vi.fn().mockResolvedValue({ content: [], usage: {} }) } };
      await callOpus47({ messages: [], maxTokens: 100, client: mockClient });
      expect(process.env.ANTHROPIC_API_KEY).toBe('sk-primary');
    });

    it('passes through to SDK without throwing when no env set + no client (SDK will error)', async () => {
      // Don't pre-throw — let SDK raise its own diagnostic error
      const mockClient = { messages: { create: vi.fn().mockResolvedValue({ content: [], usage: {} }) } };
      await expect(callOpus47({ messages: [], maxTokens: 100, client: mockClient })).resolves.toBeDefined();
    });
  });
});
