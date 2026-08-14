import { Prisma, type BookingStatus, type UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { commissionPlatformCut } from '../lib/commission-math.js';
import { sendEmail, providerApprovedEmail, providerRejectedEmail } from '../lib/email.js';
import { invalidateAuthUser } from '../lib/auth-cache.js';
import { clampLimit, clampPage } from '../lib/pagination.js';

/** SCAL-09: the UserRole enum, as a set, so an unknown ?role= is a clean empty
 *  answer rather than a Prisma enum error surfaced as HTTP 500. */
const USER_ROLES = new Set<string>([
  'DEVOTEE',
  'PANDIT',
  'STORE_OWNER',
  'ASTROLOGER',
  'WELLNESS_INSTRUCTOR',
  'GAUSHALA_MANAGER',
  'TEMPLE_MANAGER',
  'ADMIN',
]);

// ─── Types ──────────────────────────────────────────────────────────────────────

interface UserFilters {
  role?: string;
  // `status` was historically accepted but User has no status column —
  // applying it would 500 every /admin/users call. The router still
  // forwards it for backward compat; we ignore it here.
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface DashboardStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalRevenue: number;
  pendingApprovals: number;
  activeSubscriptions: number;
  recentTransactions: Array<{
    id: string;
    userId: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

interface RevenueBreakdown {
  /**
   * DI-08 (2026-08-12): DEPRECATED NAME, unchanged VALUE. This has always been
   * the PLATFORM's cut, while /admin/commissions lists PROVIDER earnings — the
   * two were 5.8x apart on prod (1142.91 vs 6580) and both were labelled
   * "commissions", so an admin could not tell whether the platform was
   * under-collecting or the ledger was corrupt. Read `platformTakeInr`.
   */
  totalCommissions: number;
  /** The platform's own revenue from the take rate on PAID commissions. */
  platformTakeInr: number;
  /** What providers earned on those same PAID commissions (sum of `amount`). */
  providerEarningsInr: number;
  totalSubscriptions: number;
  pendingPayouts: number;
  commissions: Array<{
    id: string;
    // P0 #S-04: bookingId is now nullable (a Commission row may back a store
    // order via storeOrderId instead). Either bookingId or storeOrderId is set.
    bookingId: string | null;
    storeOrderId?: string | null;
    providerId: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  subscriptionRevenue: Array<{
    plan: string;
    role: string;
    count: number;
    totalAmount: number;
  }>;
}

interface PendingApproval {
  id: string;
  userId: string;
  role: string;
  profileName: string;
  city: string | null;
  createdAt: string;
}

interface ReportsResponse {
  generatedAt: string;
  userGrowth: Array<{ month: string; users: number }>;
  bookingStats: Array<{ label: string; value: number; changePct: number | null }>;
  popularPujas: Array<{
    pujaTypeId: string;
    name: string;
    bookings: number;
    revenueInr: number;
    avgRating: number | null;
  }>;
  popularServices: Array<{
    id: string;
    name: string;
    type: 'Astrology' | 'Wellness';
    sessions: number;
    rating: number | null;
  }>;
  geographicDistribution: Array<{ state: string; users: number; pct: number }>;
}

// ─── Service ────────────────────────────────────────────────────────────────────

export class AdminService {
  async getUsers(filters: UserFilters) {
    try {
      // SCAL-09: `filters.limit` arrived unbounded from routes/admin.ts, and a
      // negative page produced a negative OFFSET. Public list routes already
      // clamp to [1, 100]; the admin list is the one an operator hammers.
      const page = clampPage(filters.page);
      const limit = clampLimit(filters.limit);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};

      if (filters.search) {
        where.OR = [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ];
      }

      // SCAL-09: the role filter used to run as a JS `.filter()` on the 20 rows
      // page 1 had already fetched, while `total` came from an UNFILTERED
      // count. Filtering by ADMIN therefore returned "however many of the first
      // 20 users are admins" next to a total counting everyone — an operator
      // reads that as "there are no pandits" when there are thousands. The
      // predicate has to constrain the query so the page AND the count agree.
      //
      // The natural shape is `where.roleAssignments = { some: { role } }`, but
      // UserRoleAssignment.userId is a bare @db.Uuid column with NO `@relation`
      // to User (prisma/schema.prisma), so Prisma rejects that argument
      // outright — verified live: `Unknown argument 'roleAssignments'` → HTTP
      // 500 "Failed to list users". Adding the relation is a schema change.
      // Until then, resolve the role to its user ids first and constrain on
      // `id`: one narrow indexed column, bounded by how many people hold that
      // role, and it gives the page and the count the same answer.
      if (filters.role) {
        if (!USER_ROLES.has(filters.role)) {
          // An unknown role matches nobody. Say so honestly (empty page, total
          // 0) rather than letting Prisma throw on an invalid enum value and
          // answering 500 to what is really a bad query parameter.
          return { users: [], total: 0, page, limit };
        }
        const holders = await prisma.userRoleAssignment.findMany({
          where: { role: filters.role as UserRole },
          select: { userId: true },
          distinct: ['userId'],
        });
        where.id = { in: holders.map((h) => h.userId) };
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      // Fetch role assignments for users
      const userIds = users.map((u) => u.id);
      const roleAssignments = await prisma.userRoleAssignment.findMany({
        where: { userId: { in: userIds } },
      });

      const roleMap = new Map<string, string[]>();
      for (const ra of roleAssignments) {
        const existing = roleMap.get(ra.userId) ?? [];
        existing.push(ra.role);
        roleMap.set(ra.userId, existing);
      }

      const enriched = users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        roles: roleMap.get(u.id) ?? ['DEVOTEE'],
        subscriptionTier: u.subscriptionTier,
        // AO-01: the admin table's Status column had no field to read, so it
        // showed every account as active — including ones an operator had just
        // "blocked". Moderation state has to come back from the server or the
        // UI is only ever displaying its own optimistic guess.
        blocked: u.blocked,
        blockedAt: u.blockedAt ? u.blockedAt.toISOString() : null,
        blockedReason: u.blockedReason,
        createdAt: u.createdAt.toISOString(),
      }));

      // No post-pagination filtering: the `where.id` restriction above already
      // constrained BOTH the page and `total`, so every row fetched belongs in
      // the answer. Re-filtering here would drop rows whose role assignments
      // arrive in the second query and re-open SCAL-09.
      return { users: enriched, total, page, limit };
    } catch (err) {
      // Previously this catch served MOCK_USERS — a DB blip silently returned
      // 8 fake admin users to the admin UI. Fail loud instead so the operator
      // sees the real error and the dashboard does not display fake data.
      console.error('[admin.service.listUsers] DB failure', err);
      throw err;
    }
  }

  async getUserById(id: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;

      const roles = await prisma.userRoleAssignment.findMany({
        where: { userId: id },
      });

      // Try to fetch associated profiles
      const [pandit, store, astrologer, wellness, gaushala, temple] = await Promise.all([
        prisma.panditProfile.findUnique({ where: { userId: id } }).catch(() => null),
        prisma.storeProfile.findUnique({ where: { userId: id } }).catch(() => null),
        prisma.astrologerProfile.findUnique({ where: { userId: id } }).catch(() => null),
        prisma.wellnessProfile.findUnique({ where: { userId: id } }).catch(() => null),
        prisma.gaushalaProfile.findUnique({ where: { userId: id } }).catch(() => null),
        prisma.templeProfile.findUnique({ where: { userId: id } }).catch(() => null),
      ]);

      return {
        ...user,
        roles: roles.map((r) => r.role),
        profiles: {
          pandit,
          store,
          astrologer,
          wellness,
          gaushala,
          temple,
        },
      };
    } catch (err) {
      console.error('[admin.service.getUserById] DB failure', err);
      throw err;
    }
  }

  async updateUser(
    id: string,
    updates: { approved?: boolean; blocked?: boolean; blockedReason?: string; roles?: string[] },
  ) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;

      // If roles are being updated, sync role assignments
      if (updates.roles) {
        await prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
        await prisma.userRoleAssignment.createMany({
          data: updates.roles.map((role, idx) => ({
            userId: id,
            role: role as
              | 'DEVOTEE'
              | 'PANDIT'
              | 'STORE_OWNER'
              | 'ASTROLOGER'
              | 'WELLNESS_INSTRUCTOR'
              | 'GAUSHALA_MANAGER'
              | 'TEMPLE_MANAGER'
              | 'ADMIN',
            isPrimary: idx === 0,
          })),
        });

        // Mirror the signup-handler stub-profile seeding so /admin/approvals
        // surfaces this user the moment an admin promotes them to a provider
        // role. Without this the role assignment exists but the *_profiles row
        // doesn't, leaving the approval queue silently empty.
        const fullName = user.fullName || user.email || 'Unnamed';
        for (const role of updates.roles) {
          try {
            switch (role) {
              case 'PANDIT':
                await prisma.panditProfile.upsert({
                  where: { userId: id },
                  update: {},
                  create: {
                    userId: id,
                    experience: 0,
                    specialties: [],
                    languages: [],
                    pricePerPuja: 500,
                  },
                });
                break;
              case 'STORE_OWNER':
                await prisma.storeProfile.upsert({
                  where: { userId: id },
                  update: {},
                  create: { userId: id, storeName: fullName, categories: [] },
                });
                break;
              case 'ASTROLOGER':
                await prisma.astrologerProfile.upsert({
                  where: { userId: id },
                  update: {},
                  create: {
                    userId: id,
                    displayName: fullName,
                    specialties: [],
                    experience: 0,
                    languages: [],
                    pricePerMinute: 10,
                  },
                });
                break;
              case 'WELLNESS_INSTRUCTOR':
                await prisma.wellnessProfile.upsert({
                  where: { userId: id },
                  update: {},
                  create: {
                    userId: id,
                    displayName: fullName,
                    specialties: [],
                    certifications: [],
                    experience: 0,
                    pricePerSession: 500,
                  },
                });
                break;
              case 'GAUSHALA_MANAGER':
                await prisma.gaushalaProfile.upsert({
                  where: { userId: id },
                  update: {},
                  create: { userId: id, gaushalaName: fullName, totalCows: 0 },
                });
                break;
              case 'TEMPLE_MANAGER':
                await prisma.templeProfile.upsert({
                  where: { userId: id },
                  update: {},
                  create: { userId: id, templeName: fullName },
                });
                break;
            }
          } catch {
            // Profile upsert failure must not roll back the role assignment.
          }
        }
      }

      // If approving provider profiles
      if (updates.approved !== undefined) {
        const roleAssignments = await prisma.userRoleAssignment.findMany({
          where: { userId: id },
        });

        for (const ra of roleAssignments) {
          const now = new Date();
          switch (ra.role) {
            case 'PANDIT':
              await prisma.panditProfile.updateMany({
                where: { userId: id },
                data: { approved: updates.approved, approvedAt: updates.approved ? now : null },
              });
              break;
            case 'STORE_OWNER':
              await prisma.storeProfile.updateMany({
                where: { userId: id },
                data: { approved: updates.approved },
              });
              break;
            case 'ASTROLOGER':
              await prisma.astrologerProfile.updateMany({
                where: { userId: id },
                data: { approved: updates.approved },
              });
              break;
            case 'WELLNESS_INSTRUCTOR':
              await prisma.wellnessProfile.updateMany({
                where: { userId: id },
                data: { approved: updates.approved },
              });
              break;
            case 'GAUSHALA_MANAGER':
              await prisma.gaushalaProfile.updateMany({
                where: { userId: id },
                data: { approved: updates.approved },
              });
              break;
            case 'TEMPLE_MANAGER':
              await prisma.templeProfile.updateMany({
                where: { userId: id },
                data: { approved: updates.approved },
              });
              break;
          }
        }

        // Best-effort approval/rejection email. Wrapped in try/catch so a
        // Resend outage doesn't roll back the approval. sendEmail() itself
        // no-ops when RESEND_API_KEY is unset, so dev/demo stays silent
        // without errors.
        await this.sendApprovalEmail(id, updates.approved, roleAssignments).catch(() => undefined);
      }

      // AO-01 (2026-08-12, P0): actually block the user.
      //
      // `blocked` has been in this method's SIGNATURE since it was written, and
      // User.blocked / blockedReason / blockedAt have existed in the schema all
      // along — but nothing ever wrote them. The admin UI's Ban button flipped
      // the Status badge optimistically, the API answered 200, and the account
      // stayed fully live: still able to sign in, take bookings and take money.
      // This is the platform's ONLY moderation control, so an operator blocking
      // a fraudulent pandit got a green confirmation and moved on while nothing
      // happened. The only way to notice was to reload and re-check every action.
      if (updates.blocked !== undefined) {
        await prisma.user.update({
          where: { id },
          data: {
            blocked: updates.blocked,
            blockedAt: updates.blocked ? new Date() : null,
            // Clear the reason on unblock so a stale one cannot linger and
            // reappear if the account is blocked again later.
            blockedReason: updates.blocked ? (updates.blockedReason ?? null) : null,
          },
        });
      }

      // SCAL-05: the auth middleware caches a verified session for up to a
      // minute, so a moderation action has to evict it explicitly or the ban
      // would not bite until the cache expired — the operator would get a green
      // confirmation while the account kept taking bookings, which is the exact
      // failure AO-01 just removed. Roles are cached in the same entry, so an
      // approval/role change evicts too.
      invalidateAuthUser(id);

      return { message: 'User updated', userId: id, blocked: updates.blocked };
    } catch (err) {
      // NEVER report success on failure. This used to answer
      // "User updated (mock)" — a 200 with a success message — for ANY error,
      // so a DB outage was indistinguishable from a completed moderation
      // action. Same class as the fabricated revenue in getRevenue, and the
      // same fix: fail loud, exactly as getUsers already does.
      console.error('[admin.service.updateUser] failed', { id, err });
      throw err;
    }
  }

  async getDashboard(): Promise<DashboardStats> {
    try {
      // `totalRevenue` is MTD — the admin dashboard label reads "Revenue
      // (this month)" and the previous "sum of last 10 transactions"
      // implementation was misleading once volume crossed ~10/day.
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        roleAssignments,
        subscriptions,
        recentTransactions,
        mtdSubscriptionAgg,
        mtdCapturedAgg,
      ] =
        await Promise.all([
          prisma.user.count(),
          // SCAL-04 (2026-08-13): count roles in SQL.
          //
          // This was `userRoleAssignment.findMany()` — no where clause, the
          // whole table — read only to tally roles in the JS loop below.
          // EXPLAIN (ANALYZE, SERIALIZE) put that at 33,360 kB against a
          // 200k-row table: the largest single transfer in the API, on the
          // first page an admin opens, into a 512 MB container. groupBy
          // returns one row per role instead.
          prisma.userRoleAssignment.groupBy({ by: ['role'], _count: { _all: true } }),
          prisma.marketplaceSubscription.count({ where: { status: 'ACTIVE' } }),
          prisma.transaction.findMany({
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          prisma.transaction.aggregate({
            where: { status: 'COMPLETED', createdAt: { gte: monthStart } },
            _sum: { amount: true },
          }),
          // AO-04 (2026-08-12, P0): the marketplace half of the number.
          //
          // "Revenue This Month" summed COMPLETED `Transaction` rows only — and
          // the ONLY writers of that table are in subscription.service. No puja
          // booking, store order, donation or consultation has ever created a
          // Transaction. So the founder's single most important tile could
          // never show marketplace revenue: it was structurally Rs 0, and wrong
          // in the direction that HIDES success — it would still read Rs 0 on
          // the day the platform took its first Rs 1,00,000. Meanwhile
          // /admin/reports read a different source and showed a real number, so
          // two admin screens flatly contradicted a third.
          //
          // Captured payments are the money that actually arrived. This is GMV
          // COLLECTED, not the platform's net cut — that is
          // getRevenue().totalCommissions, derived through commission-math.
          // Keeping the two clearly separate is the whole reason the ledger
          // conventions exist.
          prisma.payment.aggregate({
            where: { status: 'captured', createdAt: { gte: monthStart } },
            _sum: { amount: true },
          }),
        ]);

      const usersByRole: Record<string, number> = {};
      for (const group of roleAssignments) {
        usersByRole[group.role] = group._count._all;
      }

      // Money collected this month = captured marketplace payments + completed
      // subscription charges. Both halves, one number, same basis as
      // /admin/metrics — so /admin, /admin/revenue and /admin/reports agree.
      const totalRevenue =
        Number(mtdCapturedAgg._sum.amount ?? 0) + Number(mtdSubscriptionAgg._sum.amount ?? 0);
      const transactions = recentTransactions;

      // Count pending approvals across all profile types
      const [
        pendingPandits,
        pendingStores,
        pendingAstrologers,
        pendingWellness,
        pendingGaushalas,
        pendingTemples,
      ] = await Promise.all([
        prisma.panditProfile.count({ where: { approved: false } }),
        prisma.storeProfile.count({ where: { approved: false } }),
        prisma.astrologerProfile.count({ where: { approved: false } }),
        prisma.wellnessProfile.count({ where: { approved: false } }),
        prisma.gaushalaProfile.count({ where: { approved: false } }),
        prisma.templeProfile.count({ where: { approved: false } }),
      ]);

      return {
        totalUsers,
        usersByRole,
        totalRevenue,
        pendingApprovals:
          pendingPandits +
          pendingStores +
          pendingAstrologers +
          pendingWellness +
          pendingGaushalas +
          pendingTemples,
        activeSubscriptions: subscriptions,
        recentTransactions: transactions.map((t) => ({
          id: t.id,
          userId: t.userId,
          type: t.type,
          amount: Number(t.amount),
          status: t.status,
          createdAt: t.createdAt.toISOString(),
        })),
      };
    } catch (err) {
      // Previously returned a fake dashboard with 8 users and ₹125000 fake
      // revenue on any DB failure. Fail loud so the admin UI surfaces the real
      // error instead of misleading the operator with mock numbers.
      console.error('[admin.service.getMetrics] DB failure', err);
      throw err;
    }
  }

  async getRevenue(): Promise<RevenueBreakdown> {
    try {
      // These figures are the founder's revenue dashboard (web /admin/revenue,
      // the mobile admin screen and the CSV exports), so they must be TOTALS.
      //
      // They used to be computed from `findMany({ take: 50 })` — the 50 most
      // recent rows — and reported as the platform-wide total. That is right
      // only until the 51st commission exists, after which the dashboard
      // silently under-reports revenue by an amount that grows with the
      // business. A founder deciding whether to spend on acquisition would be
      // reading a number that gets more wrong the better things go.
      //
      // Grouping by `percentage` makes the platform cut exactly derivable
      // without loading the table: within a rate bucket
      //     platformCut = sum(amount) * rate / (1 - rate)
      // which is commission-math's identity applied once per DISTINCT RATE
      // rather than once per row. There are a handful of rates (0.20 today), so
      // this is bounded and exact rather than sampled.
      const [paidByRate, pendingAgg, recentCommissions, subscriptions] = await Promise.all([
        prisma.commission.groupBy({
          by: ['percentage'],
          where: { status: 'PAID' },
          _sum: { amount: true },
        }),
        prisma.commission.aggregate({
          where: { status: 'PENDING' },
          _sum: { amount: true },
        }),
        // The "Recent commissions" table only — deliberately bounded, and NOT
        // the basis of any total above.
        prisma.commission.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.marketplaceSubscription.findMany({ where: { status: 'ACTIVE' } }),
      ]);

      // `Commission.amount` is the PROVIDER's earning, not the platform's cut
      // (lib/commission-math.ts). Summing it into "Commissions Earned" reported
      // provider payouts as platform revenue — a ~4x overstatement on a 20/80
      // split. The platform's share is derived from the stored take rate.
      const platformTakeInr = paidByRate.reduce((sum, bucket) => {
        const providerTotal = bucket._sum.amount ?? new Prisma.Decimal(0);
        return sum + commissionPlatformCut(providerTotal, bucket.percentage).toNumber();
      }, 0);

      // DI-08: the other half of the same money, reported next to it. Without
      // this an admin comparing the dashboard to /admin/commissions sees two
      // numbers 5.8x apart with no way to tell that one is the platform's cut
      // and the other is what providers earned.
      const providerEarningsInr = paidByRate.reduce(
        (sum, bucket) => sum + Number(bucket._sum.amount ?? 0),
        0,
      );

      // Pending payouts genuinely IS what providers are owed, so this one keeps
      // summing `amount` — it was the under-reported figure before.
      const pendingPayouts = Number(pendingAgg._sum.amount ?? 0);

      const totalSubscriptions = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);

      // Group subscriptions by plan+role
      const subGroups = new Map<
        string,
        { plan: string; role: string; count: number; totalAmount: number }
      >();
      for (const s of subscriptions) {
        const key = `${s.plan}-${s.role}`;
        const existing = subGroups.get(key) ?? {
          plan: s.plan,
          role: s.role,
          count: 0,
          totalAmount: 0,
        };
        existing.count += 1;
        existing.totalAmount += Number(s.amount);
        subGroups.set(key, existing);
      }

      return {
        // Same value it has always carried — see the interface note. Kept so
        // the deployed web/mobile admin screens do not lose the figure while
        // they migrate to `platformTakeInr`.
        totalCommissions: platformTakeInr,
        platformTakeInr,
        providerEarningsInr,
        totalSubscriptions,
        pendingPayouts,
        commissions: recentCommissions.map((c) => ({
          id: c.id,
          bookingId: c.bookingId,
          storeOrderId: c.storeOrderId,
          providerId: c.providerId,
          amount: Number(c.amount),
          status: c.status,
          createdAt: c.createdAt.toISOString(),
        })),
        subscriptionRevenue: Array.from(subGroups.values()),
      };
    } catch (err) {
      // NEVER fabricate revenue. This used to answer a hardcoded Rs 45,000 /
      // Rs 15,000 / Rs 8,000 with invented commission rows on ANY DB error, so
      // the founder's revenue dashboard showed a confident, entirely fictional
      // number whenever the database was unreachable — and the mobile admin
      // screen's error banner could never fire, because the call always
      // "succeeded". Fail loud, exactly as getUsers already does after the same
      // mistake with MOCK_USERS.
      console.error('[admin.service.getRevenue] DB failure', err);
      throw err;
    }
  }

  async getReports(): Promise<ReportsResponse> {
    const now = new Date();
    const generatedAt = now.toISOString();

    try {
      // ─── 1. User growth (last 6 calendar months) ─────────────────────────
      const months: Array<{ start: Date; end: Date; label: string }> = [];
      for (let i = 5; i >= 0; i -= 1) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const label =
          start.toLocaleString('en-US', { month: 'short' }) +
          ' ' +
          String(start.getFullYear()).slice(2);
        months.push({ start, end, label });
      }

      const userCounts = await Promise.all(
        months.map((m) => prisma.user.count({ where: { createdAt: { lt: m.end } } })),
      );
      const userGrowth = months.map((m, i) => ({
        month: m.label,
        users: userCounts[i] ?? 0,
      }));

      // ─── 2. Booking stats (MTD vs previous month, all statuses) ──────────
      const monthStart = months[months.length - 1]!.start;
      const prevMonthStart = months[months.length - 2]?.start ?? monthStart;
      const prevMonthEnd = monthStart;

      const statusGroups: Array<[string, BookingStatus[]]> = [
        [
          'Total Bookings',
          [
            'pending_payment',
            'confirmed',
            'priest_assigned',
            'in_progress',
            'completed',
            'video_uploaded',
            'delivered',
          ],
        ],
        ['Completed', ['completed', 'video_uploaded', 'delivered']],
        ['In Progress', ['confirmed', 'priest_assigned', 'in_progress']],
        ['Cancelled', ['cancelled', 'refunded']],
      ];

      const bookingStats = await Promise.all(
        statusGroups.map(async ([label, statuses]) => {
          const [thisMonth, lastMonth] = await Promise.all([
            prisma.pujaBooking.count({
              where: { status: { in: statuses }, createdAt: { gte: monthStart } },
            }),
            prisma.pujaBooking.count({
              where: {
                status: { in: statuses },
                createdAt: { gte: prevMonthStart, lt: prevMonthEnd },
              },
            }),
          ]);
          const totalToDate = await prisma.pujaBooking.count({
            where: { status: { in: statuses } },
          });
          const changePct =
            lastMonth === 0
              ? thisMonth > 0
                ? null
                : 0
              : Number((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1));
          return { label, value: totalToDate, changePct };
        }),
      );

      // ─── 3. Popular pujas (top 8 by booking count) ───────────────────────
      const pujaAgg = await prisma.pujaBooking.groupBy({
        by: ['pujaTypeId'],
        _count: { _all: true },
        _sum: { priceAmount: true },
        _avg: { rating: true },
        orderBy: { _count: { pujaTypeId: 'desc' } },
        take: 8,
      });
      const pujaTypes = await prisma.pujaType.findMany({
        where: { id: { in: pujaAgg.map((p) => p.pujaTypeId) } },
        select: { id: true, name: true },
      });
      const pujaNameMap = new Map(pujaTypes.map((p) => [p.id, p.name] as const));
      const popularPujas = pujaAgg.map((p) => ({
        pujaTypeId: p.pujaTypeId,
        name: pujaNameMap.get(p.pujaTypeId) ?? 'Unknown Puja',
        bookings: p._count._all,
        revenueInr: Number(p._sum.priceAmount ?? 0),
        avgRating: p._avg.rating !== null ? Number(p._avg.rating.toFixed(1)) : null,
      }));

      // ─── 4. Popular services (wellness sessions + astrologer convos) ─────
      const wellnessAgg = await prisma.wellnessEnrollment.groupBy({
        by: ['sessionId'],
        _count: { _all: true },
        where: { status: { in: ['PAID', 'ATTENDED'] } },
        orderBy: { _count: { sessionId: 'desc' } },
        take: 4,
      });
      const wellnessSessions = await prisma.wellnessSession.findMany({
        where: { id: { in: wellnessAgg.map((w) => w.sessionId) } },
        select: { id: true, title: true, instructorId: true },
      });
      const wellnessInstructorIds = wellnessSessions.map((s) => s.instructorId);
      const wellnessProfiles = await prisma.wellnessProfile.findMany({
        where: { userId: { in: wellnessInstructorIds } },
        select: { userId: true, rating: true },
      });
      const wellnessRatingMap = new Map(wellnessProfiles.map((p) => [p.userId, p.rating] as const));
      const wellnessRows = wellnessAgg
        .map((w) => {
          const session = wellnessSessions.find((s) => s.id === w.sessionId);
          if (!session) return null;
          return {
            id: w.sessionId,
            name: session.title,
            type: 'Wellness' as const,
            sessions: w._count._all,
            rating: wellnessRatingMap.get(session.instructorId) ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const astroAgg = await prisma.chatConversation.groupBy({
        by: ['providerId'],
        _count: { _all: true },
        where: { kind: 'astrology' },
        orderBy: { _count: { providerId: 'desc' } },
        take: 4,
      });
      const astrologerProfiles = await prisma.astrologerProfile.findMany({
        where: { userId: { in: astroAgg.map((a) => a.providerId) } },
        select: { userId: true, displayName: true, rating: true },
      });
      const astroProfileMap = new Map(astrologerProfiles.map((p) => [p.userId, p] as const));
      const astroRows = astroAgg
        .map((a) => {
          const prof = astroProfileMap.get(a.providerId);
          if (!prof) return null;
          return {
            id: a.providerId,
            name: prof.displayName,
            type: 'Astrology' as const,
            sessions: a._count._all,
            rating: prof.rating,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const popularServices = [...astroRows, ...wellnessRows]
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5);

      // ─── 5. Geographic distribution (top 10 by User.locationState) ───────
      const stateAgg = await prisma.user.groupBy({
        by: ['locationState'],
        _count: { _all: true },
        where: { locationState: { not: null } },
        orderBy: { _count: { locationState: 'desc' } },
      });
      const totalGeoUsers = stateAgg.reduce((sum, s) => sum + s._count._all, 0);
      const top10 = stateAgg.slice(0, 10);
      const otherCount = stateAgg.slice(10).reduce((sum, s) => sum + s._count._all, 0);
      const geographicDistribution: ReportsResponse['geographicDistribution'] = top10.map((s) => ({
        state: s.locationState!,
        users: s._count._all,
        pct: totalGeoUsers > 0 ? Number(((s._count._all / totalGeoUsers) * 100).toFixed(1)) : 0,
      }));
      if (otherCount > 0) {
        geographicDistribution.push({
          state: 'Others',
          users: otherCount,
          pct: totalGeoUsers > 0 ? Number(((otherCount / totalGeoUsers) * 100).toFixed(1)) : 0,
        });
      }

      return {
        generatedAt,
        userGrowth,
        bookingStats,
        popularPujas,
        popularServices,
        geographicDistribution,
      };
    } catch {
      // DB unreachable — return empty shape rather than mock numbers so the
      // UI can render its "no data yet" states instead of fictional charts.
      return {
        generatedAt,
        userGrowth: [],
        bookingStats: [],
        popularPujas: [],
        popularServices: [],
        geographicDistribution: [],
      };
    }
  }

  async getPendingApprovals(): Promise<PendingApproval[]> {
    try {
      const [pandits, stores, astrologers, wellness, gaushalas, temples] = await Promise.all([
        prisma.panditProfile.findMany({ where: { approved: false } }),
        prisma.storeProfile.findMany({ where: { approved: false } }),
        prisma.astrologerProfile.findMany({ where: { approved: false } }),
        prisma.wellnessProfile.findMany({ where: { approved: false } }),
        prisma.gaushalaProfile.findMany({ where: { approved: false } }),
        prisma.templeProfile.findMany({ where: { approved: false } }),
      ]);

      // PanditProfile has no display-name column — `templeName` is a
      // legacy nullable field that historically held a free-form
      // descriptor and is null on every signup-stub profile. Resolve
      // the real name from the joined User row, falling back through
      // bio → "Unnamed Pandit". Without this the admin queue showed
      // every fresh pandit as "Unnamed Pandit" forever.
      const panditUsers = await prisma.user.findMany({
        where: { id: { in: pandits.map((p) => p.userId) } },
        select: { id: true, fullName: true },
      });
      const panditUserName = new Map(panditUsers.map((u) => [u.id, u.fullName] as const));

      const approvals: PendingApproval[] = [
        ...pandits.map((p) => ({
          id: p.id,
          userId: p.userId,
          role: 'PANDIT' as const,
          profileName:
            panditUserName.get(p.userId) || (p.bio ? p.bio.slice(0, 40) : 'Unnamed Pandit'),
          city: p.city,
          createdAt: p.createdAt.toISOString(),
        })),
        ...stores.map((s) => ({
          id: s.id,
          userId: s.userId,
          role: 'STORE_OWNER' as const,
          profileName: s.storeName,
          city: s.city,
          createdAt: s.createdAt.toISOString(),
        })),
        ...astrologers.map((a) => ({
          id: a.id,
          userId: a.userId,
          role: 'ASTROLOGER' as const,
          profileName: a.displayName,
          city: null,
          createdAt: a.createdAt.toISOString(),
        })),
        ...wellness.map((w) => ({
          id: w.id,
          userId: w.userId,
          role: 'WELLNESS_INSTRUCTOR' as const,
          profileName: w.displayName,
          city: null,
          createdAt: w.createdAt.toISOString(),
        })),
        ...gaushalas.map((g) => ({
          id: g.id,
          userId: g.userId,
          role: 'GAUSHALA_MANAGER' as const,
          profileName: g.gaushalaName,
          city: g.city,
          createdAt: g.createdAt.toISOString(),
        })),
        ...temples.map((t) => ({
          id: t.id,
          userId: t.userId,
          role: 'TEMPLE_MANAGER' as const,
          profileName: t.templeName,
          city: t.city,
          createdAt: t.createdAt.toISOString(),
        })),
      ];

      return approvals.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (err) {
      console.error('[admin.service.getPendingApprovals] DB failure', err);
      throw err;
    }
  }

  // ─── Provider approval email helper ──────────────────────────────────────
  //
  // Picks the first non-DEVOTEE role assignment as "the" provider role for
  // the email subject and dashboard URL. When a provider holds multiple
  // roles (rare), the first wins; subsequent emails are not sent to avoid
  // a flood of identical messages on a single approval click.

  private async sendApprovalEmail(
    userId: string,
    approved: boolean,
    roleAssignments: Array<{ role: string }>,
  ): Promise<void> {
    const providerRole = roleAssignments.find((ra) => ra.role !== 'DEVOTEE')?.role;
    if (!providerRole) return;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    const baseUrl = process.env.WEB_URL ?? 'https://darshya.online';
    const meta = ROLE_EMAIL_META[providerRole as keyof typeof ROLE_EMAIL_META];
    if (!meta) return;

    let publicProfileId: string | undefined;
    if (approved) {
      // Resolve the public profile ID for the listing URL. Best-effort —
      // if the profile was just deleted between the update and this email
      // we still send a useful approval message without the link.
      publicProfileId = await this.resolvePublicProfileId(userId, providerRole);
    }

    const providerName = user.fullName || meta.fallbackName;
    const dashboardUrl = `${baseUrl}${meta.dashboardPath}`;

    const tpl = approved
      ? providerApprovedEmail({
          providerName,
          roleLabel: meta.label,
          publicProfileUrl:
            publicProfileId && meta.publicListingType
              ? `${baseUrl}/${meta.publicListingType === 'pandit' ? 'pandits' : meta.publicListingType}/${publicProfileId}`
              : undefined,
          dashboardUrl,
        })
      : providerRejectedEmail({
          providerName,
          roleLabel: meta.label,
          reapplyUrl: `${baseUrl}/onboarding/${meta.onboardingSlug}`,
        });

    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  }

  private async resolvePublicProfileId(userId: string, role: string): Promise<string | undefined> {
    try {
      switch (role) {
        case 'PANDIT':
          return (
            await prisma.panditProfile.findUnique({ where: { userId }, select: { id: true } })
          )?.id;
        case 'STORE_OWNER':
          return (await prisma.storeProfile.findUnique({ where: { userId }, select: { id: true } }))
            ?.id;
        case 'ASTROLOGER':
          return (
            await prisma.astrologerProfile.findUnique({ where: { userId }, select: { id: true } })
          )?.id;
        case 'WELLNESS_INSTRUCTOR':
          return (
            await prisma.wellnessProfile.findUnique({ where: { userId }, select: { id: true } })
          )?.id;
        case 'GAUSHALA_MANAGER':
          return (
            await prisma.gaushalaProfile.findUnique({ where: { userId }, select: { id: true } })
          )?.id;
        case 'TEMPLE_MANAGER':
          return (
            await prisma.templeProfile.findUnique({ where: { userId }, select: { id: true } })
          )?.id;
        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }
}

// Metadata table keeping email subject/body in sync with the dashboard URL.
// Centralised so changing a slug in one place fixes both the email link and
// the approval CTA.
const ROLE_EMAIL_META = {
  PANDIT: {
    label: 'Pandit',
    fallbackName: 'Panditji',
    dashboardPath: '/priest',
    onboardingSlug: 'priest',
    publicListingType: 'pandit' as const,
  },
  STORE_OWNER: {
    label: 'Store',
    fallbackName: 'Store Owner',
    dashboardPath: '/store-admin',
    onboardingSlug: 'store_owner',
    publicListingType: null,
  },
  ASTROLOGER: {
    label: 'Astrologer',
    fallbackName: 'Astrologer',
    dashboardPath: '/astrologer-portal',
    onboardingSlug: 'astrologer',
    publicListingType: 'astrologer' as const,
  },
  WELLNESS_INSTRUCTOR: {
    label: 'Wellness Instructor',
    fallbackName: 'Instructor',
    dashboardPath: '/wellness-portal',
    onboardingSlug: 'wellness_instructor',
    publicListingType: 'wellness' as const,
  },
  GAUSHALA_MANAGER: {
    label: 'Gaushala Manager',
    fallbackName: 'Sevak',
    dashboardPath: '/gaushala-portal',
    onboardingSlug: 'gaushala_manager',
    publicListingType: 'gaushala' as const,
  },
  TEMPLE_MANAGER: {
    label: 'Temple Manager',
    fallbackName: 'Manager',
    dashboardPath: '/temple-portal',
    onboardingSlug: 'temple_manager',
    publicListingType: 'temple' as const,
  },
} as const;

export const adminService = new AdminService();
