import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { OnboardingService, type RoleType } from './onboarding.service.js';

/**
 * REQUIRE_PROVIDER_APPROVAL (default off): a submitted provider profile goes live
 * with no admin action, for all six roles. These pin what activation does and,
 * as important, what it refuses to do.
 */
let service: OnboardingService;
const GOOD_TEXT = {
  description: 'A traditional shrine serving the community',
  address: '12 Temple Road, Varanasi, Uttar Pradesh',
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.REQUIRE_PROVIDER_APPROVAL;
  service = new OnboardingService();
  prismaMock.user.findUnique.mockResolvedValue({ blocked: false });
  for (const m of ['panditProfile', 'storeProfile', 'astrologerProfile', 'wellnessProfile', 'gaushalaProfile', 'templeProfile'] as const) {
    (prismaMock[m].updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
  }
  prismaMock.priest.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
});
afterEach(() => {
  delete process.env.REQUIRE_PROVIDER_APPROVAL;
});

describe('activateOnSubmit — switch off (default)', () => {
  type ProfileModel = 'panditProfile' | 'storeProfile' | 'astrologerProfile' | 'wellnessProfile';
  const simple: Array<[RoleType, ProfileModel]> = [
    ['PANDIT', 'panditProfile'],
    ['STORE_OWNER', 'storeProfile'],
    ['ASTROLOGER', 'astrologerProfile'],
    ['WELLNESS_INSTRUCTOR', 'wellnessProfile'],
  ];
  it.each(simple)('%s: profile goes live on submit', async (role, model) => {
    const r = await service.activateOnSubmit('u-1', role);
    expect(r).toEqual({ activated: true });
    const upd = prismaMock[model].updateMany.mock.calls[0]![0];
    expect(upd.where).toEqual({ userId: 'u-1' });
    expect(upd.data.approved).toBe(true);
  });

  it('PANDIT: reopens an inactive Priest row and NEVER writes a vetting verdict (TC-08)', async () => {
    await service.activateOnSubmit('u-1', 'PANDIT');
    expect(prismaMock.priest.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', status: 'inactive' },
      data: { status: 'active' },
    });
    for (const call of [...prismaMock.priest.updateMany.mock.calls, ...prismaMock.priest.update.mock.calls, ...prismaMock.priest.upsert.mock.calls]) {
      const json = JSON.stringify(call);
      expect(json).not.toMatch(/isVerified|verificationStatus|aadhaarVerified/);
    }
  });

  it('GAUSHALA_MANAGER: a profile below the quality bar stays unlisted and says what to fix', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ gaushalaName: 'Unnamed Gaushala', description: null, address: null });
    const r = await service.activateOnSubmit('u-1', 'GAUSHALA_MANAGER');
    expect(r.activated).toBe(false);
    expect(r.reason).toBe('quality');
    expect(r.message).toMatch(/portal is active/i);
    expect(prismaMock.gaushalaProfile.updateMany).not.toHaveBeenCalled();
  });

  it('GAUSHALA_MANAGER: a complete profile goes live', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ gaushalaName: 'Shri Gau Seva', ...GOOD_TEXT });
    expect((await service.activateOnSubmit('u-1', 'GAUSHALA_MANAGER')).activated).toBe(true);
    expect(prismaMock.gaushalaProfile.updateMany).toHaveBeenCalled();
  });

  it('TEMPLE_MANAGER: a name that is already a catalogue Temple activates and links the manager to it (no admin step)', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath Temple', ...GOOD_TEXT });
    prismaMock.temple.findFirst.mockResolvedValue({ id: 't-real' });
    prismaMock.$queryRawUnsafe.mockResolvedValue([]); // not linked yet
    const r = await service.activateOnSubmit('u-1', 'TEMPLE_MANAGER');
    expect(r.activated).toBe(true);
    const linked = prismaMock.$executeRawUnsafe.mock.calls.some((c: unknown[]) => String(c[0]).includes('temple_manager_links') && c.includes('t-real'));
    expect(linked).toBe(true);
    expect(prismaMock.temple.create).not.toHaveBeenCalled();
  });

  it('TEMPLE_MANAGER: an explicit admin link to that temple lets it activate', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath Temple', ...GOOD_TEXT });
    prismaMock.temple.findFirst.mockResolvedValue({ id: 't-real' });
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ temple_id: 't-real' }]);
    expect((await service.activateOnSubmit('u-1', 'TEMPLE_MANAGER')).activated).toBe(true);
  });

  it('TEMPLE_MANAGER: a new temple name is activated and gets a hidden pending_review Temple + link', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Brand New Mandir', city: 'Pune', state: 'MH', ...GOOD_TEXT });
    prismaMock.temple.findFirst.mockResolvedValue(null);
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.create.mockResolvedValue({ id: 't-new', slug: 'brand-new-mandir' });
    const r = await service.activateOnSubmit('u-1', 'TEMPLE_MANAGER');
    expect(r.activated).toBe(true);
    const created = prismaMock.temple.create.mock.calls[0]![0].data;
    expect(created).toMatchObject({ isVerified: false, status: 'pending_review' });
  });

  it('a blocked user is never activated (the blocked-user gate outranks the switch)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ blocked: true });
    for (const role of ['PANDIT', 'STORE_OWNER', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR'] as RoleType[]) {
      expect(await service.activateOnSubmit('u-1', role)).toEqual({ activated: false, reason: 'blocked' });
    }
    expect(prismaMock.panditProfile.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.storeProfile.updateMany).not.toHaveBeenCalled();
  });
});

describe('activateOnSubmit — REQUIRE_PROVIDER_APPROVAL=true restores the old gate', () => {
  it.each(['true', '1', 'yes', 'on', 'TRUE'])('value %s: nothing is activated', async (v) => {
    process.env.REQUIRE_PROVIDER_APPROVAL = v;
    for (const role of ['PANDIT', 'STORE_OWNER', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER'] as RoleType[]) {
      expect(await service.activateOnSubmit('u-1', role)).toEqual({ activated: false, reason: 'approval_required' });
    }
    expect(prismaMock.panditProfile.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.templeProfile.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.priest.updateMany).not.toHaveBeenCalled();
  });

  it.each(['', 'false', '0', 'off', 'no'])('value %j keeps approval OFF', async (v) => {
    process.env.REQUIRE_PROVIDER_APPROVAL = v;
    expect((await service.activateOnSubmit('u-1', 'STORE_OWNER')).activated).toBe(true);
  });
});

describe('activateOnSubmit — listing completeness (no invented prices)', () => {
  type Row = Record<string, unknown>;
  const priced: Array<[RoleType, 'panditProfile' | 'astrologerProfile' | 'wellnessProfile', string, number]> = [
    ['PANDIT', 'panditProfile', 'pricePerPuja', 500],
    ['ASTROLOGER', 'astrologerProfile', 'pricePerMinute', 10],
    ['WELLNESS_INSTRUCTOR', 'wellnessProfile', 'pricePerSession', 500],
  ];

  function profile(model: 'panditProfile' | 'astrologerProfile' | 'wellnessProfile', row: Row) {
    (prismaMock[model].findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(row);
  }

  it.each(priced)('%s: placeholder price and nothing submitted -> portal active, NOT listed, says what is missing', async (role, model, field, placeholder) => {
    profile(model, { [field]: placeholder, specialties: ['Yoga'] });
    const r = await service.activateOnSubmit('u-1', role);
    expect(r.activated).toBe(false);
    expect(r.reason).toBe('incomplete');
    expect(r.message).toMatch(/^Your portal is active\. Add your price/);
    expect(r.message).not.toMatch(/approval|review/i);
    expect(prismaMock[model].updateMany).not.toHaveBeenCalled();
  });

  it.each(priced)('%s: a submitted price (even the placeholder value) lists the profile', async (role, model, _f, _p) => {
    profile(model, { specialties: ['Yoga'] });
    expect((await service.activateOnSubmit('u-1', role, { priceProvided: true })).activated).toBe(true);
    expect(prismaMock[model].updateMany).toHaveBeenCalled();
  });

  it.each(priced)('%s: a stored price that is not the placeholder counts as set', async (role, model, field, placeholder) => {
    profile(model, { [field]: placeholder + 1, specialties: ['Yoga'] });
    expect((await service.activateOnSubmit('u-1', role)).activated).toBe(true);
  });

  it.each(priced)('%s: no specialties -> unlisted, message names specialties', async (role, model, field) => {
    profile(model, { [field]: 1234, specialties: [] });
    const r = await service.activateOnSubmit('u-1', role, { priceProvided: true });
    expect(r.reason).toBe('incomplete');
    expect(r.message).toMatch(/specialties/);
  });

  it('PANDIT: the Priest row (portal access) is active even while the listing waits for a price', async () => {
    profile('panditProfile', { pricePerPuja: 500, specialties: [] });
    await service.activateOnSubmit('u-1', 'PANDIT');
    expect(prismaMock.priest.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', status: 'inactive' },
      data: { status: 'active' },
    });
  });

  it('STORE_OWNER has no price gate: it lists on submit', async () => {
    expect((await service.activateOnSubmit('u-1', 'STORE_OWNER')).activated).toBe(true);
  });

  it('describeListing: never approval wording while the switch is off; approval wording when it is on', async () => {
    profile('astrologerProfile', { approved: false, pricePerMinute: 10, specialties: ['Vedic'] });
    const off = await service.describeListing('u-1', 'ASTROLOGER');
    expect(off).toMatchObject({ listed: false, approvalRequired: false, missing: ['price'] });
    expect(off.message).toBe('Your portal is active. Add your price and details to be listed.');

    process.env.REQUIRE_PROVIDER_APPROVAL = 'true';
    const on = await service.describeListing('u-1', 'ASTROLOGER');
    expect(on.approvalRequired).toBe(true);
    expect(on.message).toMatch(/admin approval/i);

    delete process.env.REQUIRE_PROVIDER_APPROVAL;
    profile('astrologerProfile', { approved: true });
    expect(await service.describeListing('u-1', 'ASTROLOGER')).toMatchObject({ listed: true, message: null });
  });
});

describe('describeListing — cause profiles say what to fix', () => {
  it('GAUSHALA_MANAGER below the quality bar: portal active + the real reasons, no approval wording', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ approved: false, gaushalaName: 'Unnamed Gaushala', description: null, address: null });
    const d = await service.describeListing('u-1', 'GAUSHALA_MANAGER');
    expect(d.listed).toBe(false);
    expect(d.message).toMatch(/^Your portal is active\. To list this profile publicly, please fix:/);
    expect(d.message).not.toMatch(/approval|review/i);
  });
});
