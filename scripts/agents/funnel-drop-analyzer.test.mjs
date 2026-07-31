// scripts/agents/funnel-drop-analyzer.test.mjs
// Regression coverage for the funnel-drop-analyzer filing path.
//
// Bug: the analyzer detected a dead funnel (all 5 stages at 0, a 100% drop)
// every day for 60+ days but filed ZERO GitHub issues — log showed
// `findings=5 filed=0` on every run. Root cause: the per-stage loop hit an
// early `continue` on `baseline === 0` (the "no-baseline" branch), so a
// 100%-drop / all-zero state NEVER reached the P0 filing branch — even though
// an all-zero funnel is the most severe possible regression. The filing path
// (fileIssue + alreadyFiled dedupe) was correct but unreachable for this
// state. Fix: when baseline is 0 AND yesterday is also 0 (dead funnel), treat
// it as a P0 with a stable `:dead` fingerprint bucket and file ONE deduped
// alert instead of silently recording no-baseline.
//
// Mocks the GH fetch layer + the funnel API so no real issue is ever filed
// and no network is required. Node:test, matching route-manifest.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyzer } from './funnel-drop-analyzer.mjs';

// --- helpers -------------------------------------------------------------

// A 7-day funnel where every stage is 0 every day — the dead-funnel state
// the prod agent has reported for 60+ days (all "no-baseline" rows).
function deadFunnel() {
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(2026, 6, 31) - i * 86400000).toISOString().slice(0, 10);
    daily.push({
      date: d,
      stages: { landing: 0, signup: 0, kyc: 0, booking: 0, payment_success: 0 },
    });
  }
  return { daily, generatedAt: '2026-07-31T06:00:00.000Z' };
}

// A 7-day funnel with a real baseline that then collapses to 0 — a "partial
// then total" drop. Used to confirm the existing >70% path still files.
function collapsedFunnel() {
  const daily = [];
  for (let i = 6; i >= 1; i--) {
    const d = new Date(Date.UTC(2026, 6, 31) - i * 86400000).toISOString().slice(0, 10);
    daily.push({
      date: d,
      stages: { landing: 100, signup: 50, kyc: 20, booking: 10, payment_success: 5 },
    });
  }
  daily.push({
    date: '2026-07-31',
    stages: { landing: 0, signup: 0, kyc: 0, booking: 0, payment_success: 0 },
  });
  return { daily, generatedAt: '2026-07-31T06:00:00.000Z' };
}

// In-memory GH issues mock. `issues` is the open-issues list (array).
// `posts` records every POST /issues call so tests can assert filing counts
// and dedupe without touching the real API.
function mockGh({ issues = [], posts = [] } = {}) {
  const state = { issues, posts, getCalls: 0, postCalls: 0 };
  const ghFetch = async (path, init = {}) => {
    if (init.method === 'POST') {
      state.postCalls++;
      const body = JSON.parse(init.body);
      const number = 1000 + state.postCalls;
      const issue = {
        number,
        html_url: `https://github.com/x/y/issues/${number}`,
        title: body.title,
        body: body.body,
        labels: body.labels,
      };
      state.posts.push(issue);
      state.issues.push(issue); // newly filed issue is now "open"
      return { status: 201, json: issue };
    }
    // GET open issues list — return the current open set.
    state.getCalls++;
    return { status: 200, json: state.issues };
  };
  return { ghFetch, state };
}

// Capture report/log writes so tests don't touch the real docs/ tree and
// can assert on the rendered markdown.
function mockIo() {
  const reports = [];
  const logs = [];
  const writeReport = (name, body) => {
    reports.push({ name, body });
    return `docs/agent-reports/${name}.md`;
  };
  const upsertLog = (name, line) => logs.push({ name, line });
  return { writeReport, upsertLog, reports, logs };
}

// A no-op funnel fetcher returning a fixed payload.
function funnelSource(payload) {
  return async () => payload;
}

// --- tests ---------------------------------------------------------------

test('dead funnel (all stages 0) files exactly ONE deduped P0 issue', async () => {
  const gh = mockGh();
  const io = mockIo();
  const analyzer = createAnalyzer({
    ghFetch: gh.ghFetch,
    writeReport: io.writeReport,
    upsertLog: io.upsertLog,
    getFunnel: funnelSource(deadFunnel()),
    cronToken: 'tok',
    ghToken: 'ghs_test',
  });

  const result = await analyzer.run();

  // The fix: a dead funnel must file exactly one issue, not zero.
  assert.equal(gh.state.postCalls, 1, 'dead funnel must file exactly 1 issue');
  assert.equal(result.filed.length, 1, 'filed[] must contain the one filing');
  assert.equal(result.findings.length, 5, 'all 5 stages still reported');

  // The filed issue carries the P0 + funnel-drop + agent-auto-filed labels.
  const filed = gh.state.posts[0];
  assert.deepEqual(filed.labels.sort(), ['P0', 'agent-auto-filed', 'funnel-drop'].sort());
  // And it carries a stable _fingerprint_ marker for dedupe.
  assert.match(filed.body, /_fingerprint: `funnel:[a-z_:]+`/);

  // The log line reflects the filing (not the old filed=0).
  assert.equal(io.logs[0].line, 'findings=5 filed=1');
});

test('dead funnel does NOT file when GITHUB_TOKEN is unset (env-or-noop)', async () => {
  const gh = mockGh();
  const io = mockIo();
  const analyzer = createAnalyzer({
    ghFetch: gh.ghFetch,
    writeReport: io.writeReport,
    upsertLog: io.upsertLog,
    getFunnel: funnelSource(deadFunnel()),
    cronToken: 'tok',
    ghToken: '',
  });

  const result = await analyzer.run();

  assert.equal(gh.state.postCalls, 0, 'no filing without GH token');
  assert.equal(result.filed.length, 0);
  assert.equal(io.logs[0].line, 'findings=5 filed=0');
});

test('dead funnel does NOT file when CRON_AUTH_TOKEN is unset (skipped)', async () => {
  const gh = mockGh();
  const io = mockIo();
  const analyzer = createAnalyzer({
    ghFetch: gh.ghFetch,
    writeReport: io.writeReport,
    upsertLog: io.upsertLog,
    getFunnel: funnelSource(deadFunnel()),
    cronToken: '',
    ghToken: 'ghs_test',
  });

  const result = await analyzer.run();

  assert.equal(gh.state.postCalls, 0);
  assert.equal(result.skipped, true, 'must skip when CRON_AUTH_TOKEN missing');
  assert.match(io.reports[0].body, /Skipped.*CRON_AUTH_TOKEN/);
});

test('second run with the same dead-funnel fingerprint open files NOTHING (dedupe)', async () => {
  // First run files one issue; that issue is now in the open set with the
  // fingerprint in its body. Second run must NOT file a duplicate.
  const gh = mockGh();
  const io = mockIo();
  const analyzer = createAnalyzer({
    ghFetch: gh.ghFetch,
    writeReport: io.writeReport,
    upsertLog: io.upsertLog,
    getFunnel: funnelSource(deadFunnel()),
    cronToken: 'tok',
    ghToken: 'ghs_test',
  });

  await analyzer.run();
  assert.equal(gh.state.postCalls, 1, 'first run files 1');

  const r2 = await analyzer.run();
  assert.equal(gh.state.postCalls, 1, 'second run files 0 (deduped)');
  assert.equal(r2.filed.length, 0, 'second run filed[] is empty');
});

test('collapsed funnel (real baseline → 0) still files via the >70% path', async () => {
  // Regression guard: the existing partial-drop filing path must keep working
  // after the dead-funnel fix. Each stage had a real baseline and dropped
  // 100%, so all 5 should file (distinct fingerprints per stage).
  const gh = mockGh();
  const io = mockIo();
  const analyzer = createAnalyzer({
    ghFetch: gh.ghFetch,
    writeReport: io.writeReport,
    upsertLog: io.upsertLog,
    getFunnel: funnelSource(collapsedFunnel()),
    cronToken: 'tok',
    ghToken: 'ghs_test',
  });

  const result = await analyzer.run();

  assert.equal(gh.state.postCalls, 5, 'each dropped stage files its own issue');
  assert.equal(result.filed.length, 5);
  // Distinct fingerprints per stage (no cross-stage dedupe).
  const fps = new Set(gh.state.posts.map((p) => p.body.match(/_fingerprint: `([^`]+)`/)[1]));
  assert.equal(fps.size, 5, '5 distinct fingerprints filed');
});

test('healthy funnel (no drops) files nothing and reports ok', async () => {
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(2026, 6, 31) - i * 86400000).toISOString().slice(0, 10);
    daily.push({
      date: d,
      stages: { landing: 100, signup: 80, kyc: 60, booking: 40, payment_success: 20 },
    });
  }
  const gh = mockGh();
  const io = mockIo();
  const analyzer = createAnalyzer({
    ghFetch: gh.ghFetch,
    writeReport: io.writeReport,
    upsertLog: io.upsertLog,
    getFunnel: funnelSource({ daily, generatedAt: '2026-07-31T06:00:00.000Z' }),
    cronToken: 'tok',
    ghToken: 'ghs_test',
  });

  const result = await analyzer.run();

  assert.equal(gh.state.postCalls, 0, 'healthy funnel files nothing');
  assert.equal(result.filed.length, 0);
  assert.equal(io.logs[0].line, 'findings=5 filed=0');
});
