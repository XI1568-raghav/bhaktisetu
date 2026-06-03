import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSupabaseClient } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

// Tighter rate limit for unauthenticated credential/OTP endpoints — the
// global 100/min is too generous for OTP-spam and credential-stuffing.
// 10 requests per minute per IP is comfortable for a real user retrying
// once or twice; trivially blocks scripted brute-force.
const sensitiveAuthRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
};

// ─── Validation Schemas ────────────────────────────────────────────────────────

const sendOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format. Use format: +919876543210'),
});

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
  token: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

const googleSyncSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  expiresAt: z.number().nullable().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  // 8 chars minimum + at least one letter and one digit. Long enough to
  // resist trivial brute force, simple enough to remember without a
  // password manager. Special-character requirements are skipped on
  // purpose: NIST 800-63B says they don't help and harm UX.
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['devotee', 'pandit', 'store_owner', 'astrologer', 'wellness_instructor', 'gaushala_manager', 'temple_manager']).optional().default('devotee'),
  city: z.string().optional(),
});

// ─── Demo accounts registry (in-memory fallback when DB unavailable) ─────────
const DEMO_ACCOUNTS: Record<string, { password: string; role: string; fullName: string }> = {
  'devotee@demo.com': { password: 'demo123', role: 'devotee', fullName: 'Arjun Sharma' },
  'pandit@demo.com': { password: 'demo123', role: 'pandit', fullName: 'Pandit Kamal Joshi' },
  'priest@demo.com': { password: 'demo123', role: 'pandit', fullName: 'Pandit Kamal Joshi' },
  'store@demo.com': { password: 'demo123', role: 'store_owner', fullName: 'Rajesh Gupta' },
  'astro@demo.com': { password: 'demo123', role: 'astrologer', fullName: 'Acharya Vikram' },
  'wellness@demo.com': { password: 'demo123', role: 'wellness_instructor', fullName: 'Meera Iyer' },
  'gaushala@demo.com': { password: 'demo123', role: 'gaushala_manager', fullName: 'Ram Prasad' },
  'temple@demo.com': { password: 'demo123', role: 'temple_manager', fullName: 'Shyam Kumar' },
  'admin@demo.com': { password: 'demo123', role: 'admin', fullName: 'Platform Admin' },
};

function makeDemoSession(email: string) {
  const userId = `demo-${email.split('@')[0]}`;
  return {
    session: {
      accessToken: `demo-${userId}-token`,
      refreshToken: `demo-${userId}-refresh`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
  };
}

// Resolve a user's primary role from user_role_assignments and return it
// in the web-facing lowercase form (`pandit`, `store_owner`, ...). Falls
// back to 'devotee' when no assignment exists. Centralised so /me,
// /login, /verify-otp, and Google sync all surface the same answer —
// without this, the web layer kept treating new providers as devotees
// because the response carried no role field.
async function getPrimaryRoleForUser(userId: string): Promise<string> {
  try {
    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    const first = assignments[0];
    if (!first) return 'devotee';
    return first.role.toLowerCase();
  } catch {
    return 'devotee';
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Normalizes a phone number to include +91 if no country code is present.
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

// ─── Per-identity rate limits ──────────────────────────────────────────────────
// Tighter than the 100/min global @fastify/rate-limit. Keyed on the *target*
// of the auth event (phone for OTP, email for login) — not the source IP —
// so an attacker rotating IPs through CF still hits the same bucket and we
// protect the actual victim's account.
//
// SMS pump (Twilio bills us per SMS; Supabase forwards to Twilio): cap OTP
// sends per phone at 5 per 15-min window. Real users typo at most once.
// Credential stuffing on /login: cap to 10 attempts per email per 15-min
// window. Fits manual flow; blocks scripted lists.
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_MAX = 5;
const LOGIN_RATE_MAX = 10;
type Bucket = { count: number; windowStart: number };
const otpBuckets = new Map<string, Bucket>();
const loginBuckets = new Map<string, Bucket>();
function bucketOk(map: Map<string, Bucket>, key: string, max: number): boolean {
  const now = Date.now();
  const b = map.get(key);
  if (!b || now - b.windowStart > AUTH_RATE_WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

// ─── Session-cookie helpers ────────────────────────────────────────────────────
// P1 #4 — additive HttpOnly cookies alongside the JSON Bearer response.
// Mobile keeps reading the JSON body; web transitions to cookies. Both flows
// remain valid until the web migration is fully cut over.
//
// `darshya_session` carries the access token. Default TTL 3600s — Supabase
// access tokens are 1h. We don't read the TTL off env to keep this self-
// contained; flip the constant when Supabase project changes the lifetime.
// `darshya_refresh` is scoped to /api/v1/auth so it's only sent on the
// refresh endpoint, never on regular API calls. 7-day default matches
// Supabase's refresh-token lifetime.
const SESSION_COOKIE = 'darshya_session';
const REFRESH_COOKIE = 'darshya_refresh';
const SESSION_TTL_SECONDS = 60 * 60;                 // 1 hour
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;        // 7 days
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function setAuthCookies(
  reply: import('fastify').FastifyReply,
  accessToken: string,
  refreshToken: string,
): void {
  // setCookie is added by @fastify/cookie. If the plugin isn't registered
  // yet (current state of this app — see auth-model docs), the call throws.
  // We swallow that here so the JSON Bearer response path stays intact and
  // never regresses on the missing-plugin case. Once @fastify/cookie is
  // wired in server bootstrap, cookies start flowing automatically.
  const r = reply as any;
  if (typeof r.setCookie !== 'function') return;
  try {
    r.setCookie(SESSION_COOKIE, accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    r.setCookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TTL_SECONDS,
    });
  } catch {
    // best-effort; JSON Bearer response remains the contract of record
  }
}

function clearAuthCookies(reply: import('fastify').FastifyReply): void {
  const r = reply as any;
  if (typeof r.clearCookie !== 'function') return;
  try {
    r.clearCookie(SESSION_COOKIE, { path: '/' });
    r.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  } catch {
    // best-effort
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

export async function authRoutes(server: FastifyInstance) {
  // Log every auth-route hit with the Cloudflare-provided country code so
  // we can answer "is auth working from country X?" by reading prod logs
  // instead of round-tripping a VPN. cf-ipcountry is set by Cloudflare on
  // every request that traverses the proxy; missing means the request
  // came in directly (e.g. local dev or a debugging curl). We don't log
  // PII — just route, country, status, and (for failures) the response
  // code, which is enough to spot a geo-block pattern.
  server.addHook('onResponse', async (request, reply) => {
    const country = request.headers['cf-ipcountry'];
    if (typeof country === 'string' && country.length > 0) {
      request.log.info(
        {
          authEvent: true,
          route: request.routeOptions.url ?? request.url,
          method: request.method,
          country,
          status: reply.statusCode,
        },
        'auth.geo',
      );
    }
  });

  /**
   * POST /send-otp
   * Sends a one-time password to the given phone number via Supabase Auth (SMS).
   */
  server.post('/send-otp', sensitiveAuthRateLimit, async (request, reply) => {
    const parseResult = sendOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        details: parseResult.error.errors,
      });
    }

    const phone = normalizePhone(parseResult.data.phone);
    if (!bucketOk(otpBuckets, phone, OTP_RATE_MAX)) {
      return reply.code(429).send({
        error: 'TooManyRequests',
        message: 'Too many OTP requests for this number. Try again in 15 minutes.',
      });
    }
    const supabase = createSupabaseClient();

    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      request.log.error(error, 'Supabase signInWithOtp failed');
      return reply.code(400).send({
        error: 'OTP Error',
        message: error.message || 'Failed to send OTP. Please try again.',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'OTP sent successfully. Please check your phone.',
      phone,
    });
  });

  /**
   * POST /verify-otp
   * Verifies the OTP, creates/updates the Supabase session, and upserts
   * the user in the Prisma `users` table on first login.
   */
  server.post('/verify-otp', sensitiveAuthRateLimit, async (request, reply) => {
    const parseResult = verifyOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        details: parseResult.error.errors,
      });
    }

    const phone = normalizePhone(parseResult.data.phone);
    const { token } = parseResult.data;
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error || !data.session) {
      request.log.error(error, 'Supabase verifyOtp failed');
      return reply.code(400).send({
        error: 'Verification Error',
        message: error?.message || 'Invalid or expired OTP. Please try again.',
      });
    }

    const { session, user: supabaseUser } = data;

    // Upsert user in Prisma database (create on first login)
    let dbUser;
    try {
      dbUser = await prisma.user.upsert({
        where: { phone },
        update: {
          // Update nothing on subsequent logins — profile changes go through /users/me
        },
        create: {
          phone,
          fullName: '',
          email: supabaseUser?.email || null,
          preferredLanguage: 'hi',
        },
      });
    } catch (dbError) {
      request.log.error(dbError, 'Failed to upsert user in database');
      return reply.code(500).send({
        error: 'Database Error',
        message: 'Failed to create user account. Please try again.',
      });
    }

    const role = await getPrimaryRoleForUser(dbUser.id);

    return reply.code(200).send({
      success: true,
      message: 'OTP verified successfully',
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
        expiresAt: session.expires_at,
        tokenType: session.token_type,
      },
      user: {
        id: dbUser.id,
        phone: dbUser.phone,
        fullName: dbUser.fullName,
        email: dbUser.email,
        role,
        avatarUrl: dbUser.avatarUrl,
        preferredLanguage: dbUser.preferredLanguage,
        subscriptionTier: dbUser.subscriptionTier,
        isNewUser: dbUser.fullName === '',
      },
    });
  });

  /**
   * POST /refresh
   * Refreshes an expired access token using the refresh token.
   *
   * Refresh-token rotation is handled NATIVELY by Supabase Auth:
   * `auth.refreshSession({ refresh_token })` returns a NEW refresh_token on
   * every success and invalidates the prior one server-side (configured via
   * GoTrue REFRESH_TOKEN_ROTATION_ENABLED, default ON for Supabase Cloud).
   * Replaying a used refresh_token returns an error and the family is revoked.
   * No custom JTI ledger needed — Sprint 3 P1 item closed without code change.
   */
  server.post('/refresh', async (request, reply) => {
    const parseResult = refreshSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
      });
    }

    const { refreshToken } = parseResult.data;
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return reply.code(401).send({
        error: 'Refresh Error',
        message: error?.message || 'Failed to refresh session. Please log in again.',
      });
    }

    setAuthCookies(reply, data.session.access_token, data.session.refresh_token);
    return reply.code(200).send({
      success: true,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at,
        tokenType: data.session.token_type,
      },
    });
  });

  /**
   * POST /logout
   * Signs the user out of Supabase, invalidating the session.
   */
  server.post('/logout', async (request, reply) => {
    const parseResult = logoutSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
      });
    }

    const { accessToken } = parseResult.data;
    const supabase = createSupabaseClient(accessToken);

    const { error } = await supabase.auth.signOut();

    if (error) {
      request.log.warn(error, 'Supabase signOut error (non-critical)');
    }

    clearAuthCookies(reply);
    return reply.code(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  /**
   * GET /me
   * Protected route: returns the authenticated user's profile from Prisma.
   */
  server.get('/me', { preHandler: [authenticateUser] }, async (request, reply) => {
    const currentUser = request.currentUser!;

    // Demo users have synthetic ids like "demo-pandit" that aren't UUIDs;
    // return the in-memory profile directly without hitting Postgres.
    if (currentUser.id.startsWith('demo-')) {
      return reply.code(200).send({
        success: true,
        user: {
          id: currentUser.id,
          phone: currentUser.phone,
          email: currentUser.email,
          fullName: currentUser.fullName,
          avatarUrl: null,
          preferredLanguage: 'en',
          locationCity: null,
          locationState: null,
          isNri: false,
          nriCountry: null,
          gotra: null,
          nakshatra: null,
          rashi: null,
          subscriptionTier: currentUser.subscriptionTier,
          createdAt: new Date(),
          updatedAt: new Date(),
          addresses: [],
          activeSubscription: null,
          roles: currentUser.roles,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        addresses: true,
        subscription: {
          where: { status: 'active' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User profile not found.',
      });
    }

    const role = await getPrimaryRoleForUser(user.id);

    return reply.code(200).send({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role,
        avatarUrl: user.avatarUrl,
        preferredLanguage: user.preferredLanguage,
        locationCity: user.locationCity,
        locationState: user.locationState,
        isNri: user.isNri,
        nriCountry: user.nriCountry,
        gotra: user.gotra,
        nakshatra: user.nakshatra,
        rashi: user.rashi,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        addresses: user.addresses,
        activeSubscription: user.subscription[0] || null,
      },
    });
  });

  /**
   * POST /login
   * Email + password login. Checks demo accounts first, then falls through to DB.
   */
  server.post('/login', sensitiveAuthRateLimit, async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { email, password } = parseResult.data;
    const emailLower = email.toLowerCase();

    if (!bucketOk(loginBuckets, emailLower, LOGIN_RATE_MAX)) {
      return reply.code(429).send({
        error: 'TooManyRequests',
        message: 'Too many login attempts for this email. Try again in 15 minutes.',
      });
    }

    // Check demo accounts first — DEV/STAGING ONLY.
    // Prod gate: NODE_ENV !== 'production' OR explicit ALLOW_DEMO_TOKENS=true.
    // Without this, hardcoded admin@demo.com/demo123 grants ADMIN session in prod.
    const demoAllowed = process.env.NODE_ENV !== 'production'
      || process.env.ALLOW_DEMO_TOKENS === 'true';
    if (demoAllowed) {
      const demo = DEMO_ACCOUNTS[emailLower];
      if (demo && demo.password === password) {
        const { session } = makeDemoSession(emailLower);
        setAuthCookies(reply, session.accessToken, session.refreshToken);
        return reply.send({
          session,
          user: {
            id: `demo-${emailLower.split('@')[0]}`,
            email: emailLower,
            fullName: demo.fullName,
            role: demo.role,
            avatarUrl: null,
            preferredLanguage: 'en',
            subscriptionTier: 'free',
            createdAt: new Date().toISOString(),
          },
        });
      }
    }

    // Try DB lookup (will fail gracefully if DB unavailable)
    try {
      const user = await prisma.user.findUnique({
        where: { email: emailLower },
        include: { subscription: { where: { status: 'active' }, take: 1 } },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      // Note: in production, verify password hash here (bcrypt.compare)
      // For now, we rely on Supabase Auth for password verification
      const supabase = createSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });

      if (authError || !authData.session) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      const role = await getPrimaryRoleForUser(user.id);

      setAuthCookies(reply, authData.session.access_token, authData.session.refresh_token);
      return reply.send({
        session: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresAt: authData.session.expires_at ? authData.session.expires_at * 1000 : null,
        },
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role,
          avatarUrl: user.avatarUrl,
          preferredLanguage: user.preferredLanguage,
          subscriptionTier: user.subscriptionTier,
          createdAt: user.createdAt,
          activeSubscription: user.subscription[0] || null,
        },
      });
    } catch (err) {
      // DB/Supabase unavailable — only demo accounts work
      request.log.error({ err, email: emailLower }, 'Login failed — DB unavailable');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid credentials. Try a demo account: devotee@demo.com / demo123',
      });
    }
  });

  /**
   * POST /signup (alias: /register)
   * Register a new user with email + password + role.
   */
  const signupHandler = async (request: any, reply: any) => {
    const parseResult = signupSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { email, password, fullName, phone, role, city } = parseResult.data;
    const emailLower = email.toLowerCase();

    // Reject if using a demo email (prevent conflicts)
    if (DEMO_ACCOUNTS[emailLower]) {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'This email is reserved for demo accounts. Please use a different email.',
      });
    }

    try {
      const supabase = createSupabaseClient();

      // Sign up via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLower,
        password,
      });

      if (authError) {
        return reply.code(400).send({
          error: 'SignupFailed',
          message: authError.message,
        });
      }

      if (!authData.user) {
        return reply.code(500).send({
          error: 'SignupFailed',
          message: 'Failed to create user',
        });
      }

      // Upsert user in our DB. We use the Supabase auth.users.id as our
      // primary key so foreign keys line up; upsert (instead of create)
      // makes signup idempotent if Supabase succeeded on a prior attempt
      // but our DB write didn't.
      // `phone` is optional in the signup form but the schema column is
      // unique. Send a real value when provided; pass null otherwise so
      // the multi-NULL unique-index path handles it cleanly.
      const phoneValue = phone && phone.trim() ? phone.trim() : null;

      // P1 — wrap user + role assignment + provider stub in a single
      // transaction. Previously: 3 sequential writes with the inner two
      // try/catch-swallowed. If role assignment failed after user upsert
      // succeeded, account read back as DEVOTEE and the provider portal
      // was unreachable until admin patched. Now atomic: any inner failure
      // rolls back user create, signup returns 500, retry is idempotent
      // (Supabase auth + Prisma upsert both no-op on existing rows).
      const SIGNUP_ROLE_ENUM: Record<string, 'DEVOTEE' | 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER'> = {
        devotee: 'DEVOTEE',
        pandit: 'PANDIT',
        store_owner: 'STORE_OWNER',
        astrologer: 'ASTROLOGER',
        wellness_instructor: 'WELLNESS_INSTRUCTOR',
        gaushala_manager: 'GAUSHALA_MANAGER',
        temple_manager: 'TEMPLE_MANAGER',
      };
      const enumRole = SIGNUP_ROLE_ENUM[role];

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.upsert({
          where: { id: authData.user!.id },
          update: {
            email: emailLower,
            fullName,
            // Only overwrite phone if the user supplied one this time;
            // never wipe a previously-set phone with null.
            ...(phoneValue ? { phone: phoneValue } : {}),
            locationCity: city || undefined,
          },
          create: {
            id: authData.user!.id,
            email: emailLower,
            fullName,
            phone: phoneValue,
            locationCity: city || undefined,
          },
        });

        if (enumRole) {
          await tx.userRoleAssignment.upsert({
            where: { userId_role: { userId: u.id, role: enumRole } },
            update: { isPrimary: true },
            create: { userId: u.id, role: enumRole, isPrimary: true },
          });

          // Seed a stub provider profile (approved=false) so the account
          // shows up in /admin/approvals immediately, even if the
          // secondary /onboarding/provider call from web signup never
          // fires. Idempotent: empty update preserves any real data a
          // later /onboarding/provider call writes.
          switch (enumRole) {
            case 'PANDIT':
              await tx.panditProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, experience: 0, specialties: [], languages: [], pricePerPuja: 500 },
              });
              break;
            case 'STORE_OWNER':
              await tx.storeProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, storeName: fullName || 'Unnamed Store', categories: [] },
              });
              break;
            case 'ASTROLOGER':
              await tx.astrologerProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, displayName: fullName || 'Astrologer', specialties: [], experience: 0, languages: [], pricePerMinute: 10 },
              });
              break;
            case 'WELLNESS_INSTRUCTOR':
              await tx.wellnessProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, displayName: fullName || 'Wellness Instructor', specialties: [], certifications: [], experience: 0, pricePerSession: 500 },
              });
              break;
            case 'GAUSHALA_MANAGER':
              await tx.gaushalaProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, gaushalaName: fullName || 'Unnamed Gaushala', totalCows: 0 },
              });
              break;
            case 'TEMPLE_MANAGER':
              await tx.templeProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, templeName: fullName || 'Unnamed Temple' },
              });
              break;
          }
        }

        return u;
      });

      return reply.code(201).send({
        session: authData.session
          ? {
              accessToken: authData.session.access_token,
              refreshToken: authData.session.refresh_token,
              expiresAt: authData.session.expires_at ? authData.session.expires_at * 1000 : null,
            }
          : null,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role,
          status: role === 'devotee' ? 'active' : 'pending_approval',
        },
        message: role === 'devotee'
          ? 'Account created successfully'
          : 'Account created. Your profile is pending approval.',
      });
    } catch (err: any) {
      request.log.error({ err: err?.message, code: err?.code, email: emailLower }, 'Signup failed');

      // Handle duplicate email/phone
      if (err?.code === 'P2002') {
        const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(',') : String(err?.meta?.target ?? '');
        const friendly = target.includes('phone')
          ? 'An account with this phone number already exists'
          : 'An account with this email already exists';
        return reply.code(409).send({ error: 'Conflict', message: friendly });
      }

      // In dev (Supabase NOT configured), fall back to a demo session so the
      // local signup flow still works without a live backend. In prod, surface
      // the real error so we can fix it instead of silently masking it.
      // Hard prod gate: even if supabaseConfigured check misreads a placeholder
      // URL, never issue demo sessions in production.
      const supabaseConfigured = !!process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'https://demo.supabase.co';
      if (supabaseConfigured || process.env.NODE_ENV === 'production') {
        return reply.code(500).send({
          error: 'SignupFailed',
          message: err?.message || 'Could not create account. Please try again.',
        });
      }

      const demoId = `demo-${emailLower.split('@')[0]}-${Date.now()}`;
      return reply.code(201).send({
        session: {
          accessToken: `demo-${demoId}-token`,
          refreshToken: `demo-${demoId}-refresh`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        },
        user: {
          id: demoId,
          email: emailLower,
          fullName,
          role,
          status: role === 'devotee' ? 'active' : 'pending_approval',
        },
        message: role === 'devotee'
          ? 'Account created successfully (demo mode)'
          : 'Account created. Your profile is pending approval. (demo mode)',
      });
    }
  };

  server.post('/signup', sensitiveAuthRateLimit, signupHandler);
  server.post('/register', sensitiveAuthRateLimit, signupHandler);

  /**
   * POST /auth/google/sync
   * Web finishes the Google OAuth dance with Supabase client-side. The
   * Supabase access_token it receives is already valid for our Supabase
   * project; we use it to identify the user, then upsert the matching
   * Prisma row keyed on email. Returns the same {session, user} shape as
   * /auth/login so the web auth-context can store it identically.
   */
  server.post('/google/sync', async (request, reply) => {
    const parseResult = googleSyncSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { accessToken, refreshToken, expiresAt } = parseResult.data;

    const supabase = createSupabaseClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid Google session',
      });
    }

    const supaUser = authData.user;
    const email = supaUser.email?.toLowerCase();
    if (!email) {
      return reply.code(400).send({
        error: 'BadRequest',
        message: 'Google account did not return an email address',
      });
    }

    // Block colliding with reserved demo accounts (same guard as /signup).
    if (DEMO_ACCOUNTS[email]) {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'This email is reserved for demo accounts.',
      });
    }

    // Pull a display name from Google metadata; fall back to the email local-part.
    const meta = (supaUser.user_metadata || {}) as Record<string, unknown>;
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      email.split('@')[0] ||
      'New user';
    const avatarUrl =
      (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
      (typeof meta.picture === 'string' && meta.picture) ||
      null;

    try {
      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          // Refresh display fields on every login so a Google avatar/name change reflects.
          fullName,
          avatarUrl,
        },
        // phone is nullable per schema (20260428_phone_nullable migration).
        create: {
          id: supaUser.id,
          email,
          fullName,
          avatarUrl,
          phone: null,
          preferredLanguage: 'hi',
        },
        include: { subscription: { where: { status: 'active' }, take: 1 } },
      });

      const role = await getPrimaryRoleForUser(dbUser.id);

      return reply.send({
        session: {
          accessToken,
          refreshToken,
          expiresAt: expiresAt ?? null,
        },
        user: {
          id: dbUser.id,
          email: dbUser.email,
          phone: dbUser.phone,
          fullName: dbUser.fullName,
          role,
          avatarUrl: dbUser.avatarUrl,
          preferredLanguage: dbUser.preferredLanguage,
          subscriptionTier: dbUser.subscriptionTier,
          createdAt: dbUser.createdAt,
          activeSubscription: dbUser.subscription[0] || null,
          isNewUser: dbUser.fullName === fullName && Date.now() - new Date(dbUser.createdAt).getTime() < 5000,
        },
      });
    } catch (err) {
      request.log.error({ err, email }, 'Google sync — DB upsert failed');
      return reply.code(500).send({
        error: 'DatabaseError',
        message: 'Failed to sync user account. Please try again.',
      });
    }
  });
}
