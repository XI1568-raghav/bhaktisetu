/**
 * pr-review — the reviewer that reviewed nothing for seven weeks.
 *
 * From 2026-08-14 every PR got "Anthropic API 404: " because the script called
 * a third-party gateway whose host had been retired and whose key was no longer
 * valid. PRs past GitHub's 20,000-line diff limit failed earlier still, on a
 * 406. The workflow exits 0 by design, so the check stayed green throughout.
 *
 * These tests pin what ends that: the script calls the Anthropic API and
 * nothing else, it says in the PR when it could not review (including when the
 * key is not set), and it reads oversized PRs through the per-file API.
 *
 * NOTHING HERE TOUCHES THE NETWORK. Every test injects a fake fetch.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  normalizeBase,
  modelCandidates,
  responseText,
  callModel,
  callClaudeCode,
  runCommand,
  describeAttempt,
  extractVerdict,
  filePriority,
  splitDiff,
  prepareDiff,
  buildUserPrompt,
  SYSTEM_PROMPT,
  MAX_DIFF_CHARS,
  fetchDiffFiles,
  formatComment,
  reviewPullRequest,
  DEFAULT_BASE_URL,
  DEFAULT_MODELS,
} from './pr-review.mjs';

function res(status, body, { json = true } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : text),
    json: async () => (json ? JSON.parse(text) : Promise.reject(new Error('not json'))),
  };
}

const reply = (text) => res(200, { content: [{ type: 'text', text }] });
const VERDICT = JSON.stringify({ verdict: 'PASS', summary: 'fine', items: [{ check: 'tests', status: 'PASS', reason: 'covered' }], blockingIssues: [] });

describe('no third-party provider — the 2026-10-04 removal', () => {
  const sources = ['./pr-review.mjs', '../../.github/workflows/ai-review.yml'].map((f) => [f, readFileSync(new URL(f, import.meta.url), 'utf8')]);

  it('names no gateway host, no gateway secret and no non-Claude model', () => {
    for (const [file, text] of sources) {
      expect(text, file).not.toMatch(/blackbox/i);
      expect(text, file).not.toMatch(/glm-?\d|kimi|deepseek|llama|mistral|nemotron|gpt-/i);
    }
  });

  it('defaults to the Anthropic API and to Claude models only', () => {
    expect(DEFAULT_BASE_URL).toBe('https://api.anthropic.com');
    expect(DEFAULT_MODELS.length).toBeGreaterThan(0);
    for (const m of DEFAULT_MODELS) expect(m).toMatch(/^claude-/);
  });
});

describe('normalizeBase', () => {
  it('falls back to the Anthropic API when nothing is configured', () => {
    expect(normalizeBase(undefined)).toBe(DEFAULT_BASE_URL);
    expect(normalizeBase('')).toBe(DEFAULT_BASE_URL);
    expect(normalizeBase('  ')).toBe(DEFAULT_BASE_URL);
  });

  it('drops a trailing slash and a trailing /v1, so the path is not doubled', () => {
    expect(normalizeBase('https://proxy.test/')).toBe('https://proxy.test');
    expect(normalizeBase('https://proxy.test/v1')).toBe('https://proxy.test');
    expect(normalizeBase('https://proxy.test/v1/')).toBe('https://proxy.test');
  });
});

describe('modelCandidates', () => {
  it('uses PR_REVIEW_MODELS when set, the default otherwise, de-duplicated', () => {
    expect(modelCandidates('b, a, b')).toEqual(['b', 'a']);
    expect(modelCandidates('')).toEqual(DEFAULT_MODELS);
    expect(modelCandidates(undefined)).toEqual(DEFAULT_MODELS);
  });
});

describe('responseText', () => {
  it('joins text blocks, skips non-text ones, and returns "" when there is none', () => {
    expect(responseText({ content: [{ type: 'thinking' }, { type: 'text', text: 'hi' }, { type: 'text', text: '!' }] })).toBe('hi!');
    expect(responseText({ error: 'nope' })).toBe('');
    expect(responseText(null)).toBe('');
  });
});

describe('callModel', () => {
  const args = { base: 'https://api.test', apiKey: 'k', model: 'claude-x', system: 'sys', user: 'u', maxTokens: 10 };

  it('posts a Messages API request with the key in x-api-key only', async () => {
    let seen;
    const fetchImpl = async (url, init) => { seen = { url: String(url), init }; return reply('hello'); };
    const out = await callModel({ ...args, fetchImpl });
    expect(out).toEqual({ ok: true, status: 200, detail: '', text: 'hello' });
    expect(seen.url).toBe('https://api.test/v1/messages');
    expect(seen.init.headers['x-api-key']).toBe('k');
    expect(seen.init.headers.authorization).toBeUndefined();
    expect(JSON.parse(seen.init.body)).toEqual({ model: 'claude-x', max_tokens: 10, system: 'sys', messages: [{ role: 'user', content: 'u' }] });
  });

  it('reports an HTTP failure with its status and a trimmed body', async () => {
    const fetchImpl = async () => res(401, 'invalid\n   x-api-key', { json: false });
    const out = await callModel({ ...args, fetchImpl });
    expect(out.ok).toBe(false);
    expect(out.status).toBe(401);
    expect(out.detail).toContain('invalid x-api-key');
  });

  it('does not treat a 200 with no assistant text as a review', async () => {
    const out = await callModel({ ...args, fetchImpl: async () => res(200, { status: 'ok' }) });
    expect(out).toEqual({ ok: false, status: 200, detail: 'no assistant text in response', text: '' });
  });

  it('survives a thrown fetch', async () => {
    const out = await callModel({ ...args, fetchImpl: async () => { throw new Error('ECONNRESET'); } });
    expect(out).toEqual({ ok: false, status: 0, detail: 'network error', text: '' });
  });
});

describe('callClaudeCode — the subscription path', () => {
  const args = { token: 'tok', model: 'claude-x', system: 'sys', user: 'the diff', env: { PATH: '/bin', ANTHROPIC_API_KEY: 'sk-api', OTHER: '1' } };
  const cli = (out) => {
    const calls = [];
    return { calls, runCli: async (c) => { calls.push(c); return out; } };
  };
  const ok = (result, extra = {}) => ({ code: 0, stdout: JSON.stringify({ type: 'result', is_error: false, result, ...extra }), stderr: '' });

  it('runs print mode with every tool disabled and the prompt on stdin', async () => {
    const { calls, runCli } = cli(ok('hello'));
    const out = await callClaudeCode({ ...args, runCli });
    expect(out).toEqual({ ok: true, status: 200, detail: '', text: 'hello' });
    const { command, args: argv, input } = calls[0];
    expect(command).toBe('claude');
    expect(argv.slice(0, 3)).toEqual(['-p', '--output-format', 'json']);
    // The diff is untrusted text: an empty tool list is what keeps an injected
    // instruction from doing anything but changing the printed verdict.
    expect(argv[argv.indexOf('--tools') + 1]).toBe('');
    expect(argv[argv.indexOf('--model') + 1]).toBe('claude-x');
    expect(argv[argv.indexOf('--system-prompt') + 1]).toBe('sys');
    expect(input).toBe('the diff');
    expect(argv).not.toContain('the diff');
  });

  it('gives the CLI the subscription token and withholds the API key', async () => {
    const { calls, runCli } = cli(ok('hello'));
    await callClaudeCode({ ...args, runCli });
    expect(calls[0].env.CLAUDE_CODE_OAUTH_TOKEN).toBe('tok');
    expect(calls[0].env).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(calls[0].env.OTHER).toBe('1');
    // The caller's env object is not mutated.
    expect(args.env.ANTHROPIC_API_KEY).toBe('sk-api');
  });

  it('reports the CLI\'s own error, e.g. an expired or missing login', async () => {
    const { runCli } = cli({ code: 1, stdout: JSON.stringify({ type: 'result', is_error: true, result: 'Not logged in · Please run /login' }), stderr: '' });
    const out = await callClaudeCode({ ...args, runCli });
    expect(out).toEqual({ ok: false, status: 0, detail: 'Claude Code CLI: Not logged in · Please run /login', text: '' });
  });

  it('says so when the CLI is not installed', async () => {
    const { runCli } = cli({ code: null, stdout: '', stderr: '', spawnError: 'ENOENT' });
    expect((await callClaudeCode({ ...args, runCli })).detail).toBe('Claude Code CLI is not installed on the runner');
  });

  it('handles a timeout, non-JSON output and an empty result', async () => {
    expect((await callClaudeCode({ ...args, runCli: cli({ code: null, stdout: '', stderr: '', timedOut: true }).runCli })).detail).toBe('timeout');
    expect((await callClaudeCode({ ...args, runCli: cli({ code: 2, stdout: 'Usage: claude', stderr: 'unknown\n option' }).runCli })).detail).toBe('Claude Code CLI exited 2 without JSON: unknown option');
    expect((await callClaudeCode({ ...args, runCli: cli(ok('')).runCli })).detail).toBe('Claude Code CLI: no result');
  });
});

describe('runCommand', () => {
  it('feeds stdin and collects stdout and the exit code', async () => {
    const out = await runCommand({ command: process.execPath, args: ['-e', 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{process.stdout.write(s.toUpperCase());process.exit(3)})'], input: 'abc', env: process.env, timeoutMs: 10_000 });
    expect(out).toEqual({ code: 3, stdout: 'ABC', stderr: '' });
  });

  it('resolves with ENOENT for a missing binary instead of throwing', async () => {
    const out = await runCommand({ command: 'definitely-not-a-real-binary-xyz', args: [], input: '', env: process.env, timeoutMs: 10_000 });
    expect(out.spawnError).toBe('ENOENT');
  });

  it('kills a command that outlives its timeout', async () => {
    const out = await runCommand({ command: process.execPath, args: ['-e', 'setTimeout(()=>{}, 60000)'], input: '', env: process.env, timeoutMs: 200 });
    expect(out.timedOut).toBe(true);
  });

  it('survives a child that exits without reading a large stdin', async () => {
    const out = await runCommand({ command: process.execPath, args: ['-e', 'process.exit(0)'], input: 'x'.repeat(2_000_000), env: process.env, timeoutMs: 10_000 });
    expect(out.code).toBe(0);
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

describe('buildUserPrompt — the model is told what it was not shown', () => {
  const chunk = (path, size) => ({ path, text: `diff --git a/${path} b/${path}\n${'x'.repeat(size)}\n` });

  it('lists every file and marks the ones past the budget — the 2026-10-04 false FAILs', () => {
    const files = [chunk('apps/web/lib/support-api.ts', 300), chunk('apps/web/app/page.tsx', 300), chunk('apps/web/__tests__/support.test.ts', 300), chunk('big.ts', 9000)];
    const diff = prepareDiff(files, 800);
    const prompt = buildUserPrompt({ prNumber: '7', title: 't', diff });
    expect(prompt).toContain('Files changed (4):');
    expect(prompt).toContain('- apps/web/lib/support-api.ts\n');
    expect(prompt).toContain('- apps/web/app/page.tsx\n');
    expect(prompt).toContain('- big.ts [contents not shown]');
    expect(prompt).toContain('- apps/web/__tests__/support.test.ts [contents not shown]');
    expect(prompt).toContain('2 of 4 files are marked as not shown. They exist and are part of this PR.');
  });

  it('marks a file cut mid-way differently from one not shown at all', () => {
    const prompt = buildUserPrompt({ prNumber: '7', title: 't', diff: prepareDiff([chunk('huge.ts', 5000)], 100) });
    expect(prompt).toContain('- huge.ts [only the start shown]');
  });

  it('says the whole diff is present when nothing was dropped', () => {
    const prompt = buildUserPrompt({ prNumber: '7', title: 't', diff: prepareDiff([chunk('a.ts', 10)], 1000) });
    expect(prompt).toContain('The whole diff is below.');
    expect(prompt).not.toContain('not shown');
  });

  it('the system prompt forbids inferring defects from files that were not shown', () => {
    expect(SYSTEM_PROMPT).toMatch(/Never report a file as missing/);
    expect(SYSTEM_PROMPT).toMatch(/judge test coverage from the file list/);
  });

  it('reads enough of a large PR to be useful', () => {
    expect(MAX_DIFF_CHARS).toBeGreaterThanOrEqual(400_000);
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

  it('names the model and the backend that produced the review', () => {
    const body = formatComment({ verdict: 'PASS', summary: 'ok', items: [], blockingIssues: [] }, { model: 'claude-x', backend: 'Claude subscription', diff });
    expect(body).toContain('`scripts/agents/pr-review.mjs` — `claude-x` (Claude subscription).');
    expect(body).toContain('Read all 2 files in the diff.');
  });

  it('says a review was partial and lists the files it did not read', () => {
    const body = formatComment({ verdict: 'PASS', summary: 'ok', items: [], blockingIssues: [] }, { model: 'claude-x', diff: { ...diff, totalChars: 50, omitted: ['docs/x.md'] } });
    expect(body).toContain('**Partial review:** read 10 of 50 diff characters. 1 of 2 files were not read');
    expect(body).toContain('- `docs/x.md`');
    expect(body).not.toContain('Read all');
  });

  it('lists every attempt when no model produced a verdict', () => {
    const body = formatComment(
      { verdict: 'UNVERIFIED', summary: 's', error: 'claude-x → 401 bad key', items: [], blockingIssues: [] },
      { attempts: [{ model: 'claude-x', status: 401, detail: 'bad | key' }, { model: 'claude-y', status: 0, detail: 'timeout' }], diff },
    );
    expect(body).toContain('| `claude-x` | 401 bad \\| key |');
    expect(body).toContain('| `claude-y` | timeout |');
    expect(body).toContain('no model answered');
  });

  it('does not double the full stop or the space when the error is a sentence with no status', () => {
    const error = 'claude-x → ' + describeAttempt({ status: 0, detail: 'Claude Code CLI: token is invalid.' });
    expect(error).toBe('claude-x → Claude Code CLI: token is invalid.');
    const body = formatComment({ verdict: 'UNVERIFIED', summary: 's', error, items: [], blockingIssues: [] }, { diff });
    expect(body).toContain('_AI review could not complete: claude-x → Claude Code CLI: token is invalid._');
    expect(describeAttempt({ status: 401, detail: 'bad key' })).toBe('401 bad key');
    expect(describeAttempt({ status: 404, detail: '' })).toBe('404');
  });

  it('keeps a pipe in a model-written reason from breaking the table', () => {
    const body = formatComment({ verdict: 'FAIL', summary: '', items: [{ check: 'tests', status: 'FAIL', reason: 'a | b\nc' }], blockingIssues: [] }, {});
    expect(body).toContain('| tests | FAIL | a \\| b c |');
  });
});

describe('reviewPullRequest — end to end against fakes', () => {
  /** `models` maps a model id to what the API answers for it. */
  function world(models) {
    const calls = [];
    const fetchImpl = async (url, init) => {
      const u = String(url);
      if (u.startsWith('https://api.github.com')) {
        if (init.headers.Accept.includes('diff')) return res(200, 'diff --git a/apps/api/src/a.ts b/apps/api/src/a.ts\n+1\n', { json: false });
        return res(200, { title: 'a change' });
      }
      const body = JSON.parse(init.body);
      calls.push({ url: u, body });
      const answer = models[body.model];
      return answer === undefined ? res(404, { error: { message: 'model not found' } }) : answer;
    };
    return { fetchImpl, calls };
  }
  const args = { apiKey: 'k', ghToken: 't', repo: 'o/r', prNumber: '7', log: () => {} };

  it('reviews with the default Claude model against the Anthropic API', async () => {
    const { fetchImpl, calls } = world({ [DEFAULT_MODELS[0]]: reply(VERDICT) });
    const out = await reviewPullRequest({ ...args, fetchImpl });
    expect(out.result.verdict).toBe('PASS');
    expect(out.meta.model).toBe(DEFAULT_MODELS[0]);
    expect(out.meta.backend).toBe('Anthropic API');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(calls[0].body.messages[0].content).toContain('diff --git a/apps/api/src/a.ts');
    expect(calls[0].body.system).toMatch(/Darshya project code reviewer/);
  });

  it('says no credential is set, in the PR, and calls no model', async () => {
    const { fetchImpl, calls } = world({});
    const runCli = async () => { throw new Error('must not be called'); };
    const out = await reviewPullRequest({ ...args, apiKey: undefined, fetchImpl, runCli });
    expect(out.result.verdict).toBe('UNVERIFIED');
    expect(out.result.error).toBe('neither the CLAUDE_CODE_OAUTH_TOKEN nor the ANTHROPIC_API_KEY repository secret is set');
    expect(calls).toHaveLength(0);
    expect(formatComment(out.result, out.meta)).toContain('CLAUDE_CODE_OAUTH_TOKEN');
  });

  it('uses the subscription when its token is set, and never calls the API — even with an API key present', async () => {
    const { fetchImpl, calls } = world({ [DEFAULT_MODELS[0]]: reply(VERDICT) });
    const cliCalls = [];
    const runCli = async (c) => { cliCalls.push(c); return { code: 0, stdout: JSON.stringify({ is_error: false, result: VERDICT }), stderr: '' }; };
    const out = await reviewPullRequest({ ...args, oauthToken: 'tok', fetchImpl, runCli });
    expect(out.result.verdict).toBe('PASS');
    expect(out.meta.backend).toBe('Claude subscription');
    expect(calls).toHaveLength(0);
    expect(cliCalls).toHaveLength(1);
    expect(cliCalls[0].input).toContain('diff --git a/apps/api/src/a.ts');
    expect(cliCalls[0].args).toContain(DEFAULT_MODELS[0]);
  });

  it('reports a failed subscription login in the PR instead of falling back to the paid API silently', async () => {
    const { fetchImpl, calls } = world({ [DEFAULT_MODELS[0]]: reply(VERDICT) });
    const runCli = async () => ({ code: 1, stdout: JSON.stringify({ is_error: true, result: 'Not logged in · Please run /login' }), stderr: '' });
    const out = await reviewPullRequest({ ...args, oauthToken: 'expired', fetchImpl, runCli });
    expect(out.result.verdict).toBe('UNVERIFIED');
    expect(out.result.error).toContain('Not logged in');
    expect(calls).toHaveLength(0);
  });

  it('tries the next configured model when one returns no verdict', async () => {
    const { fetchImpl, calls } = world({ 'claude-a': reply('I think it is fine.'), 'claude-b': reply(VERDICT) });
    const out = await reviewPullRequest({ ...args, fetchImpl, modelsEnv: 'claude-a, claude-b' });
    expect(out.result.verdict).toBe('PASS');
    expect(out.meta.model).toBe('claude-b');
    expect(calls.map((c) => c.body.model)).toEqual(['claude-a', 'claude-b']);
  });

  it('returns UNVERIFIED with every attempt when the API rejects the key', async () => {
    const { fetchImpl } = world({ 'claude-a': res(401, { error: { message: 'invalid x-api-key' } }), 'claude-b': res(401, { error: { message: 'invalid x-api-key' } }) });
    const out = await reviewPullRequest({ ...args, fetchImpl, modelsEnv: 'claude-a,claude-b' });
    expect(out.result.verdict).toBe('UNVERIFIED');
    expect(out.result.error).toMatch(/^claude-b → 401/);
    expect(out.meta.attempts.map((a) => `${a.model}:${a.status}`)).toEqual(['claude-a:401', 'claude-b:401']);
    expect(formatComment(out.result, out.meta)).toContain('What was tried');
  });

  it('honours a configured base URL instead of the default', async () => {
    const { fetchImpl, calls } = world({ [DEFAULT_MODELS[0]]: reply(VERDICT) });
    await reviewPullRequest({ ...args, fetchImpl, baseURL: 'https://proxy.test/v1/' });
    expect(calls[0].url).toBe('https://proxy.test/v1/messages');
  });
});
