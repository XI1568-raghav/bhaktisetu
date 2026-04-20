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
