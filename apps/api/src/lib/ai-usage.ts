import { prisma } from './prisma.js';
import { cacheGet, cacheSet } from './cache.js';

/**
 * AI message usage gate — Layer M3 paywall.
 *
 * Plan tiers:
 *   - free:    5 messages / month / user
 *   - astro_session (₹99, durationDays:1): up to 30 messages while active
 *   - astro_monthly (₹499, durationDays:30): unlimited
 *
 * Storage strategy: NO new schema. We piggyback on the existing
 * `MarketplaceSubscription` rows (plan=BASIC|PRO, role=DEVOTEE) for the paid
 * tiers, and keep per-user counters in Redis (with a graceful in-memory
 * fallback when REDIS_URL is absent). Counters auto-expire so there is no
 * cron required — TTL handles the "monthly reset" semantics.
 *
 * Keys:
 *   ai:free:<userId>:<YYYY-MM>           int (TTL 35d) — free-tier monthly count
 *   ai:session:<userId>:<subId>          int (TTL durationDays) — paid session count
 *
 * Anonymous users (`anon-*`, `demo-*`) are routed straight through with no
 * counter — the existing 20/min IP rate-limit on /chat is the abuse guard.
 */

// ─── Tunables ────────────────────────────────────────────────────────────────

const FREE_MONTHLY_LIMIT = 5;
const SESSION_LIMIT = 30;

// ─── In-memory fallback when no Redis ────────────────────────────────────────

const memCounters = new Map<string, { value: number; expiresAt: number }>();

function memGet(key: string): number | null {
  const row = memCounters.get(key);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    memCounters.delete(key);
    return null;
  }
  return row.value;
}

function memSet(key: string, value: number, ttlSeconds: number): void {
  memCounters.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function counterGet(key: string): Promise<number> {
  const cached = await cacheGet<number>(key);
  if (typeof cached === 'number') return cached;
  return memGet(key) ?? 0;
}

async function counterIncr(key: string, ttlSeconds: number): Promise<number> {
  const next = (await counterGet(key)) + 1;
  await cacheSet(key, next, ttlSeconds);
  memSet(key, next, ttlSeconds);
  return next;
}

// ─── Subscription lookup ─────────────────────────────────────────────────────

interface ActivePlan {
  kind: 'session' | 'monthly';
  subscriptionId: string;
  endDate: Date;
}

/**
 * Returns the user's currently active astro plan, if any. Looks for the most
 * recent ACTIVE MarketplaceSubscription where role=DEVOTEE and the plan code
 * matches BASIC (session) or PRO (monthly). Falls back to null on DB error so
 * a flaky DB never strands paying users (they'll be treated as free, but
 * `/chat` won't 500).
 */
async function getActivePlan(userId: string): Promise<ActivePlan | null> {
  try {
    const sub = await prisma.marketplaceSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        role: 'DEVOTEE',
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) return null;
    if (sub.plan === 'BASIC') {
      return { kind: 'session', subscriptionId: sub.id, endDate: sub.endDate };
    }
    if (sub.plan === 'PRO') {
      return { kind: 'monthly', subscriptionId: sub.id, endDate: sub.endDate };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type UsageDecision =
  | { allowed: true; plan: 'free' | 'session' | 'monthly'; remaining: number | null; limit: number | null }
  | { allowed: false; reason: 'limit_reached'; plan: 'free' | 'session'; used: number; limit: number };

function isAnonymous(userId: string): boolean {
  return userId.startsWith('anon-') || userId.startsWith('demo-');
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns whether `userId` may send another chat message right now.
 * Read-only — does NOT increment counters.
 */
export async function canSendMessage(userId: string): Promise<UsageDecision> {
  if (isAnonymous(userId)) {
    return { allowed: true, plan: 'free', remaining: null, limit: null };
  }

  const active = await getActivePlan(userId);
  if (active?.kind === 'monthly') {
    return { allowed: true, plan: 'monthly', remaining: null, limit: null };
  }

  if (active?.kind === 'session') {
    const used = await counterGet(`ai:session:${userId}:${active.subscriptionId}`);
    if (used >= SESSION_LIMIT) {
      return { allowed: false, reason: 'limit_reached', plan: 'session', used, limit: SESSION_LIMIT };
    }
    return { allowed: true, plan: 'session', remaining: SESSION_LIMIT - used, limit: SESSION_LIMIT };
  }

  const used = await counterGet(`ai:free:${userId}:${monthKey()}`);
  if (used >= FREE_MONTHLY_LIMIT) {
    return { allowed: false, reason: 'limit_reached', plan: 'free', used, limit: FREE_MONTHLY_LIMIT };
  }
  return { allowed: true, plan: 'free', remaining: FREE_MONTHLY_LIMIT - used, limit: FREE_MONTHLY_LIMIT };
}

/**
 * Increment the appropriate usage counter after a chat message is accepted.
 * Idempotency is the caller's responsibility — call exactly once per
 * successful chat request.
 */
export async function recordMessage(userId: string): Promise<void> {
  if (isAnonymous(userId)) return;

  const active = await getActivePlan(userId);
  if (active?.kind === 'monthly') return;

  if (active?.kind === 'session') {
    const ttlSeconds = Math.max(
      60,
      Math.ceil((active.endDate.getTime() - Date.now()) / 1000),
    );
    await counterIncr(`ai:session:${userId}:${active.subscriptionId}`, ttlSeconds);
    return;
  }

  // Free-tier monthly counter — TTL slightly longer than a month so the key
  // survives across the rollover; the month-keyed name handles reset.
  await counterIncr(`ai:free:${userId}:${monthKey()}`, 35 * 24 * 60 * 60);
}

/**
 * Read-only summary for surfacing in the UI ("3 of 5 free messages today").
 */
export async function getUsageSummary(userId: string): Promise<{
  plan: 'free' | 'session' | 'monthly' | 'anonymous';
  used: number;
  limit: number | null;
  remaining: number | null;
}> {
  if (isAnonymous(userId)) {
    return { plan: 'anonymous', used: 0, limit: null, remaining: null };
  }
  const active = await getActivePlan(userId);
  if (active?.kind === 'monthly') {
    return { plan: 'monthly', used: 0, limit: null, remaining: null };
  }
  if (active?.kind === 'session') {
    const used = await counterGet(`ai:session:${userId}:${active.subscriptionId}`);
    return { plan: 'session', used, limit: SESSION_LIMIT, remaining: Math.max(0, SESSION_LIMIT - used) };
  }
  const used = await counterGet(`ai:free:${userId}:${monthKey()}`);
  return { plan: 'free', used, limit: FREE_MONTHLY_LIMIT, remaining: Math.max(0, FREE_MONTHLY_LIMIT - used) };
}

export const AI_USAGE_LIMITS = {
  FREE_MONTHLY_LIMIT,
  SESSION_LIMIT,
} as const;
