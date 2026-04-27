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

// Single-shot provider submission used by /auth/signup and the multi-step
// /onboarding/[role] page's "Submit for Approval" button. Bypasses the
// step machinery (start → step/1..N → submit) and instead atomically
// upserts the role assignment and the matching role-specific profile in
// one round trip. The profile is created with approved=false (schema
// default), so it surfaces in /admin/approvals immediately.
const providerSchema = z.object({
  role: z.enum(ONBOARDING_ROLES),
  data: z.record(z.unknown()),
});

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
  // overwrites the in-progress profile (still approved=false until admin
  // flips it via /admin/users/:id).

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

    // Demo users (id starts with `demo-`) are not real DB rows; skip the
    // write so we don't FK-violate the user_role_assignments.user_id ref.
    if (userId.startsWith('demo-')) {
      return reply.code(202).send({
        message: 'Demo session — profile not persisted. Sign up with a real email to submit for approval.',
        demoMode: true,
        role: parsed.data.role,
      });
    }

    try {
      const result = await onboardingService.upsertProviderProfile(
        userId,
        parsed.data.role,
        parsed.data.data,
      );
      return reply.send({
        message: 'Profile submitted for review.',
        profile: result,
        approved: false,
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

    if (userId.startsWith('demo-')) {
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
