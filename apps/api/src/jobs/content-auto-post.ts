import { prisma } from '../lib/prisma.js';
import { isRedditConfigured, submitRedditPost } from '../lib/reddit.js';

// Layer AO — auto-post APPROVED Reddit drafts.
//
// Quora has no public posting API. Quora drafts remain APPROVED forever and
// must be pasted manually from /admin/content-queue. We document this gap in
// docs/reddit-quora-autopost.md.
//
// Rate limiting (Reddit ToS friendly):
//   - Max 1 post per subreddit per 24h (the safelist enforces what we *can*
//     post to; this enforces *cadence* per sub).
//   - Max 2 posts per tick total.
//   - Identical title de-dupe: if a previous POSTED draft for the same
//     subreddit has the same normalised title, skip.
//
// All env-var gated: REDDIT_* missing → skipped.

// ─── Subreddit allowlist ──────────────────────────────────────────────────────
// Hardcoded. Auto-poster will refuse anything not in this set, regardless of
// what generation produced. Adjust by code change + review only.
export const REDDIT_AUTOPOST_ALLOWLIST: ReadonlySet<string> = new Set([
  'hinduism',
  'india',
  'indiaspeaks',
  'askhinduism',
  'bhajan',
  'indianbhajans',
]);

const PER_SUBREDDIT_COOLDOWN_HOURS = 24;
const MAX_POSTS_PER_TICK = 2;

function normSub(sub: string): string {
  return sub.replace(/^\/?r\//i, '').trim().toLowerCase();
}

function normTitle(t: string): string {
  return t.toLowerCase().replace(/\s+/g, ' ').trim();
}

interface AutoPostRow {
  id: string;
  type: string;
  title: string;
  body: string;
  target: string;
  status: string;
}

export interface AutoPostResult {
  attempted: number;
  posted: number;
  failed: number;
  skipped: number;
  errors: string[];
  ranAt: string;
  reason?: string;
}

async function loadCandidates(): Promise<AutoPostRow[]> {
  // Newest-first scan of APPROVED reddit drafts not yet posted.
  // Limit generously; per-sub cooldown filtering happens after.
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, type, title, body, target, status
         FROM content_drafts
        WHERE status = 'APPROVED' AND type = 'reddit' AND posted_at IS NULL
        ORDER BY approved_at ASC NULLS LAST, generated_at ASC
        LIMIT 50`,
    )) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      type: String(r.type),
      title: String(r.title),
      body: String(r.body),
      target: String(r.target),
      status: String(r.status),
    }));
  } catch {
    return [];
  }
}

async function recentPostsForSub(sub: string): Promise<{ titles: string[]; lastPostedAt: Date | null }> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT title, posted_at AS "postedAt"
         FROM content_drafts
        WHERE type = 'reddit'
          AND status = 'POSTED'
          AND lower(target) IN ($1, $2)
          AND posted_at IS NOT NULL
        ORDER BY posted_at DESC
        LIMIT 50`,
      sub,
      `r/${sub}`,
    )) as Array<{ title: string; postedAt: Date | string | null }>;
    const titles = rows.map((r) => normTitle(String(r.title)));
    const lastRaw = rows[0]?.postedAt;
    const lastPostedAt = lastRaw ? new Date(lastRaw as string) : null;
    return { titles, lastPostedAt };
  } catch {
    return { titles: [], lastPostedAt: null };
  }
}

async function markPosted(id: string, postedUrl: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE content_drafts
          SET status = 'POSTED', posted_at = now(), posted_url = $2
        WHERE id = $1`,
      id,
      postedUrl,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[content-auto-post] mark posted failed', err);
  }
}

function stripFlairFooter(body: string): { clean: string; flair: string | null } {
  // generation appends "\n\n[suggested flair: X]" — extract for the API call,
  // strip from the post body so it doesn't appear in the published text.
  const m = body.match(/\n*\[suggested flair:\s*([^\]]+)\]\s*$/i);
  if (!m) return { clean: body.trim(), flair: null };
  const flair = (m[1] ?? '').trim();
  const clean = body.slice(0, m.index ?? body.length).trim();
  return { clean, flair: flair || null };
}

export async function runContentAutoPost(): Promise<AutoPostResult> {
  const ranAt = new Date().toISOString();
  if (!isRedditConfigured()) {
    return {
      attempted: 0,
      posted: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      ranAt,
      reason: 'reddit env not configured',
    };
  }

  const candidates = await loadCandidates();
  if (candidates.length === 0) {
    return { attempted: 0, posted: 0, failed: 0, skipped: 0, errors: [], ranAt };
  }

  let attempted = 0;
  let posted = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Track per-sub state across this tick so we don't post twice to the same
  // sub within one run, even if recentPostsForSub didn't catch it yet.
  const tickPostedSubs = new Set<string>();

  for (const draft of candidates) {
    if (posted >= MAX_POSTS_PER_TICK) break;

    const sub = normSub(draft.target);
    if (!REDDIT_AUTOPOST_ALLOWLIST.has(sub)) {
      skipped++;
      continue;
    }
    if (tickPostedSubs.has(sub)) {
      skipped++;
      continue;
    }

    const { titles, lastPostedAt } = await recentPostsForSub(sub);
    if (lastPostedAt) {
      const ageHours = (Date.now() - lastPostedAt.getTime()) / 3_600_000;
      if (ageHours < PER_SUBREDDIT_COOLDOWN_HOURS) {
        skipped++;
        continue;
      }
    }
    if (titles.includes(normTitle(draft.title))) {
      skipped++;
      continue;
    }

    const { clean, flair } = stripFlairFooter(draft.body);
    attempted++;
    const result = await submitRedditPost({
      subreddit: sub,
      title: draft.title,
      text: clean,
      flairText: flair ?? undefined,
    });

    if (result.ok && result.url) {
      await markPosted(draft.id, result.url);
      posted++;
      tickPostedSubs.add(sub);
    } else {
      failed++;
      errors.push(`${draft.id}: ${result.reason ?? 'unknown'}`);
    }
  }

  return { attempted, posted, failed, skipped, errors, ranAt };
}

// Tick wrapper for master-cron — never throws.
export async function tickContentAutoPost(): Promise<AutoPostResult> {
  try {
    return await runContentAutoPost();
  } catch (err) {
    return {
      attempted: 0,
      posted: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      ranAt: new Date().toISOString(),
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export const __testing = { normSub, normTitle, stripFlairFooter };
