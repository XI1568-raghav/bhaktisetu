import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { uuidParamGuard } from '../lib/uuid.js';
import { authenticateUser } from '../middlewares/auth.js';
import {
  clearPreferredLanguageCache,
  languageSchema,
  sendLocalizedError,
} from '../lib/i18n.js';

// ─── Validation Schemas ────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  gotra: z.string().max(50).optional().nullable(),
  nakshatra: z.string().max(50).optional().nullable(),
  rashi: z.string().max(50).optional().nullable(),
  // I-11: was a hand-retyped copy of the Prisma `Language` enum, free to drift
  // from the enum it guards and from the three other lists that disagreed with
  // it. Derived from the one list now — see packages/shared/.../languages.ts.
  preferredLanguage: languageSchema.optional(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  isNri: z.boolean().optional(),
  nriCountry: z.string().max(100).optional().nullable(),
});

const createAddressSchema = z.object({
  label: z.string().min(1).max(50).default('home'),
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: z.string().min(4).max(10).regex(/^\d{4,10}$/, 'Invalid pincode'),
  country: z.string().max(100).default('India'),
  isDefault: z.boolean().default(false),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});

const updateAddressSchema = createAddressSchema.partial();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});

// ─── Routes ────────────────────────────────────────────────────────────────────

export async function userRoutes(server: FastifyInstance) {
  // All routes in this plugin require authentication
  server.addHook('preHandler', authenticateUser);

  /**
   * GET /me
   * Returns the authenticated user's full profile.
   */
  server.get('/me', async (request, reply) => {
    const userId = request.currentUser!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
        },
        subscription: {
          where: { status: 'active' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!user) {
      return sendLocalizedError(request, reply, {
        statusCode: 404,
        code: 'NOT_FOUND',
        error: 'Not Found',
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
        bookingsCount: user._count.bookings,
      },
    });
  });

  /**
   * PATCH /me
   * Updates the authenticated user's profile fields.
   */
  server.patch('/me', async (request, reply) => {
    const userId = request.currentUser!.id;

    const parseResult = updateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      // I-04: the field-level Zod text stays in `details` for the form to map
      // onto inputs; `message` — the string apps/web actually renders — is now
      // a catalogue string in the caller's language.
      return sendLocalizedError(request, reply, {
        statusCode: 400,
        code: 'INVALID_BODY',
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    const updateData = parseResult.data;

    // If user sets isNri to false, clear the nriCountry
    if (updateData.isNri === false) {
      updateData.nriCountry = null;
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // I18N-07: the stored language now drives every later response, so a
      // change to it has to invalidate the cached copy immediately — otherwise
      // the user switches to Tamil and reads Hindi for another five minutes.
      if (updateData.preferredLanguage !== undefined) {
        clearPreferredLanguageCache(userId);
      }

      return reply.code(200).send({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          avatarUrl: updatedUser.avatarUrl,
          preferredLanguage: updatedUser.preferredLanguage,
          locationCity: updatedUser.locationCity,
          locationState: updatedUser.locationState,
          isNri: updatedUser.isNri,
          nriCountry: updatedUser.nriCountry,
          gotra: updatedUser.gotra,
          nakshatra: updatedUser.nakshatra,
          rashi: updatedUser.rashi,
          subscriptionTier: updatedUser.subscriptionTier,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
        return sendLocalizedError(request, reply, {
          statusCode: 409,
          code: 'EMAIL_TAKEN',
          error: 'Conflict',
        });
      }
      throw err;
    }
  });

  /**
   * PUT /me/avatar
   * Placeholder for avatar upload — to be connected to S3/R2 storage.
   */
  server.put('/me/avatar', async (request, reply) => {
    return reply.code(501).send({
      error: 'Not Implemented',
      message: 'Avatar upload will be available soon. Please use profile settings to update your avatar URL.',
    });
  });

  // ─── Address routes ──────────────────────────────────────────────────────────

  /**
   * GET /me/addresses
   * Returns all saved addresses for the authenticated user.
   */
  server.get('/me/addresses', async (request, reply) => {
    const userId = request.currentUser!.id;

    const addresses = await prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    });

    return reply.code(200).send({
      success: true,
      addresses,
    });
  });

  /**
   * POST /me/addresses
   * Creates a new address for the authenticated user.
   */
  server.post('/me/addresses', async (request, reply) => {
    const userId = request.currentUser!.id;

    const parseResult = createAddressSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendLocalizedError(request, reply, {
        statusCode: 400,
        code: 'INVALID_BODY',
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    // If this address is set as default, unset other defaults first
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.userAddress.create({
      data: {
        userId,
        label: data.label,
        line1: data.line1,
        line2: data.line2 ?? null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country,
        isDefault: data.isDefault,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      },
    });

    return reply.code(201).send({
      success: true,
      message: 'Address added successfully',
      address,
    });
  });

  /**
   * PATCH /me/addresses/:id
   * Updates an existing address (verifies ownership).
   */
  server.patch<{ Params: { id: string } }>('/me/addresses/:id', { preHandler: [uuidParamGuard('id')] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id: addressId } = request.params;

    // Verify ownership
    const existing = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      // Deliberately NOT routed through the catalogue: "or does not belong to
      // you" is information no code encodes, and the generic NOT_FOUND string
      // would drop it. Same rule the serializer follows — localize only when
      // nothing caller-specific is lost. Add an ADDRESS_NOT_FOUND code to
      // lib/error-i18n.ts to localize this without the downgrade.
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Address not found or does not belong to you.',
      });
    }

    const parseResult = updateAddressSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendLocalizedError(request, reply, {
        statusCode: 400,
        code: 'INVALID_BODY',
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    // If setting this address as default, unset other defaults first
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.userAddress.update({
      where: { id: addressId },
      data,
    });

    return reply.code(200).send({
      success: true,
      message: 'Address updated successfully',
      address: updatedAddress,
    });
  });

  /**
   * DELETE /me/addresses/:id
   * Deletes an address (verifies ownership).
   */
  server.delete<{ Params: { id: string } }>('/me/addresses/:id', { preHandler: [uuidParamGuard('id')] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id: addressId } = request.params;

    // Verify ownership
    const existing = await prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      // Deliberately NOT routed through the catalogue: "or does not belong to
      // you" is information no code encodes, and the generic NOT_FOUND string
      // would drop it. Same rule the serializer follows — localize only when
      // nothing caller-specific is lost. Add an ADDRESS_NOT_FOUND code to
      // lib/error-i18n.ts to localize this without the downgrade.
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Address not found or does not belong to you.',
      });
    }

    await prisma.userAddress.delete({
      where: { id: addressId },
    });

    return reply.code(200).send({
      success: true,
      message: 'Address deleted successfully',
    });
  });

  // ─── Booking routes ──────────────────────────────────────────────────────────

  /**
   * GET /me/bookings
   * Returns paginated list of the authenticated user's puja bookings.
   */
  server.get('/me/bookings', async (request, reply) => {
    const userId = request.currentUser!.id;

    const parseResult = paginationSchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendLocalizedError(request, reply, {
        statusCode: 400,
        code: 'INVALID_QUERY',
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
    }

    const { page, limit, status } = parseResult.data;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.pujaBooking.findMany({
        where,
        include: {
          temple: {
            select: { id: true, name: true, slug: true, city: true, state: true },
          },
          pujaType: {
            select: { id: true, name: true, slug: true, category: true },
          },
          priest: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pujaBooking.count({ where }),
    ]);

    return reply.code(200).send({
      success: true,
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // ─── Orders route ────────────────────────────────────────────────────────────

  /**
   * GET /me/orders
   * Placeholder for e-commerce order history.
   */
  server.get('/me/orders', async (request, reply) => {
    const parseResult = paginationSchema.safeParse(request.query);
    const { page, limit } = parseResult.success ? parseResult.data : { page: 1, limit: 10 };

    // MedusaJS orders will be integrated here
    return reply.code(200).send({
      success: true,
      orders: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  });

  // ─── Subscription route ──────────────────────────────────────────────────────

  /**
   * GET /me/subscription
   * Returns the authenticated user's active subscription details.
   */
  server.get('/me/subscription', async (request, reply) => {
    const userId = request.currentUser!.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return reply.code(200).send({
        success: true,
        subscription: null,
        message: 'No active subscription. You are on the free tier.',
      });
    }

    return reply.code(200).send({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        price: subscription.price,
        currency: subscription.currency,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        autoRenew: subscription.autoRenew,
        createdAt: subscription.createdAt,
      },
    });
  });
}
