import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologyRoutes } from './astrology.js';

/**
 * With REQUIRE_PROVIDER_APPROVAL off, `AstrologerProfile.approved` only means
 * "live". The public directory used to echo it as `verified`, which the web
 * renders as a badge: that would tell devotees somebody reviewed an astrologer
 * nobody reviewed. It must stay `verified:false` unless an admin approval is
 * actually part of the flow.
 */
const ROW = {
  id: '71e54617-6963-418e-845f-920f4350505b',
  userId: 'ba87a424-e9d2-44f1-92a9-996441b31131',
  displayName: 'Self Registered',
  specialties: ['Vedic'],
  languages: ['Hindi'],
  experience: 3,
  rating: 0,
  totalConsultations: 0,
  pricePerMinute: 10,
  bio: null,
  approved: true,
};

async function list() {
  const app = Fastify({ logger: false });
  await app.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  const res = await app.inject({ method: 'GET', url: '/api/v1/astrology/astrologers' });
  await app.close();
  return res.json().astrologers as Array<{ verified: boolean }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.astrologerProfile.findMany.mockResolvedValue([ROW]);
});
afterEach(() => {
  delete process.env.REQUIRE_PROVIDER_APPROVAL;
});

describe('astrology directory `verified`', () => {
  it('is false for a live profile nobody reviewed (switch off)', async () => {
    expect((await list())[0]!.verified).toBe(false);
  });
  it('is true only when approval is required and the profile is approved', async () => {
    process.env.REQUIRE_PROVIDER_APPROVAL = 'true';
    expect((await list())[0]!.verified).toBe(true);
  });
});
