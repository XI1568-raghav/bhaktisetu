import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologyRoutes } from './astrology.js';

/**
 * AW-02, residual — the last endpoint still advertising the 15 invented
 * astrologers.
 *
 * Every SELLING door was closed: /astrologers, /astrologers/:id, its reviews,
 * /consultation/book and /consult/start all resolve real approved
 * AstrologerProfile UUIDs now. `GET /api/v1/astrology/specializations` did not.
 * It returned counts hardcoded from the fixture — Vedic Astrology 11, Tarot 4,
 * Numerology 5, Palmistry 3, Vastu 5, KP 4, Prashna 4, Nadi 4: forty
 * specialization slots across fifteen people who do not exist, while real supply
 * is three profiles. Unauthenticated and uncapped.
 *
 * Nothing in apps/web, apps/mobile or packages/* rendered it, so it sold
 * nothing — but it is a public endpoint STATING fictional supply, one
 * integration away from a UI, and it was the only remaining reader keeping the
 * fixture array alive.
 */

const APPROVED = [
  {
    id: '71e54617-6963-418e-845f-920f4350505b',
    userId: 'u1',
    displayName: 'Acharya Vinod Sharma',
    specialties: ['Vedic Astrology', 'Numerology'],
    languages: ['hi'],
    experience: 12,
    rating: 4.8,
    totalConsultations: 90,
    pricePerMinute: 25,
    bio: null,
    approved: true,
  },
  {
    id: '9a1c8d22-1111-4b33-9c44-aaaabbbbcccc',
    userId: 'u2',
    displayName: 'Ritika Menon',
    specialties: ['Tarot Reading', 'Vedic Astrology'],
    languages: ['en'],
    experience: 6,
    rating: 4.6,
    totalConsultations: 40,
    pricePerMinute: 18,
    bio: null,
    approved: true,
  },
];

async function get(url: string) {
  const app = Fastify({ logger: false });
  await app.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  const res = await app.inject({ method: 'GET', url });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.astrologerProfile.findMany.mockResolvedValue(APPROVED as never);
});

describe('AW-02 — GET /astrology/specializations counts REAL supply', () => {
  it('derives every count from approved AstrologerProfile rows', async () => {
    const res = await get('/api/v1/astrology/specializations');
    expect(res.statusCode).toBe(200);
    const { specializations } = res.json();

    const byName = Object.fromEntries(
      specializations.map((s: { name: string; count: number }) => [s.name, s.count]),
    );
    // Two real astrologers list Vedic Astrology; one each for the others.
    expect(byName['Vedic Astrology']).toBe(2);
    expect(byName['Numerology']).toBe(1);
    expect(byName['Tarot Reading']).toBe(1);
  });

  it('never reports the fixture counts again', async () => {
    const { specializations } = (await get('/api/v1/astrology/specializations')).json();
    const byName = Object.fromEntries(
      specializations.map((s: { name: string; count: number }) => [s.name, s.count]),
    );
    // The fixture said Vedic Astrology 11 across 15 invented people.
    expect(byName['Vedic Astrology']).not.toBe(11);
    // Specializations nobody real offers must not appear at all.
    expect(byName['Palmistry']).toBeUndefined();
    expect(byName['Nadi Astrology']).toBeUndefined();
    // And the total advertised supply can never exceed the real profile count.
    const total = specializations.reduce(
      (n: number, s: { count: number }) => n + s.count,
      0,
    );
    expect(total).toBeLessThanOrEqual(
      APPROVED.reduce((n, a) => n + a.specialties.length, 0),
    );
  });

  it('reads only APPROVED profiles', async () => {
    await get('/api/v1/astrology/specializations');
    const args = prismaMock.astrologerProfile.findMany.mock.calls[0]![0] as any;
    expect(args.where.approved).toBe(true);
  });

  it('answers an honest empty list when there is no real supply', async () => {
    prismaMock.astrologerProfile.findMany.mockResolvedValue([] as never);
    const { specializations } = (await get('/api/v1/astrology/specializations')).json();
    // Zero real astrologers means zero advertised specializations — not eight
    // categories claiming forty practitioners.
    expect(specializations).toEqual([]);
  });

  it('orders by real supply, densest first', async () => {
    const { specializations } = (await get('/api/v1/astrology/specializations')).json();
    const counts = specializations.map((s: { count: number }) => s.count);
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a));
  });
});
