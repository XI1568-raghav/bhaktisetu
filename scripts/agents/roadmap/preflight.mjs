// Preflight check — run ONCE before first orchestrator dry-run.
// Verifies all 6 GH Actions secrets are reachable + auth works.
// Usage: node scripts/agents/roadmap/preflight.mjs
//   OR locally: source env vars from .env then run
// Exit 0 = GO. Exit 1 = NO-GO with summary of what's broken.

import { existsSync, readFileSync } from 'node:fs';

const CHECKS = [
  {
    id: 'ANTHROPIC_API_KEY',
    name: 'Anthropic API key',
    required_env: ['ANTHROPIC_API_KEY'],
    test: async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const c = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
      });
      // Mirror _anthropic-client.mjs model selection so preflight tests the same call.
      const r = await c.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-7',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply OK only.' }],
      });
      const text = r.content.find(c => c.type === 'text')?.text || '';
      return { ok: text.includes('OK') || text.length > 0, msg: `model=${r.model}, tokens=${r.usage?.input_tokens}+${r.usage?.output_tokens}` };
    },
  },
  {
    id: 'SUPABASE',
    name: 'Supabase Postgres reachable + SELECT works',
    required_env: ['DATABASE_URL_READONLY'],
    fallback_env: ['SUPABASE_DIRECT_URL'],
    test: async () => {
      const pg = (await import('pg')).default;
      const url = process.env.DATABASE_URL_READONLY || process.env.SUPABASE_DIRECT_URL;
      const pool = new pg.Pool({ connectionString: url, max: 1, statement_timeout: 5000 });
      try {
        const r = await pool.query('SELECT 1 AS ok');
        return { ok: r.rows[0]?.ok === 1, msg: `pg=${url.includes('readonly') ? 'readonly' : 'direct'}, row=${JSON.stringify(r.rows[0])}` };
      } finally {
        await pool.end();
      }
    },
  },
  {
    id: 'POSTHOG',
    name: 'PostHog API auth + project access',
    required_env: ['POSTHOG_PERSONAL_API_KEY', 'POSTHOG_PROJECT_ID'],
    test: async () => {
      const r = await fetch(`https://app.posthog.com/api/projects/${process.env.POSTHOG_PROJECT_ID}/`, {
        headers: { Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
      const j = await r.json();
      return { ok: !!j.id, msg: `project="${j.name}"` };
    },
  },
  {
    id: 'RENDER',
    name: 'Render API auth + services list',
    required_env: ['RENDER_API_KEY'],
    test: async () => {
      const r = await fetch('https://api.render.com/v1/services?limit=1', {
        headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
      const j = await r.json();
      return { ok: Array.isArray(j), msg: `services=${j.length}` };
    },
  },
  {
    id: 'CF_ANALYTICS',
    name: 'Cloudflare Analytics token auth',
    required_env: ['CF_ANALYTICS_TOKEN'],
    test: async () => {
      // Cheapest validation: GET user/tokens/verify on the Account API
      const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { Authorization: `Bearer ${process.env.CF_ANALYTICS_TOKEN}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
      const j = await r.json();
      return { ok: j.success === true, msg: `token-status=${j.result?.status}` };
    },
  },
  {
    id: 'GH_REPO',
    name: 'GitHub repo access (auto via GITHUB_TOKEN in workflow)',
    required_env: [],
    test: async () => {
      // Just verify gh CLI works locally; in workflow this is auto.
      const { execFileSync } = await import('node:child_process');
      try {
        const out = execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8', timeout: 10000 });
        return { ok: out.trim().length > 0, msg: `user=${out.trim()}` };
      } catch (e) {
        return { ok: false, msg: e.message.slice(0, 100) };
      }
    },
  },
];

async function main() {
  console.log('=== ARE Orchestrator Preflight ===\n');
  const results = [];
  let fail = 0;
  let skip = 0;

  for (const check of CHECKS) {
    const missing = check.required_env.filter(e => !process.env[e]);
    const fallbackMissing = check.fallback_env ? check.fallback_env.every(e => !process.env[e]) : false;

    if (missing.length && (!check.fallback_env || fallbackMissing)) {
      console.log(`⏭  ${check.id} SKIP — missing env: ${missing.join(', ')}${check.fallback_env ? ' (or fallback ' + check.fallback_env.join('/') + ')' : ''}`);
      results.push({ id: check.id, ok: false, skipped: true });
      skip++;
      continue;
    }

    try {
      const r = await Promise.race([
        check.test(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 15s')), 15000)),
      ]);
      if (r.ok) {
        console.log(`✓  ${check.id} PASS — ${r.msg}`);
        results.push({ id: check.id, ok: true, ...r });
      } else {
        console.log(`✗  ${check.id} FAIL — ${r.msg}`);
        results.push({ id: check.id, ok: false, ...r });
        fail++;
      }
    } catch (e) {
      console.log(`✗  ${check.id} ERROR — ${e.message.slice(0, 200)}`);
      results.push({ id: check.id, ok: false, error: e.message });
      fail++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Pass: ${results.filter(r => r.ok).length}/${CHECKS.length}`);
  console.log(`Fail: ${fail}`);
  console.log(`Skip: ${skip} (env not set)`);

  if (fail > 0) {
    console.log('\n❌ NO-GO. Fix failed checks before unpausing orchestrator.');
    process.exit(1);
  }
  if (skip > 0 && skip === CHECKS.length) {
    console.log('\n❌ NO-GO. No env vars set. Set 6 GH Actions secrets first.');
    process.exit(1);
  }
  if (skip > 0) {
    console.log(`\n⚠  PARTIAL GO. ${skip} checks skipped (env not set locally). Will run again in GH Actions cron w/ secrets.`);
    process.exit(0);
  }
  console.log('\n✅ ALL GO. Safe to unpause orchestrator + trigger first dry-run.');
  process.exit(0);
}

main().catch(e => { console.error('uncaught:', e); process.exit(1); });
