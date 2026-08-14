import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { priestsPublicRoutes } from './priests-public.js';

// PJ-07 (prod sweep 2026-08-12), live-verified on api.darshya.online with no
// auth header:
//   GET /api/v1/priests/me  → 500 {"code":"P2023", "message":"\nInvalid
//   `prisma.priest.findFirst()` invocation:\n\nInconsistent column data: Error
//   creating UUID, invalid character: expected an optional prefix of
//   `urn:uuid:` followed by [0-9a-fA-F-], found `m` at 1"}
//
// Two defects in one: a mistyped or slug-shaped priest link answers 500 instead
// of 404, and the body names the ORM, the model and the query method to any
// unauthenticated caller.

const VALID_ID = '85090e1d-8bef-468d-bf56-2463436dad80';

/** The error Prisma actually raises when a non-UUID reaches a uuid column. */
function p2023(): Error & { code: string } {
  const err = new Error(
    '\nInvalid `prisma.priest.findFirst()` invocation in\nE:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\priests-public.ts:156:41\n\nInconsistent column data: Error creating UUID, invalid character',
  ) as Error & { code: string };
  err.code = 'P2023';
  return err;
}

async function call(url: string) {
  const app = Fastify({ logger: false });
  await app.register(priestsPublicRoutes, { prefix: '/api/v1/priests' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/priests${url}` });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.priest.findFirst.mockResolvedValue(null as never);
  prismaMock.priestPujaOffering.findMany.mockResolvedValue([] as never);
});

describe('PJ-07 — GET /priests/:id with a non-UUID id', () => {
  it('404s "me" instead of 500ing, and never queries Prisma', async () => {
    const res = await call('/me');
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Priest not found');
    expect(prismaMock.priest.findFirst).not.toHaveBeenCalled();
  });

  it('404s an arbitrary slug the same way', async () => {
    const res = await call('/pandit-ramesh-shastri');
    expect(res.statusCode).toBe(404);
    expect(prismaMock.priest.findFirst).not.toHaveBeenCalled();
  });

  it('404s on the /:id/pujas branch too', async () => {
    const res = await call('/foo/pujas');
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Priest not found');
    expect(prismaMock.priest.findFirst).not.toHaveBeenCalled();
  });

  it('still 404s a well-formed UUID that matches no verified priest', async () => {
    const res = await call(`/${VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(prismaMock.priest.findFirst).toHaveBeenCalledTimes(1);
  });

  it('still serves a real priest', async () => {
    prismaMock.priest.findFirst.mockResolvedValue({
      id: VALID_ID,
      displayName: 'Pandit Ramesh Shastri',
      avatarUrl: null,
      bio: null,
      languages: ['hi'],
      specializations: ['rudrabhishek'],
      experienceYears: 12,
      ratingAvg: 4.6,
      ratingCount: 43,
      isVerified: true,
    } as never);
    const res = await call(`/${VALID_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().displayName).toBe('Pandit Ramesh Shastri');
  });
});

describe('PJ-07 — a Prisma failure never reaches an unauthenticated caller', () => {
  it('does not echo the ORM, the model or the source path', async () => {
    prismaMock.priest.findFirst.mockRejectedValue(p2023() as never);
    const res = await call(`/${VALID_ID}`);
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toMatch(/prisma/i);
    expect(res.body).not.toMatch(/NewClaude/);
    expect(res.body).not.toMatch(/P2023/);
    expect(res.json().error).toBe('Something went wrong');
  });

  it('applies to the offerings query on the same route', async () => {
    prismaMock.priest.findFirst.mockResolvedValue({
      id: VALID_ID,
      displayName: 'Pandit Ramesh Shastri',
      avatarUrl: null,
      bio: null,
      languages: [],
      specializations: [],
      experienceYears: 1,
      ratingAvg: 0,
      ratingCount: 0,
      isVerified: true,
    } as never);
    prismaMock.priestPujaOffering.findMany.mockRejectedValue(p2023() as never);
    const res = await call(`/${VALID_ID}`);
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toMatch(/prisma/i);
  });
});
