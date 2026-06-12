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

interface PlannedItem {
  id: string;
  title: string;
  priority: string;
  quarter: string;
  owner_role: string;
  est_hours: number | null;
}

interface ShippedItem {
  id: string;
  title: string;
  priority: string;
  quarter: string;
  owner_role: string;
  shipped_at: string | null;
}

interface InProgressItem {
  id: string;
  title: string;
  priority: string;
  quarter: string;
  owner_role: string;
}

interface QueueItem {
  name: string;
  role: string;
  itemId: string;
  cycleTs: string; // parsed from filename prefix
}

interface FiredTripwire {
  id: string;
  shortTitle: string;
}

type OrchestratorStatusResponse =
  | {
      ok: true;
      runs: NormalizedRun[];
      commits: NormalizedCommit[];
      queueCount: number;
      queueItems: QueueItem[];
      plannedTop: PlannedItem[];
      shippedRecent: ShippedItem[];
      inProgress: InProgressItem[];
      tripwiresFired: FiredTripwire[];
      tripwiresCount: number;
      nextCronAt: string;
      fetchedAt: string;
      rateLimit: { remaining: number | null; reset: number | null };
    }
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

async function fetchQueueDir(): Promise<{ count: number; items: QueueItem[] }> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/docs/roadmap/_dryrun/queue`;
  const res = await fetch(url, { headers: gh(), next: { revalidate: 30 } });
  if (res.status === 404) return { count: 0, items: [] };
  if (!res.ok) throw new Error(`gh contents ${res.status}`);
  const entries = (await res.json()) as QueueEntry[] | { message: string };
  if (!Array.isArray(entries)) return { count: 0, items: [] };
  const mds = entries.filter((e) => e.name.endsWith('.md'));
  // Filename pattern: 2026-06-12T00-01-49-218Z-{role}-{itemId}-{slug}.md
  const items: QueueItem[] = mds.slice(0, 20).map((e) => {
    const m = e.name.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-([a-z]+)-(R-Q\d+-[A-Z]+-\d+)-/);
    return {
      name: e.name,
      cycleTs: m ? m[1].replace(/-/g, ':').replace(/^(\d{4}):(\d{2}):(\d{2}):(\d{2}):(\d{2}):(\d{2}):(\d{3})Z$/, '$1-$2-$3T$4:$5:$6.$7Z') : '',
      role: m ? m[2] : '',
      itemId: m ? m[3] : '',
    };
  });
  return { count: mds.length, items };
}

interface IndexItem {
  id: string;
  title: string;
  priority: string;
  quarter: string;
  status: string;
  owner_role: string;
  agent_assignable?: boolean;
  founder_blocker?: string | null;
  est_hours?: number | null;
  shipped_at?: string | null;
  updated_at?: string | null;
}

async function fetchIndex(): Promise<IndexItem[]> {
  // _index.json maintained by pre-commit hook on every roadmap item change.
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/docs/roadmap/_index.json`;
  const res = await fetch(url, { headers: gh(), next: { revalidate: 60 } });
  if (!res.ok) return [];
  const file = (await res.json()) as { content?: string; encoding?: string; download_url?: string };
  let raw: string;
  if (file.content && file.encoding === 'base64') {
    raw = atob(file.content.replace(/\n/g, ''));
  } else if (file.download_url) {
    const dl = await fetch(file.download_url, { next: { revalidate: 60 } });
    if (!dl.ok) return [];
    raw = await dl.text();
  } else {
    return [];
  }
  const index = JSON.parse(raw) as { items?: IndexItem[] };
  return index.items || [];
}

function rankPlanned(items: IndexItem[]): PlannedItem[] {
  const priorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const quarterRank = (q: string): number => Number(q.replace('Q', '')) || 99;
  return items
    .filter((i) => i.status === 'planned' && i.agent_assignable !== false && !i.founder_blocker)
    .sort((a, b) => {
      const p = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      if (p !== 0) return p;
      return quarterRank(a.quarter) - quarterRank(b.quarter);
    })
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      title: i.title.length > 80 ? i.title.slice(0, 77) + '…' : i.title,
      priority: i.priority,
      quarter: i.quarter,
      owner_role: i.owner_role,
      est_hours: i.est_hours ?? null,
    }));
}

function selectShippedRecent(items: IndexItem[]): ShippedItem[] {
  // Items flipped to shipped in last 14d (or w/ shipped_at in last 14d).
  // Sort newest first. Cap 10.
  const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
  const shipped = items
    .filter((i) => i.status === 'shipped')
    .filter((i) => {
      const ts = i.shipped_at || i.updated_at;
      if (!ts) return false;
      return new Date(ts).getTime() >= cutoff;
    })
    .sort((a, b) => {
      const ta = new Date(a.shipped_at || a.updated_at || 0).getTime();
      const tb = new Date(b.shipped_at || b.updated_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, 10);
  return shipped.map((i) => ({
    id: i.id,
    title: i.title.length > 80 ? i.title.slice(0, 77) + '…' : i.title,
    priority: i.priority,
    quarter: i.quarter,
    owner_role: i.owner_role,
    shipped_at: i.shipped_at ?? i.updated_at ?? null,
  }));
}

function selectInProgress(items: IndexItem[]): InProgressItem[] {
  return items
    .filter((i) => i.status === 'in_progress')
    .slice(0, 10)
    .map((i) => ({
      id: i.id,
      title: i.title.length > 80 ? i.title.slice(0, 77) + '…' : i.title,
      priority: i.priority,
      quarter: i.quarter,
      owner_role: i.owner_role,
    }));
}

async function fetchTripwires(): Promise<{ count: number; fired: FiredTripwire[] }> {
  // _tripwires-global.yml count + check last decision note for fired ones.
  // Cheap: fetch the YAML once, parse trip line markers, no full YAML parser needed.
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/docs/roadmap/_tripwires-global.yml`;
  const res = await fetch(url, { headers: gh(), next: { revalidate: 300 } });
  if (!res.ok) return { count: 0, fired: [] };
  const file = (await res.json()) as { content?: string; encoding?: string };
  if (!file.content || file.encoding !== 'base64') return { count: 0, fired: [] };
  const raw = atob(file.content.replace(/\n/g, ''));
  const idLines = raw.match(/^\s*-\s*id:\s*['"]?(T-\d+)/gm) || [];
  return { count: idLines.length, fired: [] }; // 'fired' empty until decision-note scrape added
}

// Next cron fire time from cron expr `17 */8 * * *` (minute=17, hour every 8h).
function nextCronAt(now: Date): string {
  const fireHours = [0, 8, 16];
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    for (const h of fireHours) {
      const candidate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + dayOffset,
        h, 17, 0, 0,
      ));
      if (candidate.getTime() > now.getTime()) return candidate.toISOString();
    }
  }
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString(); // fallback
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
    // Parallel fan-out — 5 calls independent. allSettled so one failure doesn't kill all.
    const [runsR, commitsR, queueR, indexR, tripwiresR] = await Promise.allSettled([
      fetchRuns(),
      fetchCommits(),
      fetchQueueDir(),
      fetchIndex(),
      fetchTripwires(),
    ]);

    const runsResult = runsR.status === 'fulfilled' ? runsR.value : { runs: [], remaining: null, reset: null };
    const commits = commitsR.status === 'fulfilled' ? commitsR.value : [];
    const queue = queueR.status === 'fulfilled' ? queueR.value : { count: 0, items: [] };
    const indexItems = indexR.status === 'fulfilled' ? indexR.value : [];
    const planned = rankPlanned(indexItems);
    const shippedRecent = selectShippedRecent(indexItems);
    const inProgress = selectInProgress(indexItems);
    const tripwires = tripwiresR.status === 'fulfilled' ? tripwiresR.value : { count: 0, fired: [] };

    const payload: OrchestratorStatusResponse = {
      ok: true,
      runs: runsResult.runs.map(normalizeRun),
      commits: commits.map(normalizeCommit),
      queueCount: queue.count,
      queueItems: queue.items,
      plannedTop: planned,
      shippedRecent,
      inProgress,
      tripwiresFired: tripwires.fired,
      tripwiresCount: tripwires.count,
      nextCronAt: nextCronAt(new Date()),
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
