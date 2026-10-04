/**
 * Contract tests for the auth / admin / onboarding surfaces.
 *
 * Each block pins one defect that shipped, and the structural assertions
 * re-read the API source on every run so the client cannot drift from the
 * server again — the same technique lib/deep-link.test.ts uses against the
 * filesystem and lib/__tests__/pandit-vetting.tc08.test.ts uses against
 * apps/api.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  API_SIGNUP_ROLES,
  describePasswordProblem,
  toApiSignupRole,
} from '../signup-contract';
import { REQUIRED_EXTRAS, describeOnboardProblem } from '../onboard-contract';
import {
  selectAdminUsers,
  selectPendingApprovals,
  selectPendingApprovalsTotal,
} from '../api-contracts';

const API_SRC = join(__dirname, '..', '..', '..', 'api', 'src');

function readApi(rel: string): string {
  return readFileSync(join(API_SRC, rel), 'utf8');
}

// ─── signup ──────────────────────────────────────────────────────────────────

describe('signup role reaches the server as a key its enum accepts', () => {
  const authSource = readApi(join('routes', 'auth.ts'));

  it("the server's signup enum says `pandit`, not `priest`", () => {
    // The exact line the client used to violate. If the API renames the key,
    // this fails here rather than as a 400 on every pandit signup.
    const enumBlock = authSource.slice(
      authSource.indexOf('const signupSchema'),
      authSource.indexOf('const signupSchema') + 1200,
    );
    expect(enumBlock).toContain("'pandit'");
    expect(enumBlock).not.toContain("'priest'");
  });

  it('every role the client can send is in the server enum', () => {
    const enumBlock = authSource.slice(
      authSource.indexOf('const signupSchema'),
      authSource.indexOf('const signupSchema') + 1200,
    );
    for (const role of API_SIGNUP_ROLES) {
      expect(enumBlock).toContain(`'${role}'`);
    }
  });

  it('translates the client `priest` to the wire `pandit`', () => {
    expect(toApiSignupRole('priest')).toBe('pandit');
  });

  it('passes every other client role through unchanged', () => {
    expect(toApiSignupRole('devotee')).toBe('devotee');
    expect(toApiSignupRole('store_owner')).toBe('store_owner');
    expect(toApiSignupRole('astrologer')).toBe('astrologer');
    expect(toApiSignupRole('wellness_instructor')).toBe('wellness_instructor');
    expect(toApiSignupRole('gaushala_manager')).toBe('gaushala_manager');
    expect(toApiSignupRole('temple_manager')).toBe('temple_manager');
  });

  it('never lets a client ask for admin — the server enum has no admin either', () => {
    expect(toApiSignupRole('admin')).toBe('devotee');
    expect(API_SIGNUP_ROLES).not.toContain('admin' as never);
  });
});

describe('signup password rule matches the server', () => {
  it('mirrors the API constraints, which are 8 + letter + digit', () => {
    const authSource = readApi(join('routes', 'auth.ts'));
    expect(authSource).toContain("min(8, 'Password must be at least 8 characters')");
    expect(authSource).toContain('regex(/[A-Za-z]/');
    expect(authSource).toContain('regex(/[0-9]/');
  });

  it('rejects the 6-character password the screen used to accept', () => {
    // The exact old client rule was `password.length < 6`, so "abc123" passed
    // here and 400'd at the API.
    expect(describePasswordProblem('abc123')).toMatch(/8 characters/);
  });

  it('rejects a long password with no digit', () => {
    expect(describePasswordProblem('onlyletters')).toMatch(/digit/);
  });

  it('rejects a long password with no letter', () => {
    expect(describePasswordProblem('12345678')).toMatch(/letter/);
  });

  it('accepts a password the server accepts', () => {
    expect(describePasswordProblem('devotee123')).toBeNull();
  });

  it('does not demand a special character the server never asked for', () => {
    expect(describePasswordProblem('abcdefg1')).toBeNull();
  });
});

// ─── provider self-onboarding ────────────────────────────────────────────────

describe('self-onboarding sends a body the discriminated union can parse', () => {
  const routeSource = readApi(join('routes', 'leads-self-onboard.ts'));

  it("every field the client marks required is required on the server's arm", () => {
    // Cheap structural check: the field name must appear in the route file at
    // all. A renamed column fails here instead of as an unreadable 400.
    for (const rules of Object.values(REQUIRED_EXTRAS)) {
      for (const rule of rules) {
        expect(routeSource).toContain(rule.key);
      }
    }
  });

  it("the server's role literals are the ones the client sends", () => {
    for (const role of Object.keys(REQUIRED_EXTRAS)) {
      expect(routeSource).toContain(`'${role}'`);
    }
  });

  const base = {
    fullName: 'Ramesh Sharma',
    email: 'ramesh@example.com',
    phone: '9876543210',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
  };

  it('blocks a temple application with no temple name — the `*` used to be decoration', () => {
    expect(describeOnboardProblem('TEMPLE', base, { deity: 'Shiva' })).toMatch(
      /Temple name/,
    );
  });

  it('blocks a pandit application with no years of experience', () => {
    expect(
      describeOnboardProblem('PRIEST', base, { specialties: 'Rudrabhishek' }),
    ).toMatch(/Years of experience/);
  });

  it('blocks "12 years" in a z.coerce.number() field, which coerces to NaN and 400s', () => {
    expect(
      describeOnboardProblem('PRIEST', base, {
        yearsExperience: '12 years',
        specialties: 'Rudrabhishek',
      }),
    ).toMatch(/whole number/);
  });

  it('blocks a cow count above the server maximum', () => {
    expect(
      describeOnboardProblem('GAUSHALA', base, {
        gaushalaName: 'Shri Krishna Gaushala',
        cowCount: '100001',
      }),
    ).toMatch(/100000/);
  });

  it('blocks a phone shorter than the server minimum of 6', () => {
    expect(
      describeOnboardProblem(
        'ASTROLOGER',
        { ...base, phone: '123' },
        { astrologyType: 'vedic' },
      ),
    ).toMatch(/phone number/i);
  });

  it('blocks an address that is not an email', () => {
    expect(
      describeOnboardProblem(
        'ASTROLOGER',
        { ...base, email: 'ramesh-at-example' },
        { astrologyType: 'vedic' },
      ),
    ).toMatch(/valid email/);
  });

  it('accepts a complete application for every role', () => {
    expect(
      describeOnboardProblem('TEMPLE', base, { templeName: 'Kashi Vishwanath', deity: 'Shiva' }),
    ).toBeNull();
    expect(
      describeOnboardProblem('PRIEST', base, { yearsExperience: '12', specialties: 'Rudrabhishek' }),
    ).toBeNull();
    expect(describeOnboardProblem('ASTROLOGER', base, { astrologyType: 'vedic' })).toBeNull();
    expect(
      describeOnboardProblem('WELLNESS_INSTRUCTOR', base, { sessionType: 'yoga' }),
    ).toBeNull();
    expect(
      describeOnboardProblem('GAUSHALA', base, {
        gaushalaName: 'Shri Krishna Gaushala',
        cowCount: '120',
        has80G: true,
      }),
    ).toBeNull();
  });
});

// ─── admin ───────────────────────────────────────────────────────────────────

describe('admin pending-approvals reads the keys the endpoint sends', () => {
  // Verbatim from adminService.getPendingApprovals(), which is also the shape
  // apps/web/app/admin/approvals/page.tsx documents.
  const LIVE = {
    approvals: [
      {
        id: 'pp_profile_1',
        userId: 'usr_1',
        role: 'PANDIT',
        profileName: 'Pandit Kamal Joshi',
        city: 'Varanasi',
        createdAt: '2026-08-30T04:00:00.000Z',
      },
      {
        id: 'tp_profile_9',
        userId: 'usr_9',
        role: 'TEMPLE_MANAGER',
        profileName: 'Shri Kashi Vishwanath Mandir',
        city: null,
        createdAt: '2026-09-01T04:00:00.000Z',
      },
    ],
    total: 7,
    hasMore: true,
  };

  it("reads profileName — the screens read `fullName`, which is never sent", () => {
    const rows = selectPendingApprovals(LIVE);
    expect(rows.map((r) => r.profileName)).toEqual([
      'Pandit Kamal Joshi',
      'Shri Kashi Vishwanath Mandir',
    ]);
  });

  it('keeps userId distinct from the profile id — PATCHing the profile id 404s', () => {
    const rows = selectPendingApprovals(LIVE);
    expect(rows[0]?.id).toBe('pp_profile_1');
    expect(rows[0]?.userId).toBe('usr_1');
  });

  it('never guesses a userId, because a wrong one would PATCH the wrong account', () => {
    const rows = selectPendingApprovals({ approvals: [{ id: 'p1', role: 'PANDIT' }] });
    expect(rows[0]?.userId).toBe('');
  });

  it('reads the server-side total rather than the page length', () => {
    expect(selectPendingApprovalsTotal(LIVE, 2)).toBe(7);
  });

  it('yields nothing — never invented rows — for an unrecognised shape', () => {
    expect(selectPendingApprovals(null)).toEqual([]);
    expect(selectPendingApprovals({ data: [{ id: 'x' }] })).toEqual([]);
    expect(selectPendingApprovals({ approvals: 'nope' })).toEqual([]);
  });

  it('the endpoint really does answer profileName/userId', () => {
    const service = readApi(join('services', 'admin.service.ts'));
    const block = service.slice(service.indexOf('async getPendingApprovals'));
    expect(block).toContain('profileName');
    expect(block).toContain('userId');
  });

  it('the write that approves somebody is PATCH /admin/users/:id { approved }', () => {
    const route = readApi(join('routes', 'admin.ts'));
    expect(route).toContain("server.patch('/users/:id'");
    expect(route).toContain('approved: z.boolean().optional()');
  });
});

describe('admin user list reads the keys the endpoint sends', () => {
  // Verbatim from adminService.getUsers()'s `enriched`.
  const LIVE = {
    users: [
      {
        id: 'usr_1',
        fullName: 'Arjun Sharma',
        email: 'arjun@example.com',
        phone: '+919876543210',
        roles: ['DEVOTEE'],
        subscriptionTier: 'bhakti_pass',
        blocked: false,
        blockedAt: null,
        blockedReason: null,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'usr_2',
        fullName: 'Pandit Kamal Joshi',
        email: null,
        phone: '+919876543211',
        roles: ['DEVOTEE', 'PANDIT'],
        subscriptionTier: 'free',
        blocked: true,
        blockedAt: '2026-08-02T00:00:00.000Z',
        blockedReason: 'payments fraud',
        createdAt: '2026-07-02T00:00:00.000Z',
      },
    ],
    total: 23,
    page: 1,
    limit: 20,
  };

  it('labels a row from `roles[]` — there is no `role` on this endpoint', () => {
    const rows = selectAdminUsers(LIVE);
    expect(rows[0]?.primaryRole).toBe('DEVOTEE');
    // The provider role wins over the DEVOTEE every user also holds.
    expect(rows[1]?.primaryRole).toBe('PANDIT');
  });

  it('surfaces `blocked`, which the screen could not show at all (AO-01)', () => {
    const rows = selectAdminUsers(LIVE);
    expect(rows[0]?.blocked).toBe(false);
    expect(rows[1]?.blocked).toBe(true);
    expect(rows[1]?.blockedReason).toBe('payments fraud');
  });

  it('treats a missing `blocked` as not-blocked, never as blocked', () => {
    const rows = selectAdminUsers({ users: [{ id: 'u', fullName: 'X' }] });
    expect(rows[0]?.blocked).toBe(false);
  });

  it('the route filters on `search`, not `q`, and zod strips the difference', () => {
    const route = readApi(join('routes', 'admin.ts'));
    const schema = route.slice(
      route.indexOf('const userQuerySchema'),
      route.indexOf('const userQuerySchema') + 260,
    );
    expect(schema).toContain('search:');
    expect(schema).not.toContain('q:');
  });

  it('the role filter matches upper-snake Prisma roles and empties the page otherwise', () => {
    const service = readApi(join('services', 'admin.service.ts'));
    const roles = service.slice(
      service.indexOf('const USER_ROLES'),
      service.indexOf('const USER_ROLES') + 260,
    );
    expect(roles).toContain("'PANDIT'");
    expect(roles).not.toContain("'priest'");
    expect(service).toContain('return { users: [], total: 0, page, limit };');
  });
});

// ─── release-build hygiene ───────────────────────────────────────────────────

describe('no demo credential reaches a release build', () => {
  const APP_DIR = join(__dirname, '..', '..', 'app');

  function read(rel: string): string {
    return readFileSync(join(APP_DIR, rel), 'utf8');
  }

  it('gates the demo-account VALUE, not just the JSX that renders it', () => {
    // The chip block is behind `__DEV__`, but a module-level array is still a
    // literal in the bundle and "the minifier will probably drop it" is not a
    // guarantee to rest a credential on. In a release bundle this must be [].
    const login = read(join('(auth)', 'login.tsx'));
    expect(login).toContain('const DEMO_HINTS = __DEV__ ? [');
    expect(login).toContain('] : [];');
  });

  it('keeps the password prefill dev-only', () => {
    const login = read(join('(auth)', 'login.tsx'));
    expect(login).toContain("useState(__DEV__ ? 'demo123' : '')");
  });

  it('leaves no demo address anywhere else in (auth) or (onboard)', () => {
    const files = [
      join('(auth)', 'signup.tsx'),
      join('(auth)', 'verify-otp.tsx'),
      join('(auth)', 'forgot-password.tsx'),
      join('(auth)', 'reset-password.tsx'),
      join('(onboard)', '_form.tsx'),
      join('(onboard)', 'waitlist.tsx'),
      join('(onboard)', 'become-priest.tsx'),
      join('(onboard)', 'become-astrologer.tsx'),
      join('(onboard)', 'become-wellness.tsx'),
      join('(onboard)', 'become-gurukul.tsx'),
      join('(onboard)', 'list-temple.tsx'),
      join('(onboard)', 'list-gaushala.tsx'),
    ];
    const offenders = files.filter((f) => /@demo\.com|demo123/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('the auth context ships no demo credential outside DEMO_ENABLED', () => {
    const ctx = readFileSync(join(__dirname, '..', 'auth-context.tsx'), 'utf8');
    // The record is `DEMO_ENABLED ? {...} : {}` — the values are gated.
    expect(ctx).toContain('DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = DEMO_ENABLED ?');
    // …and no credential is left in user-visible copy. A failed sign-in used
    // to answer "Try a demo account: devotee@demo.com / demo123".
    const messages = ctx.match(/message:\s*'[^']*'/g) ?? [];
    expect(messages.filter((m) => /demo\.com|demo123/.test(m))).toEqual([]);
  });

  it('never puts a token in a URL or a log', () => {
    const files = [
      join('(auth)', 'login.tsx'),
      join('(auth)', 'signup.tsx'),
      join('(auth)', 'verify-otp.tsx'),
      join('(auth)', 'forgot-password.tsx'),
      join('(auth)', 'reset-password.tsx'),
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/console\.(log|warn|info|debug)\s*\([^)]*[Tt]oken/);
      expect(src).not.toMatch(/[?&]token=\$\{/);
      expect(src).not.toMatch(/[?&](access_token|accessToken|refreshToken)=/);
    }
  });
});
