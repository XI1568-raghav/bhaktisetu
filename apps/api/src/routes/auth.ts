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
}
