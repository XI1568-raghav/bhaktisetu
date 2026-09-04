import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { signInWithPassword, signUp } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signInWithPassword, signUp } }),
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import { authRoutes } from './auth.js';
import { SIGNUP_DEFAULT_LANGUAGE } from '../lib/i18n.js';

/**
 * I18N-07 — the residuals around `User.preferredLanguage`.
 *
 * The resolver and its wiring landed earlier: src/lib/i18n.ts reads the stored
 * language and src/plugins/error-localization.ts puts it on the response.
 * src/plugins/error-localization.test.ts guards that. What it does NOT guard is
 * the three places the same column is still asserted by hand:
 *
 *   1. LOGIN'S ECHO. `/auth/login` returns `user.preferredLanguage`. The
 *      fixtures in auth.test.ts and auth-demo-login-contract.test.ts both set
 *      the column to 'en' — the exact value the old hardcode emitted — so an
 *      assertion written against them would pass whether or not the route reads
 *      the row at all. The fixture here is deliberately NOT 'en'.
 *
 *   2. THE DEAD BRANCH in GET /me, which minted `preferredLanguage: 'en'` for a
 *      synthetic `demo-*` identity. middlewares/auth.ts resolves demo tokens to
 *      real UUIDs (or 401s) so nothing reaches it — but a hardcode sitting in
 *      the same file as the fix is how the defect comes back.
 *
 *   3. FOUR SIGNUP PATHS inventing a default: three said 'hi', one said 'en',
 *      and prisma/schema.prisma says `@default(hi)`. Whichever is right, four
 *      independent answers cannot all be.
 *
 * Every source scan below strips comments FIRST. A prose mention of
 * `preferredLanguage: 'en'` in a docblock explaining why it was removed must not
 * be able to fail — or, worse, to satisfy — a guard.
 */

const DEMO_PASSWORD = 'demo123';
const REAL_UUID = '3f1a08c6-6ac4-4d2b-9f3f-9d0a1b2c3d4e';
const API_ROOT = path.resolve(__dirname, '..', '..');

function readSource(rel: string): string {
  return readFileSync(path.join(API_ROOT, rel), 'utf8');
}

/** Source with block and line comments removed. `http://` must survive. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function makeApp() {
  const app = Fastify({ logger: false });
  void app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

const savedNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: new Error('no supabase'),
  });
});

afterEach(() => {
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
});

describe('I18N-07 — login echoes the language the row actually stores', () => {
  it('returns the stored language, not a hardcoded default', async () => {
    // 'ta' is chosen precisely because it is neither the old hardcode ('en')
    // nor the schema default ('hi'): only reading the row can produce it.
    prismaMock.user.findUnique.mockResolvedValue({
      id: REAL_UUID,
      email: 'wellness@demo.com',
      phone: null,
      fullName: 'Demo Wellness',
      subscriptionTier: 'free',
      blocked: false,
      avatarUrl: null,
      preferredLanguage: 'ta',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'wellness@demo.com', password: DEMO_PASSWORD },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().user.preferredLanguage).toBe('ta');
  });
});

describe('I18N-07 — no route re-invents the stored language', () => {
  it('GET /me no longer mints a language for a synthetic demo identity', () => {
    const src = stripComments(readSource('src/routes/auth.ts'));
    expect(src).not.toContain("id.startsWith('demo-')");
    expect(src).not.toMatch(/preferredLanguage:\s*'en'/);
  });

  it('proves the scanner strips comments, so a docblock cannot satisfy it', () => {
    const withComment = `// preferredLanguage: 'en'\nconst x = 1;`;
    expect(stripComments(withComment)).not.toContain('preferredLanguage');
    expect(stripComments(withComment)).toContain('const x = 1;');
    // …and a real assignment survives.
    expect(stripComments(`const a = { preferredLanguage: 'en' };`)).toContain(
      "preferredLanguage: 'en'",
    );
  });
});

describe('I18N-07 — one signup default, agreeing with the schema', () => {
  const SIGNUP_FILES = [
    'src/routes/auth.ts',
    'src/routes/magic-link.ts',
    'src/routes/whatsapp-otp.ts',
  ];

  it('matches the default prisma/schema.prisma declares for the column', () => {
    const schema = readSource('prisma/schema.prisma')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    const declared = /preferredLanguage\s+Language\s+@default\(([a-z]+)\)/.exec(schema);
    expect(declared, 'preferredLanguage lost its @default in the schema').not.toBeNull();
    expect(SIGNUP_DEFAULT_LANGUAGE).toBe(declared![1]);
  });

  it('is the only answer any signup path gives', () => {
    const offenders: string[] = [];
    for (const rel of SIGNUP_FILES) {
      const src = stripComments(readSource(rel));
      for (const hit of src.matchAll(/preferredLanguage:\s*'([a-z]{2})'/g)) {
        offenders.push(`${rel} → '${hit[1]}'`);
      }
    }
    expect(offenders, 'a signup path restates a language literal').toEqual([]);
  });

  it('is actually referenced where accounts are created', () => {
    for (const rel of SIGNUP_FILES) {
      const src = stripComments(readSource(rel));
      expect(src, `${rel} does not use the shared default`).toContain(
        'SIGNUP_DEFAULT_LANGUAGE',
      );
    }
  });
});
