#!/usr/bin/env node
// pr-review — AI code review on PRs (P4.21). Fetches the PR diff, calls Claude
// via the Blackbox proxy using the VERIFIED-WORKING open-source model
// (blackboxai/z-ai/glm-5.2), with the darshya-code-review checklist as the
// system prompt, and posts the verdict + findings as a PR comment.
//
// Self-contained — does NOT depend on roadmap/_anthropic-client.mjs (which is
// opus-4.7-locked and 403-rejects on the Blackbox open-source-only endpoint;
// the roadmap-orchestrator has been failing CI for that reason — see notes).
//
// Env:
//   ANTHROPIC_API_KEY (or ANTHROPIC_API_KEY_BLACKBOX_PROXY)  proxy key
//   ANTHROPIC_BASE_URL                                       proxy URL
//   GH_TOKEN / GITHUB_TOKEN                                  for diff + comment
//   PR_NUMBER                                                the PR to review
//   GH_REPOSITORY                                            owner/repo
//
// Usage in CI:  node scripts/agents/pr-review.mjs
import { readFileSync } from 'node:fs';

// ---- 1. Resolve env ----
const apiKey =
  process.env.ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_API_KEY_BLACKBOX_PROXY;
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

// ---- 2. Fetch the PR diff via GitHub API ----
async function gh(path, { accept = 'application/vnd.github+json' } = {}) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'darshya-pr-review/1.0',
    },
  });
  if (!r.ok) throw new Error(`GitHub API ${path} → ${r.status}: ${await r.text().catch(() => '')}`);
  return r;
}

// ---- 3. The darshya-code-review checklist as the system prompt ----
// Mirrors the darshya-code-review skill so CI review == local review.
const SYSTEM_PROMPT = `You are the Darshya project code reviewer. Review the PR diff against this checklist. Return STRICT JSON only — no prose, no markdown fences.

Checklist (each item → PASS | FAIL | N/A with a one-line reason):
1. secret-egress: no committed secrets (env keys, tokens, DB URLs, passwords). .env.example placeholders only.
2. render-impact: if apps/web/** or apps/api/** changed, note deploy impact + concurrent-push-cancels risk. runtime='edge' is harmless on Render (do NOT flag). apps/web/middleware.ts is non-issue on Render (do NOT flag).
3. prisma-footguns: new migration must NOT contain CREATE INDEX CONCURRENTLY (must be applied via $executeRawUnsafe outside migrate deploy). uuid/text backfill cast needs ::uuid. Migration must use DIRECT_URL not pooled.
4. free-tier-cost: new .github/workflows/*.yml — workflow_dispatch-only (fine), on: schedule: (compute monthly minutes, FAIL if >5% of GH Actions budget), on: push: without paths filter (flag).
5. commit-msg: Conventional Commits type(scope): subject. Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com> on Claude-authored commits.
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

// ---- 4. Call Claude via the proxy (GLM-5.2, the verified-working model) ----
async function reviewDiff(diff, prMeta) {
  const model = 'blackboxai/z-ai/glm-5.2'; // open-source-only endpoint; opus/sonnet/haiku 403
  const body = {
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Review this PR.\n\nPR #${prNumber}: ${prMeta.title}\n\nDiff:\n\`\`\`diff\n${diff.slice(0, 120000)}\n\`\`\`\n\nReturn the JSON verdict.`,
      },
    ],
  };
  const r = await fetch(`${baseURL.replace(/\/$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      authorization: `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (r.status === 403) {
    const txt = await r.text().catch(() => '');
    // Don't fail the PR on a model/proxy issue — post a notice instead.
    return { verdict: 'UNVERIFIED', error: `Model 403-rejected (${model}): ${txt.slice(0, 200)}`, items: [], blockingIssues: [], summary: 'AI review could not run — proxy rejected the model.' };
  }
  if (!r.ok) throw new Error(`Anthropic API ${r.status}: ${await r.text().catch(() => '')}`);
  const data = await r.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  // Extract the JSON object from the response (model may wrap it).
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) return { verdict: 'UNVERIFIED', error: 'No JSON in model response', raw: text.slice(0, 500), items: [], blockingIssues: [], summary: 'AI review returned no parseable verdict.' };
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return { verdict: 'UNVERIFIED', error: 'Malformed JSON', raw: text.slice(0, 500), items: [], blockingIssues: [], summary: 'AI review returned malformed JSON.' };
  }
}

// ---- 5. Format the PR comment ----
function formatComment(result) {
  const verdictEmoji = { PASS: '✅', FAIL: '❌', UNVERIFIED: '⚠️' }[result.verdict] || '⚠️';
  const lines = [
    `## ${verdictEmoji} AI Code Review — ${result.verdict}`,
    '',
    result.summary || '',
    '',
  ];
  if (result.items?.length) {
    lines.push('| Check | Status | Reason |', '|---|---|---|');
    for (const it of result.items) {
      lines.push(`| ${it.check} | ${it.status} | ${it.reason || ''} |`);
    }
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
  }
  lines.push('---', '_Self-hosted GLM-5.2 review via `scripts/agents/pr-review.mjs`. Runs on PRs touching `apps/**`, `prisma/**`, `.github/**`._');
  return lines.join('\n');
}

// ---- 6. Post the comment ----
async function postComment(body) {
  const r = await gh(`/repos/${repo}/issues/${prNumber}/comments`, {
    accept: 'application/vnd.github+json',
  });
  // re-fetch is GET; POST needs a separate call
  const post = await fetch(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'darshya-pr-review/1.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (!post.ok) throw new Error(`POST comment → ${post.status}: ${await post.text().catch(() => '')}`);
  return post.json();
}

// ---- main ----
try {
  // PR metadata
  const prRes = await gh(`/repos/${repo}/pulls/${prNumber}`);
  const prMeta = await prRes.json();

  // The diff (patch format — compact, model-friendly)
  const diffRes = await gh(`/repos/${repo}/pulls/${prNumber}`, { accept: 'application/vnd.github.v3.diff' });
  const diff = await diffRes.text();

  if (!diff.trim()) {
    console.log('No diff — skipping review.');
    process.exit(0);
  }

  console.log(`Reviewing PR #${prNumber}: ${prMeta.title} (${diff.length} chars diff)`);
  const result = await reviewDiff(diff, prMeta);
  const comment = formatComment(result);
  await postComment(comment);
  console.log(`Posted review comment — verdict: ${result.verdict}`);
  // Exit 0 regardless of verdict — the review is advisory (the comment is the
  // gate, not the workflow exit). A FAIL verdict in the comment tells the human
  // not to merge; failing the workflow would block unrelated PR checks.
  process.exit(0);
} catch (e) {
  console.error(`✗ pr-review failed: ${e.message}`);
  // Post a failure notice rather than silently failing the workflow.
  try {
    await postComment(`## ⚠️ AI Code Review — error\n\nThe review script threw: \`${e.message}\`\n\nA human should review this PR. (This is informational — the PR is not blocked.)`);
  } catch {}
  process.exit(0); // still 0 — don't fail the PR on reviewer infra issues
}
