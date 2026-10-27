import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sb = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signUp: sb.signUp, signInWithPassword: sb.signInWithPassword } }),
  supabaseAdmin: { auth: { getUser: vi.fn(), admin: { signOut: vi.fn(), deleteUser: sb.deleteUser } } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from './auth.js';

const ID = '99999999-2222-3333-4444-555555555555';
const payload = { email: 'orphan@example.com', password: 'hunter2pass', fullName: 'Orphan Case', phone: '+919800000001' };

async function makeApp() {
  const app = Fastify();
  await app.register(cookie);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = 'https://real.supabase.example';
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.user.findFirst.mockResolvedValue(null);
  sb.deleteUser.mockResolvedValue({ error: null });
});

describe('POST /signup — no orphan Supabase auth user', () => {
  it('409s on a taken phone BEFORE creating the Supabase user', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'other', email: 'someone@else.com', phone: payload.phone } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe('An account with this phone number already exists');
    expect(sb.signUp).not.toHaveBeenCalled();
    await app.close();
  });

  it('409s on an email that already has a local row, without calling Supabase', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'other', email: payload.email, phone: null } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe('An account with this email already exists');
    expect(sb.signUp).not.toHaveBeenCalled();
    await app.close();
  });

  it('deletes the fresh auth user when the local insert races into P2002 (same 409 text)', async () => {
    sb.signUp.mockResolvedValue({ data: { user: { id: ID, identities: [{}] }, session: null }, error: null });
    prismaMock.$transaction.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002', meta: { target: ['phone'] } }));
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe('An account with this phone number already exists');
    expect(sb.deleteUser).toHaveBeenCalledWith(ID);
    await app.close();
  });

  it('deletes the fresh auth user on any other post-create failure and still answers 500', async () => {
    sb.signUp.mockResolvedValue({ data: { user: { id: ID, identities: [{}] }, session: null }, error: null });
    prismaMock.$transaction.mockRejectedValue(new Error('db down'));
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(500);
    expect(sb.deleteUser).toHaveBeenCalledWith(ID);
    await app.close();
  });

  it('a failing cleanup call does not change the response', async () => {
    sb.signUp.mockResolvedValue({ data: { user: { id: ID, identities: [{}] }, session: null }, error: null });
    prismaMock.$transaction.mockRejectedValue(new Error('db down'));
    sb.deleteUser.mockRejectedValue(new Error('auth down'));
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(500);
    await app.close();
  });

  it('never deletes an existing user returned by the anti-enumeration answer (identities: [])', async () => {
    sb.signUp.mockResolvedValue({ data: { user: { id: ID, identities: [] }, session: null }, error: null });
    prismaMock.$transaction.mockRejectedValue(new Error('db down'));
    const app = await makeApp();
    await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(sb.deleteUser).not.toHaveBeenCalled();
    await app.close();
  });

  it('never deletes the user on the repair path (auth user pre-existed)', async () => {
    sb.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'user_already_exists', message: 'User already registered' } });
    sb.signInWithPassword.mockResolvedValue({ data: { user: { id: ID }, session: null }, error: null });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockRejectedValue(new Error('db down'));
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(sb.deleteUser).not.toHaveBeenCalled();
    await app.close();
  });

  it('keeps the happy path: 201 and no delete', async () => {
    sb.signUp.mockResolvedValue({ data: { user: { id: ID, identities: [{}] }, session: null }, error: null });
    prismaMock.$transaction.mockResolvedValue({ id: ID, email: payload.email, fullName: payload.fullName });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(201);
    expect(sb.deleteUser).not.toHaveBeenCalled();
    await app.close();
  });
});
