import { describe, it, expect, vi } from 'vitest';
import {
  requestAiChat,
  isServerConversationId,
  AiChatUnavailableError,
  type AiChatEvent,
} from '../lib/ai-chat-client';

const enc = new TextEncoder();
const sse = (...events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');

function streamRes(chunks: (string | Error)[], delayMs = 0, status = 200): Response {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(c) {
      if (i >= chunks.length) return c.close();
      const ch = chunks[i++];
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      if (ch instanceof Error) return c.error(ch);
      c.enqueue(enc.encode(ch));
    },
  });
  return new Response(body, { status });
}

const base = { url: 'http://x/ai/chat', headers: {}, retryDelayMs: 1 };
const run = (fetchImpl: typeof fetch, extra: Record<string, unknown> = {}) => {
  const events: AiChatEvent[] = [];
  const p = requestAiChat({
    ...base,
    body: { message: 'hi', conversationId: 'conv_1_abc' },
    onEvent: (e) => events.push(e),
    fetchImpl,
    ...extra,
  });
  return { p, events };
};
const full = sse({ type: 'metadata', citations: [] }, { type: 'text', content: 'Om' }, { type: 'done', fullContent: 'Om' });

describe('requestAiChat', () => {
  it('only treats UUIDs as server conversation ids', () => {
    expect(isServerConversationId('conv_1_abc')).toBe(false);
    expect(isServerConversationId('3f2b8c1e-5d4a-4c7b-9a10-2f6e8d7c9b01')).toBe(true);
  });

  it('streams a normal answer with no fallback', async () => {
    const { p, events } = run(vi.fn(async () => streamRes([full])) as never);
    await expect(p).resolves.toEqual({ kind: 'ok', interrupted: false });
    expect(events.map((e) => e.type)).toEqual(['metadata', 'text', 'done']);
  });

  it('waits for a slow first token instead of falling back', async () => {
    const { p } = run(vi.fn(async () => streamRes([full], 300)) as never, { stallTimeoutMs: 1000 });
    await expect(p).resolves.toMatchObject({ kind: 'ok' });
  });

  it('handles CRLF framing and events split across chunks', async () => {
    const raw = full.replace(/\n/g, '\r\n');
    const { p, events } = run(vi.fn(async () => streamRes([raw.slice(0, 20), raw.slice(20)])) as never);
    await p;
    expect(events.filter((e) => e.type === 'text')).toHaveLength(1);
  });

  it('retries once after a 502 and succeeds', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response('bad', { status: 502 }))
      .mockResolvedValueOnce(streamRes([full]));
    await expect(run(f as never).p).resolves.toMatchObject({ kind: 'ok' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('retries without conversationId when the server rejects it (404)', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(streamRes([full]));
    await run(f as never).p;
    expect(JSON.parse(f.mock.calls[0][1].body).conversationId).toBe('conv_1_abc');
    expect(JSON.parse(f.mock.calls[1][1].body).conversationId).toBeUndefined();
  });

  it('throws unavailable only after two failures', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(run(f as never).p).rejects.toBeInstanceOf(AiChatUnavailableError);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('aborts a stalled stream after the stall timeout, then retries', async () => {
    const f = vi.fn((_u: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) =>
        init.signal!.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))),
      ),
    );
    await expect(run(f as never, { stallTimeoutMs: 30 }).p).rejects.toBeInstanceOf(AiChatUnavailableError);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('keeps partial text when the connection drops mid-answer (no fallback)', async () => {
    const part = sse({ type: 'metadata', citations: [] }, { type: 'text', content: 'Karma' });
    const f = vi.fn(async () => streamRes([part, new Error('reset')]));
    const { p, events } = run(f as never);
    await expect(p).resolves.toEqual({ kind: 'ok', interrupted: true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.type === 'text')).toBe(true);
  });

  it('returns the paywall on 402 without retrying', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ message: 'limit' }), { status: 402 }));
    await expect(run(f as never).p).resolves.toEqual({ kind: 'paywall', message: 'limit' });
    expect(f).toHaveBeenCalledTimes(1);
  });
});
