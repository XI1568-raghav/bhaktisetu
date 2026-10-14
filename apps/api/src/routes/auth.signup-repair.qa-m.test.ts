import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sb = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn() }));
vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: sb }),
  supabaseAdmin: { auth: { getUser: vi.fn(), admin: { signOut: vi.fn() } } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from './auth.js';

const ID = '88888888-2222-3333-4444-555555555555';
const SESSION = { access_token: 'a', refresh_token: 'r', expires_at: 1893456000, user: { id: ID } };
const payload = { email: 'm-repair@example.com', password: 'hunter2pass', fullName: 'M Repair' };
const exists = { code: 'user_already_exists', message: 'User already registered' };

async function makeApp() {
  const app = Fastify();
  await app.register(cookie);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.$transaction.mockResolvedValue({ id: ID, email: payload.email, fullName: payload.fullName });
});
afterEach(() => {
  delete process.env.WEB_URL;
});

describe('POST /signup — confirmation redirect', () => {
  it('passes emailRedirectTo (the auth callback page) and the full name to Supabase', async () => {
    process.env.WEB_URL = 'https://web.example/';
    sb.signUp.mockResolvedValue({ data: { user: { id: ID }, session: null }, error: null });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(201);
    expect(sb.signUp.mock.calls[0]![0].options).toEqual({
      emailRedirectTo: 'https://web.example/auth/callback',
      data: { full_name: 'M Repair' },
    });
    await app.close();
  });
});

describe('POST /signup — idempotent repair of a missing DB row', () => {
  it('repairs the row when the password proves ownership and no DB row exists', async () => {
    sb.signUp.mockResolvedValue({ data: { user: null, session: null }, error: exists });
    sb.signInWithPassword.mockResolvedValue({ data: { user: { id: ID }, session: SESSION }, error: null });
    prismaMock.user.findUnique.mockResolvedValue(null);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(201);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(res.json().session.accessToken).toBe('a');
    await app.close();
  });

  it('stays 409 with a wrong password', async () => {
    sb.signUp.mockResolvedValue({ data: { user: null, session: null }, error: exists });
    sb.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    await app.close();
  });

  it('stays 409 when the DB row already exists (no role switch on a live account)', async () => {
    sb.signUp.mockResolvedValue({ data: { user: null, session: null }, error: exists });
    sb.signInWithPassword.mockResolvedValue({ data: { user: { id: ID }, session: SESSION }, error: null });
    prismaMock.user.findUnique.mockResolvedValue({ id: ID } as never);
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload });
    expect(res.statusCode).toBe(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    await app.close();
  });
});
