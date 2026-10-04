/**
 * Reader for `GET /api/v1/lessons` — the Sanskrit-lesson progress payload.
 *
 * THE SHAPE, VERBATIM (apps/api/src/routes/lessons.ts:42-58):
 *
 *   {
 *     success: true,
 *     progress: [{ lessonId, score, completedAt }],
 *     streak:   { currentDays, longestDays, lastActiveDay } | null,
 *     badges:   [{ key, earnedAt }]
 *   }
 *
 * `app/(devotee)/learn-sanskrit.tsx` read `lessons` (never sent) and
 * `badges[].id` / `badges[].awardedAt` (also never sent). The first was a hard
 * crash — `undefined.map(...)` during render on every healthy 200 — and the
 * second painted a row of chips reading "undefined". Both are invisible to
 * `tsc` because the boundary was a hand-written interface asserted over
 * `res.json()`.
 *
 * The route also answers `{success, progress: [], streak: null, badges: []}`
 * for a synthetic (demo-/anon-) user or a DB-less instance, which is a real
 * empty state and reads as one here.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export interface LessonCompletion {
  lessonId: string;
  /** 0-100, as the server stored it. Never recomputed here. */
  score: number | null;
  completedAt: string | null;
}

export interface LessonStreak {
  currentDays: number;
  longestDays: number;
}

export interface LessonBadge {
  /** The server's own badge key, e.g. `perfect-score`. */
  key: string;
  earnedAt: string | null;
}

export interface LessonProgress {
  completed: LessonCompletion[];
  streak: LessonStreak | null;
  badges: LessonBadge[];
}

/** An empty, HONEST progress record — used when the request itself failed. */
export const EMPTY_LESSON_PROGRESS: LessonProgress = {
  completed: [],
  streak: null,
  badges: [],
};

export function selectLessonProgress(payload: unknown): LessonProgress {
  if (!isRecord(payload)) return EMPTY_LESSON_PROGRESS;

  const rawProgress = Array.isArray(payload.progress) ? payload.progress : [];
  const completed = rawProgress
    .map((row): LessonCompletion | null => {
      if (!isRecord(row)) return null;
      const lessonId = str(row.lessonId);
      if (!lessonId) return null;
      return { lessonId, score: num(row.score), completedAt: str(row.completedAt) };
    })
    .filter((r): r is LessonCompletion => r !== null);

  const rawStreak = isRecord(payload.streak) ? payload.streak : null;
  const currentDays = rawStreak ? num(rawStreak.currentDays) : null;
  const longestDays = rawStreak ? num(rawStreak.longestDays) : null;
  const streak =
    currentDays !== null && longestDays !== null ? { currentDays, longestDays } : null;

  const rawBadges = Array.isArray(payload.badges) ? payload.badges : [];
  const badges = rawBadges
    .map((row): LessonBadge | null => {
      if (!isRecord(row)) return null;
      const key = str(row.key);
      if (!key) return null;
      return { key, earnedAt: str(row.earnedAt) };
    })
    .filter((b): b is LessonBadge => b !== null);

  return { completed, streak, badges };
}

/**
 * A readable name for a badge key.
 *
 * The keys are a CLOSED set defined server-side (`BADGE_RULES`,
 * apps/api/src/routes/lessons.ts:16-25) and the API sends no display name, so
 * the label has to live client-side. An unknown key is humanised rather than
 * hidden — a badge the devotee earned must not vanish because this table is
 * behind the server.
 */
const BADGE_LABELS: Record<string, string> = {
  'first-lesson': 'First lesson',
  'lessons-10': '10 lessons',
  'lessons-25': '25 lessons',
  'lessons-50': '50 lessons',
  'perfect-score': 'Perfect score',
  'streak-3': '3-day streak',
  'streak-7': '7-day streak',
  'streak-30': '30-day streak',
};

export function badgeLabel(key: string): string {
  const known = BADGE_LABELS[key];
  if (known) return known;
  const humanised = key.replace(/[-_]+/g, ' ').trim();
  return humanised.length > 0 ? humanised.charAt(0).toUpperCase() + humanised.slice(1) : key;
}
