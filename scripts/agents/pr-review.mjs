#!/usr/bin/env node
// pr-review — AI code review on PRs (P4.21). Fetches the PR diff, asks Claude
// to review it against the darshya-code-review checklist, and posts the verdict
// + findings as a PR comment.
//
// HISTORY THAT SHAPES THIS FILE. Until 2026-10-04 it called a third-party
// gateway with one hard-coded path and model. The gateway retired that host and
// the key was no longer valid on its replacement, so from 2026-08-14 every PR
// got "Anthropic API 404: " and nothing was reviewed — while the check stayed
// green, because this script exits 0 by design. A second failure sat behind the
// first: any PR over GitHub's 20,000-line / 300-file diff limit got a 406 from
// the whole-PR diff endpoint and was never read either.
//
// So this file now: talks to the Anthropic API only, names no third-party host
// or model, says exactly what it tried when a call fails (including when the
// key is simply not set), and reads oversized PRs through the per-file API.
//
// Self-contained — does NOT depend on roadmap/_anthropic-client.mjs.
//
// TWO WAYS TO AUTHENTICATE, checked in this order:
//   1. CLAUDE_CODE_OAUTH_TOKEN — a Claude subscription. The review runs through
//      the Claude Code CLI in print mode with every tool disabled, and counts
//      against the subscription's usage instead of being billed per token.
//      The token comes from `claude setup-token`.
//   2. ANTHROPIC_API_KEY — the Anthropic API, billed per token.
// With neither set the script reviews nothing and says so in the PR.
//
// Env:
//   CLAUDE_CODE_OAUTH_TOKEN  subscription token (repo secret) — preferred
//   ANTHROPIC_API_KEY      Anthropic API key (repo secret) — alternative
//   ANTHROPIC_BASE_URL     optional, API path only; defaults to https://api.anthropic.com
//   PR_REVIEW_MODELS       optional, comma-separated Claude model ids, tried in order
//   GH_TOKEN / GITHUB_TOKEN  for diff + comment
//   PR_NUMBER              the PR to review
//   GH_REPOSITORY          owner/repo
//
// Usage in CI:  node scripts/agents/pr-review.mjs
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const DEFAULT_BASE_URL = 'https://api.anthropic.com';
/** The cheapest current Claude model: a checklist review over a diff does not need more. */
export const DEFAULT_MODELS = ['claude-haiku-4-5-20251001'];
const MESSAGES_PATH = '/v1/messages';

export const MAX_DIFF_CHARS = 120_000;
const REVIEW_TIMEOUT_MS = 150_000;

// ---- The darshya-code-review checklist as the system prompt ----
// Mirrors the darshya-code-review skill so CI review == local review.
export const SYSTEM_PROMPT = `You are the Darshya project code reviewer. Review the PR diff against this checklist. Return STRICT JSON only — no prose, no markdown fences.

Checklist (each item → PASS | FAIL | N/A with a one-line reason):
1. secret-egress: no committed secrets (env keys, tokens, DB URLs, passwords). .env.example placeholders only.
2. render-impact: if apps/web/** or apps/api/** changed, note deploy impact. The API service auto-deploys on every push to main and never runs migrations; web deploys only when dispatched. runtime='edge' is harmless on Render (do NOT flag). apps/web/middleware.ts is non-issue on Render (do NOT flag).
3. prisma-footguns: new migration must NOT contain CREATE INDEX CONCURRENTLY (must be applied via $executeRawUnsafe outside migrate deploy). uuid/text backfill cast needs ::uuid. Migration must use DIRECT_URL not pooled.
4. free-tier-cost: new .github/workflows/*.yml — workflow_dispatch-only (fine), on: schedule: (compute monthly minutes, FAIL if >5% of GH Actions budget), on: push: without paths filter (flag).
5. commit-msg: Conventional Commits type(scope): subject. Claude-authored commits end with a Co-Authored-By: Claude <model> <noreply@anthropic.com> trailer; any model name is acceptable.
6. tests: coverage for the change. PRE-EXISTING known failure canada-pandit-prospector.test.ts (and nri-fb-ads-pack.test.mjs x3, twitter-thread-pack.test.mjs x2) are NOT regressions — do not flag them.

Return JSON:
{
  "verdict": "PASS" | "FAIL",
  "items": [
    {"check": "secret-egress", "status": "PASS|FAIL|N/A", "reason": "..."}
  ],
  "blockingIssues": [{"file": "...", "line": "...", "issue": "...", "fix": "..."}],
  "summary": "one line"
}
A FAIL verdict means the PR has a real problem that should block or warn before merge.`;

// ---- Anthropic API ----

/** Unset → the Anthropic API. A configured value may carry a trailing slash or `/v1`. */
export function normalizeBase(url) {
  const trimmed = String(url ?? '').trim().replace(/\/+$/, '').replace(/\/v1$/, '');
  return trimmed || DEFAULT_BASE_URL;
}

/** PR_REVIEW_MODELS if set, otherwise the default. De-duplicated, order kept. */
export function modelCandidates(envList, defaults = DEFAULT_MODELS) {
  const fromEnv = String(envList ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set(fromEnv.length ? fromEnv : defaults)];
}

/** Pull the assistant text out of a Messages API response. '' when there is none. */
export function responseText(data) {
  return (data?.content ?? []).map((c) => (typeof c?.text === 'string' ? c.text : '')).join('');
}

/**
 * One Messages API request. Never throws: a network failure or timeout comes
 * back as `{ ok: false, status: 0 }` so the caller can try the next model and
 * report all of them.
 */
export async function callModel({ fetchImpl = fetch, base, apiKey, model, system, user, maxTokens, timeoutMs = REVIEW_TIMEOUT_MS }) {
  let r;
  try {
    r = await fetchImpl(`${base}${MESSAGES_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    return { ok: false, status: 0, detail: e?.name === 'TimeoutError' ? 'timeout' : 'network error', text: '' };
  }
  if (!r.ok) {
    const detail = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
    return { ok: false, status: r.status, detail, text: '' };
  }
  const data = await r.json().catch(() => null);
  const text = responseText(data);
  // A 200 with no assistant text is not a review — an HTML page or an error
  // envelope both look like this.
  if (!text) return { ok: false, status: r.status, detail: 'no assistant text in response', text: '' };
  return { ok: true, status: r.status, detail: '', text };
}

// ---- Claude Code CLI (subscription) ----

/** Run a command, feed it stdin, collect its output. Never rejects. */
export function runCommand({ command, args, input, env, timeoutMs }) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: null, stdout: '', stderr: String(e?.message ?? e), spawnError: e?.code ?? 'spawn failed' });
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const done = (r) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      done({ code: null, stdout, stderr, timedOut: true });
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => done({ code: null, stdout, stderr, spawnError: e?.code ?? 'spawn failed' }));
    child.on('close', (code) => done({ code, stdout, stderr }));
    // The CLI can exit before reading all of a large prompt; that is reported
    // through its exit, not by crashing this process on EPIPE.
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

/**
 * One review through the Claude Code CLI in print mode. Same return shape as
 * callModel, so the caller treats both backends alike.
 *
 * `--tools ""` is load-bearing, not tidiness: the diff is attacker-controlled
 * text, and with no tools a prompt injection inside it can change the verdict
 * it prints and nothing else — it cannot read the runner, the token or the repo.
 */
export async function callClaudeCode({ runCli = runCommand, command = 'claude', token, model, system, user, timeoutMs = REVIEW_TIMEOUT_MS, env = process.env }) {
  // Drop ANTHROPIC_API_KEY for the child: with both present the CLI would bill
  // the API key, which is exactly what choosing the subscription is meant to avoid.
  const { ANTHROPIC_API_KEY: _dropped, ...rest } = env;
  const res = await runCli({
    command,
    args: ['-p', '--output-format', 'json', '--model', model, '--system-prompt', system, '--tools', '', '--no-session-persistence'],
    input: user,
    env: { ...rest, CLAUDE_CODE_OAUTH_TOKEN: token },
    timeoutMs,
  });
  if (res.spawnError) {
    return { ok: false, status: 0, detail: res.spawnError === 'ENOENT' ? 'Claude Code CLI is not installed on the runner' : `could not start the Claude Code CLI (${res.spawnError})`, text: '' };
  }
  if (res.timedOut) return { ok: false, status: 0, detail: 'timeout', text: '' };
  let data = null;
  try {
    data = JSON.parse(res.stdout);
  } catch {}
  if (!data || typeof data !== 'object') {
    const tail = (res.stderr || res.stdout || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    return { ok: false, status: 0, detail: `Claude Code CLI exited ${res.code} without JSON${tail ? `: ${tail}` : ''}`, text: '' };
  }
  const text = typeof data.result === 'string' ? data.result : '';
  if (data.is_error || !text) {
    return { ok: false, status: 0, detail: `Claude Code CLI: ${(text || 'no result').replace(/\s+/g, ' ').slice(0, 160)}`, text: '' };
  }
  return { ok: true, status: 200, detail: '', text };
}

// ---- Verdict ----

const VERDICTS = new Set(['PASS', 'FAIL']);

/** Parse the model's reply. Returns `{ ok, result }` or `{ ok: false, error }`. */
export function extractVerdict(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: 'no JSON in model response' };
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, error: 'malformed JSON in model response' };
  }
  if (!parsed || typeof parsed !== 'object' || !VERDICTS.has(parsed.verdict)) {
    return { ok: false, error: 'JSON without a PASS/FAIL verdict' };
  }
  return {
    ok: true,
    result: {
      verdict: parsed.verdict,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      blockingIssues: Array.isArray(parsed.blockingIssues) ? parsed.blockingIssues : [],
    },
  };
}

// ---- Diff ----

/** Lower = reviewed first, so truncation drops the least risky files. */
export function filePriority(path) {
  if (/(^|\/)prisma\/|\/migrations\/|^\.github\/|render\.yaml$|Dockerfile$/.test(path)) return 0;
  if (/(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$|^graft\//.test(path)) return 4;
  if (/\.(md|mdx|txt)$|^docs\//.test(path)) return 3;
  if (/\.test\.|\.spec\.|__tests__\//.test(path)) return 2;
  return 1;
}

/** Split a unified diff into per-file chunks keyed by the b/ path. */
export function splitDiff(diff) {
  return diff
    .split(/^(?=diff --git )/m)
    .filter((chunk) => chunk.startsWith('diff --git '))
    .map((chunk) => {
      const m = /^diff --git a\/.* b\/(.*)$/m.exec(chunk);
      return { path: m ? m[1] : '', text: chunk };
    });
}

/**
 * Order files by risk and cut to the character budget on a file boundary where
 * possible. Reports what was left out so the comment can say so — a review that
 * silently read a third of the diff is worse than no review.
 */
export function prepareDiff(files, maxChars = MAX_DIFF_CHARS) {
  const ordered = files
    .map((f, i) => ({ ...f, i, p: filePriority(f.path) }))
    .sort((a, b) => a.p - b.p || a.i - b.i);
  const totalChars = ordered.reduce((n, f) => n + f.text.length, 0);
  let text = '';
  const omitted = [];
  for (const f of ordered) {
    if (text.length + f.text.length <= maxChars) {
      text += f.text;
    } else if (!text) {
      // A single file larger than the whole budget: take its head rather than nothing.
      text = f.text.slice(0, maxChars);
      omitted.push(`${f.path} (truncated)`);
    } else {
      omitted.push(f.path);
    }
  }
  return { text, totalChars, fileCount: files.length, omitted };
}

async function gh(fetchImpl, ghToken, path, { accept = 'application/vnd.github+json', method = 'GET', body } = {}) {
  const r = await fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'darshya-pr-review/2.0',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return r;
}

/**
 * The PR's files as diff chunks. The whole-PR diff endpoint answers 406 past
 * 20,000 lines or 300 files; the per-file endpoint pages up to 3,000 files, so
 * fall back to it instead of leaving large PRs unreviewed.
 */
export async function fetchDiffFiles({ fetchImpl = fetch, ghToken, repo, prNumber }) {
  const whole = await gh(fetchImpl, ghToken, `/repos/${repo}/pulls/${prNumber}`, { accept: 'application/vnd.github.v3.diff' });
  if (whole.ok) return { files: splitDiff(await whole.text()), source: 'diff' };
  if (whole.status !== 406) {
    throw new Error(`GitHub diff for PR ${prNumber} → ${whole.status}: ${(await whole.text().catch(() => '')).slice(0, 200)}`);
  }
  const files = [];
  for (let page = 1; page <= 30; page += 1) {
    const r = await gh(fetchImpl, ghToken, `/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`);
    if (!r.ok) throw new Error(`GitHub files for PR ${prNumber} page ${page} → ${r.status}`);
    const batch = await r.json();
    for (const f of batch) {
      const header = `diff --git a/${f.previous_filename ?? f.filename} b/${f.filename}\n`;
      const body = f.patch ? `${f.patch}\n` : `(${f.status}; no text patch — binary or too large)\n`;
      files.push({ path: f.filename, text: header + body });
    }
    if (batch.length < 100) break;
  }
  return { files, source: 'files' };
}

// ---- Comment ----

function cell(v) {
  return String(v ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

export function formatComment(result, meta = {}) {
  const verdictEmoji = { PASS: '✅', FAIL: '❌', UNVERIFIED: '⚠️' }[result.verdict] || '⚠️';
  const lines = [`## ${verdictEmoji} AI Code Review — ${result.verdict}`, '', result.summary || '', ''];
  if (result.items?.length) {
    lines.push('| Check | Status | Reason |', '|---|---|---|');
    for (const it of result.items) lines.push(`| ${cell(it.check)} | ${cell(it.status)} | ${cell(it.reason)} |`);
    lines.push('');
  }
  if (result.blockingIssues?.length) {
    lines.push('### Blocking issues', '');
    for (const b of result.blockingIssues) {
      lines.push(`- \`${b.file}${b.line ? ':' + b.line : ''}\` — ${b.issue}${b.fix ? ` → **fix:** ${b.fix}` : ''}`);
    }
    lines.push('');
  }
  if (result.verdict === 'UNVERIFIED') {
    lines.push(`_AI review could not complete: ${result.error || 'unknown'}._`);
    lines.push('This is informational — a human should review. The PR is not blocked by this.');
    lines.push('');
    if (meta.attempts?.length) {
      lines.push('<details><summary>What was tried</summary>', '', '| Model | Result |', '|---|---|');
      for (const a of meta.attempts) {
        lines.push(`| \`${a.model}\` | ${a.status || '—'}${a.detail ? ` ${cell(a.detail)}` : ''} |`);
      }
      lines.push('', '</details>', '');
    }
  }
  if (meta.diff) {
    const { fileCount, totalChars, omitted, text } = meta.diff;
    if (omitted.length) {
      lines.push(
        `**Partial review:** read ${text.length.toLocaleString('en-US')} of ${totalChars.toLocaleString('en-US')} diff characters. ` +
          `${omitted.length} of ${fileCount} files were not read (lockfiles, docs and tests are dropped first):`,
        '',
        `<details><summary>Files not read</summary>`,
        '',
        ...omitted.map((p) => `- \`${p}\``),
        '',
        '</details>',
        '',
      );
    } else {
      lines.push(`Read all ${fileCount} files in the diff.`, '');
    }
  }
  const via = meta.model ? `\`${meta.model}\`${meta.backend ? ` (${meta.backend})` : ''}` : 'no model answered';
  lines.push('---', `_Automated review by \`scripts/agents/pr-review.mjs\` — ${via}. Advisory: it never blocks a PR._`);
  return lines.join('\n');
}

// ---- Orchestration ----

/** Everything except reading env and exiting, so a test can drive it with a fake fetch. */
export async function reviewPullRequest({ fetchImpl = fetch, runCli = runCommand, oauthToken, apiKey, baseURL, ghToken, repo, prNumber, modelsEnv, log = console.log }) {
  const prRes = await gh(fetchImpl, ghToken, `/repos/${repo}/pulls/${prNumber}`);
  if (!prRes.ok) throw new Error(`GitHub PR ${prNumber} → ${prRes.status}`);
  const prMeta = await prRes.json();

  const { files, source } = await fetchDiffFiles({ fetchImpl, ghToken, repo, prNumber });
  if (!files.length) return { skipped: true };
  const diff = prepareDiff(files);
  log(`Reviewing PR #${prNumber}: ${prMeta.title} — ${diff.fileCount} files, ${diff.totalChars} chars (${source} API), ${diff.omitted.length} not read`);

  // Say so in the PR rather than exiting quietly: a reviewer that is switched
  // off and looks switched on is the failure this file was rewritten to end.
  if (!oauthToken && !apiKey) {
    return {
      result: { verdict: 'UNVERIFIED', summary: 'AI review is not configured.', error: 'neither the CLAUDE_CODE_OAUTH_TOKEN nor the ANTHROPIC_API_KEY repository secret is set', items: [], blockingIssues: [] },
      meta: { attempts: [], diff },
    };
  }

  // The subscription wins when both are set: it is the one that costs nothing extra.
  const backend = oauthToken ? 'Claude subscription' : 'Anthropic API';
  const base = normalizeBase(baseURL);
  const user = `Review this PR.\n\nPR #${prNumber}: ${prMeta.title}\n\nDiff:\n\`\`\`diff\n${diff.text}\n\`\`\`\n\nReturn the JSON verdict.`;
  const attempts = [];
  for (const model of modelCandidates(modelsEnv)) {
    const res = oauthToken
      ? await callClaudeCode({ runCli, token: oauthToken, model, system: SYSTEM_PROMPT, user })
      : await callModel({ fetchImpl, base, apiKey, model, system: SYSTEM_PROMPT, user, maxTokens: 4096 });
    if (!res.ok) {
      attempts.push({ model, status: res.status, detail: res.detail });
      log(`  ${model} → ${res.status || ''}${res.detail ? ` ${res.detail}` : ''}`);
      continue;
    }
    const verdict = extractVerdict(res.text);
    if (verdict.ok) return { result: verdict.result, meta: { model, backend, diff } };
    attempts.push({ model, status: res.status, detail: verdict.error });
    log(`  ${model} → ${verdict.error}`);
  }
  const last = attempts.at(-1);
  return {
    result: { verdict: 'UNVERIFIED', summary: 'AI review returned no usable verdict.', error: last ? `${last.model} → ${last.status || ''}${last.detail ? ` ${last.detail}` : ''}`.trim() : 'no model configured', items: [], blockingIssues: [] },
    meta: { attempts, diff },
  };
}

export async function postComment({ fetchImpl = fetch, ghToken, repo, prNumber, body }) {
  const post = await gh(fetchImpl, ghToken, `/repos/${repo}/issues/${prNumber}/comments`, { method: 'POST', body: { body } });
  if (!post.ok) throw new Error(`POST comment → ${post.status}: ${(await post.text().catch(() => '')).slice(0, 200)}`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const repo = process.env.GH_REPOSITORY || process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;

  // Missing model credentials are NOT in this list: that case is reported in
  // the PR itself by reviewPullRequest.
  const missing = [];
  if (!ghToken) missing.push('GH_TOKEN');
  if (!repo) missing.push('GH_REPOSITORY');
  if (!prNumber) missing.push('PR_NUMBER');
  if (missing.length) {
    console.error(`✗ pr-review: missing env: ${missing.join(', ')}`);
    process.exit(2); // config error — don't fail the PR, just skip
  }

  try {
    const out = await reviewPullRequest({ oauthToken, apiKey, baseURL, ghToken, repo, prNumber, modelsEnv: process.env.PR_REVIEW_MODELS });
    if (out.skipped) {
      console.log('No diff — skipping review.');
      return;
    }
    await postComment({ ghToken, repo, prNumber, body: formatComment(out.result, out.meta) });
    console.log(`Posted review comment — verdict: ${out.result.verdict}`);
  } catch (e) {
    console.error(`✗ pr-review failed: ${e.message}`);
    // Post a failure notice rather than failing silently.
    try {
      await postComment({ ghToken, repo, prNumber, body: `## ⚠️ AI Code Review — error\n\nThe review script threw: \`${e.message}\`\n\nA human should review this PR. (This is informational — the PR is not blocked.)` });
    } catch {}
  }
  // Exit 0 regardless of verdict — the review is advisory (the comment is the
  // gate, not the workflow exit). Failing the workflow on a reviewer or API
  // problem would block unrelated PR checks.
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
