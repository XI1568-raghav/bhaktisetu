import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { templePortalRoutes } from './temple-portal.js';
import { doneeTaxSchema, isValidRegn80G, maskTaxId, taxInfoView } from '../lib/donee-tax.js';
import { donorContactMap, saveDonorContact, __resetDonationContactForTests } from '../lib/donation-contact.js';
import { gaushalaPortalRoutes } from './gaushala-portal.js';

const MGR = { id: '77777777-7777-4777-8777-777777777777', email: 'temple@demo.com', phone: null, fullName: 'Mgr', subscriptionTier: 'free', blocked: false };
const GM = { id: '88888888-8888-4888-8888-888888888888', email: 'gaushala@demo.com', phone: null, fullName: 'GM', subscriptionTier: 'free', blocked: false };

describe('donee tax validation', () => {
  it('PAN: uppercased and format-checked', () => {
    expect(doneeTaxSchema.parse({ pan: ' aaats1234q ' }).pan).toBe('AAATS1234Q');
    expect(doneeTaxSchema.safeParse({ pan: 'BAD' }).success).toBe(false);
    expect(doneeTaxSchema.safeParse({ pan: null }).success).toBe(true);
    expect(doneeTaxSchema.safeParse({ pan: 'AAATS1234Q', extra: 1 }).success).toBe(false);
  });
  it('80G registration: new URN and legacy order-number styles only', () => {
    expect(isValidRegn80G('AAATS1234QF20214')).toBe(true);
    expect(isValidRegn80G('CIT(E)/DEL/80G/2015-16/123')).toBe(true);
    expect(isValidRegn80G('12345')).toBe(false);
    expect(isValidRegn80G('hello world')).toBe(false);
    expect(doneeTaxSchema.safeParse({ regn80g: 'nope' }).success).toBe(false);
  });
  it('view never claims 80G while the platform flag is off, even with both numbers', () => {
    const v = taxInfoView({ pan: 'AAATS1234Q', regn80g: 'AAATS1234QF20214' });
    expect(v.bothOnFile).toBe(true);
    expect(v.platformHas80G).toBe(false);
    expect(v.receiptsClaim80G).toBe(false);
  });
  it('maskTaxId keeps the last four characters', () => {
    expect(maskTaxId('ABCDE1234F')).toBe('******234F');
    expect(maskTaxId(null)).toBeNull();
  });
});

describe('temple portal tax-info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (a: any) => (a.where.email === 'temple@demo.com' ? MGR : null));
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: MGR.id, role: 'TEMPLE_MANAGER' }] as any);
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Kashi', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  });
  const put = (payload: unknown) => {
    const app = Fastify();
    void app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
    return app.inject({ method: 'PUT', url: '/api/v1/temple-portal/tax-info', headers: { authorization: 'Bearer demo-temple' }, payload: payload as any });
  };

  it('rejects a bad PAN and a bad registration with 400 and writes nothing', async () => {
    expect((await put({ pan: 'xx' })).statusCode).toBe(400);
    expect((await put({ regn80g: 'zz' })).statusCode).toBe(400);
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('saves normalised values onto temples (adding columns if needed)', async () => {
    const res = await put({ pan: 'aaats1234q', regn80g: 'aaats1234qf20214' });
    expect(res.statusCode).toBe(200);
    const sqls = prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.some((q) => /ALTER TABLE temples ADD COLUMN IF NOT EXISTS regn_80g/.test(q))).toBe(true);
    const upd = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) => /UPDATE temples SET/.test(String(c[0])))!;
    expect(upd.slice(1)).toEqual(['temple-1', 'AAATS1234Q', 'AAATS1234QF20214']);
    expect(res.json().receiptsClaim80G).toBe(false);
  });

  it('refuses a non-manager', async () => {
    prismaMock.user.findUnique.mockImplementation(async (a: any) => ({ ...MGR, id: 'dev-1', email: a.where.email }));
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: 'dev-1', role: 'DEVOTEE' }] as any);
    const app = Fastify();
    void app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
    const res = await app.inject({ method: 'PUT', url: '/api/v1/temple-portal/tax-info', headers: { authorization: 'Bearer demo-devotee' }, payload: { pan: 'AAATS1234Q' } });
    expect(res.statusCode).toBe(403);
  });
});

describe('gaushala portal donations list shows the donor, not the paying account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (a: any) => (a.where.email === 'gaushala@demo.com' ? GM : null));
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: GM.id, role: 'GAUSHALA_MANAGER' }] as any);
    prismaMock.donation.findMany.mockResolvedValue([
      { id: 'don_1', amountInr: 101, status: 'paid', receiptNumber: 'DR-1', createdAt: new Date(), paidAt: new Date(), donorPan: 'ABCDE1234F', user: { fullName: 'Account Holder', email: 'acct@x.test' } },
      { id: 'don_2', amountInr: 201, status: 'paid', receiptNumber: 'DR-2', createdAt: new Date(), paidAt: new Date(), donorPan: null, user: { fullName: 'Old Row', email: 'old@x.test' } },
    ] as any);
  });
  const list = () => {
    const app = Fastify();
    void app.register(gaushalaPortalRoutes, { prefix: '/api/v1/gaushala-portal' });
    return app.inject({ method: 'GET', url: '/api/v1/gaushala-portal/donations', headers: { authorization: 'Bearer demo-gaushala' } });
  };

  it('uses donor_name / email / phone typed on the form, masks PAN, falls back for old rows', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: 'don_1', donor_name: 'Sita Devi', donor_email: 'sita@x.test', donor_phone: '9876543210' }]);
    const { donations } = (await list()).json();
    expect(donations[0]).toMatchObject({ donor: 'Sita Devi', email: 'sita@x.test', phone: '9876543210', donorPanMasked: '******234F' });
    expect(JSON.stringify(donations[0])).not.toContain('ABCDE1234F');
    expect(donations[1]).toMatchObject({ donor: 'Old Row', email: 'old@x.test', phone: null });
  });

  it('still works when the donor columns do not exist yet', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('column "donor_name" does not exist'));
    const res = await list();
    expect(res.statusCode).toBe(200);
    expect(res.json().donations[0].donor).toBe('Account Holder');
  });
});

describe('donation contact storage', () => {
  beforeEach(() => { vi.clearAllMocks(); __resetDonationContactForTests(); });
  it('adds the columns lazily when the first write fails, then retries once', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValueOnce(new Error('column does not exist')).mockResolvedValue(1);
    expect(await saveDonorContact('don_1', { name: 'A', email: 'A@X.test' })).toBe(true);
    const sqls = prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.filter((q) => /ADD COLUMN IF NOT EXISTS donor_/.test(q))).toHaveLength(3);
    expect(prismaMock.$executeRawUnsafe.mock.calls.at(-1)!.slice(1)).toEqual(['don_1', 'A', 'a@x.test', null]);
  });
  it('nothing to save and a dead DB never throw', async () => {
    expect(await saveDonorContact('d', {})).toBe(false);
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('down'));
    expect(await saveDonorContact('d', { name: 'A' })).toBe(false);
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('down'));
    expect((await donorContactMap(['d'])).size).toBe(0);
  });
});

describe('migrations are additive and idempotent', () => {
  const dir = path.resolve(__dirname, '../../prisma/migrations');
  it.each(['20261013000000_review_moderation', '20261013010000_donee_tax_and_email_outbox'])('%s', (name) => {
    const sql = fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8').replace(/^--.*$/gm, '');
    expect(sql).not.toMatch(/CONCURRENTLY|DROP |DELETE |TRUNCATE/i);
    for (const stmt of sql.split(';').map((x) => x.trim()).filter(Boolean)) {
      expect(stmt).toMatch(/IF NOT EXISTS/i);
    }
  });
});
