import { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { httpUrl } from '../lib/http-url.js';
import { BookingStatus, StreamStatus, StreamProvider } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { donorContactMap } from '../lib/donation-contact.js';
import { doneeTaxSchema, maskTaxId, readDoneeTax, taxInfoView, writeDoneeTax } from '../lib/donee-tax.js';
import { provedBookingIds, shareRelease } from '../lib/temple-share-release.js';
import { getLinkedTempleId } from '../services/temple-manager-link.service.js';
import { memoProfileId } from '../lib/profile-id-memo.js';
import { cancelInvite, createInvite, listInvitesForTemple } from '../services/temple-priest-invite.service.js';

/**
 * Temple manager self-service routes. Today scoped via ?slug=<temple-slug>
 * — schema does not yet have an explicit Temple ↔ TempleManager relation, so
 * the gate is "user has TEMPLE_MANAGER role". Once a relation exists, lock
 * down to managers of that specific temple.
 */

const HH_MM_RANGE = /^\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*$/;

const timingsSchema = z.object({
  regularHours: z.record(z.string().regex(HH_MM_RANGE, 'must be HH:MM - HH:MM')),
  closedOn: z.string().nullable().optional(),
  specialDays: z.string().nullable().optional(),
});

// Temple-puja offering CRUD. Mirrors the temple_puja_offerings columns —
// templeId comes from the resolved temple, not the body, so it's omitted.
const pujaOfferingCreateSchema = z.object({
  pujaTypeId: z.string().uuid(),
  priceOverride: z.number().nonnegative().nullable().optional(),
  nriPrice: z.number().nonnegative().nullable().optional(),
  assignedPriestId: z.string().uuid().nullable().optional(),
  availableSlots: z.array(z.unknown()).max(200).optional(),
  maxBookingsPerSlot: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});
const pujaOfferingUpdateSchema = pujaOfferingCreateSchema.partial();

// Darshan stream CRUD. youtube fields optional — when streamProvider is
// YOUTUBE, the portal sets youtubeVideoId; for IVS/EXTERNAL_RTMP only
// streamKey + playbackUrl matter.
const STREAM_PROVIDERS = ['YOUTUBE', 'IVS', 'EXTERNAL_RTMP'] as const;
const STREAM_STATUSES = ['offline', 'live', 'scheduled'] as const;
const STREAM_STATUS_PATCH = ['scheduled', 'live', 'ended'] as const;

const darshanCreateSchema = z.object({
  streamKey: z.string().min(1).max(200),
  playbackUrl: httpUrl('playbackUrl', 1000),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  cameraLocation: z.string().max(200).optional(),
  streamProvider: z.enum(STREAM_PROVIDERS).optional(),
  youtubeVideoId: z.string().max(40).optional(),
  youtubeChannelId: z.string().max(60).optional(),
  attribution: z.string().max(200).optional(),
  scheduledStart: z.string().datetime().optional(),
  isPremium: z.boolean().optional(),
  status: z.enum(STREAM_STATUSES).optional(),
});
const darshanUpdateSchema = darshanCreateSchema.partial();
const darshanStatusSchema = z.object({ status: z.enum(STREAM_STATUS_PATCH) });

export const __testing = {
  pujaOfferingCreateSchema,
  pujaOfferingUpdateSchema,
  darshanCreateSchema,
  darshanUpdateSchema,
  darshanStatusSchema,
};

function hasTempleManagerRole(req: { currentUser?: { roles?: string[] } }): boolean {
  return req.currentUser?.roles?.includes('TEMPLE_MANAGER') ?? false;
}

type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * Layer AM gate. If the temple is linked to an Org (org_id set), only
 * OWNER/ADMIN of that org may edit. P0 #B1 (2026-07-09): legacy unlinked
 * temples (no org_id) are admin-ONLY editable — the old `return
 * hasManagerRole` fallback let ANY TEMPLE_MANAGER overwrite ANY unlinked
 * temple's timingInfo by guessing the slug. Unlinked temples must be
 * migrated to an org (or made admin-only) to be editable.
 */
async function userCanEditTemple(
  templeId: string,
  userId: string,
  hasManagerRole: boolean,
  isAdmin: boolean,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ org_id: string | null }[]>(
    `SELECT org_id FROM temples WHERE id = $1::uuid LIMIT 1`,
    templeId,
  );
  const orgId = rows[0]?.org_id;
  if (!orgId) {
    if (isAdmin) return true;
    // An unlinked temple is editable by the one approved manager whose profile
    // resolves to THIS temple, and nobody else. Nothing links a temple to an
    // org, so without this the schedule editor answered 403 to every temple's
    // own manager. Any other manager still resolves to a different temple (or
    // none), so guessing a slug does not help.
    return hasManagerRole && (await resolveManagerTempleId(userId)) === templeId;
  }
  const member = await prisma.$queryRawUnsafe<{ role: OrgRole }[]>(
    `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
    orgId,
    userId,
  );
  const role = member[0]?.role;
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Resolve the Temple this TEMPLE_MANAGER owns. Mirrors the dashboard's
 * name-match shim (TempleProfile ↔ Temple have no FK today, see
 * schema.prisma TempleProfile comment). Returns null when the manager has
 * no profile or the profile name doesn't match any Temple row.
 */
export async function resolveManagerTempleId(userId: string): Promise<string | null> {
  return (await resolveManagerTemple(userId)).templeId;
}

export type TempleLinkReason = 'linked' | 'no_temple_profile' | 'not_approved' | 'no_matching_temple';

/**
 * S-06: the same resolution, but it says WHY it failed.
 *
 * A manager with no TempleProfile and a manager whose profile name matches no
 * Temple row were indistinguishable — both produced a silent `{offerings: []}`
 * on GET and `400 {"error":"No matched Temple for this manager"}` on POST. The
 * slots editor shipped in #231 is correct; it was stranded behind this.
 *
 * The name match is also case- and whitespace-tolerant now. "Somnath Temple "
 * typed into the profile form should still find `Somnath Temple`; there is no
 * FK between TempleProfile and Temple to fall back on (schema.prisma:1058).
 */
async function resolveManagerTemple(
  userId: string,
): Promise<{ templeId: string | null; reason: TempleLinkReason }> {
  // Nearly every temple-portal tab starts here, and the lookup below is up to
  // three round trips to the remote database in a row. A manager's linked temple
  // is remembered for 30 s (setTempleManagerLink forgets it at once); a manager
  // who is NOT linked yet is never cached, so linking takes effect immediately.
  let fresh: { templeId: string | null; reason: TempleLinkReason } | null = null;
  const cached = await memoProfileId('temple-link', userId, async () => {
    fresh = await resolveManagerTempleUncached(userId);
    return fresh.reason === 'linked' ? fresh.templeId : null;
  }, 30_000);
  if (cached) return { templeId: cached, reason: 'linked' };
  return fresh ?? (await resolveManagerTempleUncached(userId));
}

async function resolveManagerTempleUncached(
  userId: string,
): Promise<{ templeId: string | null; reason: TempleLinkReason }> {
  // An admin's explicit link (temple_manager_links) wins over the name match.
  // The profile read does not depend on it, so both start together.
  const [explicit, profile] = await Promise.all([
    getLinkedTempleId(userId),
    prisma.templeProfile.findUnique({
      where: { userId },
      select: { templeName: true, approved: true },
    }),
  ]);
  if (explicit) return { templeId: explicit, reason: 'linked' };
  if (!profile) return { templeId: null, reason: 'no_temple_profile' };
  // Anyone can sign up as a temple manager and type any temple's name into
  // their profile. Until an admin has approved that profile the name is just a
  // claim, so it must not open a real temple's donors, bookings or payouts.
  if (!profile.approved) return { templeId: null, reason: 'not_approved' };
  const name = (profile.templeName ?? '').trim();
  if (!name) return { templeId: null, reason: 'no_matching_temple' };
  const temple = await prisma.temple.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  return temple?.id
    ? { templeId: temple.id, reason: 'linked' }
    : { templeId: null, reason: 'no_matching_temple' };
}

const TEMPLE_LINK_MESSAGE: Record<Exclude<TempleLinkReason, 'linked'>, string> = {
  no_temple_profile:
    'Your temple profile is not set up yet, so offerings cannot be attached to a temple. Complete your temple profile to start listing pujas.',
  not_approved:
    'Your portal is active. Your temple is not linked to a public temple page yet: add a description and a full address to your profile, or the Darshya team confirms that you manage a temple whose name is already listed. Pujas, bookings and donations appear here once it is linked.',
  no_matching_temple:
    'Your temple profile is not connected to a public temple page on Darshya yet; the Darshya team connects it by hand, and your bookings and offerings will appear here once that is done.',
};

/** 409 with the real blocker, instead of the raw "No matched Temple" string. */
function notLinked(reply: FastifyReply, reason: TempleLinkReason) {
  return reply.code(409).send({
    code: 'temple_not_linked',
    error: 'Temple not linked',
    reason,
    message: TEMPLE_LINK_MESSAGE[reason as Exclude<TempleLinkReason, 'linked'>],
  });
}

/** Upper bound on TemplePayout rows read for the dashboard's released/upcoming split. */
const DASHBOARD_SHARE_SCAN_CAP = 5000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A manager may only pin a priest who is on THIS temple's roster, i.e. one who
 * accepted the invitation. Pinning is what auto-assigns bookings to that pandit
 * (dispatch.service pinned-priest path), so without this check a manager could
 * put any pandit's name on their offerings without the pandit ever consenting.
 * Returns an error string, or null when the id may be used.
 */
async function pinnedPriestError(templeId: string, priestId: string | null | undefined): Promise<string | null> {
  if (!priestId) return null;
  const onRoster = await prisma.templePriest.findFirst({
    where: { templeId, priestId },
    select: { id: true },
  });
  return onRoster ? null : 'That priest is not on your temple roster. Invite them first; they must accept before you can assign them.';
}

export async function templePortalRoutes(server: FastifyInstance) {
  // Every `:id` in this file is a UUID column. A malformed one reached Prisma and
  // came back as a 500; it can only ever be "not found".
  server.addHook('preValidation', async (request, reply) => {
    const id = (request.params as { id?: unknown } | undefined)?.id;
    if (typeof id === 'string' && !UUID_RE.test(id)) {
      return reply.code(404).send({ error: 'Not found' });
    }
  });

  // GET /dashboard — TempleProfile + booking/donation aggregates when the
  // marketplace temple-profile is linkable to a real Temple row by name match
  // (no FK exists today — see schema.prisma:779-797). Falls back to zeros if
  // no matching Temple row.
  server.get('/dashboard', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }

    const profile = await prisma.templeProfile.findUnique({ where: { userId } });
    if (!profile) {
      return reply.send({
        profile: null,
        stats: {
          totalBookings: 0, monthBookings: 0, totalRevenueInr: 0, monthRevenueInr: 0,
          releasedInr: 0, monthReleasedInr: 0, upcomingInr: 0, monthUpcomingInr: 0, totalStreams: 0,
        },
        recentBookings: [],
      });
    }

    // Same resolution as every other tab: approved profile, name matched case-
    // and whitespace-tolerantly. The dashboard used to match the name exactly,
    // so it showed zeros while the Bookings tab listed real bookings.
    const link = await resolveManagerTemple(userId);
    const templeId = link.templeId;

    if (!templeId) {
      return reply.send({
        profile,
        stats: {
          totalBookings: 0, monthBookings: 0,
          totalRevenueInr: 0, monthRevenueInr: 0,
          releasedInr: 0, monthReleasedInr: 0, upcomingInr: 0, monthUpcomingInr: 0,
          totalStreams: profile.totalStreams,
        },
        recentBookings: [],
        templeLinked: false,
        reason: link.reason,
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Every paid, live booking. This listed only confirmed + completed, so the
    // count fell to 0 the moment a pandit accepted (priest_assigned) and stayed
    // there through in_progress, video_uploaded and delivered, while the Bookings
    // tab listed them all.
    const baseWhere = {
      templeId,
      status: {
        in: [
          BookingStatus.confirmed,
          BookingStatus.priest_assigned,
          BookingStatus.in_progress,
          BookingStatus.completed,
          BookingStatus.video_uploaded,
          BookingStatus.delivered,
        ],
      },
    };
    // "Revenue" is what the temple earns: its TemplePayout rows. A reversed row
    // belongs to a refunded booking and is not an earning. This used to sum
    // PujaBooking.priceAmount, the devotee's whole payment including the
    // platform fee and the provider's share.
    const shareWhere = {
      templeId,
      status: { in: ['pending', 'completed'] as ('pending' | 'completed')[] },
    };

    const [totalCount, monthCount, shareRows, recent] = await Promise.all([
      prisma.pujaBooking.count({ where: baseWhere }),
      prisma.pujaBooking.count({ where: { ...baseWhere, createdAt: { gte: monthStart } } }),
      prisma.templePayout.findMany({
        where: shareWhere,
        select: { bookingId: true, amount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: DASHBOARD_SHARE_SCAN_CAP,
      }),
      prisma.pujaBooking.findMany({
        where: { templeId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { fullName: true } },
          pujaType: { select: { name: true } },
        },
      }),
    ]);

    // Released = paid or payable (puja performed AND proved); Upcoming = share
    // minted at confirmation but still held. The same rule as GET /payouts.
    const proved = await provedBookingIds(prisma, shareRows);
    let releasedTotal = 0;
    let releasedMonth = 0;
    let upcomingTotal = 0;
    let upcomingMonth = 0;
    for (const r of shareRows) {
      const amt = Number(r.amount);
      const inMonth = r.createdAt >= monthStart;
      if (shareRelease(r, proved) === 'upcoming') {
        upcomingTotal += amt;
        if (inMonth) upcomingMonth += amt;
      } else {
        releasedTotal += amt;
        if (inMonth) releasedMonth += amt;
      }
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;

    return reply.send({
      profile,
      stats: {
        totalBookings: totalCount,
        monthBookings: monthCount,
        // Released share only. totalRevenueInr / monthRevenueInr are kept for
        // older clients and now mean the same as releasedInr / monthReleasedInr.
        totalRevenueInr: r2(releasedTotal),
        monthRevenueInr: r2(releasedMonth),
        releasedInr: r2(releasedTotal),
        monthReleasedInr: r2(releasedMonth),
        upcomingInr: r2(upcomingTotal),
        monthUpcomingInr: r2(upcomingMonth),
        totalStreams: profile.totalStreams,
      },
      recentBookings: recent.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        devotee: b.user.fullName ?? 'Devotee',
        pujaName: b.pujaType.name,
        scheduledDate: b.scheduledDate,
        scheduledTimeSlot: b.scheduledTimeSlot,
        priceInr: Number(b.priceAmount),
        status: b.status,
      })),
    });
  });

  server.get<{ Querystring: { slug?: string } }>(
    '/schedule',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      // Mirror PATCH gate: read access also scoped to org membership when
      // the temple is org-linked. Otherwise legacy TEMPLE_MANAGER fallback.
      // Without this, any TEMPLE_MANAGER could enumerate timingInfo for
      // every temple in the system by guessing slugs.
      const hasManager = hasTempleManagerRole(request);
      const slug = request.query.slug;
      // No slug: a manager gets their OWN temple (same resolution as the
      // dashboard), so the schedule page needs no typed ?slug=.
      let ownTempleId: string | null = null;
      if (!slug) {
        if (!hasManager) return reply.code(400).send({ error: 'slug required' });
        const link = await resolveManagerTemple(request.currentUser!.id);
        if (!link.templeId) return notLinked(reply, link.reason);
        ownTempleId = link.templeId;
      }
      const temple = await prisma.temple.findUnique({ where: ownTempleId ? { id: ownTempleId } : { slug: slug! }, select: { id: true, slug: true, name: true, timingInfo: true } });
      if (!temple) return reply.code(404).send({ error: 'Temple not found' });
      const allowed = await userCanEditTemple(temple.id, request.currentUser!.id, hasManager, request.currentUser!.roles.includes('ADMIN'));
      if (!allowed) {
        return reply.code(403).send({ error: 'NotAuthorizedForTemple' });
      }
      return temple;
    },
  );

  server.patch<{ Querystring: { slug?: string }; Body: unknown }>(
    '/schedule',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const hasManager = hasTempleManagerRole(request);
      const slug = request.query.slug;
      if (!slug) return reply.code(400).send({ error: 'slug required' });
      const tRow = await prisma.temple.findUnique({ where: { slug }, select: { id: true } });
      if (!tRow) return reply.code(404).send({ error: 'Temple not found' });
      const allowed = await userCanEditTemple(tRow.id, request.currentUser!.id, hasManager, request.currentUser!.roles.includes('ADMIN'));
      if (!allowed) {
        return reply.code(403).send({ error: 'NotAuthorizedForTemple' });
      }
      const parsed = timingsSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const next = {
        regularHours: parsed.data.regularHours,
        closedOn: parsed.data.closedOn ?? undefined,
        specialDays: parsed.data.specialDays ?? undefined,
      };
      const temple = await prisma.temple.update({
        where: { slug },
        data: { timingInfo: next as object },
        select: { id: true, slug: true, name: true, timingInfo: true },
      });
      server.log.info({ slug, userId: request.currentUser?.id }, 'temple-portal schedule update');
      return temple;
    },
  );

  // ─── GET /donations ─────────────────────────────────────────────────────────
  // Temple donations live on the polymorphic Donation.templeId column
  // (migration 20260520020000). Response shape mirrors
  // gaushala-portal/donations so the temple manager UI can reuse the
  // same DonationRow component. Status filter mapping is identical:
  //   pending  → created
  //   received → paid
  //   failed   → failed
  server.get('/donations', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(userId);
    if (!templeId) {
      // Manager has no profile or the profile name doesn't match a
      // verified Temple row. Empty list — same as the dashboard path.
      return reply.send({ donations: [], total: 0 });
    }
    const q = request.query as { status?: string; limit?: string };
    const limit = Math.min(Number(q.limit) || 100, 500);
    const statusMap: Record<string, 'created' | 'paid' | 'failed'> = {
      pending: 'created',
      received: 'paid',
      failed: 'failed',
    };
    const mapped = q.status ? statusMap[q.status.toLowerCase()] : undefined;
    const where: any = { templeId, ...(mapped ? { status: mapped } : {}) };
    const donations = await prisma.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { fullName: true, email: true } } },
    });
    // The donor's own name / email / phone from the donation form, not the paying
    // account's. PAN is never returned in full: last four characters only.
    const contacts = await donorContactMap(donations.map((d) => d.id));
    return reply.send({
      donations: donations.map((d) => ({
        id: d.id,
        donor: contacts.get(d.id)?.name ?? d.user?.fullName ?? 'Anonymous',
        email: contacts.get(d.id)?.email ?? d.user?.email ?? null,
        phone: contacts.get(d.id)?.phone ?? null,
        donorPanMasked: maskTaxId(d.donorPan),
        amountInr: Number(d.amountInr),
        status: d.status, // created | paid | failed
        receiptNumber: d.receiptNumber ?? null,
        createdAt: d.createdAt,
        paidAt: d.paidAt,
      })),
      total: donations.length,
    });
  });

  // ─── GET/PUT /tax-info — the temple's PAN + 80G registration ───────────────
  // Entered by the temple manager (or an admin via /admin/temples/:id/tax-info).
  // Storing them does not by itself make a receipt an 80G receipt: that needs both
  // numbers AND the platform-level flag (lib/eighty-g.ts).
  server.get('/tax-info', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!hasTempleManagerRole(request)) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    if (!link.templeId) return notLinked(reply, link.reason);
    return taxInfoView(await readDoneeTax('temple', link.templeId));
  });

  server.put('/tax-info', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!hasTempleManagerRole(request)) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const parsed = doneeTaxSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    if (parsed.data.pan === undefined && parsed.data.regn80g === undefined) {
      return reply.code(400).send({ error: 'Nothing to update' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    if (!link.templeId) return notLinked(reply, link.reason);
    await writeDoneeTax('temple', link.templeId, parsed.data);
    server.log.info({ templeId: link.templeId, userId: request.currentUser!.id }, 'temple-portal tax info update');
    return taxInfoView(await readDoneeTax('temple', link.templeId));
  });

  // ─── GET /payouts — the temple's share of puja revenue (TemplePayout) ──────
  // Cross-cutting Phase 2: temple managers previously saw an empty stub (the
  // CommissionsPanel queried by providerId=user.id, but no Commission is ever
  // keyed to a temple). This surfaces the temple's actual payout rows.
  server.get('/payouts', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ payouts: [], total: 0, payableInr: 0, upcomingInr: 0, pendingInr: 0, paidInr: 0 });
    const rows = await prisma.templePayout.findMany({
      where: { templeId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    // The share is written when the booking is confirmed but is only payable
    // once the puja is performed AND proved (video_uploaded / delivered), the
    // same hold the pandit's earning has. Until then it is 'upcoming'.
    const proved = await provedBookingIds(prisma, rows);
    const releaseOf = (r: { status: string; bookingId: string | null }) => shareRelease(r, proved);
    const sumWhere = (kind: string) =>
      rows.filter((r) => releaseOf(r) === kind).reduce((s, r) => s + Number(r.amount), 0);
    const payable = sumWhere('payable');
    const upcoming = sumWhere('upcoming');
    const paid = sumWhere('paid');
    return reply.send({
      payouts: rows.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        amount: r.amount.toString(),
        status: r.status,
        releaseStatus: releaseOf(r),
        reference: r.reference,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      total: rows.length,
      payableInr: Math.round(payable * 100) / 100,
      upcomingInr: Math.round(upcoming * 100) / 100,
      // Everything not yet sent (payable + upcoming), kept for older clients.
      pendingInr: Math.round((payable + upcoming) * 100) / 100,
      paidInr: Math.round(paid * 100) / 100,
    });
  });


  // ─── CRUD /pujas ────────────────────────────────────────────────────────────
  // Temple manager-authored offerings against the templeId resolved from
  // their TempleProfile. All writes 403 if the user has no matched temple
  // — surfaces the "your profile name doesn't match a Temple row" UX bug
  // instead of silently 404ing on every save.

  function serializeOffering(o: {
    id: string;
    templeId: string;
    pujaTypeId: string;
    priceOverride: { toString(): string } | null;
    nriPrice: { toString(): string } | null;
    assignedPriestId: string | null;
    availableSlots: unknown;
    maxBookingsPerSlot: number;
    isActive: boolean;
  }) {
    return {
      id: o.id,
      templeId: o.templeId,
      pujaTypeId: o.pujaTypeId,
      priceOverride: o.priceOverride ? o.priceOverride.toString() : null,
      nriPrice: o.nriPrice ? o.nriPrice.toString() : null,
      assignedPriestId: o.assignedPriestId,
      availableSlots: o.availableSlots,
      maxBookingsPerSlot: o.maxBookingsPerSlot,
      isActive: o.isActive,
    };
  }

  server.get('/pujas', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    // S-06: a bare `{offerings: []}` looked identical whether the manager had
    // no offerings or no temple at all. Say which.
    const link = await resolveManagerTemple(request.currentUser!.id);
    if (!link.templeId) {
      return reply.send({
        offerings: [],
        templeLinked: false,
        reason: link.reason,
        message: TEMPLE_LINK_MESSAGE[link.reason as Exclude<TempleLinkReason, 'linked'>],
      });
    }
    const offerings = await prisma.templePujaOffering.findMany({
      where: { templeId: link.templeId },
      orderBy: { id: 'desc' },
    });
    return reply.send({ offerings: offerings.map(serializeOffering), templeLinked: true });
  });

  server.post('/pujas', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) {
      // S-06: was `400 {"error":"No matched Temple for this manager"}`, which
      // the UI rendered verbatim. Machine-readable code + copy that names the
      // actual blocker and the way out.
      return reply.code(409).send({
        code: 'temple_not_linked',
        error: 'Temple not linked',
        reason: link.reason,
        message: TEMPLE_LINK_MESSAGE[link.reason as Exclude<TempleLinkReason, 'linked'>],
      });
    }
    const parsed = pujaOfferingCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const pinErr = await pinnedPriestError(templeId, parsed.data.assignedPriestId);
    if (pinErr) return reply.code(409).send({ code: 'priest_not_on_roster', error: pinErr });
    try {
      const offering = await prisma.templePujaOffering.create({
        data: {
          templeId,
          pujaTypeId: parsed.data.pujaTypeId,
          priceOverride: parsed.data.priceOverride ?? null,
          nriPrice: parsed.data.nriPrice ?? null,
          assignedPriestId: parsed.data.assignedPriestId ?? null,
          availableSlots: (parsed.data.availableSlots ?? []) as object,
          maxBookingsPerSlot: parsed.data.maxBookingsPerSlot ?? 5,
          isActive: parsed.data.isActive ?? true,
        },
      });
      return reply.code(201).send({ offering: serializeOffering(offering) });
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        return reply.code(409).send({ error: 'This puja type is already offered by your temple.' });
      }
      throw err;
    }
  });

  server.patch('/pujas/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const { id } = request.params as { id: string };
    const parsed = pujaOfferingUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.templePujaOffering.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Offering not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this offering.' });
    }
    // Un-pinning (null) and re-saving the priest already pinned are always fine.
    if (parsed.data.assignedPriestId && parsed.data.assignedPriestId !== existing.assignedPriestId) {
      const pinErr = await pinnedPriestError(templeId, parsed.data.assignedPriestId);
      if (pinErr) return reply.code(409).send({ code: 'priest_not_on_roster', error: pinErr });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.pujaTypeId !== undefined) data.pujaTypeId = parsed.data.pujaTypeId;
    if (parsed.data.priceOverride !== undefined) data.priceOverride = parsed.data.priceOverride;
    if (parsed.data.nriPrice !== undefined) data.nriPrice = parsed.data.nriPrice;
    if (parsed.data.assignedPriestId !== undefined) data.assignedPriestId = parsed.data.assignedPriestId;
    if (parsed.data.availableSlots !== undefined) data.availableSlots = parsed.data.availableSlots;
    if (parsed.data.maxBookingsPerSlot !== undefined) data.maxBookingsPerSlot = parsed.data.maxBookingsPerSlot;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
    const offering = await prisma.templePujaOffering.update({ where: { id }, data });
    return reply.send({ offering: serializeOffering(offering) });
  });

  server.delete('/pujas/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const { id } = request.params as { id: string };
    const existing = await prisma.templePujaOffering.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Offering not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this offering.' });
    }
    await prisma.templePujaOffering.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ─── GET /priests — list the manager's temple priest roster ────────────────
  server.get('/priests', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ priests: [], invitations: [] });
    const rows = await prisma.templePriest.findMany({
      where: { templeId },
      include: { priest: { select: { id: true, displayName: true, userId: true } } },
      orderBy: [{ isPrimary: 'desc' }, { joinedAt: 'asc' }],
    });
    return reply.send({
      priests: rows.map((r) => ({
        id: r.id,
        priestId: r.priestId,
        displayName: r.priest.displayName,
        isPrimary: r.isPrimary,
        joinedAt: r.joinedAt.toISOString(),
      })),
      invitations: await listInvitesForTemple(templeId),
    });
  });

  // ─── POST /priests — add a priest to the roster (by Priest id) ─────────────
  server.post('/priests', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const parsed = z
      .object({ priestId: z.string().uuid(), isPrimary: z.boolean().optional() })
      .safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const priest = await prisma.priest.findUnique({ where: { id: parsed.data.priestId } });
    if (!priest) return reply.code(404).send({ error: 'Priest not found' });
    // A manager cannot put a pandit on the roster (or make them primary) on
    // their own: this only records an invitation. The roster row is created
    // when the pandit accepts (POST /priest/temple-invites/:id/accept).
    const result = await createInvite({
      templeId,
      priestId: parsed.data.priestId,
      isPrimary: parsed.data.isPrimary ?? false,
      invitedBy: request.currentUser!.id,
    });
    if (result.kind === 'on_roster') {
      return reply.code(409).send({ error: 'This priest is already on your roster.' });
    }
    return reply
      .code(result.created ? 201 : 200)
      .send({ ok: true, invited: true, id: result.id, status: result.status });
  });

  // ─── DELETE /priests/invites/:id — withdraw a pending/declined invitation ──
  server.delete('/priests/invites/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    if (!link.templeId) return notLinked(reply, link.reason);
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }
    const removed = await cancelInvite(link.templeId, id);
    if (!removed) return reply.code(404).send({ error: 'Invitation not found' });
    return reply.send({ ok: true });
  });

  // ─── DELETE /priests/:id — remove a roster row (ownership-scoped) ──────────
  server.delete('/priests/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const { id } = request.params as { id: string };
    const existing = await prisma.templePriest.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Roster entry not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this roster entry.' });
    }
    await prisma.templePriest.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ─── GET /bookings — ALL puja bookings for the manager's temple ─────────────
  // Temple revamp (2026-08-05): managers previously saw only the dashboard's
  // 10 most recent bookings — no list/filter. This is the full booking view so
  // a temple manager can run their seva calendar (the single biggest gap vs
  // temple ERPs like 3ioSetu/Sankalpa which center the booking roster).
  server.get('/bookings', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ bookings: [] });
    const { status, dateFrom, dateTo, limit } = request.query as {
      status?: string; dateFrom?: string; dateTo?: string; limit?: string;
    };
    const where: Record<string, unknown> = { templeId };
    // A status or date the database cannot parse used to reach Prisma and come
    // back as a 500 with a generic "something went wrong". Say what is wrong.
    if (status) {
      if (!(Object.values(BookingStatus) as string[]).includes(status)) {
        return reply.code(400).send({ error: `Unknown booking status "${status}".` });
      }
      where.status = status;
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
        return reply.code(400).send({ error: 'dateFrom and dateTo must be valid dates (YYYY-MM-DD).' });
      }
      where.scheduledDate = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }
    const bookings = await prisma.pujaBooking.findMany({
      where: where as never,
      orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Number(limit) || 100, 500),
      include: {
        pujaType: { select: { name: true, category: true } },
        priest: { select: { displayName: true } },
        user: { select: { fullName: true, email: true } },
      },
    });
    return reply.send({
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        scheduledDate: b.scheduledDate,
        scheduledTimeSlot: b.scheduledTimeSlot,
        priceAmount: b.priceAmount.toString(),
        pujaName: b.pujaType.name,
        pujaCategory: b.pujaType.category,
        priestName: b.priest?.displayName ?? null,
        devoteeName: b.user.fullName,
        devoteeEmail: b.user.email,
        dispatchTier: b.dispatchTier,
        assignedVia: b.assignedVia,
        createdAt: b.createdAt,
      })),
      total: bookings.length,
    });
  });

  // ─── CRUD /darshan ──────────────────────────────────────────────────────────

  function serializeDarshan(s: {
    id: string;
    templeId: string;
    streamKey: string;
    playbackUrl: string;
    status: StreamStatus;
    scheduledStart: Date | null;
    actualStart: Date | null;
    viewerCount: number;
    peakViewers: number;
    isPremium: boolean;
    streamProvider: StreamProvider;
    youtubeVideoId: string | null;
    youtubeChannelId: string | null;
    attribution: string | null;
    title: string | null;
    description: string | null;
    cameraLocation: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: s.id,
      templeId: s.templeId,
      streamKey: s.streamKey,
      playbackUrl: s.playbackUrl,
      status: s.status,
      scheduledStart: s.scheduledStart,
      actualStart: s.actualStart,
      viewerCount: s.viewerCount,
      peakViewers: s.peakViewers,
      isPremium: s.isPremium,
      streamProvider: s.streamProvider,
      youtubeVideoId: s.youtubeVideoId,
      youtubeChannelId: s.youtubeChannelId,
      attribution: s.attribution,
      title: s.title,
      description: s.description,
      cameraLocation: s.cameraLocation,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  server.get('/darshan', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ streams: [] });
    const streams = await prisma.liveDarshanStream.findMany({
      where: { templeId },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ streams: streams.map(serializeDarshan) });
  });

  server.post('/darshan', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const parsed = darshanCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const stream = await prisma.liveDarshanStream.create({
      data: {
        templeId,
        streamKey: parsed.data.streamKey,
        playbackUrl: parsed.data.playbackUrl,
        title: parsed.data.title ?? null,
        description: parsed.data.description ?? null,
        cameraLocation: parsed.data.cameraLocation ?? null,
        streamProvider: parsed.data.streamProvider ?? 'YOUTUBE',
        youtubeVideoId: parsed.data.youtubeVideoId ?? null,
        youtubeChannelId: parsed.data.youtubeChannelId ?? null,
        attribution: parsed.data.attribution ?? null,
        scheduledStart: parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : null,
        isPremium: parsed.data.isPremium ?? false,
        status: parsed.data.status ?? 'offline',
      },
    });
    return reply.code(201).send({ stream: serializeDarshan(stream) });
  });

  server.patch('/darshan/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const { id } = request.params as { id: string };
    const parsed = darshanUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.liveDarshanStream.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Stream not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this stream.' });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.streamKey !== undefined) data.streamKey = parsed.data.streamKey;
    if (parsed.data.playbackUrl !== undefined) data.playbackUrl = parsed.data.playbackUrl;
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.cameraLocation !== undefined) data.cameraLocation = parsed.data.cameraLocation;
    if (parsed.data.streamProvider !== undefined) data.streamProvider = parsed.data.streamProvider;
    if (parsed.data.youtubeVideoId !== undefined) data.youtubeVideoId = parsed.data.youtubeVideoId;
    if (parsed.data.youtubeChannelId !== undefined) data.youtubeChannelId = parsed.data.youtubeChannelId;
    if (parsed.data.attribution !== undefined) data.attribution = parsed.data.attribution;
    if (parsed.data.scheduledStart !== undefined) {
      data.scheduledStart = parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : null;
    }
    if (parsed.data.isPremium !== undefined) data.isPremium = parsed.data.isPremium;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    const stream = await prisma.liveDarshanStream.update({ where: { id }, data });
    return reply.send({ stream: serializeDarshan(stream) });
  });

  server.delete('/darshan/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const { id } = request.params as { id: string };
    const existing = await prisma.liveDarshanStream.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Stream not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this stream.' });
    }
    await prisma.liveDarshanStream.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // PATCH /darshan/:id/status — flip between scheduled/live/ended. The
  // LiveDarshanStream.status enum is offline | live | scheduled; we map
  // the public "ended" verb to offline + clear actualStart, and "live"
  // stamps actualStart if missing. Without these side effects the
  // manager UI would have to call /darshan/:id with a second PATCH.
  server.patch('/darshan/:id/status', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const link = await resolveManagerTemple(request.currentUser!.id);
    const templeId = link.templeId;
    if (!templeId) return notLinked(reply, link.reason);
    const { id } = request.params as { id: string };
    const parsed = darshanStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.liveDarshanStream.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Stream not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this stream.' });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.status === 'scheduled') {
      data.status = 'scheduled';
    } else if (parsed.data.status === 'live') {
      data.status = 'live';
      if (!existing.actualStart) data.actualStart = new Date();
    } else {
      // ended → offline. Keep actualStart for analytics.
      data.status = 'offline';
    }
    const stream = await prisma.liveDarshanStream.update({ where: { id }, data });
    return reply.send({ stream: serializeDarshan(stream) });
  });
}
