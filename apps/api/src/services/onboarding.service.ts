import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { assessCauseProfile } from '../lib/cause-approval-guard.js';
import { requireProviderApproval } from '../lib/provider-approval.js';
import { describeQualityReasons, type CauseQualityReason } from '../lib/cause-quality.js';
import { createTempleFromProfile, getLinkedTempleId } from './temple-manager-link.service.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type RoleType = 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER';

/**
 * The DB defaults a stub profile row is born with (schema `@default`). They are
 * placeholders, not prices anyone chose: a profile is only listed once its owner
 * has submitted a price (or the stored price differs from the placeholder).
 */
const PRICE_PLACEHOLDER: Partial<Record<RoleType, { field: string; value: number }>> = {
  PANDIT: { field: 'pricePerPuja', value: 500 },
  ASTROLOGER: { field: 'pricePerMinute', value: 10 },
  WELLNESS_INSTRUCTOR: { field: 'pricePerSession', value: 500 },
};

export type ListingGap = 'price' | 'specialties';

export interface ListingStatus {
  /** Profile is publicly listed (`approved`). */
  listed: boolean;
  /** REQUIRE_PROVIDER_APPROVAL: true means an admin still has to approve. */
  approvalRequired: boolean;
  /** What the owner still has to add before the profile is listed. Empty when approval is the only blocker. */
  missing: ListingGap[];
  /** Honest one-liner for the portal, or null when listed. */
  message: string | null;
}

const GAP_LABEL: Record<ListingGap, string> = { price: 'price', specialties: 'specialties' };

export function listingMessage(missing: ListingGap[]): string {
  const what = missing.map((g) => GAP_LABEL[g]).join(' and ');
  return `Your portal is active. Add your ${what} and details to be listed.`;
}

interface OnboardingProgress {
  userId: string;
  role: string;
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    step: number;
    completed: boolean;
    data: Record<string, unknown> | null;
  }>;
  submitted: boolean;
}

interface StepData {
  [key: string]: unknown;
}

// ─── Step Definitions Per Role ──────────────────────────────────────────────────

const ROLE_STEPS: Record<RoleType, string[]> = {
  PANDIT: ['Personal Details', 'Specialties & Languages', 'Experience & Pricing', 'Aadhaar Verification', 'Review & Submit'],
  STORE_OWNER: ['Personal Details', 'Store Information', 'GST & Documents', 'Product Categories', 'Review & Submit'],
  ASTROLOGER: ['Personal Details', 'Specialties & Languages', 'Experience & Pricing', 'Certifications', 'Review & Submit'],
  WELLNESS_INSTRUCTOR: ['Personal Details', 'Specialties & Certifications', 'Experience & Pricing', 'Availability', 'Review & Submit'],
  GAUSHALA_MANAGER: ['Personal Details', 'Gaushala Information', 'Cow Details', 'Verification Documents', 'Review & Submit'],
  TEMPLE_MANAGER: ['Personal Details', 'Temple Information', 'Deity & Traditions', 'Verification', 'Review & Submit'],
};

// ─── Mock In-Memory State ───────────────────────────────────────────────────────

const mockOnboarding = new Map<string, OnboardingProgress>();

// ─── Service ────────────────────────────────────────────────────────────────────

export class OnboardingService {
  getStepsForRole(role: string): string[] {
    return ROLE_STEPS[role as RoleType] ?? [];
  }

  async startOnboarding(userId: string, role: RoleType): Promise<OnboardingProgress> {
    const steps = ROLE_STEPS[role];
    if (!steps) {
      throw new Error(`Invalid role for onboarding: ${role}`);
    }

    try {
      // Create role assignment. Deliberately NOT primary yet — see the note on
      // setPrimaryRole (A-010): opening the wizard is not a commitment, and
      // promoting here would drop a devotee who abandons step 1 into an empty
      // provider portal on their next login. The promotion happens where the
      // provider profile is actually written (submitForApproval /
      // upsertProviderProfile).
      await prisma.userRoleAssignment.upsert({
        where: { userId_role: { userId, role } },
        update: {},
        create: { userId, role, isPrimary: false },
      });

      // Create onboarding steps
      for (let i = 0; i < steps.length; i++) {
        await prisma.onboardingStep.upsert({
          where: { userId_role_step: { userId, role, step: i + 1 } },
          update: {},
          create: { userId, role, step: i + 1, completed: false },
        });
      }

      const progress = await this.getProgress(userId, role);
      if (!progress) throw new Error('Failed to fetch onboarding progress after creation');
      return progress;
    } catch {
      // Mock fallback
      const progress: OnboardingProgress = {
        userId,
        role,
        currentStep: 1,
        totalSteps: steps.length,
        steps: steps.map((_, idx) => ({
          step: idx + 1,
          completed: false,
          data: null,
        })),
        submitted: false,
      };
      mockOnboarding.set(`${userId}-${role}`, progress);
      return progress;
    }
  }

  async getProgress(userId: string, role?: string): Promise<OnboardingProgress | null> {
    try {
      // Find the role if not provided
      let resolvedRole = role;
      if (!resolvedRole) {
        const assignment = await prisma.userRoleAssignment.findFirst({
          where: { userId, role: { not: 'DEVOTEE' } },
          orderBy: { createdAt: 'desc' },
        });
        if (!assignment) return null;
        resolvedRole = assignment.role;
      }

      const steps = await prisma.onboardingStep.findMany({
        where: { userId, role: resolvedRole as RoleType },
        orderBy: { step: 'asc' },
      });

      if (steps.length === 0) return null;

      const totalSteps = ROLE_STEPS[resolvedRole as RoleType]?.length ?? 5;
      const completedSteps = steps.filter((s) => s.completed);
      const currentStep = completedSteps.length + 1;
      const submitted = completedSteps.length === totalSteps;

      return {
        userId,
        role: resolvedRole,
        currentStep: Math.min(currentStep, totalSteps),
        totalSteps,
        steps: steps.map((s) => ({
          step: s.step,
          completed: s.completed,
          data: s.data as Record<string, unknown> | null,
        })),
        submitted,
      };
    } catch {
      // Mock fallback — find any onboarding for this user
      for (const [key, progress] of mockOnboarding) {
        if (key.startsWith(userId)) {
          return progress;
        }
      }
      return null;
    }
  }

  async completeStep(userId: string, role: string, step: number, data: StepData): Promise<OnboardingProgress> {
    try {
      await prisma.onboardingStep.update({
        where: { userId_role_step: { userId, role: role as RoleType, step } },
        data: { completed: true, data: data as Prisma.InputJsonValue },
      });

      const progress = await this.getProgress(userId, role);
      if (!progress) throw new Error('Onboarding not found');
      return progress;
    } catch (err) {
      // Mock fallback
      const key = `${userId}-${role}`;
      const progress = mockOnboarding.get(key);
      if (!progress) throw new Error('Onboarding not found. Call /onboarding/start first.');

      const stepEntry = progress.steps.find((s) => s.step === step);
      if (!stepEntry) throw new Error(`Step ${step} not found`);

      stepEntry.completed = true;
      stepEntry.data = data;
      progress.currentStep = Math.min(
        progress.steps.filter((s) => s.completed).length + 1,
        progress.totalSteps
      );
      progress.submitted = progress.steps.every((s) => s.completed);

      return progress;
    }
  }

  async submitForApproval(userId: string, role: string): Promise<{ message: string; submitted: boolean }> {
    const progress = await this.getProgress(userId, role);

    if (!progress) {
      throw new Error('Onboarding not found');
    }

    const allCompleted = progress.steps.every((s) => s.completed);
    if (!allCompleted) {
      throw new Error('All onboarding steps must be completed before submission');
    }

    try {
      // Create the provider profile based on role
      const stepsData = progress.steps.reduce<Record<string, unknown>>((acc, s) => {
        if (s.data) Object.assign(acc, s.data);
        return acc;
      }, {});

      await this.createProviderProfile(userId, role as RoleType, stepsData);

      // A-010: the multi-step wizard never touched isPrimary after
      // startOnboarding, so a devotee who completed every step still logged in
      // as 'devotee'. Promote once the profile exists, not before.
      await this.setPrimaryRole(userId, role as RoleType);

      const ph = PRICE_PLACEHOLDER[role as RoleType];
      const sent = ph ? Number(stepsData[ph.field]) : NaN;
      const activation = (await this.activateOnSubmit(userId, role as RoleType, {
        priceProvided: Number.isFinite(sent) && sent > 0,
      }).catch(() => ({ activated: false }))) as {
        activated: boolean;
        message?: string;
      };
      if (activation.activated) {
        return { message: 'Your profile is live and your portal is ready.', submitted: true };
      }
      return {
        message:
          activation.message ??
          'Application submitted for review. You will be notified upon approval.',
        submitted: true,
      };
    } catch {
      return { message: 'Application submitted for review (demo). You will be notified upon approval.', submitted: true };
    }
  }

  // ─── Single-shot provider submit (used by /auth/signup) ──────────────────
  //
  // Idempotent: upserts user_role_assignments AND the role-specific
  // *_profiles row in sequence. Profile defaults to approved=false (schema
  // @default), so it lands in /admin/approvals immediately. Re-posting
  // overwrites editable fields without flipping approval state.

  async upsertProviderProfile(
    userId: string,
    role: RoleType,
    data: Record<string, unknown>,
  ): Promise<{ role: string; profileId?: string; approved: boolean; activated: boolean; reason?: string; message?: string }> {
    // A-010: was `create: { isPrimary: false }` + a no-op `update: {}`, which
    // left the account resolving as whatever it was before (devotee).
    await this.setPrimaryRole(userId, role);

    await this.createProviderProfile(userId, role, data);
    await this.saveUploads(userId, role, data);
    // The profile is saved either way: a failure to activate leaves it where the
    // old flow left it (waiting in /admin/approvals) instead of failing the submit.
    const placeholder = PRICE_PLACEHOLDER[role];
    const sentPrice = placeholder ? Number(data[placeholder.field]) : NaN;
    const activation = await this.activateOnSubmit(userId, role, {
      priceProvided: Number.isFinite(sentPrice) && sentPrice > 0,
    }).catch(() => ({ activated: false as const }));

    const profile = (await this.getProviderProfile(userId, role)) as { id?: string; approved?: boolean } | null;
    return { role, profileId: profile?.id, approved: activation.activated || profile?.approved === true, ...activation };
  }


  /**
   * REQUIRE_PROVIDER_APPROVAL=false (the default): a submitted provider profile
   * goes live with no admin action. Called from every submit path
   * (`upsertProviderProfile`, the wizard's `submitForApproval`).
   *
   * Holds back, with a reason the UI can state honestly, only what would put a
   * third party's money or identity at risk:
   *  - a blocked user (the blocked-user gate outranks everything);
   *  - a gaushala / temple profile below the cause-quality bar (it would be a
   *    public donation page);
   *  - a temple profile whose name is already a catalogue Temple that this
   *    manager is not explicitly linked to (name match is how donations and
   *    settlements find the payee, so an unreviewed claim on a real temple's
   *    name must stay a human decision).
   *
   * TC-08: never writes `Priest.isVerified` / `verificationStatus`. A pandit is
   * "live" (PanditProfile.approved + ACTIVE Priest row), not "vetted".
   */
  async activateOnSubmit(
    userId: string,
    role: RoleType,
    opts: { priceProvided?: boolean } = {},
  ): Promise<{ activated: boolean; reason?: 'approval_required' | 'blocked' | 'quality' | 'temple_name_taken' | 'incomplete'; message?: string }> {
    if (requireProviderApproval()) return { activated: false, reason: 'approval_required' };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { blocked: true } });
    if (user?.blocked) return { activated: false, reason: 'blocked' };

    if (role === 'PANDIT') {
      // Portal access = an ACTIVE Priest row. It does not wait for the public
      // listing: a registered pandit has a usable portal even while unlisted.
      // A suspended row stays suspended.
      await prisma.priest.updateMany({ where: { userId, status: 'inactive' }, data: { status: 'active' } });
    }

    // Listing completeness: what the public lists need (a price the owner
    // chose, specialties). Never invented; the portal says what is missing.
    const gaps = await this.listingGaps(userId, role, opts);
    if (gaps.length > 0) {
      return { activated: false, reason: 'incomplete', message: listingMessage(gaps) };
    }

    if (role === 'GAUSHALA_MANAGER' || role === 'TEMPLE_MANAGER') {
      const q = await assessCauseProfile(userId, role);
      if (q && !q.ok) {
        return {
          activated: false,
          reason: 'quality',
          message: `Your portal is active. To list this profile publicly, please fix: ${describeQualityReasons(q.reasons as CauseQualityReason[])}.`,
        };
      }
    }

    let templeNeedsCreate = false;
    if (role === 'TEMPLE_MANAGER') {
      const profile = await prisma.templeProfile.findUnique({ where: { userId }, select: { templeName: true } });
      const name = (profile?.templeName ?? '').trim();
      const existing = name
        ? await prisma.temple.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { id: true } })
        : null;
      if (existing) {
        const linked = await getLinkedTempleId(userId);
        if (linked !== existing.id) {
          return {
            activated: false,
            reason: 'temple_name_taken',
            message:
              'Your portal is active. A temple with this name is already on Darshya, so the Darshya team confirms that you manage it before donations and bookings are linked to you.',
          };
        }
      } else {
        templeNeedsCreate = true;
      }
    }

    const ok = await this.approveProviderProfile(userId, role);
    if (!ok) return { activated: false, reason: 'approval_required' };

    if (templeNeedsCreate) {
      // Hidden pending_review Temple + explicit link, exactly what the admin
      // "create temple from profile" button does; it is not listed to devotees.
      await createTempleFromProfile(userId).catch(() => undefined);
    }
    return { activated: true };
  }

  /**
   * What a profile still lacks before the public lists may show it. Price counts
   * as set when this submission carried one, or the stored value is no longer the
   * schema placeholder. Specialties must be non-empty for the three roles that
   * are searched by them.
   */
  async listingGaps(userId: string, role: RoleType, opts: { priceProvided?: boolean } = {}): Promise<ListingGap[]> {
    const placeholder = PRICE_PLACEHOLDER[role];
    if (!placeholder) return [];
    const profile = (await this.getProviderProfile(userId, role)) as Record<string, unknown> | null;
    if (!profile) return [];
    const gaps: ListingGap[] = [];
    const stored = Number(profile[placeholder.field]);
    if (!opts.priceProvided && !(Number.isFinite(stored) && stored !== placeholder.value)) gaps.push('price');
    const specialties = profile.specialties;
    if (!Array.isArray(specialties) || specialties.length === 0) gaps.push('specialties');
    return gaps;
  }

  /** Listing state for the portal screens: never approval wording unless the switch is on. */
  async describeListing(userId: string, role: RoleType): Promise<ListingStatus> {
    const approvalRequired = requireProviderApproval();
    const profile = (await this.getProviderProfile(userId, role)) as { approved?: boolean } | null;
    const listed = profile?.approved === true;
    if (listed) return { listed, approvalRequired, missing: [], message: null };
    if (approvalRequired) {
      return { listed, approvalRequired, missing: [], message: 'Your profile is waiting for admin approval.' };
    }
    const missing = await this.listingGaps(userId, role).catch(() => [] as ListingGap[]);
    if (missing.length === 0 && (role === 'GAUSHALA_MANAGER' || role === 'TEMPLE_MANAGER')) {
      const q = await assessCauseProfile(userId, role).catch(() => null);
      if (q && !q.ok) {
        return {
          listed,
          approvalRequired,
          missing,
          message: `Your portal is active. To list this profile publicly, please fix: ${describeQualityReasons(q.reasons as CauseQualityReason[])}.`,
        };
      }
    }
    return {
      listed,
      approvalRequired,
      missing,
      message: missing.length > 0 ? listingMessage(missing) : 'Your portal is active. Complete your profile details to be listed.',
    };
  }

  // Profile photo -> the account avatar; identity documents -> the private
  // storage keys kept on the verification step row (read back by admins through
  // short-lived signed URLs, never public).
  private async saveUploads(userId: string, role: RoleType, data: Record<string, unknown>): Promise<void> {
    const photoUrl = typeof data.photoUrl === 'string' && data.photoUrl ? data.photoUrl : null;
    if (photoUrl) {
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl: photoUrl } });
    }
    const aadhaarKey = typeof data.aadhaarDocKey === 'string' && data.aadhaarDocKey ? data.aadhaarDocKey : null;
    const certificateKey =
      typeof data.certificateDocKey === 'string' && data.certificateDocKey ? data.certificateDocKey : null;
    if (aadhaarKey || certificateKey) {
      const docs = { aadhaarKey, certificateKey };
      await prisma.onboardingStep.upsert({
        where: { userId_role_step: { userId, role, step: 4 } },
        update: { data: docs },
        create: { userId, role, step: 4, completed: false, data: docs },
      });
    }
  }

  /**
   * A-010 (2026-08-10) — provider portal lockout.
   *
   * A user has exactly ONE primary role assignment, and
   * `getPrimaryRoleForUser` (routes/auth.ts) derives the login role from it,
   * ordering `isPrimary desc, createdAt asc`. Onboarding used to write the new
   * provider assignment with `isPrimary:false` and never cleared the older
   * DEVOTEE row, so the devotee row always won: a devotee who became a pandit /
   * store owner / astrologer / wellness instructor / gaushala manager / temple
   * manager kept resolving as 'devotee' and the web AuthGuard bounced them off
   * their own portal permanently — recoverable only by a manual admin edit.
   *
   * Demote every other assignment, then promote this one, so the one-primary
   * invariant actually holds. Both halves run in ONE transaction: a demote that
   * commits without its promote would leave the account with no primary row at
   * all, which is a different flavour of the same lockout.
   */
  private async setPrimaryRole(userId: string, role: RoleType): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = (await tx.userRoleAssignment.findMany({ where: { userId } })) ?? [];

      for (const assignment of existing) {
        if (assignment.role === role || !assignment.isPrimary) continue;
        // upsert rather than update so a row that disappears between the read and
        // the write is recreated demoted instead of throwing P2025 mid-onboarding.
        await tx.userRoleAssignment.upsert({
          where: { userId_role: { userId, role: assignment.role } },
          update: { isPrimary: false },
          create: { userId, role: assignment.role, isPrimary: false },
        });
      }

      await tx.userRoleAssignment.upsert({
        where: { userId_role: { userId, role } },
        update: { isPrimary: true },
        create: { userId, role, isPrimary: true },
      });
    });
  }

  /**
   * Flip a provider profile to approved=true (immediately bookable). Used by
   * the lead-CONVERTED path (PBO-6) so an admin's conversion click both
   * provisions the profile AND activates it in one step — mirroring what
   * AdminService.updateUser does on /admin/approvals, without the role
   * re-seed or approval-email side effects (the caller sends its own
   * contextual lead-conversion email). Only PanditProfile carries an
   * approvedAt timestamp; the others have only `approved`.
   */
  async approveProviderProfile(userId: string, role: RoleType): Promise<boolean> {
    const now = new Date();
    switch (role) {
      case 'PANDIT': {
        const r = await prisma.panditProfile.updateMany({
          where: { userId },
          data: { approved: true, approvedAt: now },
        });
        return r.count > 0;
      }
      case 'STORE_OWNER': {
        const r = await prisma.storeProfile.updateMany({ where: { userId }, data: { approved: true } });
        return r.count > 0;
      }
      case 'ASTROLOGER': {
        const r = await prisma.astrologerProfile.updateMany({ where: { userId }, data: { approved: true } });
        return r.count > 0;
      }
      case 'WELLNESS_INSTRUCTOR': {
        const r = await prisma.wellnessProfile.updateMany({ where: { userId }, data: { approved: true } });
        return r.count > 0;
      }
      case 'GAUSHALA_MANAGER': {
        // Same cause quality gate as the admin approvals queue.
        const q = await assessCauseProfile(userId, role);
        if (q && !q.ok) return false;
        const r = await prisma.gaushalaProfile.updateMany({ where: { userId }, data: { approved: true } });
        return r.count > 0;
      }
      case 'TEMPLE_MANAGER': {
        const q = await assessCauseProfile(userId, role);
        if (q && !q.ok) return false;
        const r = await prisma.templeProfile.updateMany({ where: { userId }, data: { approved: true } });
        return r.count > 0;
      }
      default:
        return false;
    }
  }

  async getProviderProfile(userId: string, role: RoleType): Promise<Record<string, unknown> | null> {
    switch (role) {
      case 'PANDIT':
        return prisma.panditProfile.findUnique({ where: { userId } }) as Promise<Record<string, unknown> | null>;
      case 'STORE_OWNER':
        return prisma.storeProfile.findUnique({ where: { userId } }) as Promise<Record<string, unknown> | null>;
      case 'ASTROLOGER':
        return prisma.astrologerProfile.findUnique({ where: { userId } }) as Promise<Record<string, unknown> | null>;
      case 'WELLNESS_INSTRUCTOR':
        return prisma.wellnessProfile.findUnique({ where: { userId } }) as Promise<Record<string, unknown> | null>;
      case 'GAUSHALA_MANAGER':
        return prisma.gaushalaProfile.findUnique({ where: { userId } }) as Promise<Record<string, unknown> | null>;
      case 'TEMPLE_MANAGER':
        return prisma.templeProfile.findUnique({ where: { userId } }) as Promise<Record<string, unknown> | null>;
      default:
        return null;
    }
  }

  private async createProviderProfile(userId: string, role: RoleType, data: Record<string, unknown>): Promise<void> {
    switch (role) {
      case 'PANDIT': {
        await prisma.panditProfile.upsert({
          where: { userId },
          update: {
            templeName: data.templeName as string ?? null,
            experience: Number(data.experience) || 0,
            specialties: (data.specialties as string[]) ?? [],
            languages: (data.languages as string[]) ?? [],
            bio: data.bio as string ?? null,
            city: data.city as string ?? null,
            state: data.state as string ?? null,
            ...(Number(data.pricePerPuja) > 0 ? { pricePerPuja: Number(data.pricePerPuja) } : {}),
          },
          create: {
            userId,
            templeName: data.templeName as string ?? null,
            experience: Number(data.experience) || 0,
            specialties: (data.specialties as string[]) ?? [],
            languages: (data.languages as string[]) ?? [],
            bio: data.bio as string ?? null,
            city: data.city as string ?? null,
            state: data.state as string ?? null,
            ...(Number(data.pricePerPuja) > 0 ? { pricePerPuja: Number(data.pricePerPuja) } : {}),
          },
        });
        // Mirror into `Priest` so getPriestId() in priest routes / payouts
        // resolves. Without this, every priest-dashboard route throws
        // "Priest account not found" and payouts cannot be issued.
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { fullName: true },
        });
        const displayName = (data.displayName as string)
          ?? user?.fullName
          ?? 'Pandit';
        await prisma.priest.upsert({
          where: { userId },
          update: {
            displayName,
            specializations: (data.specialties as string[]) ?? [],
            languages: (data.languages as string[]) ?? [],
            experienceYears: Number(data.experience) || 0,
            bio: data.bio as string ?? null,
          },
          create: {
            userId,
            displayName,
            specializations: (data.specialties as string[]) ?? [],
            languages: (data.languages as string[]) ?? [],
            experienceYears: Number(data.experience) || 0,
            bio: data.bio as string ?? null,
          },
        });
        break;
      }
      case 'STORE_OWNER':
        await prisma.storeProfile.upsert({
          where: { userId },
          update: {
            storeName: data.storeName as string ?? 'Unnamed Store',
            gstNumber: data.gstNumber as string ?? null,
            address: data.address as string ?? null,
            city: data.city as string ?? null,
            state: data.state as string ?? null,
            categories: (data.categories as string[]) ?? [],
          },
          create: {
            userId,
            storeName: data.storeName as string ?? 'Unnamed Store',
            gstNumber: data.gstNumber as string ?? null,
            address: data.address as string ?? null,
            city: data.city as string ?? null,
            state: data.state as string ?? null,
            categories: (data.categories as string[]) ?? [],
          },
        });
        break;
      case 'ASTROLOGER':
        await prisma.astrologerProfile.upsert({
          where: { userId },
          update: {
            displayName: data.displayName as string ?? 'Unnamed',
            specialties: (data.specialties as string[]) ?? [],
            experience: Number(data.experience) || 0,
            languages: (data.languages as string[]) ?? [],
            bio: data.bio as string ?? null,
            ...(Number(data.pricePerMinute) > 0 ? { pricePerMinute: Number(data.pricePerMinute) } : {}),
          },
          create: {
            userId,
            displayName: data.displayName as string ?? 'Unnamed',
            specialties: (data.specialties as string[]) ?? [],
            experience: Number(data.experience) || 0,
            languages: (data.languages as string[]) ?? [],
            bio: data.bio as string ?? null,
            ...(Number(data.pricePerMinute) > 0 ? { pricePerMinute: Number(data.pricePerMinute) } : {}),
          },
        });
        break;
      case 'WELLNESS_INSTRUCTOR':
        await prisma.wellnessProfile.upsert({
          where: { userId },
          update: {
            displayName: data.displayName as string ?? 'Unnamed',
            specialties: (data.specialties as string[]) ?? [],
            certifications: (data.certifications as string[]) ?? [],
            experience: Number(data.experience) || 0,
            bio: data.bio as string ?? null,
            ...(Number(data.pricePerSession) > 0 ? { pricePerSession: Number(data.pricePerSession) } : {}),
          },
          create: {
            userId,
            displayName: data.displayName as string ?? 'Unnamed',
            specialties: (data.specialties as string[]) ?? [],
            certifications: (data.certifications as string[]) ?? [],
            experience: Number(data.experience) || 0,
            bio: data.bio as string ?? null,
            ...(Number(data.pricePerSession) > 0 ? { pricePerSession: Number(data.pricePerSession) } : {}),
          },
        });
        break;
      case 'GAUSHALA_MANAGER':
        await prisma.gaushalaProfile.upsert({
          where: { userId },
          update: {
            gaushalaName: data.gaushalaName as string ?? 'Unnamed Gaushala',
            address: data.address as string ?? null,
            city: data.city as string ?? null,
            totalCows: Number(data.totalCows) || 0,
            description: data.description as string ?? null,
          },
          create: {
            userId,
            gaushalaName: data.gaushalaName as string ?? 'Unnamed Gaushala',
            address: data.address as string ?? null,
            city: data.city as string ?? null,
            totalCows: Number(data.totalCows) || 0,
            description: data.description as string ?? null,
          },
        });
        break;
      case 'TEMPLE_MANAGER':
        await prisma.templeProfile.upsert({
          where: { userId },
          update: {
            templeName: data.templeName as string ?? 'Unnamed Temple',
            deity: data.deity as string ?? null,
            city: data.city as string ?? null,
            state: data.state as string ?? null,
            address: data.address as string ?? null,
            description: data.description as string ?? null,
          },
          create: {
            userId,
            templeName: data.templeName as string ?? 'Unnamed Temple',
            deity: data.deity as string ?? null,
            city: data.city as string ?? null,
            state: data.state as string ?? null,
            address: data.address as string ?? null,
            description: data.description as string ?? null,
          },
        });
        break;
    }
  }
}

export const onboardingService = new OnboardingService();
