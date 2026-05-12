import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

beforeEach(() => {
  vi.clearAllMocks();
});

async function loadService() {
  vi.resetModules();
  const mod = await import('./onboarding.service.js');
  return new mod.OnboardingService();
}

// Regression — P1 from end-to-end audit.
// PANDIT signup previously created only `panditProfile`. Every priest-route
// guard calls `getPriestId()` → `prisma.priest.findUnique({ where: { userId } })`.
// Without a mirrored Priest row, signed-up pandits hit "Priest account not found"
// and cannot reach dashboard, accept bookings, or be paid out.
describe('OnboardingService.upsertProviderProfile — PANDIT mirror', () => {
  it('creates Priest row alongside panditProfile (uses user.fullName when displayName absent)', async () => {
    const service = await loadService();
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.panditProfile.upsert.mockResolvedValue({ id: 'pp-1' });
    prismaMock.user.findUnique.mockResolvedValue({ fullName: 'Pandit Sharma' });
    prismaMock.priest.upsert.mockResolvedValue({ id: 'priest-1' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ id: 'pp-1' });

    await service.upsertProviderProfile('user-1', 'PANDIT', {
      specialties: ['Satyanarayan', 'Griha Pravesh'],
      languages: ['hi', 'sa'],
      experience: 12,
      bio: 'Vedic priest, 12 yrs',
      pricePerPuja: 1500,
    });

    expect(prismaMock.panditProfile.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.priest.upsert).toHaveBeenCalledTimes(1);

    const args = prismaMock.priest.upsert.mock.calls[0]![0];
    expect(args.where).toEqual({ userId: 'user-1' });
    expect(args.create).toMatchObject({
      userId: 'user-1',
      displayName: 'Pandit Sharma',
      specializations: ['Satyanarayan', 'Griha Pravesh'],
      languages: ['hi', 'sa'],
      experienceYears: 12,
    });
    expect(args.update).toMatchObject({
      displayName: 'Pandit Sharma',
      specializations: ['Satyanarayan', 'Griha Pravesh'],
      experienceYears: 12,
    });
  });

  it('prefers explicit displayName over user.fullName', async () => {
    const service = await loadService();
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.panditProfile.upsert.mockResolvedValue({ id: 'pp-2' });
    prismaMock.user.findUnique.mockResolvedValue({ fullName: 'Old Name' });
    prismaMock.priest.upsert.mockResolvedValue({ id: 'priest-2' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ id: 'pp-2' });

    await service.upsertProviderProfile('user-2', 'PANDIT', {
      displayName: 'Acharya Tripathi',
      specialties: [],
      languages: [],
      experience: 0,
    });

    const args = prismaMock.priest.upsert.mock.calls[0]![0];
    expect(args.create.displayName).toBe('Acharya Tripathi');
  });

  it('falls back to "Pandit" when neither displayName nor user row available', async () => {
    const service = await loadService();
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.panditProfile.upsert.mockResolvedValue({ id: 'pp-3' });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.priest.upsert.mockResolvedValue({ id: 'priest-3' });
    prismaMock.panditProfile.findUnique.mockResolvedValue({ id: 'pp-3' });

    await service.upsertProviderProfile('user-3', 'PANDIT', {
      specialties: [],
      languages: [],
      experience: 0,
    });

    const args = prismaMock.priest.upsert.mock.calls[0]![0];
    expect(args.create.displayName).toBe('Pandit');
  });

  it('does NOT touch prisma.priest for non-PANDIT roles', async () => {
    const service = await loadService();
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.storeProfile.upsert.mockResolvedValue({ id: 'sp-1' });
    prismaMock.storeProfile.findUnique.mockResolvedValue({ id: 'sp-1' });

    await service.upsertProviderProfile('user-4', 'STORE_OWNER', {
      storeName: 'Devi Bhandar',
      city: 'Varanasi',
    });

    expect(prismaMock.priest.upsert).not.toHaveBeenCalled();
  });
});
