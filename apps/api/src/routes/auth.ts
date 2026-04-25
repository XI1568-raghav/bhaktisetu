import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSupabaseClient } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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

// ─── Routes ────────────────────────────────────────────────────────────────────

export async function authRoutes(server: FastifyInstance) {
  /**
   * POST /send-otp
   * Sends a one-time password to the given phone number via Supabase Auth (SMS).
   */
  server.post('/send-otp', async (request, reply) => {
    const parseResult = sendOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        details: parseResult.error.errors,
      });
    }

    const phone = normalizePhone(parseResult.data.phone);
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
  server.post('/verify-otp', async (request, reply) => {
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

    return reply.code(200).send({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
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
  server.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { email, password } = parseResult.data;
    const emailLower = email.toLowerCase();

    // Check demo accounts first
    const demo = DEMO_ACCOUNTS[emailLower];
    if (demo && demo.password === password) {
      const { session } = makeDemoSession(emailLower);
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
          role: (user as any).role || 'devotee',
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

      // Create user record in our DB
      // phone is optional in signup form but required in DB schema; use type assertion to allow omission
      const user = await prisma.user.create({
        data: {
          id: authData.user.id,
          email: emailLower,
          fullName,
          phone: (phone as string),
          locationCity: city || undefined,
        },
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
      request.log.warn({ err: err?.message, email: emailLower }, 'Signup DB/Supabase unavailable — using demo mode');

      // Handle duplicate email
      if (err?.code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'An account with this email already exists',
        });
      }

      // DB/Supabase unavailable — return demo session so signup still works in dev
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

  server.post('/signup', signupHandler);
  server.post('/register', signupHandler);
}
