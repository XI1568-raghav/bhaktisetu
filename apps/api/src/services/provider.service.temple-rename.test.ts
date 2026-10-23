import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { ProviderService } from './provider.service.js';

/**
 * With REQUIRE_PROVIDER_APPROVAL off a temple profile goes live on submit, so
 * renaming it onto a catalogue temple would be the way to claim that temple's
 * donations (the name match finds the payee). The rename must drop the profile
 * back to not-live unless an admin linked this manager to that temple.
 */
const ID = '11111111-1111-4111-8111-111111111111';
const UID = '22222222-2222-4222-8222-222222222222';
const live = { id: ID, userId: UID, templeName: 'My Own Mandir', approved: true, description: 'A long enough description here', address: '12 Temple Road, Pune' };

let service: ProviderService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new ProviderService();
  prismaMock.templeProfile.findUnique.mockResolvedValue(live);
  prismaMock.templeProfile.update.mockImplementation(async (a: { data: Record<string, unknown> }) => ({ ...live, ...a.data }));
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
});
afterEach(() => {
  delete process.env.REQUIRE_PROVIDER_APPROVAL;
});

describe('temple profile rename (approval off)', () => {
  it('renaming onto a catalogue temple un-lists the profile', async () => {
    prismaMock.temple.findFirst.mockResolvedValue({ id: 't-real' });
    await service.updateProvider('temple', ID, UID, { templeName: 'Somnath Temple' });
    expect(prismaMock.templeProfile.update.mock.calls[0]![0].data).toMatchObject({ templeName: 'Somnath Temple', approved: false });
  });

  it('renaming to a name nobody has keeps it live', async () => {
    prismaMock.temple.findFirst.mockResolvedValue(null);
    await service.updateProvider('temple', ID, UID, { templeName: 'Another New Mandir' });
    expect(prismaMock.templeProfile.update.mock.calls[0]![0].data.approved).toBeUndefined();
  });

  it('an explicit admin link to that temple keeps it live', async () => {
    prismaMock.temple.findFirst.mockResolvedValue({ id: 't-real' });
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ temple_id: 't-real' }]);
    await service.updateProvider('temple', ID, UID, { templeName: 'Somnath Temple' });
    expect(prismaMock.templeProfile.update.mock.calls[0]![0].data.approved).toBeUndefined();
  });

  it('with approval required the admin-approved flow is untouched', async () => {
    process.env.REQUIRE_PROVIDER_APPROVAL = 'true';
    prismaMock.temple.findFirst.mockResolvedValue({ id: 't-real' });
    await service.updateProvider('temple', ID, UID, { templeName: 'Somnath Temple' });
    expect(prismaMock.templeProfile.update.mock.calls[0]![0].data.approved).toBeUndefined();
  });
});
