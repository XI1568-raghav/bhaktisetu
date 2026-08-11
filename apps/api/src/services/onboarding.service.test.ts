import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { OnboardingService } from './onboarding.service.js';

let service: OnboardingService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new OnboardingService();
});

describe('OnboardingService.getStepsForRole', () => {
  it('returns 5-step list for PANDIT', () => {
    const steps = service.getStepsForRole('PANDIT');
    expect(steps).toHaveLength(5);
    expect(steps[0]).toBe('Personal Details');
    expect(steps[4]).toBe('Review & Submit');
  });

  it('returns 5-step list for STORE_OWNER', () => {
    const steps = service.getStepsForRole('STORE_OWNER');
    expect(steps).toHaveLength(5);
    expect(steps).toContain('Store Information');
  });

  it('returns 5-step list for ASTROLOGER', () => {
    expect(service.getStepsForRole('ASTROLOGER')).toHaveLength(5);
  });

  it('returns 5-step list for GAUSHALA_MANAGER', () => {
    const steps = service.getStepsForRole('GAUSHALA_MANAGER');
    expect(steps).toContain('Cow Details');
  });

  it('returns 5-step list for TEMPLE_MANAGER', () => {
    const steps = service.getStepsForRole('TEMPLE_MANAGER');
    expect(steps).toContain('Deity & Traditions');
  });

  it('returns empty for unknown role', () => {
    expect(service.getStepsForRole('GHOST')).toEqual([]);
  });
});

describe('OnboardingService.startOnboarding', () => {
  it('throws on invalid role', async () => {
    await expect(service.startOnboarding('user-1', 'BOGUS' as any)).rejects.toThrow(/Invalid role/);
  });

  it('upserts role assignment + step records when prisma succeeds', async () => {
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.onboardingStep.upsert.mockResolvedValue({});
    prismaMock.userRoleAssignment.findFirst.mockResolvedValue({ role: 'PANDIT' });
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { step: 1, completed: false, data: null },
      { step: 2, completed: false, data: null },
      { step: 3, completed: false, data: null },
      { step: 4, completed: false, data: null },
      { step: 5, completed: false, data: null },
    ]);

    const out = await service.startOnboarding('user-1', 'PANDIT');

    expect(out.userId).toBe('user-1');
    expect(out.role).toBe('PANDIT');
    expect(out.totalSteps).toBe(5);
    expect(out.currentStep).toBe(1);
    expect(out.submitted).toBe(false);
    expect(prismaMock.userRoleAssignment.upsert).toHaveBeenCalled();
    expect(prismaMock.onboardingStep.upsert).toHaveBeenCalledTimes(5);
  });

  it('falls back to in-memory when prisma throws', async () => {
    prismaMock.userRoleAssignment.upsert.mockRejectedValue(new Error('db down'));

    const out = await service.startOnboarding('user-fallback', 'ASTROLOGER');

    expect(out.userId).toBe('user-fallback');
    expect(out.totalSteps).toBe(5);
    expect(out.steps).toHaveLength(5);
    expect(out.steps.every((s) => s.completed === false)).toBe(true);
  });
});

describe('OnboardingService.getProgress', () => {
  it('returns null when no assignment found and no role given', async () => {
    prismaMock.userRoleAssignment.findFirst.mockResolvedValue(null);
    const out = await service.getProgress('user-empty');
    expect(out).toBeNull();
  });

  it('returns null when no steps exist for role', async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([]);
    const out = await service.getProgress('user-no-steps', 'PANDIT');
    expect(out).toBeNull();
  });

  it('computes currentStep + submitted=true when all 5 done', async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { step: 1, completed: true, data: {} },
      { step: 2, completed: true, data: {} },
      { step: 3, completed: true, data: {} },
      { step: 4, completed: true, data: {} },
      { step: 5, completed: true, data: {} },
    ]);

    const out = await service.getProgress('user-1', 'PANDIT');
    expect(out!.submitted).toBe(true);
    expect(out!.currentStep).toBe(5);
  });

  it('computes currentStep mid-way', async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { step: 1, completed: true, data: {} },
      { step: 2, completed: true, data: {} },
      { step: 3, completed: false, data: null },
      { step: 4, completed: false, data: null },
      { step: 5, completed: false, data: null },
    ]);

    const out = await service.getProgress('user-mid', 'PANDIT');
    expect(out!.currentStep).toBe(3);
    expect(out!.submitted).toBe(false);
  });
});

describe('OnboardingService.submitForApproval', () => {
  it('throws when onboarding not found', async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([]);
    await expect(service.submitForApproval('user-x', 'PANDIT')).rejects.toThrow(/Onboarding not found/);
  });

  it('throws when not all steps completed', async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { step: 1, completed: true, data: {} },
      { step: 2, completed: false, data: null },
      { step: 3, completed: false, data: null },
      { step: 4, completed: false, data: null },
      { step: 5, completed: false, data: null },
    ]);
    await expect(service.submitForApproval('user-x', 'PANDIT')).rejects.toThrow(/must be completed/);
  });

  it('returns submitted:true when all steps complete', async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { step: 1, completed: true, data: { name: 'A' } },
      { step: 2, completed: true, data: { city: 'Pune' } },
      { step: 3, completed: true, data: { experience: 5 } },
      { step: 4, completed: true, data: {} },
      { step: 5, completed: true, data: {} },
    ]);
    prismaMock.panditProfile.upsert.mockResolvedValue({});

    const out = await service.submitForApproval('user-ok', 'PANDIT');
    expect(out.submitted).toBe(true);
    expect(prismaMock.panditProfile.upsert).toHaveBeenCalled();
  });
});

describe('OnboardingService.upsertProviderProfile', () => {
  it('upserts role assignment + STORE_OWNER profile', async () => {
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.storeProfile.upsert.mockResolvedValue({});
    prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'sp-1' });

    const out = await service.upsertProviderProfile('user-s', 'STORE_OWNER', {
      storeName: 'Sai Bhandar',
      city: 'Mumbai',
    });

    expect(out.role).toBe('STORE_OWNER');
    expect(out.profileId).toBe('sp-1');
    expect(prismaMock.userRoleAssignment.upsert).toHaveBeenCalled();
    expect(prismaMock.storeProfile.upsert).toHaveBeenCalled();
  });

  it('upserts ASTROLOGER profile with default rate when missing', async () => {
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.astrologerProfile.upsert.mockResolvedValue({});
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ id: 'ap-1' });

    await service.upsertProviderProfile('user-a', 'ASTROLOGER', { displayName: 'Acharya X' });

    const call = prismaMock.astrologerProfile.upsert.mock.calls[0]![0]!;
    expect(call.create.pricePerMinute).toBe(10);
  });
});

// A-010 — devotee→provider onboarding used to leave the new role
// isPrimary:false, so getPrimaryRoleForUser kept resolving 'devotee' and the
// web AuthGuard bounced the provider off their own portal permanently.
describe('OnboardingService — A-010 primary-role promotion', () => {
  function roleUpsertFor(role: string) {
    return prismaMock.userRoleAssignment.upsert.mock.calls
      .map((c) => c[0])
      .find((c: any) => c.where.userId_role.role === role);
  }

  it('upsertProviderProfile promotes the provider role to primary', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'user-p', role: 'DEVOTEE', isPrimary: true },
    ]);
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.panditProfile.upsert.mockResolvedValue({});
    prismaMock.priest.upsert.mockResolvedValue({});
    prismaMock.user.findUnique.mockResolvedValue({ fullName: 'Pandit A' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ id: 'pp-9' });

    await service.upsertProviderProfile('user-p', 'PANDIT', { experience: 3 });

    const pandit = roleUpsertFor('PANDIT');
    expect(pandit.update.isPrimary).toBe(true);
    expect(pandit.create.isPrimary).toBe(true);
  });

  it('upsertProviderProfile demotes the previously-primary devotee row', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'user-d', role: 'DEVOTEE', isPrimary: true },
    ]);
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.storeProfile.upsert.mockResolvedValue({});
    prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'sp-9' });

    await service.upsertProviderProfile('user-d', 'STORE_OWNER', { storeName: 'X' });

    const devotee = roleUpsertFor('DEVOTEE');
    expect(devotee).toBeDefined();
    expect(devotee.update.isPrimary).toBe(false);
    // Demote must land before the promote, so the one-primary invariant never
    // passes through a state with two primaries.
    const roles = prismaMock.userRoleAssignment.upsert.mock.calls.map(
      (c) => (c[0] as any).where.userId_role.role,
    );
    expect(roles.indexOf('DEVOTEE')).toBeLessThan(roles.indexOf('STORE_OWNER'));
  });

  it('leaves already-non-primary rows alone', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'user-n', role: 'DEVOTEE', isPrimary: false },
      { userId: 'user-n', role: 'ASTROLOGER', isPrimary: false },
    ]);
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.astrologerProfile.upsert.mockResolvedValue({});
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ id: 'ap-9' });

    await service.upsertProviderProfile('user-n', 'ASTROLOGER', {});

    expect(roleUpsertFor('DEVOTEE')).toBeUndefined();
    expect(roleUpsertFor('ASTROLOGER').update.isPrimary).toBe(true);
  });

  it('submitForApproval promotes the wizard role once all steps are done', async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { step: 1, completed: true, data: {} },
      { step: 2, completed: true, data: {} },
      { step: 3, completed: true, data: {} },
      { step: 4, completed: true, data: {} },
      { step: 5, completed: true, data: {} },
    ]);
    prismaMock.templeProfile.upsert.mockResolvedValue({});
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'user-t', role: 'DEVOTEE', isPrimary: true },
      { userId: 'user-t', role: 'TEMPLE_MANAGER', isPrimary: false },
    ]);
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});

    const out = await service.submitForApproval('user-t', 'TEMPLE_MANAGER');

    expect(out.submitted).toBe(true);
    expect(roleUpsertFor('TEMPLE_MANAGER').update.isPrimary).toBe(true);
    expect(roleUpsertFor('DEVOTEE').update.isPrimary).toBe(false);
  });

  it('runs demote+promote inside one transaction', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'user-tx', role: 'DEVOTEE', isPrimary: true },
    ]);
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.gaushalaProfile.upsert.mockResolvedValue({});
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ id: 'gp-9' });

    await service.upsertProviderProfile('user-tx', 'GAUSHALA_MANAGER', {});

    // A committed demote without its promote would leave the account with NO
    // primary row — the same portal lockout wearing a different hat.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.userRoleAssignment.upsert).toHaveBeenCalledTimes(2);
  });

  it('startOnboarding does NOT promote — opening the wizard is not a commitment', async () => {
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.onboardingStep.upsert.mockResolvedValue({});
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { step: 1, completed: false, data: null },
      { step: 2, completed: false, data: null },
      { step: 3, completed: false, data: null },
      { step: 4, completed: false, data: null },
      { step: 5, completed: false, data: null },
    ]);

    await service.startOnboarding('user-w', 'WELLNESS_INSTRUCTOR');

    expect(roleUpsertFor('WELLNESS_INSTRUCTOR').create.isPrimary).toBe(false);
  });
});

describe('OnboardingService.getProviderProfile', () => {
  it('routes PANDIT to panditProfile', async () => {
    prismaMock.panditProfile.findUnique.mockResolvedValue({ id: 'pp-1' });
    const out = await service.getProviderProfile('u-1', 'PANDIT');
    expect(out).toEqual({ id: 'pp-1' });
  });

  it('routes WELLNESS_INSTRUCTOR to wellnessProfile', async () => {
    prismaMock.wellnessProfile.findUnique.mockResolvedValue({ id: 'wp-1' });
    const out = await service.getProviderProfile('u-2', 'WELLNESS_INSTRUCTOR');
    expect(out).toEqual({ id: 'wp-1' });
  });

  it('routes TEMPLE_MANAGER to templeProfile', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ id: 'tp-1' });
    const out = await service.getProviderProfile('u-3', 'TEMPLE_MANAGER');
    expect(out).toEqual({ id: 'tp-1' });
  });

  it('returns null for unknown role', async () => {
    const out = await service.getProviderProfile('u-x', 'GHOST' as any);
    expect(out).toBeNull();
  });
});
