import { FastifyInstance } from 'fastify';
import { gaushalaService } from '../services/gaushala.service.js';
import { prisma } from '../lib/prisma.js';
import { gaushalaQuality } from '../lib/cause-quality.js';

// CT-API-1 (prod probe 2026-09-09): `GET /api/v1/gaushala/<id>` answered 500 for
// every id that is not shaped like a uuid — `not-a-uuid`, `123`, `__ct_zzz`,
// `abc-def` all measured against api.darshya.online — while the well-formed but
// absent `00000000-0000-4000-8000-000000000000` correctly answered 404. So the
// split was the id FORMAT, not existence: `GaushalaProfile.id` and `.userId` are
// both `@db.Uuid`, the findFirst below raised P2023, and the error handler
// published it as INTERNAL_ERROR. A crawler following a stale or mangled link
// got a server error where the resource simply is not there.
// Same regex as routes/priests-public.ts:42 and lib/gaushala-donee.ts:27.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // CT-API-1: the guard sits BELOW the fixture lookup, not in front of the
    // handler. The directory serves gs_001…gs_005, which are not uuids and must
    // keep resolving; matching them by identity above rather than by a guessed
    // id shape means no future fixture id can be 404'd here. What remains is an
    // id that is neither a fixture nor parseable as a uuid, and it cannot match
    // a uuid column — a miss decided before the query runs, not a P2023.
    if (!UUID_RE.test(id)) {
      return reply.code(404).send({ error: 'Gaushala not found.' });
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
    // An approved-but-junk profile is hidden like an unapproved one.
    if (!profile || !gaushalaQuality(profile).ok) {
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
        // TC-11: `verified` used to be echoed here. `GaushalaProfile.verified`
        // is written by NOTHING — every approval path in the API sets
        // `approved` (gaushala-portal.ts:152/:163, admin.service.ts:694/:748,
        // onboarding.service.ts:302, auth.ts:1279, gaushala-cows.ts:35) — so
        // the field could only ever be false, and a client reading it was
        // reading a verification signal the product cannot produce.
        //
        // Reporting `verified: false` on a gaushala an admin HAS approved is
        // worse than silence: it reads as "we checked and it failed". So the
        // field is dropped and the flag that is really written is published in
        // its place. The column itself is left on the model rather than
        // dropped — a destructive migration auto-applies on API boot here, and
        // an unused nullable-by-default boolean costs nothing to keep.
        approved: profile.approved,
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
