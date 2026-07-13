import { z } from 'zod';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, isAbsolute, sep } from 'node:path';

// Default reports root. Overridable via the `root` arg (tests use it). In prod
// the MCP server runs from the repo root, so docs/agent-reports resolves.
const DEFAULT_ROOT = 'docs/agent-reports';
const MAX_LIST = 50;
const DEFAULT_READ_LIMIT = 10_000; // ~10k chars per report — plenty for a digest

export const AgentReportsSchema = z
  .object({
    root: z.string().optional(),
  })
  .strict();

export const AgentReportReadSchema = z
  .object({
    path: z.string().min(1),
    root: z.string().optional(),
    limit: z.number().int().positive().max(500_000).optional(),
  })
  .strict();

// Recursively walk a directory, returning relative .md paths (POSIX-style).
async function listMarkdown(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let s;
      try {
        s = await stat(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        await walk(full);
      } else if (s.isFile() && entry.endsWith('.md')) {
        out.push(relative(root, full).split(sep).join('/'));
      }
    }
  }
  await walk(root);
  return out;
}

export async function agentReports(args: z.infer<typeof AgentReportsSchema>) {
  const root = args.root ?? DEFAULT_ROOT;
  let paths: string[];
  try {
    paths = await listMarkdown(root);
  } catch {
    paths = [];
  }
  // Sort newest-first by mtime.
  const withMtime = await Promise.all(
    paths.map(async (p) => {
      try {
        const s = await stat(join(root, p));
        return {
          name: p.split('/').pop() ?? p,
          relativePath: p,
          modifiedAt: s.mtime.toISOString(),
        };
      } catch {
        return {
          name: p.split('/').pop() ?? p,
          relativePath: p,
          modifiedAt: new Date(0).toISOString(),
        };
      }
    }),
  );
  withMtime.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
  const reports = withMtime.slice(0, MAX_LIST);

  return {
    content: [
      { type: 'text' as const, text: JSON.stringify({ reports, count: reports.length }, null, 2) },
    ],
  };
}

// Resolve a user-supplied path UNDER root, rejecting traversal + absolute paths.
// Returns the safe absolute path or null if the path escapes root.
function safeResolve(root: string, rel: string): string | null {
  if (isAbsolute(rel)) return null;
  const resolved = join(root, rel);
  const relFromRoot = relative(root, resolved);
  // If relFromRoot starts with '..' or is absolute, the path escaped root.
  if (relFromRoot.startsWith('..') || isAbsolute(relFromRoot)) return null;
  return resolved;
}

export async function agentReportRead(args: z.infer<typeof AgentReportReadSchema>) {
  const root = args.root ?? DEFAULT_ROOT;
  const limit = args.limit ?? DEFAULT_READ_LIMIT;
  const safe = safeResolve(root, args.path);

  if (safe === null) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              error:
                'Path traversal or absolute path rejected — path must stay within the reports root.',
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  let body: string;
  try {
    body = await readFile(safe, 'utf8');
  } catch {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: `Report not found: ${args.path}` }, null, 2),
        },
      ],
    };
  }

  const truncated = body.length > limit;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            relativePath: args.path,
            content: truncated ? body.slice(0, limit) : body,
            truncated,
            length: body.length,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export const agentReportsToolDef = {
  name: 'agent_reports',
  description:
    "List Darshya's automated-agent reports (docs/agent-reports/). Returns up to 50 .md report paths (top-level + subdirs like cmo/, sales/), newest-first, each with name + relativePath + modifiedAt. Read-only.",
  inputSchema: {
    type: 'object' as const,
    properties: { root: { type: 'string', description: 'Override reports root (testing).' } },
    additionalProperties: false,
  },
};

export const agentReportReadToolDef = {
  name: 'agent_report_read',
  description:
    "Read one Darshya agent report by relative path (e.g. '2026-07-13-health-smoke-02h.md' or 'cmo/2026-07-12-weekly-digest.md'). Truncates over 10k chars (set `limit` to raise). Rejects path traversal and absolute paths. Read-only.",
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Report relative path under docs/agent-reports/.' },
      limit: { type: 'number', description: 'Max chars to return (default 10000).' },
      root: { type: 'string', description: 'Override reports root (testing).' },
    },
    required: ['path'],
    additionalProperties: false,
  },
};
