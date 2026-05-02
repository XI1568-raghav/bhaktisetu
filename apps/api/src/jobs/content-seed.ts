import {
  generateRedditPost,
  generateQuoraAnswer,
  saveDraft,
  TOPIC_POOL,
  REDDIT_TARGETS,
  QUORA_TOPICS,
} from '../services/content-draft.service.js';

// Daily content seed cron. Generates 2 Reddit drafts + 2 Quora drafts and
// stores them as DRAFT in content_drafts. Never auto-posts. Admin reviews,
// edits, approves, then manually posts and marks POSTED.

export interface ContentSeedResult {
  redditOk: number;
  redditFailed: number;
  quoraOk: number;
  quoraFailed: number;
  skipped?: boolean;
  reason?: string;
}

const HAS_GROQ = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'demo-key';

// Daily gate — once per UTC day, in-process. Render free tier restarts often,
// so this is best-effort; the underlying Reddit/Quora sites obviously rate-
// limit at the human level (we never auto-post anyway).
let lastRunUtcDay: string | null = null;

function todayUtcKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickN<T>(arr: ReadonlyArray<T>, n: number, seed: number): T[] {
  // Deterministic-ish rotation by day: avoids drawing duplicates within a tick
  // and rotates topics across days without an RNG dependency.
  const out: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    let idx = (seed + i * 7) % arr.length;
    let guard = 0;
    while (used.has(idx) && guard < arr.length) {
      idx = (idx + 1) % arr.length;
      guard++;
    }
    used.add(idx);
    const item = arr[idx];
    if (item !== undefined) out.push(item);
  }
  return out;
}

export async function runContentSeed(force = false): Promise<ContentSeedResult> {
  if (!HAS_GROQ) {
    return {
      redditOk: 0,
      redditFailed: 0,
      quoraOk: 0,
      quoraFailed: 0,
      skipped: true,
      reason: 'GROQ_API_KEY not set',
    };
  }
  const todayKey = todayUtcKey();
  if (!force && lastRunUtcDay === todayKey) {
    return {
      redditOk: 0,
      redditFailed: 0,
      quoraOk: 0,
      quoraFailed: 0,
      skipped: true,
      reason: 'already ran today',
    };
  }
  lastRunUtcDay = todayKey;

  // Day-of-year as rotation seed
  const start = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 0));
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);

  const redditTopics = pickN(TOPIC_POOL, 2, dayOfYear);
  const quoraTopics = pickN(TOPIC_POOL, 2, dayOfYear + 13);
  const redditSubs = pickN(REDDIT_TARGETS, 2, dayOfYear);
  const quoraTopicTags = pickN(QUORA_TOPICS, 2, dayOfYear + 5);

  let redditOk = 0;
  let redditFailed = 0;
  let quoraOk = 0;
  let quoraFailed = 0;

  for (let i = 0; i < redditTopics.length; i++) {
    const topic = redditTopics[i]!;
    const subreddit = redditSubs[i] ?? redditSubs[0] ?? 'r/hinduism';
    try {
      const draft = await generateRedditPost({ subreddit, topic });
      if (draft) {
        await saveDraft({
          type: 'reddit',
          title: draft.title,
          body: `${draft.body}\n\n[suggested flair: ${draft.suggestedFlair}]`,
          target: draft.subreddit,
        });
        redditOk++;
      } else {
        redditFailed++;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[content-seed] reddit generation failed', err);
      redditFailed++;
    }
  }

  for (let i = 0; i < quoraTopics.length; i++) {
    const topic = quoraTopics[i]!;
    const tag = quoraTopicTags[i] ?? quoraTopicTags[0] ?? 'Hindu Rituals';
    try {
      const draft = await generateQuoraAnswer({ question: topic, topic: tag });
      if (draft) {
        await saveDraft({
          type: 'quora',
          title: draft.title,
          body: draft.body,
          target: draft.topic,
        });
        quoraOk++;
      } else {
        quoraFailed++;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[content-seed] quora generation failed', err);
      quoraFailed++;
    }
  }

  return { redditOk, redditFailed, quoraOk, quoraFailed };
}

// Tick wrapper for master-cron — daily-gated, never throws.
export async function tickContentSeed(): Promise<ContentSeedResult> {
  try {
    return await runContentSeed(false);
  } catch (err) {
    return {
      redditOk: 0,
      redditFailed: 0,
      quoraOk: 0,
      quoraFailed: 0,
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
