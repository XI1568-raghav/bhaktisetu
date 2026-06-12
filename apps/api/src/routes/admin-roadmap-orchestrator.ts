import type { FastifyPluginAsync } from 'fastify';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

/**
 * POST /api/v1/admin/roadmap/orchestrator-trigger
 *
 * GH Actions cron calls this w/ shared secret. Spawns orchestrator child
 * process detached so HTTP request returns 202 immediately (~50ms) while
 * orchestrator runs unbounded in background.
 *
 * Auth: shared secret via X-Orchestrator-Secret header (timing-safe compare).
 * Logs: /tmp/orchestrator-<cycleId>.log (Render writes to ephemeral disk).
 * Lock: docs/roadmap/_lock.json (orchestrator self-manages via lock file).
 *
 * GET version returns last cycle status from disk (for dashboard/healthcheck).
 */

function resolveRepoRoot(): string {
  if (process.env.ROADMAP_ROOT) return resolve(process.env.ROADMAP_ROOT, '..', '..');
  // Render: apps/api is cwd; repo root = ../..
  const candidates = [
    resolve(process.cwd(), '..', '..'),
    process.cwd(),
  ];
  for (const c of candidates) if (existsSync(join(c, 'scripts', 'agents', 'roadmap-orchestrator.mjs'))) return c;
  return candidates[0]!;
}

function verifySecret(provided: string | undefined): boolean {
  const expected = process.env.ORCHESTRATOR_TRIGGER_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const route: FastifyPluginAsync = async (app) => {
  // POST: trigger orchestrator
  app.post('/admin/roadmap/orchestrator-trigger', async (req, reply) => {
    const secret = (req.headers['x-orchestrator-secret'] as string | undefined) || '';
    if (!verifySecret(secret)) {
      reply.status(401);
      return { error: 'invalid secret' };
    }

    const body = (req.body as { dryRun?: boolean } | null) || {};
    const dryRun = body.dryRun !== false; // default true for safety
    const repoRoot = resolveRepoRoot();
    const cycleTs = new Date().toISOString();
    const cycleId = `C-${cycleTs.replace(/[^0-9T]/g, '').slice(0, 13)}`;
    const logDir = '/tmp/orchestrator-logs';
    try { mkdirSync(logDir, { recursive: true }); } catch {}
    const logPath = join(logDir, `${cycleId}.log`);

    // Verify orchestrator script reachable
    const orchestratorScript = join(repoRoot, 'scripts', 'agents', 'run-orchestrator-bg.mjs');
    if (!existsSync(orchestratorScript)) {
      reply.status(500);
      return { error: `orchestrator script missing at ${orchestratorScript}` };
    }

    // Spawn detached so Fastify can return 202 immediately
    try {
      const child = spawn('node', [orchestratorScript], {
        cwd: repoRoot,
        env: {
          ...process.env,
          DRY_RUN: String(dryRun),
          CYCLE_ID: cycleId,
          LOG_PATH: logPath,
        },
        detached: true,
        stdio: ['ignore', 'inherit', 'inherit'],
      });
      child.unref();
      // Write initial status marker
      writeFileSync(logPath, `[trigger] cycle ${cycleId} spawned at ${cycleTs} (pid=${child.pid})\nDRY_RUN=${dryRun}\n`);
    } catch (err) {
      reply.status(500);
      app.log.warn({ err }, 'orchestrator spawn failed');
      return { error: 'spawn failed', detail: String(err) };
    }

    reply.status(202);
    return {
      ok: true,
      cycleId,
      dryRun,
      acceptedAt: cycleTs,
      pollAt: `/api/v1/admin/roadmap/orchestrator-status?cycleId=${cycleId}`,
      logPath,
    };
  });

  // GET: DEPRECATED 2026-06-12. Orchestrator no longer runs on Render — moved
  // to GH Actions runner (Option 2-GH). /tmp/orchestrator-logs is permanently
  // empty on this instance. New live-status source: web app edge route
  // /api/orchestrator-status reads GitHub Actions REST API directly.
  app.get('/admin/roadmap/orchestrator-status', async (_req, reply) => {
    reply.status(410);
    reply.header('cache-control', 'no-cache');
    return {
      error: 'gone',
      message: 'Endpoint deprecated — orchestrator moved to GH Actions runner. Use /api/orchestrator-status on the web app (reads GitHub Actions REST API).',
      newSource: '/api/orchestrator-status',
      deprecatedAt: '2026-06-12',
    };
  });
};

export default route;
