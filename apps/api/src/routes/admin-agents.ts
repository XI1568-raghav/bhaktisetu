import { FastifyInstance } from 'fastify';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

// Agent fleet artifact reader. Lists recent markdown reports from
// docs/agent-reports/ and serves their content on demand. Reports are
// written by the GH Actions agent fleet (scripts/agents/*.mjs) and
// committed back to repo, so they're available in the deployed image.

const REPORT_DIR = join(process.cwd(), 'docs', 'agent-reports');

function safeList() {
  if (!existsSync(REPORT_DIR)) return [];
  return readdirSync(REPORT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const stat = statSync(join(REPORT_DIR, f));
      // Filename: YYYY-MM-DD-<agent>[-suffix].md
      const m = f.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      return {
        file: f,
        date: m?.[1] || '',
        agent: m?.[2] || f.replace(/\.md$/, ''),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => (a.file < b.file ? 1 : -1));
}

export async function adminAgentsRoutes(server: FastifyInstance) {
  server.get('/runs', { preHandler: [authenticateUser, requireRole('admin')] }, async () => {
    const items = safeList();
    // Group by agent name, return last 30 entries per agent.
    const byAgent: Record<string, typeof items> = {};
    for (const it of items) {
      const baseAgent = it.agent.replace(/-\d{2}h$/, ''); // strip hour suffix
      (byAgent[baseAgent] ||= []).push(it);
    }
    const summary = Object.entries(byAgent).map(([agent, runs]) => ({
      agent,
      lastRun: runs[0]?.mtime,
      runCount: runs.length,
      latestFile: runs[0]?.file,
    }));
    return { agents: summary, total: items.length };
  });

  server.get<{ Params: { file: string } }>('/runs/:file', {
    preHandler: [authenticateUser, requireRole('admin')],
  }, async (req, reply) => {
    const file = req.params.file;
    // Whitelist: must match the expected pattern, no path traversal.
    if (!/^[\w\-\d]+\.md$/.test(file)) {
      return reply.code(400).send({ error: 'invalid file name' });
    }
    const fpath = join(REPORT_DIR, file);
    if (!existsSync(fpath) || !fpath.startsWith(REPORT_DIR)) {
      return reply.code(404).send({ error: 'not found' });
    }
    const content = readFileSync(fpath, 'utf8');
    const stat = statSync(fpath);
    return { file, content, size: stat.size, mtime: stat.mtime.toISOString() };
  });

  server.get('/recent', { preHandler: [authenticateUser, requireRole('admin')] }, async () => {
    // 20 most recent across all agents
    return { recent: safeList().slice(0, 20) };
  });
}
