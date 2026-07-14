import { z } from 'zod';
import { exec } from 'node:child_process';

// Runs `git log -<count> --pretty=format:'%h|%an|%ad|%s' --date=short` in the
// cwd (the MCP server runs from the repo root). Pipe-delimited so we don't fight
// shell quoting across subjects. count is capped at 50, defaults to 10.
export const RecentCommitsSchema = z
  .object({
    count: z.number().int().positive().max(50).optional(),
  })
  .strict();

export async function recentCommits(args: z.infer<typeof RecentCommitsSchema>) {
  const count = args.count ?? 10;
  const cmd = `git log -${count} --pretty=format:%h|%an|%ad|%s --date=short`;

  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        resolve({
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ commits: [], error: stderr || err.message }, null, 2),
            },
          ],
        });
        return;
      }
      const commits = stdout
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const parts = line.split('|');
          const sha = parts[0] ?? '';
          const author = parts[1] ?? '';
          const date = parts[2] ?? '';
          const subject = parts.slice(3).join('|');
          return { sha, author, date, subject };
        });
      resolve({
        content: [{ type: 'text' as const, text: JSON.stringify({ commits }, null, 2) }],
      });
    });
  });
}

export const recentCommitsToolDef = {
  name: 'recent_commits',
  description:
    "Recent git commits on the current branch (sha, author, date, subject). Defaults to 10, max 50. Read-only. Use for 'what shipped recently?'",
  inputSchema: {
    type: 'object' as const,
    properties: {
      count: { type: 'number', description: 'Number of commits (default 10, max 50).' },
    },
    additionalProperties: false,
  },
};
