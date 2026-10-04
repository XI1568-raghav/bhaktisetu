/**
 * Lead-conversion approval path (approveProviderProfile) must obey the same
 * cause quality gate as the admin approvals queue.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { OnboardingService } from './onboarding.service.js';

let service: OnboardingService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new OnboardingService();
  prismaMock.gaushalaProfile.updateMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templeProfile.updateMany.mockResolvedValue({ count: 1 } as never);
});

describe('approveProviderProfile cause gate', () => {
  it('does not approve a junk gaushala', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({
      gaushalaName: 'saharanpur', description: 'skkss', address: 'ssdwdqe',
    } as never);
    expect(await service.approveProviderProfile('u1', 'GAUSHALA_MANAGER')).toBe(false);
    expect(prismaMock.gaushalaProfile.updateMany).not.toHaveBeenCalled();
  });

  it('does not approve a temple with no address or description', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: 'Shri Mahakaleshwar Temple', description: null, address: null,
    } as never);
    expect(await service.approveProviderProfile('u1', 'TEMPLE_MANAGER')).toBe(false);
    expect(prismaMock.templeProfile.updateMany).not.toHaveBeenCalled();
  });

  it('approves a good gaushala', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({
      gaushalaName: 'Shri Krishna Gaushala',
      description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.',
      address: 'Vrindavan Road, Mathura',
    } as never);
    expect(await service.approveProviderProfile('u1', 'GAUSHALA_MANAGER')).toBe(true);
  });
});
