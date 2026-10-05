import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Customer test 2026-10-06 — /astrology/chat answered every question from the
 * canned keyword fallback (`source: fallback-keyword`) and /ai/chat returned a
 * 500, while voice-pandit's health said the LLM was "live". The provider call
 * threw, a bare `catch {}` swallowed it, and nothing said why. Now: failures are
 * logged with provider + status (never the key), a second Groq model and then
 * Anthropic are tried before giving up, and a probe reports the real state.
 */
const KEY = 'gsk_test_SECRET_VALUE';

function groqOk(text: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
}
function groqErr(status: number, code: string) {
  return new Response(JSON.stringify({ error: { message: `no (${code})`, code, type: 'x' } }), { status });
}

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ['GROQ_API_KEY', 'ANTHROPIC_API_KEY']) vi.stubEnv(k, '');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./claude.js');
}

let fetchMock: ReturnType<typeof vi.fn>;
let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  errSpy.mockRestore();
});

describe('generateText with Groq', () => {
  it('returns the model text when Groq answers', async () => {
    fetchMock.mockResolvedValueOnce(groqOk('Namaste'));
    const { generateText } = await load({ GROQ_API_KEY: KEY });
    expect(await generateText({ systemPrompt: 's', userMessage: 'u' })).toBe('Namaste');
  });

  it('retries once with the other Groq model when the first is refused', async () => {
    fetchMock.mockResolvedValueOnce(groqErr(400, 'model_decommissioned')).mockResolvedValueOnce(groqOk('Second model'));
    const { generateText, MODELS } = await load({ GROQ_API_KEY: KEY });
    expect(await generateText({ systemPrompt: 's', userMessage: 'u', model: MODELS.HAIKU })).toBe('Second model');
    const models = fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)).model);
    expect(models).toHaveLength(2);
    expect(new Set(models).size).toBe(2);
  });

  it('does not retry a bad key (401) on the other model, and says why in the log', async () => {
    fetchMock.mockResolvedValue(groqErr(401, 'invalid_api_key'));
    const { generateText } = await load({ GROQ_API_KEY: KEY });
    await expect(generateText({ systemPrompt: 's', userMessage: 'u' })).rejects.toThrow(/401/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const logged = errSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toMatch(/groq/i);
    expect(logged).toMatch(/401/);
    expect(logged).not.toContain(KEY);
  });

  it('never puts the key in a thrown error', async () => {
    fetchMock.mockResolvedValue(groqErr(500, 'oops'));
    const { generateText } = await load({ GROQ_API_KEY: KEY });
    const e = await generateText({ systemPrompt: 's', userMessage: 'u' }).catch((x) => x as Error);
    expect(String((e as Error).message)).not.toContain(KEY);
  });
});

describe('streamChat with Groq', () => {
  it('retries the other model when the first stream request is refused', async () => {
    const sse = 'data: {"choices":[{"delta":{"content":"Om"}}]}\n\ndata: [DONE]\n\n';
    fetchMock.mockResolvedValueOnce(groqErr(404, 'model_not_found')).mockResolvedValueOnce(new Response(sse, { status: 200 }));
    const { streamChat } = await load({ GROQ_API_KEY: KEY });
    const stream = await streamChat({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] });
    let text = '';
    for await (const ev of stream as AsyncIterable<{ type: string; delta?: { text?: string } }>) {
      if (ev.type === 'content_block_delta') text += ev.delta?.text ?? '';
    }
    expect(text).toBe('Om');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('probeAiProvider', () => {
  it('reports ok when a one-token call succeeds', async () => {
    fetchMock.mockResolvedValueOnce(groqOk('ok'));
    const { probeAiProvider } = await load({ GROQ_API_KEY: KEY });
    expect(await probeAiProvider()).toMatchObject({ provider: 'groq', ok: true });
  });

  it('reports the status and code of a failure without the key', async () => {
    fetchMock.mockResolvedValue(groqErr(401, 'invalid_api_key'));
    const { probeAiProvider } = await load({ GROQ_API_KEY: KEY });
    const p = await probeAiProvider();
    expect(p).toMatchObject({ provider: 'groq', ok: false, status: 401, code: 'invalid_api_key' });
    expect(JSON.stringify(p)).not.toContain(KEY);
  });

  it('reports demo mode when no provider key is set', async () => {
    const { probeAiProvider } = await load({});
    expect(await probeAiProvider()).toMatchObject({ provider: 'none', ok: false });
  });
});
