#!/usr/bin/env node
// pr-review — AI code review on PRs (P4.21). Fetches the PR diff, asks a model
// behind the Blackbox gateway to review it against the darshya-code-review
// checklist, and posts the verdict + findings as a PR comment.
//
// WHY THIS FILE DISCOVERS ITS ROUTE INSTEAD OF NAMING ONE. It used to hard-code
// one path (`/v1/messages`) and one model (`blackboxai/z-ai/glm-5.2`). The
// gateway's catalogue drifts, and from 2026-08-14 that pair answered an empty
// 404 on every PR. The script reported `Anthropic API 404: ` for seven weeks
// and reviewed nothing, while its check stayed green — it exits 0 by design.
// A second failure sat behind the first: any PR over GitHub's 20,000-line /
// 300-file diff limit got a 406 and was never read either.
//
// So: probe (endpoint style x model) with a few-token request, use the first
// pair that answers, and when none does say exactly what was tried. And read
// oversized PRs through the per-file API rather than giving up on them.
//
// Self-contained — does NOT depend on roadmap/_anthropic-client.mjs.
//
// Env:
//   ANTHROPIC_API_KEY (or ANTHROPIC_API_KEY_BLACKBOX_PROXY)  gateway key
//   ANTHROPIC_BASE_URL                                       gateway URL
//   GH_TOKEN / GITHUB_TOKEN                                  for diff + comment
//   PR_NUMBER                                                the PR to review
//   GH_REPOSITORY                                            owner/repo
//   PR_REVIEW_MODELS   optional, comma-separated — tried before the defaults
//
// Usage in CI:  node scripts/agents/pr-review.mjs
import { pathToFileURL } from 'node:url';

/** Tried in order. Open-weight models first: this key has never reached the closed Claude models. */
export const DEFAULT_MODELS = [
  'blackboxai/z-ai/glm-5.2',
  'z-ai/glm-5.2',
  'blackboxai/moonshotai/kimi-k3',
  'blackboxai/deepseek/deepseek-v4-pro',
  'blackboxai/mistral/devstral-2',
  'blackboxai/mistral/mistral-medium-3.5',
  'blackboxai/nvidia/nemotron-3-ultra',
  'blackboxai/meta/llama-3.1-70b',
  'blackboxai/openai/gpt-5.3-codex',
];

/** `anthropic` = Messages API shape, `openai` = chat-completions shape. */
export const ENDPOINTS = [
  { style: 'anthropic', path: '/v1/messages' },
  { style: 'openai', path: '/chat/completions' },
  { style: 'openai', path: '/v1/chat/completions' },
];

export const MAX_DIFF_CHARS = 120_000;
const PROBE_TIMEOUT_MS = 30_000;
const REVIEW_TIMEOUT_MS = 150_000;
const PROBE_BUDGET_MS = 180_000;
const MAX_REVIEW_ATTEMPTS = 3;

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

// ---- Gateway ----

/** The secret may or may not carry a trailing slash or `/v1`; the endpoint paths supply their own. */
export function normalizeBase(url) {
  return String(url ?? '').trim().replace(/\/+$/, '').replace(/\/v1$/, '');
}

/** PR_REVIEW_MODELS first, then the defaults, de-duplicated, order kept. */
export function modelCandidates(envList, defaults = DEFAULT_MODELS) {
  const fromEnv = String(envList ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([...fromEnv, ...defaults])];
}

function authHeaders(apiKey) {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    authorization: `Bearer ${apiKey}`,
    'anthropic-version': '2023-06-01',
  };
}

function requestBody(style, { model, system, user, maxTokens }) {
  if (style === 'anthropic') {
    return { model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] };
  }
  return {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
}

/** Pull the assistant text out of either response shape. '' when there is none. */
export function responseText(style, data) {
  if (style === 'anthropic') {
    return (data?.content ?? []).map((c) => (typeof c?.text === 'string' ? c.text : '')).join('');
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c?.text === 'string' ? c.text : '')).join('');
  return '';
}

/**
 * One request. Never throws: a network failure or timeout comes back as
 * `{ ok: false, status: 0 }` so the caller can move to the next route.
 */
export async function callModel({ fetchImpl = fetch, base, apiKey, endpoint, model, system, user, maxTokens, timeoutMs }) {
  let r;
  try {
    r = await fetchImpl(`${base}${endpoint.path}`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(requestBody(endpoint.style, { model, system, user, maxTokens })),
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
  const text = responseText(endpoint.style, data);
  // A 200 with no assistant text is not a working route — an HTML landing page
  // or an error envelope both look like this.
  if (!text) return { ok: false, status: r.status, detail: 'no assistant text in response', text: '' };
  return { ok: true, status: r.status, detail: '', text };
}

/**
 * Probe (endpoint x model) with a tiny request and return every pair that
 * answers, in preference order, plus the log of what was tried.
 *
 * Every model is tried on an endpoint before moving on. The gateway answers an
 * empty 404 both for a path that does not exist and for a model it has dropped,
 * so the two cannot be told apart and an early exit would skip live models.
 * The time budget is what bounds the walk.
 */
export async function findRoutes({ fetchImpl = fetch, base, apiKey, models, endpoints = ENDPOINTS, wanted = MAX_REVIEW_ATTEMPTS, budgetMs = PROBE_BUDGET_MS, now = Date.now }) {
  const attempts = [];
  const routes = [];
  const deadline = now() + budgetMs;
  for (const endpoint of endpoints) {
    for (const model of models) {
      if (routes.length >= wanted) return { routes, attempts };
      if (now() > deadline) {
        attempts.push({ path: endpoint.path, model, status: 0, detail: 'probe time budget exhausted' });
        return { routes, attempts };
      }
      const res = await callModel({
        fetchImpl, base, apiKey, endpoint, model,
        system: 'Reply with the single word OK.',
        user: 'ping',
        maxTokens: 16,
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      attempts.push({ path: endpoint.path, model, status: res.status, detail: res.detail });
      if (res.ok) routes.push({ endpoint, model });
    }
    // One endpoint that answers is the gateway's real surface; the others are
    // the same models behind a different envelope and add nothing.
    if (routes.length) break;
  }
  return { routes, attempts };
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
      lines.push('<details><summary>What was tried</summary>', '', '| Endpoint | Model | Result |', '|---|---|---|');
      for (const a of meta.attempts) {
        lines.push(`| \`${a.path}\` | \`${a.model}\` | ${a.status || '—'}${a.detail ? ` ${cell(a.detail)}` : ''} |`);
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
  const via = meta.route ? `\`${meta.route.model}\` via \`${meta.route.endpoint.path}\`` : 'no working model route';
  lines.push('---', `_Automated review by \`scripts/agents/pr-review.mjs\` — ${via}. Advisory: it never blocks a PR._`);
  return lines.join('\n');
}

// ---- Orchestration ----

/** Everything except reading env and exiting, so a test can drive it with a fake fetch. */
export async function reviewPullRequest({ fetchImpl = fetch, apiKey, baseURL, ghToken, repo, prNumber, modelsEnv, log = console.log }) {
  const prRes = await gh(fetchImpl, ghToken, `/repos/${repo}/pulls/${prNumber}`);
  if (!prRes.ok) throw new Error(`GitHub PR ${prNumber} → ${prRes.status}`);
  const prMeta = await prRes.json();

  const { files, source } = await fetchDiffFiles({ fetchImpl, ghToken, repo, prNumber });
  if (!files.length) return { skipped: true };
  const diff = prepareDiff(files);
  log(`Reviewing PR #${prNumber}: ${prMeta.title} — ${diff.fileCount} files, ${diff.totalChars} chars (${source} API), ${diff.omitted.length} not read`);

  const base = normalizeBase(baseURL);
  const { routes, attempts } = await findRoutes({ fetchImpl, base, apiKey, models: modelCandidates(modelsEnv) });
  for (const a of attempts) log(`  probe ${a.path} ${a.model} → ${a.status || a.detail}`);

  if (!routes.length) {
    return {
      result: { verdict: 'UNVERIFIED', summary: 'AI review could not run — the gateway answered no model on any endpoint.', error: 'no working model route', items: [], blockingIssues: [] },
      meta: { attempts, diff },
    };
  }

  const user = `Review this PR.\n\nPR #${prNumber}: ${prMeta.title}\n\nDiff:\n\`\`\`diff\n${diff.text}\n\`\`\`\n\nReturn the JSON verdict.`;
  let lastError = 'unknown';
  for (const route of routes) {
    const res = await callModel({ fetchImpl, base, apiKey, endpoint: route.endpoint, model: route.model, system: SYSTEM_PROMPT, user, maxTokens: 4096, timeoutMs: REVIEW_TIMEOUT_MS });
    if (!res.ok) {
      lastError = `${route.model} → ${res.status || res.detail}${res.status && res.detail ? ` ${res.detail}` : ''}`;
      attempts.push({ path: route.endpoint.path, model: route.model, status: res.status, detail: `review call: ${res.detail}` });
      log(`  review ${route.model} failed: ${lastError}`);
      continue;
    }
    const verdict = extractVerdict(res.text);
    if (verdict.ok) return { result: verdict.result, meta: { route, diff } };
    lastError = `${route.model}: ${verdict.error}`;
    attempts.push({ path: route.endpoint.path, model: route.model, status: res.status, detail: `review call: ${verdict.error}` });
    log(`  review ${route.model} unusable: ${verdict.error}`);
  }
  return {
    result: { verdict: 'UNVERIFIED', summary: 'AI review returned no usable verdict.', error: lastError, items: [], blockingIssues: [] },
    meta: { attempts, diff },
  };
}

export async function postComment({ fetchImpl = fetch, ghToken, repo, prNumber, body }) {
  const post = await gh(fetchImpl, ghToken, `/repos/${repo}/issues/${prNumber}/comments`, { method: 'POST', body: { body } });
  if (!post.ok) throw new Error(`POST comment → ${post.status}: ${(await post.text().catch(() => '')).slice(0, 200)}`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_BLACKBOX_PROXY;
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const repo = process.env.GH_REPOSITORY || process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;

  const missing = [];
  if (!apiKey) missing.push('ANTHROPIC_API_KEY');
  if (!baseURL) missing.push('ANTHROPIC_BASE_URL');
  if (!ghToken) missing.push('GH_TOKEN');
  if (!repo) missing.push('GH_REPOSITORY');
  if (!prNumber) missing.push('PR_NUMBER');
  if (missing.length) {
    console.error(`✗ pr-review: missing env: ${missing.join(', ')}`);
    process.exit(2); // config error — don't fail the PR, just skip
  }

  try {
    const out = await reviewPullRequest({ apiKey, baseURL, ghToken, repo, prNumber, modelsEnv: process.env.PR_REVIEW_MODELS });
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
  // gate, not the workflow exit). Failing the workflow on a reviewer or gateway
  // problem would block unrelated PR checks.
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
