import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { listGaushalaBalances, recordDisbursement } = vi.hoisted(() => ({ listGaushalaBalances: vi.fn(), recordDisbursement: vi.fn() }));
vi.mock('../services/gaushala-disbursement.service.js', () => ({ listGaushalaBalances, recordDisbursement }));

import Fastify from 'fastify';
import { adminGaushalaDisbursementRoutes } from './admin-gaushala-disbursements.js';

const ADMIN = { id: 'admin-1', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const U = '96fcee5a-a89f-434b-8905-14a484a62f02';

async function call(method: 'GET' | 'POST', payload?: unknown, auth = 'Bearer demo-admin-token') {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminGaushalaDisbursementRoutes(i); }, { prefix: '/api/v1/admin/gaushala-disbursements' });
  const res = await app.inject({ method, url: '/api/v1/admin/gaushala-disbursements', headers: { authorization: auth, 'content-type': 'application/json' }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: { where: { email?: string } }) => (a.where.email === 'admin@demo.com' ? ADMIN : a.where.email === 'devotee@demo.com' ? { ...ADMIN, id: 'dev-1', email: 'devotee@demo.com' } : null));
  listGaushalaBalances.mockResolvedValue([{ gaushalaUserId: U, owedInr: 502 }]);
  recordDisbursement.mockResolvedValue({ ok: true, id: 'd1', owedInr: 0 });
});

describe('admin gaushala disbursements', () => {
  it('is admin only', async () => {
    expect((await call('GET', undefined, 'Bearer demo-devotee-token')).statusCode).toBe(403);
    expect((await call('POST', { gaushalaUserId: U, amountInr: 1, reference: 'UTR1' }, 'Bearer demo-devotee-token')).statusCode).toBe(403);
    expect(recordDisbursement).not.toHaveBeenCalled();
  });

  it('lists balances', async () => {
    const res = await call('GET');
    expect(res.statusCode).toBe(200);
    expect(res.json().gaushalas[0].owedInr).toBe(502);
  });

  it('records a transfer, passing the admin id', async () => {
    const res = await call('POST', { gaushalaUserId: U, amountInr: 502, reference: 'UTR123456' });
    expect(res.statusCode).toBe(200);
    expect(recordDisbursement).toHaveBeenCalledWith(expect.objectContaining({ gaushalaUserId: U, amountInr: 502, reference: 'UTR123456', adminId: 'admin-1' }));
  });

  it.each([
    [{ gaushalaUserId: U, amountInr: 502 }, 'missing reference'],
    [{ gaushalaUserId: U, amountInr: 502, reference: '  ' }, 'blank reference'],
    [{ gaushalaUserId: U, amountInr: 0, reference: 'UTR1' }, 'zero amount'],
    [{ gaushalaUserId: U, amountInr: -5, reference: 'UTR1' }, 'negative amount'],
    [{ gaushalaUserId: 'not-a-uuid', amountInr: 5, reference: 'UTR1' }, 'bad id'],
  ])('rejects %j (%s) before touching money', async (body: unknown, _label: string) => {
    const res = await call('POST', body);
    expect(res.statusCode).toBe(400);
    expect(recordDisbursement).not.toHaveBeenCalled();
  });

  it('maps exceeds_balance and duplicate_reference to 409 with a readable message', async () => {
    recordDisbursement.mockResolvedValueOnce({ ok: false, code: 'exceeds_balance', owedInr: 102 });
    const a = await call('POST', { gaushalaUserId: U, amountInr: 200, reference: 'UTR1' });
    expect(a.statusCode).toBe(409);
    expect(a.json().error).toMatch(/102/);
    recordDisbursement.mockResolvedValueOnce({ ok: false, code: 'duplicate_reference', owedInr: 500 });
    const b = await call('POST', { gaushalaUserId: U, amountInr: 100, reference: 'UTR1' });
    expect(b.statusCode).toBe(409);
    expect(b.json().error).toMatch(/already/i);
  });
});
