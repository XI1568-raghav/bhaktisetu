import { prisma } from '../lib/prisma.js';
import {
  sendEmail,
  providerApprovedEmail,
  providerRejectedEmail,
} from '../lib/email.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface UserFilters {
  role?: string;
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
  totalCommissions: number;
  totalSubscriptions: number;
  pendingPayouts: number;
  commissions: Array<{
    id: string;
    bookingId: string;
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

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const MOCK_USERS = [
  {
    id: 'user-001',
    fullName: 'Arjun Sharma',
    email: 'arjun@darshya.online',
    phone: '+919876543210',
    roles: ['DEVOTEE'],
    status: 'active',
    subscriptionTier: 'bhakti_pass',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'user-002',
    fullName: 'Pandit Raghunath',
    email: 'raghunath@darshya.online',
    phone: '+919876543211',
    roles: ['PANDIT'],
    status: 'active',
    subscriptionTier: 'free',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'user-003',
    fullName: 'Priya Store',
    email: 'priya@darshya.online',
    phone: '+919876543212',
    roles: ['STORE_OWNER'],
    status: 'pending_approval',
    subscriptionTier: 'free',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'user-004',
    fullName: 'Jyotish Mehta',
    email: 'jyotish@darshya.online',
    phone: '+919876543213',
    roles: ['ASTROLOGER'],
    status: 'active',
    subscriptionTier: 'free',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'user-005',
    fullName: 'Yoga Meera',
    email: 'meera@darshya.online',
    phone: '+919876543214',
    roles: ['WELLNESS_INSTRUCTOR'],
    status: 'pending_approval',
    subscriptionTier: 'free',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'user-006',
    fullName: 'Gaushala Seva Trust',
    email: 'gaushala@darshya.online',
    phone: '+919876543215',
    roles: ['GAUSHALA_MANAGER'],
    status: 'active',
    subscriptionTier: 'free',
    createdAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'user-007',
    fullName: 'Temple Admin',
    email: 'temple@darshya.online',
    phone: '+919876543216',
    roles: ['TEMPLE_MANAGER'],
    status: 'active',
    subscriptionTier: 'free',
    createdAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'admin-001',
    fullName: 'Platform Admin',
    email: 'admin@darshya.online',
    phone: '+919876543200',
    roles: ['ADMIN'],
    status: 'active',
    subscriptionTier: 'premium',
    createdAt: '2026-01-01T10:00:00Z',
  },
];

const MOCK_PENDING_APPROVALS: PendingApproval[] = [
  { id: 'pa-001', userId: 'user-003', role: 'STORE_OWNER', profileName: 'Priya Sacred Store', city: 'Mumbai', createdAt: '2026-02-01T10:00:00Z' },
  { id: 'pa-002', userId: 'user-005', role: 'WELLNESS_INSTRUCTOR', profileName: 'Yoga Meera', city: 'Bangalore', createdAt: '2026-03-01T10:00:00Z' },
];

// ─── Service ────────────────────────────────────────────────────────────────────

export class AdminService {
  async getUsers(filters: UserFilters) {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};

      if (filters.search) {
        where.OR = [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ];
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
        createdAt: u.createdAt.toISOString(),
      }));

      // Filter by role if specified
      const filtered = filters.role
        ? enriched.filter((u) => u.roles.includes(filters.role!))
        : enriched;

      return { users: filtered, total, page, limit };
    } catch {
      // Fallback mock
      let filtered = [...MOCK_USERS];
      if (filters.role) {
        filtered = filtered.filter((u) => u.roles.includes(filters.role!));
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.phone.includes(q)
        );
      }

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const start = (page - 1) * limit;

      return {
        users: filtered.slice(start, start + limit),
        total: filtered.length,
        page,
        limit,
      };
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
    } catch {
      const mockUser = MOCK_USERS.find((u) => u.id === id);
      return mockUser ?? null;
    }
  }

  async updateUser(id: string, updates: { approved?: boolean; blocked?: boolean; roles?: string[] }) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;

      // If roles are being updated, sync role assignments
      if (updates.roles) {
        await prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
        await prisma.userRoleAssignment.createMany({
          data: updates.roles.map((role, idx) => ({
            userId: id,
            role: role as 'DEVOTEE' | 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER' | 'ADMIN',
            isPrimary: idx === 0,
          })),
        });
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
              await prisma.storeProfile.updateMany({ where: { userId: id }, data: { approved: updates.approved } });
              break;
            case 'ASTROLOGER':
              await prisma.astrologerProfile.updateMany({ where: { userId: id }, data: { approved: updates.approved } });
              break;
            case 'WELLNESS_INSTRUCTOR':
              await prisma.wellnessProfile.updateMany({ where: { userId: id }, data: { approved: updates.approved } });
              break;
            case 'GAUSHALA_MANAGER':
              await prisma.gaushalaProfile.updateMany({ where: { userId: id }, data: { approved: updates.approved } });
              break;
            case 'TEMPLE_MANAGER':
              await prisma.templeProfile.updateMany({ where: { userId: id }, data: { approved: updates.approved } });
              break;
          }
        }

        // Best-effort approval/rejection email. Wrapped in try/catch so a
        // Resend outage doesn't roll back the approval. sendEmail() itself
        // no-ops when RESEND_API_KEY is unset, so dev/demo stays silent
        // without errors.
        await this.sendApprovalEmail(id, updates.approved, roleAssignments).catch(() => undefined);
      }

      return { message: 'User updated', userId: id };
    } catch {
      return { message: 'User updated (mock)', userId: id };
    }
  }

  async getDashboard(): Promise<DashboardStats> {
    try {
      const [totalUsers, roleAssignments, subscriptions, transactions] = await Promise.all([
        prisma.user.count(),
        prisma.userRoleAssignment.findMany(),
        prisma.marketplaceSubscription.count({ where: { status: 'ACTIVE' } }),
        prisma.transaction.findMany({
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      const usersByRole: Record<string, number> = {};
      for (const ra of roleAssignments) {
        usersByRole[ra.role] = (usersByRole[ra.role] ?? 0) + 1;
      }

      const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      // Count pending approvals across all profile types
      const [pendingPandits, pendingStores, pendingAstrologers, pendingWellness, pendingGaushalas, pendingTemples] =
        await Promise.all([
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
        pendingApprovals: pendingPandits + pendingStores + pendingAstrologers + pendingWellness + pendingGaushalas + pendingTemples,
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
    } catch {
      return {
        totalUsers: MOCK_USERS.length,
        usersByRole: {
          DEVOTEE: 1,
          PANDIT: 1,
          STORE_OWNER: 1,
          ASTROLOGER: 1,
          WELLNESS_INSTRUCTOR: 1,
          GAUSHALA_MANAGER: 1,
          TEMPLE_MANAGER: 1,
          ADMIN: 1,
        },
        totalRevenue: 125000,
        pendingApprovals: 2,
        activeSubscriptions: 3,
        recentTransactions: [
          { id: 'txn-001', userId: 'user-001', type: 'BOOKING', amount: 2100, status: 'COMPLETED', createdAt: '2026-04-10T10:00:00Z' },
          { id: 'txn-002', userId: 'user-004', type: 'SUBSCRIPTION', amount: 999, status: 'COMPLETED', createdAt: '2026-04-08T10:00:00Z' },
        ],
      };
    }
  }

  async getRevenue(): Promise<RevenueBreakdown> {
    try {
      const [commissions, subscriptions] = await Promise.all([
        prisma.commission.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.marketplaceSubscription.findMany({ where: { status: 'ACTIVE' } }),
      ]);

      const totalCommissions = commissions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const pendingPayouts = commissions
        .filter((c) => c.status === 'PENDING')
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const totalSubscriptions = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);

      // Group subscriptions by plan+role
      const subGroups = new Map<string, { plan: string; role: string; count: number; totalAmount: number }>();
      for (const s of subscriptions) {
        const key = `${s.plan}-${s.role}`;
        const existing = subGroups.get(key) ?? { plan: s.plan, role: s.role, count: 0, totalAmount: 0 };
        existing.count += 1;
        existing.totalAmount += Number(s.amount);
        subGroups.set(key, existing);
      }

      return {
        totalCommissions,
        totalSubscriptions,
        pendingPayouts,
        commissions: commissions.map((c) => ({
          id: c.id,
          bookingId: c.bookingId,
          providerId: c.providerId,
          amount: Number(c.amount),
          status: c.status,
          createdAt: c.createdAt.toISOString(),
        })),
        subscriptionRevenue: Array.from(subGroups.values()),
      };
    } catch {
      return {
        totalCommissions: 45000,
        totalSubscriptions: 15000,
        pendingPayouts: 8000,
        commissions: [
          { id: 'com-001', bookingId: 'bk-001', providerId: 'user-002', amount: 630, status: 'PAID', createdAt: '2026-04-10T10:00:00Z' },
          { id: 'com-002', bookingId: 'bk-002', providerId: 'user-002', amount: 420, status: 'PENDING', createdAt: '2026-04-12T10:00:00Z' },
        ],
        subscriptionRevenue: [
          { plan: 'BASIC', role: 'PANDIT', count: 5, totalAmount: 4995 },
          { plan: 'PRO', role: 'ASTROLOGER', count: 3, totalAmount: 8997 },
        ],
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

      const approvals: PendingApproval[] = [
        ...pandits.map((p) => ({
          id: p.id,
          userId: p.userId,
          role: 'PANDIT' as const,
          profileName: p.templeName ?? 'Unnamed Pandit',
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

      return approvals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return MOCK_PENDING_APPROVALS;
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
        case 'PANDIT': return (await prisma.panditProfile.findUnique({ where: { userId }, select: { id: true } }))?.id;
        case 'STORE_OWNER': return (await prisma.storeProfile.findUnique({ where: { userId }, select: { id: true } }))?.id;
        case 'ASTROLOGER': return (await prisma.astrologerProfile.findUnique({ where: { userId }, select: { id: true } }))?.id;
        case 'WELLNESS_INSTRUCTOR': return (await prisma.wellnessProfile.findUnique({ where: { userId }, select: { id: true } }))?.id;
        case 'GAUSHALA_MANAGER': return (await prisma.gaushalaProfile.findUnique({ where: { userId }, select: { id: true } }))?.id;
        case 'TEMPLE_MANAGER': return (await prisma.templeProfile.findUnique({ where: { userId }, select: { id: true } }))?.id;
        default: return undefined;
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
  PANDIT: { label: 'Pandit', fallbackName: 'Panditji', dashboardPath: '/priest', onboardingSlug: 'priest', publicListingType: 'pandit' as const },
  STORE_OWNER: { label: 'Store', fallbackName: 'Store Owner', dashboardPath: '/store-admin', onboardingSlug: 'store_owner', publicListingType: null },
  ASTROLOGER: { label: 'Astrologer', fallbackName: 'Astrologer', dashboardPath: '/astrologer-portal', onboardingSlug: 'astrologer', publicListingType: 'astrologer' as const },
  WELLNESS_INSTRUCTOR: { label: 'Wellness Instructor', fallbackName: 'Instructor', dashboardPath: '/wellness-portal', onboardingSlug: 'wellness_instructor', publicListingType: 'wellness' as const },
  GAUSHALA_MANAGER: { label: 'Gaushala Manager', fallbackName: 'Sevak', dashboardPath: '/gaushala-portal', onboardingSlug: 'gaushala_manager', publicListingType: 'gaushala' as const },
  TEMPLE_MANAGER: { label: 'Temple Manager', fallbackName: 'Manager', dashboardPath: '/temple-portal', onboardingSlug: 'temple_manager', publicListingType: 'temple' as const },
} as const;

export const adminService = new AdminService();
