import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologyRoutes } from './astrology.js';

/**
 * The hours an astrologer saves in the portal were never published, so the
 * booking page could not show them and a devotee found out only when the
 * booking was refused. GET /astrologers/:id now carries them (IST).
 */
const ID = '71e54617-6963-418e-845f-920f4350505b';
const ROW = {
  id: ID,
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
  availability: { Monday: { morning: true, afternoon: false, evening: false } },
};

async function detail() {
  const app = Fastify({ logger: false });
  await app.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/astrology/astrologers/${ID}` });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
});

describe('GET /astrologers/:id availability', () => {
  it('publishes the saved weekly schedule, with its hours and timezone', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(ROW as never);
    const { astrologer } = (await detail()).json();
    expect(astrologer.availability.timezone).toBe('IST');
    expect(astrologer.availability.days.Monday).toEqual({ morning: true, afternoon: false, evening: false });
    expect(astrologer.availability.days.Sunday).toEqual({ morning: false, afternoon: false, evening: false });
    expect(astrologer.availability.hours.morning).toBe('06:00-12:00');
  });

  it('is null when the astrologer never saved a schedule', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ ...ROW, availability: null } as never);
    expect((await detail()).json().astrologer.availability).toBeNull();
  });

  it('still does not invent ratings or reviews', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(ROW as never);
    const { astrologer } = (await detail()).json();
    expect(astrologer.rating).toBe(0);
    expect(astrologer.consultationCount).toBe(0);
    expect(astrologer).not.toHaveProperty('reviewCount');
  });
});
