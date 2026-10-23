import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import { onboardingService } from '../services/onboarding.service.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const ONBOARDING_ROLES = [
  'PANDIT', 'STORE_OWNER', 'ASTROLOGER',
  'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER',
] as const;

const startSchema = z.object({
  role: z.enum(ONBOARDING_ROLES),
});

const stepDataSchema = z.object({
  role: z.enum(ONBOARDING_ROLES),
  data: z.record(z.unknown()),
});

const submitSchema = z.object({
  role: z.enum(ONBOARDING_ROLES),
});

// Per-role data schemas. Prior version was z.record(z.unknown()) which let
// the service swallow missing required fields with silent defaults
// ("Unnamed", "Unnamed Gaushala", price 500) and dropped certifications
// from wellness profiles entirely. These schemas surface the gaps as 400s
// instead of writing junk rows that admins later have to clean up.
// The onboarding form sends `null` for fields the user left blank; treat null
// and '' the same as absent instead of failing the whole submission (the cause
// of the "Invalid request body. Required: { role, data }" on Submit for Approval).
const blankToUndefined = (v: unknown) => (v === null || v === '' ? undefined : v);
const optionalShortString = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const photoUrlSchema = z.preprocess(blankToUndefined, z.string().url().max(1000).optional());
const docKeySchema = z.preprocess(blankToUndefined, z.string().max(300).optional());

const stringArray = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems);

const panditDataSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  templeName: optionalShortString(200),
  experience: z.coerce.number().int().min(0).max(80),
  specialties: stringArray(20, 80).default([]),
  languages: stringArray(15, 40).default([]),
  bio: optionalShortString(2000),
  city: optionalShortString(80),
  state: optionalShortString(80),
  pricePerPuja: z.coerce.number().int().min(100, 'pricePerPuja must be at least ₹100').max(100000),
  photoUrl: photoUrlSchema,
  aadhaarDocKey: docKeySchema,
  certificateDocKey: docKeySchema,
});

const storeOwnerDataSchema = z.object({
  storeName: z.string().trim().min(2, 'storeName is required').max(200),
  gstNumber: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][Z][0-9A-Z]$/, 'Invalid GSTIN format')
      .optional(),
  ),
  address: optionalShortString(500),
  city: optionalShortString(80),
  state: optionalShortString(80),
  categories: stringArray(20, 80).default([]),
});

const astrologerDataSchema = z.object({
  displayName: z.string().trim().min(2, 'displayName is required').max(120),
  specialties: stringArray(20, 80).default([]),
  experience: z.coerce.number().int().min(0).max(80),
  languages: stringArray(15, 40).default([]),
  bio: optionalShortString(2000),
  pricePerMinute: z.coerce.number().int().min(1).max(10000),
  photoUrl: photoUrlSchema,
});

const wellnessDataSchema = z.object({
  displayName: z.string().trim().min(2, 'displayName is required').max(120),
  specialties: stringArray(20, 80).default([]),
  certifications: stringArray(20, 200).default([]),
  experience: z.coerce.number().int().min(0).max(80),
  bio: optionalShortString(2000),
  pricePerSession: z.coerce.number().int().min(100).max(100000),
  photoUrl: photoUrlSchema,
});

const gaushalaDataSchema = z.object({
  gaushalaName: z.string().trim().min(2, 'gaushalaName is required').max(200),
  address: optionalShortString(500),
  city: optionalShortString(80),
  totalCows: z.coerce.number().int().min(0).max(100000),
  description: optionalShortString(5000),
});

const templeDataSchema = z.object({
  templeName: z.string().trim().min(2, 'templeName is required').max(200),
  deity: optionalShortString(80),
  city: optionalShortString(80),
  state: optionalShortString(80),
  address: optionalShortString(500),
  description: optionalShortString(5000),
});

// Single-shot provider submission used by /auth/signup and the multi-step
// /onboarding/[role] page's "Submit for Approval" button. Bypasses the
// step machinery (start → step/1..N → submit) and instead atomically
// upserts the role assignment and the matching role-specific profile in
// one round trip. With REQUIRE_PROVIDER_APPROVAL unset the profile is activated
// on submit (onboardingService.activateOnSubmit); with it set the profile stays
// approved=false and surfaces in /admin/approvals.
const providerSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('PANDIT'), data: panditDataSchema }),
  z.object({ role: z.literal('STORE_OWNER'), data: storeOwnerDataSchema }),
  z.object({ role: z.literal('ASTROLOGER'), data: astrologerDataSchema }),
  z.object({ role: z.literal('WELLNESS_INSTRUCTOR'), data: wellnessDataSchema }),
  z.object({ role: z.literal('GAUSHALA_MANAGER'), data: gaushalaDataSchema }),
  z.object({ role: z.literal('TEMPLE_MANAGER'), data: templeDataSchema }),
]);

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function onboardingRoutes(server: FastifyInstance) {
  // All onboarding routes require authentication
  const authPreHandler = [authenticateUser];

  // ─── POST /start — Start onboarding for a role ─────────────────────────────

  server.post('/start', { preHandler: authPreHandler }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const parsed = startSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
        validRoles: ONBOARDING_ROLES,
      });
    }

    const userId = request.currentUser!.id;

    try {
      const progress = await onboardingService.startOnboarding(userId, parsed.data.role);
      const stepNames = onboardingService.getStepsForRole(parsed.data.role);

      return {
        message: `Onboarding started for ${parsed.data.role}`,
        progress,
        stepNames,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start onboarding';
      return reply.code(400).send({ error: message });
    }
  });

  // ─── GET /progress — Get current onboarding step ───────────────────────────

  server.get('/progress', { preHandler: authPreHandler }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { role } = request.query as { role?: string };

    const progress = await onboardingService.getProgress(userId, role);

    if (!progress) {
      return reply.code(404).send({
        error: 'No onboarding in progress. Call POST /onboarding/start first.',
      });
    }

    const stepNames = onboardingService.getStepsForRole(progress.role);
    return { progress, stepNames };
  });

  // ─── PATCH /step/:step — Complete a step with data ─────────────────────────

  server.patch('/step/:step', { preHandler: authPreHandler }, async (request, reply) => {
    const { step } = request.params as { step: string };
    const stepNum = Number(step);

    if (isNaN(stepNum) || stepNum < 1) {
      return reply.code(400).send({ error: 'Step must be a positive integer' });
    }

    const body = request.body as Record<string, unknown>;
    const parsed = stepDataSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body. Required: { role: string, data: object }',
        details: parsed.error.flatten(),
      });
    }

    const userId = request.currentUser!.id;

    try {
      const progress = await onboardingService.completeStep(
        userId,
        parsed.data.role,
        stepNum,
        parsed.data.data
      );

      return {
        message: `Step ${stepNum} completed`,
        progress,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete step';
      return reply.code(400).send({ error: message });
    }
  });

  // ─── POST /provider — One-shot provider profile creation ──────────────────
  //
  // Skips the start/step/submit dance. Used by /auth/signup right after
  // the user account exists, and by the consolidated /onboarding/[role]
  // form on its final "Submit for Approval" click. Idempotent: re-posting
  // overwrites the in-progress profile. With approval off, re-posting also
  // re-activates it; to remove a provider for good an admin blocks the user.

  server.post('/provider', { preHandler: authPreHandler }, async (request, reply) => {
    const parsed = providerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body. Required: { role, data }',
        details: parsed.error.flatten(),
        validRoles: ONBOARDING_ROLES,
      });
    }

    const userId = request.currentUser!.id;

    // Refuse to persist provider profiles for any demo session.
    //
    // Two cases the middleware can hand us:
    //   (a) userId itself starts with "demo-" — pre-DB-seed fallback id.
    //   (b) auth middleware mapped a "demo-..." access token to a real
    //       seeded demo user (e.g. devotee@demo.com), giving us a real
    //       UUID. Without this guard a smoke-test signup that demo-mode
    //       fell through to would write a pandit_profiles row attached
    //       to the devotee demo user — contaminating /admin/approvals.
    //
    // The access-token check covers (b); the id-prefix check covers (a).
    const authHeader = request.headers.authorization ?? '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    const isDemoSession = userId.startsWith('demo-') || accessToken.startsWith('demo-');

    if (isDemoSession) {
      return reply.code(202).send({
        message: 'Demo session — profile not persisted. Sign up with a real email to submit for approval.',
        demoMode: true,
        role: parsed.data.role,
      });
    }

    // Uploaded identity documents must be the caller's own private objects.
    const pd = parsed.data.data as { aadhaarDocKey?: string; certificateDocKey?: string };
    const ownPrefix = `kyc-document/${userId.replace(/[^a-z0-9-]/gi, '')}/`;
    for (const k of [pd.aadhaarDocKey, pd.certificateDocKey]) {
      if (k && !k.startsWith(ownPrefix)) {
        return reply.code(400).send({ error: 'Invalid document reference. Please upload the file again.' });
      }
    }

    try {
      const result = await onboardingService.upsertProviderProfile(
        userId,
        parsed.data.role,
        parsed.data.data,
      );
      const approved = result.approved === true;
      return reply.send({
        message: approved
          ? 'Your profile is live and your portal is ready.'
          : result.message ?? 'Profile submitted for review.',
        profile: result,
        approved,
        ...(result.reason ? { reason: result.reason } : {}),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit profile';
      request.log.error({ err, userId, role: parsed.data.role }, 'onboarding.provider failed');
      return reply.code(400).send({ error: message });
    }
  });

  // ─── GET /provider — Fetch current provider profile (for edit form) ────────

  server.get('/provider', { preHandler: authPreHandler }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { role } = request.query as { role?: string };

    if (!role || !ONBOARDING_ROLES.includes(role as typeof ONBOARDING_ROLES[number])) {
      return reply.code(400).send({
        error: 'role query param required',
        validRoles: ONBOARDING_ROLES,
      });
    }

    const authHeader = request.headers.authorization ?? '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (userId.startsWith('demo-') || accessToken.startsWith('demo-')) {
      return reply.send({ profile: null, demoMode: true });
    }

    try {
      const profile = await onboardingService.getProviderProfile(
        userId,
        role as typeof ONBOARDING_ROLES[number],
      );
      return reply.send({ profile });
    } catch (err) {
      request.log.error({ err, userId, role }, 'onboarding.getProvider failed');
      return reply.send({ profile: null });
    }
  });

  // ─── POST /submit — Submit for approval ────────────────────────────────────

  server.post('/submit', { preHandler: authPreHandler }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const userId = request.currentUser!.id;

    try {
      const result = await onboardingService.submitForApproval(userId, parsed.data.role);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit for approval';
      return reply.code(400).send({ error: message });
    }
  });
}
