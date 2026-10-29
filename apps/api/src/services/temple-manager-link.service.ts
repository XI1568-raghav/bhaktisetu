import { prisma } from '../lib/prisma.js';
import { forgetProfileId } from '../lib/profile-id-memo.js';

/**
 * Explicit link between a temple manager (User) and the public Temple row they
 * run. Until now the two were joined only by matching the profile's temple name
 * against Temple.name, so a typo silently gave the manager an empty portal.
 *
 * The table is created lazily (like gaushala_disbursements): production
 * migrations are applied by hand and never on deploy, so a table this feature
 * needs must not depend on either.
 */
let tableReady: Promise<void> | null = null;

export function ensureTempleManagerLinksTable(): Promise<void> {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS temple_manager_links (
        manager_user_id UUID PRIMARY KEY,
        temple_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  })().catch((err) => {
    tableReady = null;
    throw err;
  });
  return tableReady;
}

/**
 * The Temple an admin explicitly linked this manager to, or null. Never throws:
 * a missing table or a DB hiccup must fall back to the name match rather than
 * lock managers out. A link whose Temple row is gone is ignored.
 */
export async function getLinkedTempleId(userId: string): Promise<string | null> {
  try {
    await ensureTempleManagerLinksTable();
    const rows = await prisma.$queryRawUnsafe<{ temple_id: string }[]>(
      `SELECT l.temple_id FROM temple_manager_links l
         JOIN temples t ON t.id = l.temple_id
        WHERE l.manager_user_id = $1::uuid LIMIT 1`,
      userId,
    );
    return Array.isArray(rows) && rows[0]?.temple_id ? rows[0].temple_id : null;
  } catch {
    return null;
  }
}

/** Upsert: re-linking the same manager just repoints them (idempotent). */
export async function setTempleManagerLink(userId: string, templeId: string): Promise<void> {
  await ensureTempleManagerLinksTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO temple_manager_links (manager_user_id, temple_id)
     VALUES ($1::uuid, $2::uuid)
     ON CONFLICT (manager_user_id) DO UPDATE SET temple_id = EXCLUDED.temple_id`,
    userId,
    templeId,
  );
  forgetProfileId('temple-link', userId);
}

export function slugifyTempleName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** First free slug: base, base-2, base-3 ... Falls back to a random suffix. */
export async function uniqueTempleSlug(name: string): Promise<string> {
  const base = slugifyTempleName(name) || 'temple';
  const rows = await prisma.temple.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
    take: 200,
  });
  const taken = new Set((rows ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export type CreateFromProfileResult =
  | { kind: 'no_profile' }
  | { kind: 'already_linked'; templeId: string }
  | { kind: 'linked_existing'; templeId: string }
  | { kind: 'created'; templeId: string; slug: string };

/**
 * Create the PUBLIC Temple row from the manager's profile and link it. The row
 * is created unverified (isVerified=false, status pending_review) so it is not
 * listed to devotees until an admin verifies it. Idempotent: an existing link
 * is returned as is, and a Temple that already carries the profile's name is
 * linked rather than duplicated.
 */
export async function createTempleFromProfile(userId: string): Promise<CreateFromProfileResult> {
  const existing = await getLinkedTempleId(userId);
  if (existing) return { kind: 'already_linked', templeId: existing };

  const profile = await prisma.templeProfile.findUnique({ where: { userId } });
  if (!profile) return { kind: 'no_profile' };
  const name = (profile.templeName ?? '').trim();
  if (!name) return { kind: 'no_profile' };

  const sameName = await prisma.temple.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (sameName?.id) {
    await setTempleManagerLink(userId, sameName.id);
    return { kind: 'linked_existing', templeId: sameName.id };
  }

  const city = (profile.city ?? '').trim();
  const state = (profile.state ?? '').trim();
  const data = {
    name,
    description: (profile.description ?? '').trim() || `${name}${city ? `, ${city}` : ''}.`,
    deityPrimary: (profile.deity ?? '').trim() || 'Not specified',
    deities: [] as string[],
    addressLine: (profile.address ?? '').trim() || city || 'Address pending',
    city,
    state,
    // Required columns the profile does not carry; an admin completes them
    // when verifying. The row stays hidden (status pending_review) until then.
    pincode: '',
    lat: 0,
    lng: 0,
    isVerified: false,
    status: 'pending_review' as const,
  };

  let created: { id: string; slug: string } | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const slug = await uniqueTempleSlug(name);
    try {
      created = await prisma.temple.create({ data: { ...data, slug }, select: { id: true, slug: true } });
    } catch (err) {
      // Lost a slug race with a concurrent create: pick again.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }
  if (!created) throw new Error('Could not allocate a unique temple slug');
  await setTempleManagerLink(userId, created.id);
  return { kind: 'created', templeId: created.id, slug: created.slug };
}
