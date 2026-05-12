import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

type RoleType = 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER';

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
      // Create role assignment
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

      return { message: 'Application submitted for review. You will be notified upon approval.', submitted: true };
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
  ): Promise<{ role: string; profileId?: string }> {
    await prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId, role } },
      update: {},
      create: { userId, role, isPrimary: false },
    });

    await this.createProviderProfile(userId, role, data);

    const profileId = await this.fetchProfileId(userId, role);
    return { role, profileId };
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

  private async fetchProfileId(userId: string, role: RoleType): Promise<string | undefined> {
    const profile = await this.getProviderProfile(userId, role);
    return (profile as { id?: string } | null)?.id;
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
            pricePerPuja: Number(data.pricePerPuja) || 500,
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
            pricePerPuja: Number(data.pricePerPuja) || 500,
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
            pricePerMinute: Number(data.pricePerMinute) || 10,
          },
          create: {
            userId,
            displayName: data.displayName as string ?? 'Unnamed',
            specialties: (data.specialties as string[]) ?? [],
            experience: Number(data.experience) || 0,
            languages: (data.languages as string[]) ?? [],
            bio: data.bio as string ?? null,
            pricePerMinute: Number(data.pricePerMinute) || 10,
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
            pricePerSession: Number(data.pricePerSession) || 500,
          },
          create: {
            userId,
            displayName: data.displayName as string ?? 'Unnamed',
            specialties: (data.specialties as string[]) ?? [],
            certifications: (data.certifications as string[]) ?? [],
            experience: Number(data.experience) || 0,
            bio: data.bio as string ?? null,
            pricePerSession: Number(data.pricePerSession) || 500,
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
