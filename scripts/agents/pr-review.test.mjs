/**
 * pr-review — the reviewer that reviewed nothing for seven weeks.
 *
 * From 2026-08-14 every PR got `Anthropic API 404: ` because the script named
 * one path and one model and the gateway had dropped the pair. PRs past
 * GitHub's 20,000-line diff limit failed earlier still, on a 406. The workflow
 * exits 0 by design, so the check stayed green throughout.
 *
 * These tests pin the two behaviours that end that: the script finds a route
 * that answers instead of assuming one, and it reads oversized PRs through the
 * per-file API. When nothing answers it must say what it tried.
 *
 * NOTHING HERE TOUCHES THE NETWORK. Every test injects a fake fetch.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeBase,
  modelCandidates,
  responseText,
  findRoutes,
  extractVerdict,
  filePriority,
  splitDiff,
  prepareDiff,
  fetchDiffFiles,
  formatComment,
  reviewPullRequest,
  ENDPOINTS,
  DEFAULT_MODELS,
} from './pr-review.mjs';

const BASE = 'https://gateway.test';

function res(status, body, { json = true } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : text),
    json: async () => (json ? JSON.parse(text) : Promise.reject(new Error('not json'))),
  };
}

const anthropicReply = (text) => res(200, { content: [{ type: 'text', text }] });
const openaiReply = (text) => res(200, { choices: [{ message: { content: text } }] });
const VERDICT = JSON.stringify({ verdict: 'PASS', summary: 'fine', items: [{ check: 'tests', status: 'PASS', reason: 'covered' }], blockingIssues: [] });

/** A gateway that answers only the given `path model` pairs. */
function gateway(working, { reply = VERDICT } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = String(url);
    if (!u.startsWith(BASE)) throw new Error(`unexpected url ${u}`);
    const path = u.slice(BASE.length);
    const body = JSON.parse(init.body);
    calls.push({ path, model: body.model, body });
    if (!working.includes(`${path} ${body.model}`)) return res(404, undefined);
    return path === '/v1/messages' ? anthropicReply(reply) : openaiReply(reply);
  };
  return { fetchImpl, calls };
}

describe('normalizeBase', () => {
  it('drops a trailing slash and a trailing /v1, so endpoint paths are not doubled', () => {
    expect(normalizeBase('https://gateway.test/')).toBe(BASE);
    expect(normalizeBase('https://gateway.test/v1')).toBe(BASE);
    expect(normalizeBase('https://gateway.test/v1/')).toBe(BASE);
    expect(normalizeBase(' https://gateway.test ')).toBe(BASE);
  });
});

describe('modelCandidates', () => {
  it('puts PR_REVIEW_MODELS first and de-duplicates', () => {
    expect(modelCandidates('b, a', ['a', 'c'])).toEqual(['b', 'a', 'c']);
    expect(modelCandidates('', ['a'])).toEqual(['a']);
    expect(modelCandidates(undefined, ['a'])).toEqual(['a']);
  });
});

describe('responseText', () => {
  it('reads both envelopes and returns "" when there is no assistant text', () => {
    expect(responseText('anthropic', { content: [{ type: 'thinking' }, { type: 'text', text: 'hi' }] })).toBe('hi');
    expect(responseText('openai', { choices: [{ message: { content: 'hi' } }] })).toBe('hi');
    expect(responseText('openai', { choices: [{ message: { content: [{ type: 'text', text: 'hi' }] } }] })).toBe('hi');
    expect(responseText('anthropic', { error: 'nope' })).toBe('');
    expect(responseText('openai', null)).toBe('');
  });
});

describe('findRoutes', () => {
  it('skips a dead model and uses the next one — the 2026-08-14 failure', async () => {
    const { fetchImpl } = gateway(['/v1/messages m2']);
    const { routes, attempts } = await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1', 'm2'] });
    expect(routes).toEqual([{ endpoint: ENDPOINTS[0], model: 'm2' }]);
    expect(attempts.map((a) => `${a.model}:${a.status}`)).toEqual(['m1:404', 'm2:200']);
  });

  it('moves to the next endpoint when the path itself is gone', async () => {
    const { fetchImpl, calls } = gateway(['/chat/completions m3']);
    const { routes } = await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1', 'm2', 'm3'] });
    expect(routes).toEqual([{ endpoint: ENDPOINTS[1], model: 'm3' }]);
    // An empty 404 cannot be told apart from a dropped model, so every model
    // is tried on a path before it is abandoned.
    expect(calls.filter((c) => c.path === '/v1/messages').map((c) => c.model)).toEqual(['m1', 'm2', 'm3']);
  });

  it('reaches a live model that sits behind several dropped ones on the same path', async () => {
    const { fetchImpl } = gateway(['/v1/messages m5']);
    const { routes } = await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1', 'm2', 'm3', 'm4', 'm5'] });
    expect(routes).toEqual([{ endpoint: ENDPOINTS[0], model: 'm5' }]);
  });

  it('stops at the first endpoint that answers and at the wanted number of routes', async () => {
    const { fetchImpl, calls } = gateway(['/v1/messages m1', '/v1/messages m2', '/v1/messages m3', '/chat/completions m1']);
    const { routes } = await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1', 'm2', 'm3'], wanted: 2 });
    expect(routes.map((r) => r.model)).toEqual(['m1', 'm2']);
    expect(calls.some((c) => c.path === '/chat/completions')).toBe(false);
    expect(calls).toHaveLength(2);
  });

  it('sends the chat-completions envelope on a chat-completions path', async () => {
    const { fetchImpl, calls } = gateway(['/chat/completions m1']);
    await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1'] });
    const openaiCall = calls.find((c) => c.path === '/chat/completions');
    expect(openaiCall.body.messages[0].role).toBe('system');
    expect(openaiCall.body.system).toBeUndefined();
    const anthropicCall = calls.find((c) => c.path === '/v1/messages');
    expect(typeof anthropicCall.body.system).toBe('string');
  });

  it('does not treat a 200 with no assistant text as a working route', async () => {
    const fetchImpl = async () => res(200, { status: 'ok' });
    const { routes, attempts } = await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1'] });
    expect(routes).toEqual([]);
    expect(attempts[0].detail).toMatch(/no assistant text/);
  });

  it('survives a thrown fetch and records it', async () => {
    const fetchImpl = async () => { throw new Error('ECONNRESET'); };
    const { routes, attempts } = await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1'], endpoints: [ENDPOINTS[0]] });
    expect(routes).toEqual([]);
    expect(attempts).toEqual([{ path: '/v1/messages', model: 'm1', status: 0, detail: 'network error' }]);
  });

  it('stops when the time budget is spent', async () => {
    let t = 0;
    const { fetchImpl } = gateway([]);
    const { attempts } = await findRoutes({ fetchImpl, base: BASE, apiKey: 'k', models: ['m1', 'm2', 'm3'], budgetMs: 10, now: () => (t += 8) });
    expect(attempts.at(-1).detail).toBe('probe time budget exhausted');
    expect(attempts.length).toBeLessThan(9);
  });
});

describe('extractVerdict', () => {
  it('accepts a bare object and one wrapped in a fence or prose', () => {
    expect(extractVerdict(VERDICT).ok).toBe(true);
    expect(extractVerdict('```json\n' + VERDICT + '\n```').result.verdict).toBe('PASS');
    expect(extractVerdict('Here you go: ' + VERDICT + ' done').result.summary).toBe('fine');
  });

  it('rejects prose, broken JSON, and JSON with no PASS/FAIL verdict', () => {
    expect(extractVerdict('looks good to me')).toEqual({ ok: false, error: 'no JSON in model response' });
    expect(extractVerdict('{"verdict": "PASS",')).toEqual({ ok: false, error: 'no JSON in model response' });
    expect(extractVerdict('{"verdict": PASS}').error).toBe('malformed JSON in model response');
    expect(extractVerdict('{"verdict": "MAYBE"}').error).toBe('JSON without a PASS/FAIL verdict');
  });

  it('normalises missing arrays so the comment formatter cannot throw', () => {
    const { result } = extractVerdict('{"verdict":"FAIL"}');
    expect(result).toEqual({ verdict: 'FAIL', summary: '', items: [], blockingIssues: [] });
  });
});

describe('diff preparation', () => {
  const chunk = (path, size) => ({ path, text: `diff --git a/${path} b/${path}\n${'x'.repeat(size)}\n` });

  it('ranks migrations and workflows first, lockfiles last', () => {
    expect(filePriority('apps/api/prisma/migrations/1_x/migration.sql')).toBe(0);
    expect(filePriority('.github/workflows/ci.yml')).toBe(0);
    expect(filePriority('apps/api/src/routes/store.ts')).toBe(1);
    expect(filePriority('apps/web/__tests__/a.test.tsx')).toBe(2);
    expect(filePriority('docs/audit/x.md')).toBe(3);
    expect(filePriority('pnpm-lock.yaml')).toBe(4);
  });

  it('splits a unified diff on file boundaries', () => {
    const files = splitDiff('diff --git a/a.ts b/a.ts\n+1\ndiff --git a/old.ts b/new.ts\n+2\n');
    expect(files.map((f) => f.path)).toEqual(['a.ts', 'new.ts']);
    expect(files[1].text).toBe('diff --git a/old.ts b/new.ts\n+2\n');
  });

  it('drops the least risky files first and names every file it dropped', () => {
    const files = [chunk('pnpm-lock.yaml', 500), chunk('docs/x.md', 300), chunk('apps/api/src/a.ts', 300), chunk('apps/api/prisma/migrations/1/migration.sql', 300)];
    const out = prepareDiff(files, 800);
    expect(out.text).toContain('migration.sql');
    expect(out.text).toContain('apps/api/src/a.ts');
    expect(out.omitted).toEqual(['docs/x.md', 'pnpm-lock.yaml']);
    expect(out.fileCount).toBe(4);
    expect(out.totalChars).toBe(files.reduce((n, f) => n + f.text.length, 0));
  });

  it('reads everything and omits nothing when the diff fits', () => {
    const out = prepareDiff([chunk('a.ts', 10), chunk('b.ts', 10)], 1000);
    expect(out.omitted).toEqual([]);
  });

  it('takes the head of a single file larger than the whole budget, and says so', () => {
    const out = prepareDiff([chunk('big.ts', 5000)], 100);
    expect(out.text.length).toBe(100);
    expect(out.omitted).toEqual(['big.ts (truncated)']);
  });
});

describe('fetchDiffFiles', () => {
  it('falls back to the per-file API on a 406 — the oversized-PR failure', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ filename: `f${i}.ts`, status: 'modified', patch: '@@ -1 +1 @@\n-a\n+b' }));
    const page2 = [{ filename: 'img.png', status: 'added' }, { filename: 'new.ts', previous_filename: 'old.ts', status: 'renamed', patch: '@@' }];
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push(`${init.headers.Accept} ${String(url).replace('https://api.github.com', '')}`);
      if (init.headers.Accept.includes('diff')) return res(406, { message: 'Sorry, the diff exceeded the maximum number of lines (20000)' });
      return res(200, /[?&]page=1$/.test(String(url)) ? page1 : page2);
    };
    const { files, source } = await fetchDiffFiles({ fetchImpl, ghToken: 't', repo: 'o/r', prNumber: '7' });
    expect(source).toBe('files');
    expect(files).toHaveLength(102);
    expect(files[0].text).toBe('diff --git a/f0.ts b/f0.ts\n@@ -1 +1 @@\n-a\n+b\n');
    expect(files[100].text).toMatch(/no text patch/);
    expect(files[101].text.startsWith('diff --git a/old.ts b/new.ts\n')).toBe(true);
    expect(seen.filter((s) => s.includes('/files?')).length).toBe(2);
  });

  it('uses the whole-PR diff when GitHub serves it', async () => {
    const fetchImpl = async () => res(200, 'diff --git a/a.ts b/a.ts\n+1\n', { json: false });
    const { files, source } = await fetchDiffFiles({ fetchImpl, ghToken: 't', repo: 'o/r', prNumber: '7' });
    expect(source).toBe('diff');
    expect(files.map((f) => f.path)).toEqual(['a.ts']);
  });

  it('throws on any other GitHub failure instead of reviewing an empty diff', async () => {
    const fetchImpl = async () => res(403, { message: 'rate limited' });
    await expect(fetchDiffFiles({ fetchImpl, ghToken: 't', repo: 'o/r', prNumber: '7' })).rejects.toThrow(/403/);
  });
});

describe('formatComment', () => {
  const diff = { text: 'x'.repeat(10), totalChars: 10, fileCount: 2, omitted: [] };

  it('names the model and endpoint that produced the review', () => {
    const body = formatComment({ verdict: 'PASS', summary: 'ok', items: [], blockingIssues: [] }, { route: { endpoint: ENDPOINTS[1], model: 'm9' }, diff });
    expect(body).toContain('`m9` via `/chat/completions`');
    expect(body).toContain('Read all 2 files in the diff.');
  });

  it('says a review was partial and lists the files it did not read', () => {
    const body = formatComment({ verdict: 'PASS', summary: 'ok', items: [], blockingIssues: [] }, { route: { endpoint: ENDPOINTS[0], model: 'm' }, diff: { ...diff, totalChars: 50, omitted: ['docs/x.md'] } });
    expect(body).toContain('**Partial review:** read 10 of 50 diff characters. 1 of 2 files were not read');
    expect(body).toContain('- `docs/x.md`');
    expect(body).not.toContain('Read all');
  });

  it('lists every attempt when no route worked', () => {
    const body = formatComment(
      { verdict: 'UNVERIFIED', summary: 's', error: 'no working model route', items: [], blockingIssues: [] },
      { attempts: [{ path: '/v1/messages', model: 'm1', status: 404, detail: '' }, { path: '/chat/completions', model: 'm1', status: 401, detail: 'bad | key' }], diff },
    );
    expect(body).toContain('| `/v1/messages` | `m1` | 404 |');
    expect(body).toContain('| `/chat/completions` | `m1` | 401 bad \\| key |');
    expect(body).toContain('no working model route');
  });

  it('keeps a pipe in a model-written reason from breaking the table', () => {
    const body = formatComment({ verdict: 'FAIL', summary: '', items: [{ check: 'tests', status: 'FAIL', reason: 'a | b\nc' }], blockingIssues: [] }, {});
    expect(body).toContain('| tests | FAIL | a \\| b c |');
  });
});

describe('reviewPullRequest — end to end against fakes', () => {
  function world({ working, reply = VERDICT, replies } = {}) {
    const gw = gateway(working ?? [], { reply });
    let reviewCall = 0;
    const fetchImpl = async (url, init) => {
      const u = String(url);
      if (u.startsWith('https://api.github.com')) {
        if (init.headers.Accept.includes('diff')) return res(200, 'diff --git a/apps/api/src/a.ts b/apps/api/src/a.ts\n+1\n', { json: false });
        return res(200, { title: 'a change' });
      }
      const body = JSON.parse(init.body);
      if (replies && body.max_tokens > 16 && gw && (working ?? []).includes(`${u.slice(BASE.length)} ${body.model}`)) {
        gw.calls.push({ path: u.slice(BASE.length), model: body.model, body });
        return anthropicReply(replies[reviewCall++]);
      }
      return gw.fetchImpl(url, init);
    };
    return { fetchImpl, calls: gw.calls };
  }
  const args = { apiKey: 'k', baseURL: `${BASE}/v1/`, ghToken: 't', repo: 'o/r', prNumber: '7', log: () => {} };

  it('reviews with the first model that answers and reports which one', async () => {
    const { fetchImpl, calls } = world({ working: ['/v1/messages blackboxai/deepseek/deepseek-v4-pro'] });
    const out = await reviewPullRequest({ ...args, fetchImpl });
    expect(out.result.verdict).toBe('PASS');
    expect(out.meta.route.model).toBe('blackboxai/deepseek/deepseek-v4-pro');
    const review = calls.find((c) => c.body.max_tokens > 16);
    expect(review.body.messages[0].content).toContain('diff --git a/apps/api/src/a.ts');
    expect(review.body.system).toMatch(/Darshya project code reviewer/);
  });

  it('falls through to the next working model when the first returns no verdict', async () => {
    const { fetchImpl } = world({
      working: ['/v1/messages blackboxai/z-ai/glm-5.2', '/v1/messages z-ai/glm-5.2'],
      replies: ['I think it is fine.', VERDICT],
    });
    const out = await reviewPullRequest({ ...args, fetchImpl });
    expect(out.result.verdict).toBe('PASS');
    expect(out.meta.route.model).toBe('z-ai/glm-5.2');
  });

  it('returns UNVERIFIED with the full attempt log when the gateway answers nothing', async () => {
    const { fetchImpl } = world({ working: [] });
    const out = await reviewPullRequest({ ...args, fetchImpl });
    expect(out.result.verdict).toBe('UNVERIFIED');
    expect(out.result.error).toBe('no working model route');
    // Every default model on every endpoint, and nothing skipped.
    expect(out.meta.attempts).toHaveLength(DEFAULT_MODELS.length * ENDPOINTS.length);
    expect(new Set(out.meta.attempts.map((a) => a.path))).toEqual(new Set(ENDPOINTS.map((e) => e.path)));
    expect(out.meta.attempts.every((a) => a.status === 404)).toBe(true);
    expect(formatComment(out.result, out.meta)).toContain('What was tried');
  });

  it('honours PR_REVIEW_MODELS ahead of the defaults', async () => {
    const { fetchImpl } = world({ working: ['/v1/messages custom/model'] });
    const out = await reviewPullRequest({ ...args, fetchImpl, modelsEnv: 'custom/model' });
    expect(out.meta.route.model).toBe('custom/model');
  });
});
