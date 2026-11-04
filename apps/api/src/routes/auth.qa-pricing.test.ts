import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: {} }),
  supabaseAdmin: { auth: { getUser: vi.fn(), admin: { signOut: vi.fn() } } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from './auth.js';

// GET /auth/me carries `qaPricing` so the web can show waived-fee prices and the
// QA banner. It is a display hint derived from the account email; the allowlist
// itself is never sent.

const ROW = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'me@example.com',
  phone: null,
  fullName: 'Me',
  avatarUrl: null,
  preferredLanguage: 'en',
  subscriptionTier: 'free',
  blocked: false,
  blockedReason: null,
  locationCity: null,
  locationState: null,
  isNri: false,
  nriCountry: null,
  gotra: null,
  nakshatra: null,
  rashi: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  addresses: [],
  subscription: [],
};
const ORIGINAL = process.env.QA_PAYER_EMAILS;

async function me() {
  const app = Fastify({ logger: false });
  await app.register(cookie);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { authorization: 'Bearer demo-devotee' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  delete process.env.ADMIN_EMAILS;
  prismaMock.user.findUnique.mockImplementation((async (args: { where: { email?: string } }) =>
    args.where.email === 'devotee@demo.com' ? { ...ROW, email: 'devotee@demo.com' } : ROW) as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QA_PAYER_EMAILS;
  else process.env.QA_PAYER_EMAILS = ORIGINAL;
});

describe('GET /auth/me qaPricing', () => {
  it('is false when QA_PAYER_EMAILS is unset', async () => {
    delete process.env.QA_PAYER_EMAILS;
    const res = await me();
    expect(res.statusCode).toBe(200);
    expect(res.json().user.qaPricing).toBe(false);
  });

  it('is true for an allowlisted account, case-insensitively', async () => {
    process.env.QA_PAYER_EMAILS = 'ME@Example.com';
    expect((await me()).json().user.qaPricing).toBe(true);
  });

  it('is false for an account that is not listed, and the list is not leaked in the body', async () => {
    process.env.QA_PAYER_EMAILS = 'someone.else@example.com,third@example.com';
    const res = await me();
    expect(res.json().user.qaPricing).toBe(false);
    expect(res.body).not.toContain('someone.else@example.com');
    expect(res.body).not.toContain('third@example.com');
  });
});
