import { FastifyInstance } from 'fastify';
import { gaushalaService } from '../services/gaushala.service.js';
import { prisma } from '../lib/prisma.js';

export async function gaushalaRoutes(server: FastifyInstance) {
  // ─── GET / — List all gaushalas ────────────────────────────────────────────────

  server.get('/', async (request, reply) => {
    const gaushalas = gaushalaService.getGaushalas();
    return { gaushalas };
  });

  // ─── GET /:id — Gaushala detail with cows ──────────────────────────────────────

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gaushala = gaushalaService.getGaushalaById(id);

    if (gaushala) {
      return { gaushala: { ...gaushala, source: 'fixture', donationCauseId: id } };
    }

    // COM-07: the /gaushala page's "Approved gaushalas you can support
    // directly" strip links every real DB profile to /gaushala/<uuid>, and
    // every one of those 404'd because only the gs_00x fixtures resolved here.
    // Resolve real, APPROVED profiles by profile id or owner id, and hand back
    // the donation cause id so the detail page's donate CTA reaches the right
    // donee (see lib/gaushala-donee.ts).
    const profile = await prisma.gaushalaProfile.findFirst({
      where: { approved: true, OR: [{ id }, { userId: id }] },
    });
    if (!profile) {
      return reply.code(404).send({ error: 'Gaushala not found.' });
    }

    return {
      gaushala: {
        id: profile.id,
        name: profile.gaushalaName,
        location: profile.city ?? '',
        state: '',
        description: profile.description ?? '',
        address: profile.address ?? '',
        totalCows: profile.totalCows,
        verified: profile.verified,
        // No fixture cows are grafted onto a real gaushala — an empty roster
        // means this gaushala has not listed cows yet, and the page must say so.
        cows: [],
        availableCows: 0,
        cowsListed: 0,
        source: 'profile',
        donationCauseId: profile.userId,
      },
    };
  });

  // ─── GET /cows — List cows (filterable) ────────────────────────────────────────

  server.get('/cows', async (request, reply) => {
    const { gaushalaId, available } = request.query as {
      gaushalaId?: string;
      available?: string;
    };

    const isAvailable = available !== undefined
      ? available === 'true'
      : undefined;

    const cows = gaushalaService.getCows(gaushalaId, isAvailable);
    return { cows, total: cows.length };
  });

  // ─── GET /cows/:id — Cow detail with monthly updates ──────────────────────────

  server.get('/cows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cow = gaushalaService.getCowById(id);

    if (!cow) {
      return reply.code(404).send({ error: 'Cow not found.' });
    }

    return { cow };
  });

  // ─── GET /plans — Adoption tiers ───────────────────────────────────────────────

  server.get('/plans', async (request, reply) => {
    const plans = gaushalaService.getAdoptionPlans();
    return { plans };
  });

  // COM-19 (prod sweep 2026-08-12): three routes used to live here — a POST
  // that claimed a cow, plus the two reads that listed what it claimed. The
  // POST charged nothing, persisted nothing, and wrote `isAdopted = true` onto
  // a module-level fixture array, so one signed-in caller could walk all eight
  // cows off the shelf for zero rupees and every other visitor of that process
  // then saw "0 available" until the dyno restarted. It also told the caller
  // they would receive monthly updates, which nothing was ever going to send.
  //
  // Since #230 the real path is /donations with a planId prefill — Razorpay,
  // a persisted Donation row and a receipt — and apps/web stopped calling
  // these, so they were orphaned as well as unsafe. They are removed rather
  // than guarded: a paid rail already exists, and a second free one beside it
  // is the whole risk. Restore only on top of a completed donation, persisted.
}
