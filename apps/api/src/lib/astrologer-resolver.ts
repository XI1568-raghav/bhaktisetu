/**
 * Astrologer slug↔UUID resolver (Phase #10, 2026-06-08).
 *
 * Bridges the public-facing slug (e.g. 'astro_001') used in URL routes
 * to the real Supabase user UUID stored in `users` table when the astrologer
 * has completed onboarding + KYC.
 *
 * Owner KYC field decisions are still pending — this resolver ships the
 * indirection layer so route handlers can call resolveAstrologerUserId(slug)
 * today; the underlying lookup table (`astrologer_slug_map`) is populated
 * lazily once owner approves KYC field schema.
 *
 * Resolution order:
 *   1. astrologer_slug_map.user_id (preferred — set on admin approval)
 *   2. astrologerProfile.userId WHERE slug = $1 (fallback when profile exists)
 *   3. null — caller MUST handle (return 404 + log warn)
 *
 * The `astrologer_slug_map` table is created idempotently in ensure-schema.ts.
 */
import { prisma } from './prisma.js';

interface SlugMapRow {
  slug: string;
  user_id: string;
  verified_at: Date | null;
}

/**
 * Resolve a public slug to a Supabase user UUID.
 * Returns null if no mapping exists (caller must handle 404).
 */
export async function resolveAstrologerUserId(slug: string): Promise<string | null> {
  if (!slug || typeof slug !== 'string') return null;
  // Sanitize — slugs follow [a-z0-9_-]{2,64}.
  if (!/^[a-z0-9_-]{2,64}$/i.test(slug)) return null;

  // 1. Direct slug_map lookup.
  try {
    const rows = await prisma.$queryRawUnsafe<SlugMapRow[]>(
      `SELECT slug, user_id, verified_at FROM astrologer_slug_map WHERE slug = $1 LIMIT 1`,
      slug,
    );
    if (rows[0]?.user_id) return rows[0].user_id;
  } catch {
    /* table missing on cold prod — fall through */
  }

  // 2. astrologerProfile fallback — only if profile model has slug column.
  // (Schema may not yet expose slug; this is a defensive lookup.)
  try {
    const row = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
      `SELECT user_id FROM astrologer_profiles WHERE slug = $1 LIMIT 1`,
      slug,
    );
    if (row[0]?.user_id) return row[0].user_id;
  } catch {
    /* column missing — owner KYC decision pending */
  }

  return null;
}

/**
 * Reverse lookup — get slug from user UUID.
 * Used in admin UI to render slug column for verified astrologers.
 */
export async function resolveAstrologerSlug(userId: string): Promise<string | null> {
  if (!userId || typeof userId !== 'string') return null;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  try {
    const rows = await prisma.$queryRawUnsafe<SlugMapRow[]>(
      `SELECT slug FROM astrologer_slug_map WHERE user_id = $1::uuid LIMIT 1`,
      userId,
    );
    return rows[0]?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Admin-only: bind a slug to a user UUID after KYC approval.
 * Idempotent — re-binding the same slug updates verified_at.
 */
export async function bindAstrologerSlug(slug: string, userId: string): Promise<void> {
  if (!/^[a-z0-9_-]{2,64}$/i.test(slug)) {
    throw new Error('Invalid slug format');
  }
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error('Invalid user UUID format');
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO astrologer_slug_map (slug, user_id, verified_at)
     VALUES ($1, $2::uuid, now())
     ON CONFLICT (slug) DO UPDATE SET user_id = EXCLUDED.user_id, verified_at = now()`,
    slug,
    userId,
  );
}
