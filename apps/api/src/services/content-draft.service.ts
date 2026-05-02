import { prisma } from '../lib/prisma.js';
import { generateText, MODELS } from '../integrations/claude.js';

// Layer O — Reddit/Quora content seed automation.
// Generates genuine value-add devotional posts for organic outreach.
// All output flows through admin approval queue — never auto-posted.

const HAS_GROQ = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'demo-key';

// ─── 30-topic rotation pool ───────────────────────────────────────────────────
export const TOPIC_POOL: ReadonlyArray<string> = [
  'How to start a daily puja routine at home for working professionals',
  'Understanding gotra: what it means and how to find yours if your family lost track',
  'The 12 Jyotirlingas explained: significance and which one to visit first',
  'How panchang (tithi, nakshatra, yoga, karana) actually affects your day',
  'Why we light a diya during aarti — the science and symbolism',
  'Hanuman Chalisa: real benefits backed by tradition and personal experience',
  'Maha Mrityunjaya mantra — when to chant it and the correct pronunciation',
  'Sankalp explained: why every puja begins with one and how to write yours',
  'Difference between Shradh and Tarpan and why both matter',
  'Vastu basics for a small flat: 5 things you can fix without breaking walls',
  'Brahma Muhurta: why 4-6 AM matters and a realistic way to wake up then',
  'How to choose your ishta devata when you feel drawn to multiple deities',
  'The meaning behind Om Namah Shivaya — beyond the surface translation',
  'Reading the Bhagavad Gita for the first time: which translation and chapter to start with',
  'Why we offer water (arghya) to the rising sun — Surya Namaskar context',
  'Nakshatra and personality: what your birth star says about you',
  'Festival calendar: practical guide to the 8 most important Hindu festivals',
  'Tulsi puja at home: rules, mantras, and why it never leaves a Hindu household',
  'Difference between bhakti, jnana, and karma yoga — which path suits you',
  'Why we ring a bell entering a temple — the acoustics and the symbolism',
  'How to perform Ganesh puja before starting any new venture',
  'Mahalaya, Pitru Paksha, and ancestor worship: a beginner guide',
  'Navratri 9 days, 9 forms of Durga — meaning of each day',
  'Saraswati puja for students: when, how, and what really matters',
  'Rudraksha mala: how to choose, energize, and care for one',
  'The Saptapadi (seven vows) of a Hindu wedding — what each step means',
  'Why coconut, banana leaf, and turmeric show up in every puja',
  'Understanding karma: not punishment, but cause-and-effect across lifetimes',
  'Mantra japa with mala: correct technique, count, and posture',
  'Griha pravesh puja: what to do before moving into a new home',
];

// ─── Subreddits / Quora topics that match devotional content ──────────────────
export const REDDIT_TARGETS: ReadonlyArray<string> = [
  'r/hinduism',
  'r/india',
  'r/IndiaSpeaks',
  'r/AskHinduism',
  'r/bhajan',
];

export const QUORA_TOPICS: ReadonlyArray<string> = [
  'Hindu Rituals',
  'Hindu Mythology',
  'Puja',
  'Hindu Philosophy',
  'Hinduism',
];

// ─── Prompt builders ──────────────────────────────────────────────────────────

const REDDIT_SYSTEM_PROMPT = `You are a long-time devotee writing a genuine, helpful Reddit post in a Hindu / India subreddit. You are NOT marketing anything. You are sharing knowledge, asking thoughtful questions, or telling a personal experience.

RULES:
- Write like a real Redditor — first person, casual but respectful tone, no corporate language.
- 200-400 words. NEVER pad with filler.
- NO sales pitch. NO "I built an app". NO links to commercial sites — except: if (and only if) deeply relevant in the LAST paragraph, you may mention "darshya.online has free live darshan from these temples" or similar — once, naturally, optional.
- Use lowercase subreddit conventions (no headers in title case spam).
- Cite scripture or tradition where relevant — Bhagavad Gita chapter:verse, Upanishad name, etc.
- If you mention sources, be accurate. Don't fabricate verses.
- Avoid divisive politics, conversion debates, caste arguments.
- No emojis except the very occasional 🙏 if culturally fitting (max 1 per post).

Reply STRICTLY as a single JSON object with EXACTLY these keys, no markdown, no commentary:
{
  "title": "<the Reddit post title — 60-110 chars, no clickbait>",
  "body": "<the post body, 200-400 words, plain text with line breaks, no markdown headers>",
  "suggestedFlair": "<a short flair like 'Discussion', 'Knowledge', 'Question', 'Experience'>"
}

Do not wrap the JSON in code fences.`;

const QUORA_SYSTEM_PROMPT = `You are a knowledgeable Hindu devotee answering a question on Quora. Tone: thoughtful, well-structured, generous with detail.

RULES:
- 300-600 words.
- Direct, educational answer. Cite sources (Gita, Upanishads, specific puranas) where appropriate.
- Use 1-2 short paragraph breaks and at most one bullet list. No heavy markdown.
- NO sales pitch. NO commercial CTAs — except: in the last paragraph, you MAY include one casual mention like "If you want to watch live darshan from temples like Kashi Vishwanath or Tirupati, darshya.online streams them free." — only if relevant to the question.
- No emojis. No "Hope this helps!" filler.
- Avoid politics, conversion debates, sectarian disputes.

Reply STRICTLY as a single JSON object with EXACTLY these keys, no markdown, no commentary:
{
  "title": "<a short summary headline for admin reference, 40-80 chars>",
  "body": "<the answer body, 300-600 words, plain text>"
}

Do not wrap the JSON in code fences.`;

// ─── Result types ─────────────────────────────────────────────────────────────

export interface RedditPostDraft {
  title: string;
  body: string;
  subreddit: string;
  suggestedFlair: string;
}

export interface QuoraAnswerDraft {
  title: string;
  body: string;
  topic: string;
}

// ─── Core generators ──────────────────────────────────────────────────────────

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    const cleaned = raw
      .replace(/^[\s\S]*?\{/, '{')
      .replace(/\}[\s\S]*$/, '}');
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function generateRedditPost(params: {
  subreddit: string;
  topic: string;
}): Promise<RedditPostDraft | null> {
  if (!HAS_GROQ) return null;

  const userMessage = `Write a Reddit post for ${params.subreddit} about: "${params.topic}".

Tone: a long-time practitioner sharing genuine knowledge. Pick whichever angle feels most natural — personal experience, a question for the community, or a "did you know" explainer.

Output the JSON object only.`;

  const raw = await generateText({
    systemPrompt: REDDIT_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 900,
    model: MODELS.SONNET,
  });

  const parsed = safeParseJson(raw);
  const title = typeof parsed.title === 'string' ? parsed.title : '';
  const body = typeof parsed.body === 'string' ? parsed.body : '';
  const suggestedFlair =
    typeof parsed.suggestedFlair === 'string' ? parsed.suggestedFlair : 'Discussion';

  if (!title || !body) return null;

  return {
    title: title.trim(),
    body: body.trim(),
    subreddit: params.subreddit,
    suggestedFlair: suggestedFlair.trim(),
  };
}

export async function generateQuoraAnswer(params: {
  question: string;
  topic?: string;
}): Promise<QuoraAnswerDraft | null> {
  if (!HAS_GROQ) return null;

  const userMessage = `Answer this Quora question genuinely and thoroughly: "${params.question}"

Topic context: ${params.topic ?? 'Hindu rituals and philosophy'}.

Output the JSON object only.`;

  const raw = await generateText({
    systemPrompt: QUORA_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 1200,
    model: MODELS.SONNET,
  });

  const parsed = safeParseJson(raw);
  const title = typeof parsed.title === 'string' ? parsed.title : '';
  const body = typeof parsed.body === 'string' ? parsed.body : '';

  if (!title || !body) return null;

  return {
    title: title.trim(),
    body: body.trim(),
    topic: params.topic ?? 'Hindu Rituals',
  };
}

// ─── ContentDraft persistence (Prisma model OR raw SQL fallback) ──────────────
// Schema may not be migrated yet on every environment. We attempt the Prisma
// model first; if that fails, we run a raw CREATE TABLE IF NOT EXISTS and
// retry an INSERT via $executeRawUnsafe. Both paths are best-effort and
// failures are swallowed (logged to stderr) so the cron tick never crashes.

interface ContentDraftInsert {
  type: 'reddit' | 'quora' | 'twitter';
  title: string;
  body: string;
  target: string;
}

const CONTENT_DRAFT_DDL = `
CREATE TABLE IF NOT EXISTS content_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  target          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'DRAFT',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at     TIMESTAMPTZ,
  posted_at       TIMESTAMPTZ,
  posted_url      TEXT,
  rejected_reason TEXT
);
CREATE INDEX IF NOT EXISTS content_drafts_status_idx ON content_drafts(status, generated_at DESC);
CREATE INDEX IF NOT EXISTS content_drafts_type_idx ON content_drafts(type);
`;

let ddlAttempted = false;

async function ensureTable(): Promise<void> {
  if (ddlAttempted) return;
  ddlAttempted = true;
  try {
    await prisma.$executeRawUnsafe(CONTENT_DRAFT_DDL);
  } catch (err) {
    // pgcrypto may be missing; try uuid-ossp; otherwise log and move on.
    try {
      await prisma.$executeRawUnsafe(
        `CREATE EXTENSION IF NOT EXISTS pgcrypto;` + CONTENT_DRAFT_DDL,
      );
    } catch (err2) {
      // eslint-disable-next-line no-console
      console.warn('[content-draft] could not ensure content_drafts table', err2 ?? err);
    }
  }
}

export async function saveDraft(input: ContentDraftInsert): Promise<void> {
  await ensureTable();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO content_drafts (type, title, body, target, status)
       VALUES ($1, $2, $3, $4, 'DRAFT')`,
      input.type,
      input.title,
      input.body,
      input.target,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[content-draft] insert failed', err);
  }
}

export interface ContentDraftRow {
  id: string;
  type: string;
  title: string;
  body: string;
  target: string;
  status: string;
  generatedAt: string;
  approvedAt: string | null;
  postedAt: string | null;
  postedUrl: string | null;
  rejectedReason: string | null;
}

export async function listDrafts(status?: string): Promise<ContentDraftRow[]> {
  await ensureTable();
  try {
    const where = status ? `WHERE status = $1` : '';
    const args = status ? [status] : [];
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, type, title, body, target, status,
              generated_at AS "generatedAt",
              approved_at AS "approvedAt",
              posted_at AS "postedAt",
              posted_url AS "postedUrl",
              rejected_reason AS "rejectedReason"
       FROM content_drafts
       ${where}
       ORDER BY generated_at DESC
       LIMIT 200`,
      ...args,
    )) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      type: String(r.type),
      title: String(r.title),
      body: String(r.body),
      target: String(r.target),
      status: String(r.status),
      generatedAt:
        r.generatedAt instanceof Date ? r.generatedAt.toISOString() : String(r.generatedAt ?? ''),
      approvedAt:
        r.approvedAt instanceof Date ? r.approvedAt.toISOString() : (r.approvedAt as string | null),
      postedAt:
        r.postedAt instanceof Date ? r.postedAt.toISOString() : (r.postedAt as string | null),
      postedUrl: (r.postedUrl as string | null) ?? null,
      rejectedReason: (r.rejectedReason as string | null) ?? null,
    }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[content-draft] list failed', err);
    return [];
  }
}

export async function updateDraftStatus(
  id: string,
  status: 'APPROVED' | 'POSTED' | 'REJECTED',
  extra?: { postedUrl?: string; rejectedReason?: string; body?: string; title?: string },
): Promise<boolean> {
  await ensureTable();
  try {
    const sets: string[] = ['status = $2'];
    const args: unknown[] = [id, status];
    let i = 3;
    if (status === 'APPROVED') sets.push(`approved_at = now()`);
    if (status === 'POSTED') sets.push(`posted_at = now()`);
    if (extra?.postedUrl !== undefined) {
      sets.push(`posted_url = $${i++}`);
      args.push(extra.postedUrl);
    }
    if (extra?.rejectedReason !== undefined) {
      sets.push(`rejected_reason = $${i++}`);
      args.push(extra.rejectedReason);
    }
    if (extra?.body !== undefined) {
      sets.push(`body = $${i++}`);
      args.push(extra.body);
    }
    if (extra?.title !== undefined) {
      sets.push(`title = $${i++}`);
      args.push(extra.title);
    }
    await prisma.$executeRawUnsafe(
      `UPDATE content_drafts SET ${sets.join(', ')} WHERE id = $1`,
      ...args,
    );
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[content-draft] update failed', err);
    return false;
  }
}
