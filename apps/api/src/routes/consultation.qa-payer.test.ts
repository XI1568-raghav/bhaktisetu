import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

// QA_PAYER_EMAILS: consultation floor is Rs 50 and 5 minutes for everyone,
// Rs 1 and 1 minute for an allowlisted tester (a Rs 1/min astrologer x 1 min).

const PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const ASTRO_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const DEVOTEE = {
  id: '2b5bd615-1633-4c95-9b09-03efb2b9e429',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};
const ORIGINAL = process.env.QA_PAYER_EMAILS;

function book(minutes: number) {
  const app = Fastify({ logger: false });
  void app.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  return app.inject({
    method: 'POST',
    url: '/api/v1/consultation/book',
    headers: { authorization: 'Bearer demo-devotee' },
    payload: { astrologerId: PROFILE_ID, minutes },
  });
}
const inserts = () =>
  prismaMock.$queryRawUnsafe.mock.calls.filter((c: unknown[]) =>
    String(c[0]).includes('INSERT INTO astrologer_consultations'),
  );

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'devotee@demo.com' ? DEVOTEE : null,
  );
  prismaMock.astrologerProfile.findUnique.mockResolvedValue({
    id: PROFILE_ID,
    userId: ASTRO_USER_ID,
    displayName: 'QA Acharya',
    pricePerMinute: 1,
    approved: true,
    availability: null,
  } as never);
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QA_PAYER_EMAILS;
  else process.env.QA_PAYER_EMAILS = ORIGINAL;
});

describe('consultation minimums with QA_PAYER_EMAILS', () => {
  it('env unset: 1 minute is refused by the 5-minute floor', async () => {
    delete process.env.QA_PAYER_EMAILS;
    const res = await book(1);
    expect(res.statusCode).toBe(400);
    expect(res.json().details.fieldErrors.minutes[0]).toContain('5');
    expect(inserts()).toHaveLength(0);
  });

  it('env unset: Rs 1/min x 10 min = Rs 10 is refused by the Rs 50 floor', async () => {
    delete process.env.QA_PAYER_EMAILS;
    const res = await book(10);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Minimum consultation amount is ₹50.');
    expect(inserts()).toHaveLength(0);
  });

  it('user not on the list is held to both floors', async () => {
    process.env.QA_PAYER_EMAILS = 'someone.else@example.com';
    expect((await book(1)).statusCode).toBe(400);
    expect((await book(10)).json().error).toBe('Minimum consultation amount is ₹50.');
    expect(inserts()).toHaveLength(0);
  });

  it('allowlisted user: 1 minute at Rs 1/min is accepted and priced Rs 1 (100 paise order amount in the row)', async () => {
    process.env.QA_PAYER_EMAILS = 'DEVOTEE@demo.com';
    await book(1);
    const rows = inserts();
    expect(rows).toHaveLength(1);
    // $4 is amount_inr in the INSERT (see /book).
    expect((rows[0] as unknown[])).toContain(1);
  });

  it('allowlisted user is still refused 0 minutes and more than 60', async () => {
    process.env.QA_PAYER_EMAILS = 'devotee@demo.com';
    expect((await book(0)).statusCode).toBe(400);
    expect((await book(61)).statusCode).toBe(400);
    expect(inserts()).toHaveLength(0);
  });
});
