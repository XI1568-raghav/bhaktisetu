import { describe, it, expect, beforeEach, vi } from 'vitest';

async function loadService() {
  vi.resetModules();
  const mod = await import('./gaushala.service.js');
  return new mod.GaushalaService();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GaushalaService.getGaushalas', () => {
  it('returns all gaushalas with computed availableCows from cow array', async () => {
    const service = await loadService();
    const list = service.getGaushalas();
    expect(list.length).toBeGreaterThan(0);
    for (const gs of list) {
      expect(gs).toHaveProperty('id');
      expect(gs).toHaveProperty('availableCows');
      expect(gs).toHaveProperty('cowsListed');
      expect(typeof gs.availableCows).toBe('number');
    }
  });

  it('availableCows reflects un-adopted count, not the static field', async () => {
    const service = await loadService();
    const list = service.getGaushalas();
    const krishna = list.find((g) => g.id === 'gs_001');
    expect(krishna).toBeDefined();
    const allCows = service.getCows('gs_001');
    const expected = allCows.filter((c) => !c.isAdopted).length;
    expect(krishna!.availableCows).toBe(expected);
  });
});

describe('GaushalaService.getGaushalaById', () => {
  it('returns gaushala with cows array', async () => {
    const service = await loadService();
    const gs = service.getGaushalaById('gs_001');
    expect(gs).not.toBeNull();
    expect(Array.isArray(gs!.cows)).toBe(true);
    expect(gs!.cows.every((c: any) => c.gaushalaId === 'gs_001')).toBe(true);
  });

  it('returns null for unknown id', async () => {
    const service = await loadService();
    expect(service.getGaushalaById('does-not-exist')).toBeNull();
  });
});

describe('GaushalaService.getCows', () => {
  it('returns all cows when no filter', async () => {
    const service = await loadService();
    const cows = service.getCows();
    expect(cows.length).toBeGreaterThan(0);
  });

  it('filters by gaushalaId', async () => {
    const service = await loadService();
    const cows = service.getCows('gs_002');
    expect(cows.every((c) => c.gaushalaId === 'gs_002')).toBe(true);
  });

  it('available=true returns only un-adopted', async () => {
    const service = await loadService();
    const cows = service.getCows(undefined, true);
    expect(cows.every((c) => c.isAdopted === false)).toBe(true);
  });

  it('available=false returns only adopted', async () => {
    const service = await loadService();
    const cows = service.getCows(undefined, false);
    expect(cows.every((c) => c.isAdopted === true)).toBe(true);
  });
});

describe('GaushalaService.getCowById', () => {
  it('returns cow when found', async () => {
    const service = await loadService();
    const c = service.getCowById('cow_001');
    expect(c).not.toBeNull();
    expect(c!.id).toBe('cow_001');
  });

  it('returns null when missing', async () => {
    const service = await loadService();
    expect(service.getCowById('cow_999')).toBeNull();
  });
});

describe('GaushalaService.getAdoptionPlans', () => {
  it('returns all 4 plans with required shape', async () => {
    const service = await loadService();
    const plans = service.getAdoptionPlans();
    expect(plans.length).toBe(4);
    for (const p of plans) {
      expect(p).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          type: expect.any(String),
          price: expect.any(Number),
          currency: 'INR',
          features: expect.any(Array),
        })
      );
    }
  });

  it('exactly one popular plan', async () => {
    const service = await loadService();
    const popular = service.getAdoptionPlans().filter((p) => p.popular);
    expect(popular).toHaveLength(1);
  });
});

describe('GaushalaService.adoptCow', () => {
  it('throws on unknown cow', async () => {
    const service = await loadService();
    expect(() => service.adoptCow('user-1', 'cow_999', 'plan_monthly')).toThrow(/Cow not found/);
  });

  it('throws on unknown plan', async () => {
    const service = await loadService();
    expect(() => service.adoptCow('user-1', 'cow_001', 'plan_bogus')).toThrow(/Invalid adoption plan/);
  });

  it('throws when cow already adopted', async () => {
    const service = await loadService();
    // TC-11: this used to lean on cow_002 arriving pre-adopted by "Rajesh
    // Kumar" — one of six invented donors baked into the fixture, which the
    // detail page rendered as "This cow has been adopted by {name}" and which
    // suppressed availableCows. Those are gone, so the precondition is
    // established here instead. The assertion is unchanged: a second adoption
    // of the same cow must be rejected.
    service.adoptCow('user-0', 'cow_002', 'plan_monthly');
    expect(() => service.adoptCow('user-1', 'cow_002', 'plan_monthly')).toThrow(/already been adopted/);
  });

  it('marks cow adopted and persists adoption record', async () => {
    const service = await loadService();
    const adoption = service.adoptCow('user-42', 'cow_001', 'plan_monthly');
    expect(adoption.userId).toBe('user-42');
    expect(adoption.cowId).toBe('cow_001');
    expect(adoption.status).toBe('active');
    expect(adoption.totalPaid).toBe(3000);
    expect(adoption.certificate).toContain('cow_001');

    const cow = service.getCowById('cow_001');
    expect(cow!.isAdopted).toBe(true);
  });

  it('lifetime plan has null nextRenewalDate', async () => {
    const service = await loadService();
    const adoption = service.adoptCow('user-1', 'cow_003', 'plan_lifetime');
    expect(adoption.nextRenewalDate).toBeNull();
  });

  it('annual plan sets nextRenewalDate ~1 year out', async () => {
    const service = await loadService();
    const adoption = service.adoptCow('user-1', 'cow_010', 'plan_annual');
    expect(adoption.nextRenewalDate).toBeTruthy();
    const start = new Date(adoption.startDate);
    const next = new Date(adoption.nextRenewalDate!);
    const diffYears = (next.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    expect(diffYears).toBeGreaterThan(0.95);
    expect(diffYears).toBeLessThan(1.05);
  });
});

describe('GaushalaService.getMyAdoptions', () => {
  it('returns empty for new user', async () => {
    const service = await loadService();
    expect(service.getMyAdoptions('nobody')).toEqual([]);
  });

  it('returns adoptions after adoptCow', async () => {
    const service = await loadService();
    service.adoptCow('user-x', 'cow_001', 'plan_daily');
    const list = service.getMyAdoptions('user-x');
    expect(list).toHaveLength(1);
    expect(list[0]!.cowId).toBe('cow_001');
  });
});

describe('GaushalaService.getAdoptionUpdates', () => {
  it('returns null for unknown adoption', async () => {
    const service = await loadService();
    expect(service.getAdoptionUpdates('adp_nope', 'user-1')).toBeNull();
  });

  it('returns cow monthlyUpdates when adoption matches', async () => {
    const service = await loadService();
    const adoption = service.adoptCow('user-y', 'cow_001', 'plan_monthly');
    const updates = service.getAdoptionUpdates(adoption.id, 'user-y');
    expect(Array.isArray(updates)).toBe(true);
    expect(updates!.length).toBeGreaterThan(0);
  });
});
