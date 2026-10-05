import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const svc = vi.hoisted(() => ({
  listTempleBalances: vi.fn(),
  recordPujaShareTransfer: vi.fn(),
  recordDonationTransfer: vi.fn(),
}));
vi.mock('../services/temple-settlement.service.js', () => svc);

import Fastify from 'fastify';
import { adminTempleSettlementRoutes } from './admin-temple-settlements.js';

const ADMIN = { id: 'admin-1', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const T = '56955f8d-1b90-47f5-97ea-f86560cb58fe';

async function call(method: 'GET' | 'POST', path: string, payload?: unknown, auth = 'Bearer demo-admin-token') {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminTempleSettlementRoutes(i); }, { prefix: '/api/v1/admin/temple-settlements' });
  const res = await app.inject({
    method,
    url: `/api/v1/admin/temple-settlements${path}`,
    headers: { authorization: auth, 'content-type': 'application/json' },
    ...(payload ? { payload: JSON.stringify(payload) } : {}),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: { where: { email?: string } }) =>
    a.where.email === 'admin@demo.com' ? ADMIN
      : a.where.email === 'temple@demo.com' ? { ...ADMIN, id: 'mgr-1', email: 'temple@demo.com' } : null);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  svc.listTempleBalances.mockResolvedValue([{ templeId: T, pujaShareOwedInr: 100 }]);
  svc.recordPujaShareTransfer.mockResolvedValue({ ok: true, settled: 2, owedInr: 0 });
  svc.recordDonationTransfer.mockResolvedValue({ ok: true, settled: 1, owedInr: 0 });
});

describe('admin temple settlements', () => {
  it('is admin only, so a temple manager cannot settle their own payouts', async () => {
    expect((await call('GET', '/', undefined, 'Bearer demo-temple-token')).statusCode).toBe(403);
    expect((await call('POST', '/puja-share', { templeId: T, amountInr: 100, reference: 'UTR1' }, 'Bearer demo-temple-token')).statusCode).toBe(403);
    expect((await call('POST', '/donations', { templeId: T, amountInr: 100, reference: 'UTR1' }, 'Bearer demo-temple-token')).statusCode).toBe(403);
    expect(svc.recordPujaShareTransfer).not.toHaveBeenCalled();
    expect(svc.recordDonationTransfer).not.toHaveBeenCalled();
  });

  it('lists balances', async () => {
    const res = await call('GET', '/');
    expect(res.statusCode).toBe(200);
    expect(res.json().temples[0].pujaShareOwedInr).toBe(100);
  });

  it('records a puja-share transfer and a donation transfer', async () => {
    const a = await call('POST', '/puja-share', { templeId: T, amountInr: 100, reference: 'UTR123456' });
    expect(a.statusCode).toBe(200);
    expect(svc.recordPujaShareTransfer).toHaveBeenCalledWith(expect.objectContaining({ templeId: T, amountInr: 100, reference: 'UTR123456' }));
    const b = await call('POST', '/donations', { templeId: T, amountInr: 50, reference: 'UTR777' });
    expect(b.statusCode).toBe(200);
    expect(svc.recordDonationTransfer).toHaveBeenCalledWith(expect.objectContaining({ adminId: 'admin-1', amountInr: 50 }));
  });

  it.each([
    [{ templeId: T, amountInr: 5 }, 'missing reference'],
    [{ templeId: T, amountInr: 5, reference: '  ' }, 'blank reference'],
    [{ templeId: T, amountInr: 0, reference: 'UTR1' }, 'zero amount'],
    [{ templeId: T, amountInr: -5, reference: 'UTR1' }, 'negative amount'],
    [{ templeId: 'nope', amountInr: 5, reference: 'UTR1' }, 'bad id'],
  ])('rejects %j (%s) before touching money', async (body: unknown, _label: string) => {
    expect((await call('POST', '/puja-share', body)).statusCode).toBe(400);
    expect((await call('POST', '/donations', body)).statusCode).toBe(400);
    expect(svc.recordPujaShareTransfer).not.toHaveBeenCalled();
    expect(svc.recordDonationTransfer).not.toHaveBeenCalled();
  });

  it('turns each refusal into a 409 with a readable sentence', async () => {
    svc.recordPujaShareTransfer.mockResolvedValueOnce({ ok: false, code: 'amount_mismatch', owedInr: 145.1 });
    const a = await call('POST', '/puja-share', { templeId: T, amountInr: 100, reference: 'UTR1' });
    expect(a.statusCode).toBe(409);
    expect(a.json().error).toMatch(/145\.10/);
    svc.recordPujaShareTransfer.mockResolvedValueOnce({ ok: false, code: 'nothing_payable', owedInr: 0 });
    expect((await call('POST', '/puja-share', { templeId: T, amountInr: 100, reference: 'UTR1' })).json().error).toMatch(/performed/);
    svc.recordDonationTransfer.mockResolvedValueOnce({ ok: false, code: 'exceeds_balance', owedInr: 102 });
    expect((await call('POST', '/donations', { templeId: T, amountInr: 200, reference: 'UTR1' })).json().error).toMatch(/102/);
    svc.recordDonationTransfer.mockResolvedValueOnce({ ok: false, code: 'duplicate_reference', owedInr: 5 });
    expect((await call('POST', '/donations', { templeId: T, amountInr: 1, reference: 'UTR1' })).json().error).toMatch(/already/i);
  });
});
