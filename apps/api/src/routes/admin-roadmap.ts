import type { FastifyPluginAsync } from 'fastify';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

/**
 * GET /admin/roadmap — aggregated Autonomous Roadmap Engine (ARE) state.
 *
 * Reads git-tracked files from docs/roadmap/. No DB. 60s edge cache.
 * Admin role-gated. Powers the /admin/roadmap dashboard.
 *
 * YAML parsing: handcoded minimal parser for two specific shapes
 *   - Queue frontmatter:    flat key: value pairs between two --- fences
 *   - Tripwires global:     `tripwires:` list with `- id:` / `name:` style entries
 * Avoids pulling in js-yaml as an apps/api runtime dep (already used in
 * scripts/agents/roadmap/_lib.mjs but that's node-script land).
 */

function resolveRoadmapRoot(): string {
  if (process.env.ROADMAP_ROOT) return process.env.ROADMAP_ROOT;
  // Walk candidates: dev (repo root) + Render (apps/api cwd) + monorepo nested
  const candidates = [
    join(process.cwd(), 'docs', 'roadmap'),
    resolve(process.cwd(), '..', '..', 'docs', 'roadmap'),
    resolve(process.cwd(), '..', 'docs', 'roadmap'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return candidates[0]!;
}

// Minimal frontmatter parser. Supports `key: value` lines only — sufficient
// for the queue .md frontmatter we control. Strips wrapping quotes.
function parseFrontmatter(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const k = m[1]!;
    let v: string = m[2]!.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

// Parse the tripwires list out of _tripwires-global.yml. Returns array of
// objects keyed by the leading `id:` / `name:` / `action:` / etc fields.
// Each list entry starts with `  - id:` and continues with `    key: value`
// lines until the next `  -` or EOF.
function parseTripwiresYaml(yaml: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const lines = yaml.split(/\r?\n/);
  let inTripwires = false;
  let current: Record<string, unknown> | null = null;
  for (const raw of lines) {
    // Skip comments + blank lines
    if (/^\s*#/.test(raw) || raw.trim() === '') continue;
    if (/^tripwires\s*:/.test(raw)) {
      inTripwires = true;
      continue;
    }
    // Top-level (non-indented) key after tripwires terminates the list
    if (inTripwires && /^[A-Za-z0-9_-]+\s*:/.test(raw)) {
      if (current) out.push(current);
      current = null;
      inTripwires = false;
      continue;
    }
    if (!inTripwires) continue;
    const dashMatch = raw.match(/^\s*-\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (dashMatch) {
      if (current) out.push(current);
      current = {};
      const k = dashMatch[1]!;
      let v: string = dashMatch[2]!.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      current[k] = v;
      continue;
    }
    const kvMatch = raw.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kvMatch && current) {
      const k = kvMatch[1]!;
      let v: string = kvMatch[2]!.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      current[k] = v;
    }
  }
  if (current) out.push(current);
  return out;
}

function readQueueFromDir(dir: string, sourceLabel: string): Array<Record<string, unknown>> {
  if (!existsSync(dir)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    try {
      const content = readFileSync(join(dir, f), 'utf8');
      const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
      if (!m) continue;
      const fm = parseFrontmatter(m[1]!);
      out.push({ filename: f, source: sourceLabel, ...fm });
    } catch {
      /* skip */
    }
  }
  return out;
}

function readQueue(root: string): Array<Record<string, unknown>> {
  // Prefer live queue. Fall back to _dryrun/queue while orchestrator in dry-run mode.
  const live = readQueueFromDir(join(root, 'queue'), 'live');
  if (live.length > 0) return live;
  return readQueueFromDir(join(root, '_dryrun', 'queue'), 'dryrun');
}

function readLastDecisions(root: string, n = 20): Array<{ filename: string; content: string }> {
  // Prefer live decisions/, fall back to _dryrun/decisions/
  let dir = join(root, 'decisions');
  if (!existsSync(dir) || readdirSync(dir).length === 0) {
    const dryrun = join(root, '_dryrun', 'decisions');
    if (existsSync(dryrun)) dir = dryrun;
    else return [];
  }
  // Walk recursively (decisions stored by YYYY-MM/ subdirs per Phase 4.3
  // finalize structure).
  const walkRecursive = (d: string): string[] => {
    const out: string[] = [];
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) out.push(...walkRecursive(p));
      else if (e.name.endsWith('.md')) out.push(p);
    }
    return out;
  };
  const files = walkRecursive(dir).sort().reverse().slice(0, n);
  return files.map((f) => {
    const rel = f.slice(dir.length + 1).replace(/\\/g, '/');
    return {
      filename: rel,
      content: readFileSync(f, 'utf8').slice(0, 4000),
    };
  });
}

const route: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/roadmap',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (_req, reply) => {
      const root = resolveRoadmapRoot();
      const indexPath = join(root, '_index.json');
      const kpiPath = join(root, '_kpi-cache.json');
      const tripwirePath = join(root, '_tripwires-global.yml');

      let index: unknown = { items: [] };
      if (existsSync(indexPath)) {
        try {
          index = JSON.parse(readFileSync(indexPath, 'utf8'));
        } catch (err) {
          app.log.warn({ err }, 'admin-roadmap: _index.json parse failed');
        }
      }

      let kpis: unknown = {};
      if (existsSync(kpiPath)) {
        try {
          kpis = JSON.parse(readFileSync(kpiPath, 'utf8'));
        } catch (err) {
          app.log.warn({ err }, 'admin-roadmap: _kpi-cache.json parse failed');
        }
      }

      let tripwires: Array<Record<string, unknown>> = [];
      if (existsSync(tripwirePath)) {
        try {
          tripwires = parseTripwiresYaml(readFileSync(tripwirePath, 'utf8'));
        } catch (err) {
          app.log.warn({ err }, 'admin-roadmap: _tripwires-global.yml parse failed');
        }
      }

      // 60s edge cache. Aggregation is cheap but called per dashboard load.
      reply.header('cache-control', 'public, max-age=60, s-maxage=60');
      return {
        index,
        queue: readQueue(root),
        decisions: readLastDecisions(root, 20),
        kpis,
        tripwires: { all: tripwires },
      };
    },
  );
};

export default route;

export const __testing = { readQueue, readLastDecisions, parseTripwiresYaml, parseFrontmatter };
