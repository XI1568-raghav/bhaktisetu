// app/api/orchestrator-status/route.ts
// Live status of Autonomous Roadmap Engine — reads GitHub Actions API + git contents.
// Replaces the dead Render-disk endpoint (orchestrator now runs on GH runners, not Render).
//
// Three GitHub REST calls per request (cached 30s server-side):
//   1. workflow runs:    /repos/{owner}/{repo}/actions/workflows/roadmap-loop.yml/runs?per_page=10
//   2. recent commits:   /repos/{owner}/{repo}/commits?author=orchestrator-bot[bot]&per_page=10
//   3. queue dir count:  /repos/{owner}/{repo}/contents/docs/roadmap/_dryrun/queue (HEAD via length)
//
// Auth: none required (public repo). Optional GITHUB_TOKEN env bumps rate limit 60→5000/h.

export const runtime = 'edge';
export const revalidate = 30; // cache 30s — UI polls every 10s, 3 polls share 1 GH call

const OWNER = 'XI1568-raghav';
const REPO = 'bhaktisetu';
const WORKFLOW_FILE = 'roadmap-loop.yml';

interface WorkflowRun {
  id: number;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_started_at: string;
  display_title: string;
}

interface Commit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  html_url: string;
  author: { login: string } | null;
}

interface QueueEntry {
  name: string;
  size: number;
  download_url: string | null;
}

type OrchestratorStatusResponse =
  | { ok: true; runs: NormalizedRun[]; commits: NormalizedCommit[]; queueCount: number; fetchedAt: string; rateLimit: { remaining: number | null; reset: number | null } }
  | { ok: false; error: string };

interface NormalizedRun {
  id: number;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  title: string;
  wallSeconds: number;
}

interface NormalizedCommit {
  sha: string;
  shortSha: string;
  message: string;
  date: string;
  htmlUrl: string;
}

function gh(headers: HeadersInit = {}): HeadersInit {
  const token = process.env.GITHUB_TOKEN; // optional — only for higher rate limit
  return {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'bhaktisetu-orchestrator-status',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
}

async function fetchRuns(): Promise<{ runs: WorkflowRun[]; remaining: number | null; reset: number | null }> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=10`;
  const res = await fetch(url, { headers: gh(), next: { revalidate: 30 } });
  const remaining = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (!res.ok) throw new Error(`gh runs ${res.status}`);
  const data = (await res.json()) as { workflow_runs: WorkflowRun[] };
  return {
    runs: data.workflow_runs || [],
    remaining: remaining ? Number(remaining) : null,
    reset: reset ? Number(reset) : null,
  };
}

async function fetchCommits(): Promise<Commit[]> {
  // GH `?author=` filters by commit author email match; for bot commits we filter post-hoc by name.
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=30`;
  const res = await fetch(url, { headers: gh(), next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`gh commits ${res.status}`);
  const all = (await res.json()) as Commit[];
  return all.filter((c) => c.commit.author?.name?.includes('orchestrator-bot')).slice(0, 10);
}

async function fetchQueueCount(): Promise<number> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/docs/roadmap/_dryrun/queue`;
  const res = await fetch(url, { headers: gh(), next: { revalidate: 30 } });
  if (res.status === 404) return 0; // dir may not exist yet
  if (!res.ok) throw new Error(`gh contents ${res.status}`);
  const entries = (await res.json()) as QueueEntry[] | { message: string };
  if (!Array.isArray(entries)) return 0;
  return entries.filter((e) => e.name.endsWith('.md')).length;
}

function normalizeRun(r: WorkflowRun): NormalizedRun {
  const started = new Date(r.run_started_at || r.created_at).getTime();
  const updated = new Date(r.updated_at).getTime();
  const wallSeconds = Math.max(0, Math.round((updated - started) / 1000));
  return {
    id: r.id,
    status: r.status,
    conclusion: r.conclusion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
    title: r.display_title || `run ${r.id}`,
    wallSeconds,
  };
}

function normalizeCommit(c: Commit): NormalizedCommit {
  return {
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0] ?? '',
    date: c.commit.author?.date ?? '',
    htmlUrl: c.html_url,
  };
}

export async function GET(): Promise<Response> {
  try {
    // Parallel fan-out — all 3 calls independent.
    const [runsResult, commits, queueCount] = await Promise.all([
      fetchRuns(),
      fetchCommits(),
      fetchQueueCount(),
    ]);

    const payload: OrchestratorStatusResponse = {
      ok: true,
      runs: runsResult.runs.map(normalizeRun),
      commits: commits.map(normalizeCommit),
      queueCount,
      fetchedAt: new Date().toISOString(),
      rateLimit: { remaining: runsResult.remaining, reset: runsResult.reset },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
}
