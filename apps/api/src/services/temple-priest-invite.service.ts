import { prisma } from '../lib/prisma.js';

/**
 * A temple manager cannot put a pandit on the temple roster on their own: the
 * roster row (TemplePriest) anchors that pandit's bookings to the temple and
 * routes the temple's share, so the pandit has to agree first.
 *
 * The manager's "add" therefore writes a PENDING row here. Only when the
 * invited pandit accepts is a TemplePriest row created, so every existing
 * consumer of TemplePriest (roster list, booking anchoring, the temple share)
 * sees accepted links only, without any of them changing. A declined or pending
 * invite never touches TemplePriest.
 *
 * TemplePriest has no status column and schema changes are not allowed (prod
 * migrations are applied by hand), so the invitation table is created lazily,
 * like gaushala_disbursements.
 */
let tableReady: Promise<void> | null = null;

export function ensureInviteTable(): Promise<void> {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS temple_priest_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        temple_id UUID NOT NULL,
        priest_id UUID NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
        invited_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        responded_at TIMESTAMPTZ,
        UNIQUE (temple_id, priest_id)
      )`);
  })().catch((err) => {
    tableReady = null;
    throw err;
  });
  return tableReady;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export type CreateInviteResult =
  | { kind: 'on_roster' }
  | { kind: 'invited'; id: string; status: 'pending'; created: boolean };

/**
 * Invite a pandit. Idempotent: inviting someone who already has a pending
 * invitation returns that invitation; someone already on the roster is
 * reported as such; a previously declined (or since-removed) pandit can be
 * invited again, which reopens the same row.
 */
export async function createInvite(input: {
  templeId: string;
  priestId: string;
  isPrimary: boolean;
  invitedBy: string;
}): Promise<CreateInviteResult> {
  await ensureInviteTable();

  const onRoster = await prisma.templePriest.findUnique({
    where: { templeId_priestId: { templeId: input.templeId, priestId: input.priestId } },
    select: { id: true },
  });
  if (onRoster) return { kind: 'on_roster' };

  const inserted = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO temple_priest_invites (temple_id, priest_id, is_primary, invited_by)
     VALUES ($1::uuid, $2::uuid, $3, $4::uuid)
     ON CONFLICT (temple_id, priest_id) DO UPDATE
       SET status = 'pending', is_primary = EXCLUDED.is_primary,
           invited_by = EXCLUDED.invited_by, created_at = now(), responded_at = NULL
       WHERE temple_priest_invites.status <> 'pending'
     RETURNING id`,
    input.templeId,
    input.priestId,
    input.isPrimary,
    input.invitedBy,
  );
  if (inserted[0]) return { kind: 'invited', id: inserted[0].id, status: 'pending', created: true };

  // Already pending: the same invitation, not a second one.
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM temple_priest_invites WHERE temple_id = $1::uuid AND priest_id = $2::uuid AND status = 'pending'`,
    input.templeId,
    input.priestId,
  );
  return { kind: 'invited', id: existing[0]!.id, status: 'pending', created: false };
}

export interface ManagerInviteRow {
  id: string;
  priestId: string;
  displayName: string;
  isPrimary: boolean;
  status: 'pending' | 'declined';
  invitedAt: string;
}

/** What a temple manager sees next to the roster: waiting and declined invitations. */
export async function listInvitesForTemple(templeId: string): Promise<ManagerInviteRow[]> {
  await ensureInviteTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      priest_id: string;
      display_name: string;
      is_primary: boolean;
      status: 'pending' | 'declined';
      created_at: Date | string;
    }>
  >(
    `SELECT i.id, i.priest_id, p.display_name, i.is_primary, i.status, i.created_at
       FROM temple_priest_invites i JOIN priests p ON p.id = i.priest_id
      WHERE i.temple_id = $1::uuid AND i.status IN ('pending','declined')
      ORDER BY i.created_at DESC`,
    templeId,
  );
  return rows.map((r) => ({
    id: r.id,
    priestId: r.priest_id,
    displayName: r.display_name,
    isPrimary: r.is_primary,
    status: r.status,
    invitedAt: new Date(r.created_at).toISOString(),
  }));
}

/** Withdraw a still-pending invitation. Scoped to the temple. */
export async function cancelInvite(templeId: string, inviteId: string): Promise<boolean> {
  await ensureInviteTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `DELETE FROM temple_priest_invites
      WHERE id = $1::uuid AND temple_id = $2::uuid AND status IN ('pending','declined')
      RETURNING id`,
    inviteId,
    templeId,
  );
  return rows.length > 0;
}

export interface PriestInviteRow {
  id: string;
  templeId: string;
  templeName: string;
  templeCity: string;
  isPrimary: boolean;
  invitedAt: string;
}

/** Pending invitations addressed to this pandit. */
export async function listPendingForPriest(priestId: string): Promise<PriestInviteRow[]> {
  await ensureInviteTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      temple_id: string;
      temple_name: string;
      temple_city: string;
      is_primary: boolean;
      created_at: Date | string;
    }>
  >(
    `SELECT i.id, i.temple_id, t.name AS temple_name, t.city AS temple_city, i.is_primary, i.created_at
       FROM temple_priest_invites i JOIN temples t ON t.id = i.temple_id
      WHERE i.priest_id = $1::uuid AND i.status = 'pending'
      ORDER BY i.created_at DESC`,
    priestId,
  );
  return rows.map((r) => ({
    id: r.id,
    templeId: r.temple_id,
    templeName: r.temple_name,
    templeCity: r.temple_city,
    isPrimary: r.is_primary,
    invitedAt: new Date(r.created_at).toISOString(),
  }));
}

export type RespondResult =
  | { kind: 'ok'; status: 'accepted' | 'declined'; templeId: string }
  | { kind: 'not_found' }
  | { kind: 'already_answered'; status: InviteStatus };

/**
 * The invited pandit answers. Only the pandit the invitation names can answer;
 * anyone else gets `not_found`, indistinguishable from an id that does not
 * exist. Answering the same way twice is a no-op success; answering the
 * opposite way after the fact is refused. Accepting is what creates the roster
 * row, atomically with marking the invitation accepted.
 */
export async function respondToInvite(input: {
  inviteId: string;
  priestId: string;
  accept: boolean;
}): Promise<RespondResult> {
  await ensureInviteTable();
  const next: 'accepted' | 'declined' = input.accept ? 'accepted' : 'declined';

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.$queryRawUnsafe<Array<{ temple_id: string; is_primary: boolean }>>(
      `UPDATE temple_priest_invites SET status = $3, responded_at = now()
        WHERE id = $1::uuid AND priest_id = $2::uuid AND status = 'pending'
        RETURNING temple_id, is_primary`,
      input.inviteId,
      input.priestId,
      next,
    );

    if (claimed[0]) {
      if (input.accept) {
        await tx.templePriest.upsert({
          where: {
            templeId_priestId: { templeId: claimed[0].temple_id, priestId: input.priestId },
          },
          create: {
            templeId: claimed[0].temple_id,
            priestId: input.priestId,
            isPrimary: claimed[0].is_primary,
          },
          update: {},
        });
      }
      return { kind: 'ok', status: next, templeId: claimed[0].temple_id } as const;
    }

    const current = await tx.$queryRawUnsafe<Array<{ status: InviteStatus; temple_id: string }>>(
      `SELECT status, temple_id FROM temple_priest_invites WHERE id = $1::uuid AND priest_id = $2::uuid`,
      input.inviteId,
      input.priestId,
    );
    if (!current[0]) return { kind: 'not_found' } as const;
    if (current[0].status === next) {
      return { kind: 'ok', status: next, templeId: current[0].temple_id } as const;
    }
    return { kind: 'already_answered', status: current[0].status } as const;
  });
}
