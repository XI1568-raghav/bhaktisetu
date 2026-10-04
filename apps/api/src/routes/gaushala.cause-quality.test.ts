/**
 * GET /gaushala/:id must 404 an approved-but-junk profile (so its Donate CTA
 * disappears) and keep serving a good one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { gaushalaRoutes } from './gaushala.js';

const ID = '03edd2ff-4479-48f3-9ad1-6940e5558a4d';
const base = { id: ID, userId: ID, city: null, totalCows: 1, approved: true };

async function get() {
  const app = Fastify({ logger: false });
  await app.register(gaushalaRoutes, { prefix: '/api/v1/gaushala' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${ID}` });
  await app.close();
  return res;
}

beforeEach(() => vi.clearAllMocks());

describe('GET /gaushala/:id quality gate', () => {
  it('404s an approved junk profile', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue({
      ...base, gaushalaName: 'saharanpur', description: 'skkss', address: 'ssdwdqe',
    } as never);
    expect((await get()).statusCode).toBe(404);
  });

  it('serves a good profile', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue({
      ...base,
      gaushalaName: 'Shri Krishna Gaushala',
      description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.',
      address: 'Vrindavan Road, Mathura',
    } as never);
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.json().gaushala.name).toBe('Shri Krishna Gaushala');
  });
});
