import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import { requireCronSecretHeader } from '../middlewares/cron-auth.js';
import { astrologyService } from '../services/astrology.service.js';
import {
  generateKundli,
  getDailyHoroscope,
  prewarmDailyHoroscopes,
  KundliInputSchema,
  HoroscopeQuerySchema,
  SIGNS,
} from '../lib/astrology.js';
import { prisma } from '../lib/prisma.js';
import { requireProviderApproval } from '../lib/provider-approval.js';
import { getAstrologerPresence } from '../services/astrologer.service.js';
import { publicAvailability } from '../lib/astrologer-availability.js';

// Pagination clamp shared across astrologer list + reviews. Without an
// upper bound, anyone hitting GET /astrologers?limit=99999 forces a full
// in-memory scrape — worse, public unauthenticated, so it's a free DoS.
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// A real AstrologerProfile.id. Anything else is a legacy in-memory fixture slug
// ('astro_001'..) — see the AW-02 note on GET /astrologers/:id.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const astrologerListQuerySchema = paginationSchema.extend({
  specialization: z.string().optional(),
  language: z.string().optional(),
  priceRange: z.string().optional(),
  online: z.string().optional(),
  sort: z.enum(['rating', 'price', 'experience']).optional(),
});

/**
 * The public shape of one astrologer. Built ONLY from an approved
 * `AstrologerProfile` row plus the in-memory presence toggle — every field here
 * is something a real person entered about themselves.
 */
interface PublicAstrologer {
  id: string;
  userId: string;
  name: string;
  specializations: string[];
  languages: string[];
  experienceYears: number;
  rating: number;
  consultationCount: number;
  perMinuteRate: number;
  isOnline: boolean;
  mode: ReturnType<typeof getAstrologerPresence>['mode'];
  bio: string | null;
  verified: boolean;
}

/**
 * AW-02 (P0). The single reader of real astrologer supply.
 *
 * Both consumer directory endpoints (`GET /astrologers` and
 * `GET /astrologers/live`) go through this, so they can never again disagree
 * about who exists — which is exactly what went wrong: `/astrologers/live`
 * served the 3 approved profiles while `/astrologers` served a 15-row invented
 * fixture, and the Expo app reads the latter.
 *
 * `take: 100` matches the pagination clamp above; the directory is far smaller
 * than that today and a bound keeps this public, unauthenticated route cheap.
 */
/**
 * AW-02: presentation-only icon hints for specialization names. A name absent
 * here still renders (falls back to 'star') — this map must never decide which
 * specializations EXIST; only approved profiles do that.
 */
const SPECIALIZATION_ICONS: Record<string, string> = {
  'Vedic Astrology': 'star',
  'Tarot Reading': 'cards',
  Numerology: 'hash',
  Palmistry: 'hand',
  Vastu: 'home',
  'KP Astrology': 'compass',
  'Prashna Kundli': 'help-circle',
  'Nadi Astrology': 'scroll',
};

/**
 * `verified` is a claim that somebody reviewed the astrologer. With approval off
 * `approved` only means "live", so it may not be reported as verified (TC-08).
 */
function adminReviewed(approved: boolean): boolean {
  return requireProviderApproval() && approved;
}

async function loadApprovedAstrologers(): Promise<PublicAstrologer[]> {
  const profiles = await prisma.astrologerProfile.findMany({
    where: { approved: true },
    orderBy: [{ rating: 'desc' }, { totalConsultations: 'desc' }],
    take: 100,
  });
  return profiles.map((p) => {
    const presence = getAstrologerPresence(p.userId);
    return {
      id: p.id,
      userId: p.userId,
      name: p.displayName,
      specializations: p.specialties ?? [],
      languages: p.languages ?? [],
      experienceYears: p.experience,
      rating: p.rating,
      consultationCount: p.totalConsultations,
      perMinuteRate: Number(p.pricePerMinute),
      isOnline: presence.online,
      mode: presence.mode,
      bio: p.bio,
      verified: adminReviewed(p.approved),
    };
  });
}

function filterAstrologers(
  rows: PublicAstrologer[],
  f: { language?: string; specialization?: string; online?: string },
): PublicAstrologer[] {
  let out = rows;
  if (f.language) {
    const want = f.language.toLowerCase();
    out = out.filter((a) => a.languages.some((l) => l.toLowerCase() === want));
  }
  if (f.specialization) {
    const want = f.specialization.toLowerCase();
    out = out.filter((a) => a.specializations.some((s) => s.toLowerCase() === want));
  }
  if (f.online === 'true') out = out.filter((a) => a.isOnline);
  return out;
}

export async function astrologyRoutes(server: FastifyInstance) {
  // ─── GET /astrologers ──────────────────────────────────────────────────────
  // The consumer astrologer directory, paginated.
  //
  // AW-02 (P0): this served `astrologyService.getAstrologers()` — the 15-row
  // in-memory fixture ('astro_001'..'astro_015') of invented people with
  // invented ratings, review counts and ₹/min rates. `?online=true` answered
  // "12 online", none of whom exist. The earlier pass closed the web funnel,
  // the profile page, the reviews route and the booking route, and left this
  // one open on the grounds that `packages/api-client`'s `useAstrologers` reads
  // it — but that hook is the Expo app's ONLY astrologer source:
  // apps/mobile/app/(devotee)/astrology.tsx prints "{total} astrologers online"
  // from it, and apps/mobile/app/(astrologer)/profile.tsx looks the SIGNED-IN
  // astrologer up inside it, so a real onboarded astrologer never finds
  // themselves. Being read is the reason to fix it, not the reason to leave it.
  //
  // It now reads the same approved `AstrologerProfile` rows `/astrologers/live`
  // serves. With this door rebound the fixture had no readers left, and it has
  // since been deleted outright — see the deletion note in
  // services/astrology.service.ts.
  server.get('/astrologers', async (request, reply) => {
    const parsed = astrologerListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const { specialization, language, priceRange, online, sort, page, limit } = parsed.data;

    let rows = filterAstrologers(await loadApprovedAstrologers(), {
      specialization,
      language,
      online,
    });

    if (priceRange) {
      const [minStr, maxStr] = priceRange.split('-');
      const min = Number(minStr) || 0;
      const max = Number(maxStr) || Infinity;
      rows = rows.filter((a) => a.perMinuteRate >= min && a.perMinuteRate <= max);
    }

    switch (sort) {
      case 'rating':
        rows.sort((a, b) => b.rating - a.rating);
        break;
      case 'price':
        rows.sort((a, b) => a.perMinuteRate - b.perMinuteRate);
        break;
      case 'experience':
        rows.sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      default:
        // Online-first, then rating — same ordering as /astrologers/live.
        rows.sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || b.rating - a.rating);
    }

    const pageNum = page ?? 1;
    const pageSize = limit ?? 15;
    const start = (pageNum - 1) * pageSize;

    return {
      astrologers: rows.slice(start, start + pageSize),
      total: rows.length,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(rows.length / pageSize),
      source: 'live',
    };
  });

  // ─── GET /astrologers/:id ──────────────────────────────────────────────────
  // Get astrologer detail with reviews

  server.get('/astrologers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // A UUID means the caller is pointing at a REAL onboarded AstrologerProfile
    // (sourced from /astrologers/live). Resolve it against the DB so the detail
    // page + booking flow serve the real astrologer.
    if (UUID_RE.test(id)) {
      const p = await prisma.astrologerProfile.findUnique({ where: { id } });
      if (!p || !p.approved) {
        return reply.code(404).send({ error: 'Astrologer not found.' });
      }
      const presence = getAstrologerPresence(p.userId);
      return {
        astrologer: {
          id: p.id,
          userId: p.userId,
          name: p.displayName,
          specializations: p.specialties,
          languages: p.languages,
          experienceYears: p.experience,
          rating: p.rating,
          consultationCount: p.totalConsultations,
          perMinuteRate: Number(p.pricePerMinute),
          isOnline: presence.online,
          mode: presence.mode,
          bio: p.bio,
          verified: adminReviewed(p.approved),
          // The hours the astrologer set in the portal (IST), so the booking page
          // can show them and POST /consultation/book can enforce them. null =
          // no schedule on file = any time may be requested.
          availability: publicAvailability(p.availability),
          source: 'live',
        },
      };
    }
    // AW-02 (2026-08-12, P0): this used to fall through to
    // astrologyService.getAstrologerByIdOrSlug(), the 15-row in-memory
    // directory of invented astrologers. That made every fixture slug a
    // describable person: /astrology/view?id=astro_001 rendered "Pt. Raghunath
    // Sharma" as a profile and /astrology/astro_001/book drew a live pay
    // button over him. POST /consultation/book already refuses any id that is
    // not an approved AstrologerProfile — an id the platform will not sell is
    // an id it must not describe either. The in-memory directory has since been
    // deleted; a slug now resolves to nothing anywhere in the service.
    return reply.code(404).send({ error: 'Astrologer not found.' });
  });

  // ─── GET /astrologers/:id/reviews ──────────────────────────────────────────
  // Paginated reviews for an astrologer

  server.get('/astrologers/:id/reviews', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const { page, limit } = parsed.data;

    // AW-02: the same door, one step narrower. This served REVIEWS[slug] — five
    // named testimonials per fixture astrologer, all invented. A slug is not a
    // person here any more, so it has no reviews to show; say 404, matching the
    // detail route above.
    if (!UUID_RE.test(id)) {
      return reply.code(404).send({ error: 'Astrologer not found.' });
    }
    // Real astrologers have no review store yet — there is no astrologer review
    // table, and the generated fixture testimonials that used to fill this page
    // are deleted. An empty page is the truthful answer.
    return { reviews: [], total: 0, page: page ?? 1, limit: limit ?? 5, totalPages: 0 };
  });

  // ─── GET /specializations ──────────────────────────────────────────────────
  // List all specializations with counts

  server.get('/specializations', async (request, reply) => {
    // AW-02: this used to return counts hardcoded from the 15-row fixture —
    // Vedic Astrology 11, Tarot 4, Numerology 5, Palmistry 3, Vastu 5, KP 4,
    // Prashna 4, Nadi 4. Forty specialization slots across fifteen people who do
    // not exist, on a public unauthenticated endpoint, while real supply was
    // three profiles. It sold nothing (no client renders it), but a public
    // endpoint STATING fictional supply is one integration away from a UI, and
    // it was the last reader keeping the fixture array alive — rebinding it is
    // what made the fixture deletable.
    //
    // Same reader as /astrologers and /astrologers/live, so the directory and
    // its facet counts cannot disagree about who exists.
    const astrologers = await loadApprovedAstrologers();
    const counts = new Map<string, number>();
    for (const a of astrologers) {
      for (const raw of a.specializations ?? []) {
        const name = typeof raw === 'string' ? raw.trim() : '';
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    const specializations = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, icon: SPECIALIZATION_ICONS[name] ?? 'star' }))
      // Densest real supply first; name as a stable tiebreak so the order does
      // not wobble between requests.
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return { specializations };
  });

  // ─── GET /astrologers/live ─── REAL onboarded astrologers (cross-cutting P2)
  // The /astrologers directory reads a 15-row in-memory mock fixture; genuinely
  // onboarded astrologers (AstrologerProfile, approved) never surface in the
  // devotee funnel. This endpoint serves the REAL directory — approved profiles
  // with a live online badge fed by the go-online presence toggle. Phase 2 of
  // the full directory swap (booking binding) is tracked in the plan doc.
  server.get('/astrologers/live', async (request, reply) => {
    const { language, specialization, online } = request.query as {
      language?: string;
      specialization?: string;
      online?: string;
    };
    // AW-02: shares `loadApprovedAstrologers` with GET /astrologers so the two
    // directories cannot state different supply for the same moment.
    const rows = filterAstrologers(await loadApprovedAstrologers(), {
      language,
      specialization,
      online,
    });
    // Online-first ordering.
    rows.sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || b.rating - a.rating);
    return { astrologers: rows, total: rows.length, source: 'live' };
  });

  // ─── POST /consult/start ───────────────────────────────────────────────────
  // Start a consultation session (auth required)

  server.post(
    '/consult/start',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const { astrologerId, mode } = request.body as {
        astrologerId: string;
        mode: 'chat' | 'call' | 'video';
      };

      if (!astrologerId) {
        return reply.code(400).send({ error: 'astrologerId is required.' });
      }

      if (!mode || !['chat', 'call', 'video'].includes(mode)) {
        return reply
          .code(400)
          .send({ error: 'mode must be one of: chat, call, video.' });
      }

      // AW-02 (P0): the last endpoint that would still open a consultation
      // against an invented person. `astrologyService.startConsultation` looks
      // the id up in the 15-row fixture, so POSTing `astro_001` answered 200
      // with `astrologerName: "Pt. Raghunath Sharma"`, a per-minute rate and
      // `freeMinutes: 5` — a session the platform cannot staff. Same door, same
      // rule as POST /consultation/book (routes/consultation.ts:257-269): the
      // only startable astrologer is an approved AstrologerProfile.
      const looksLikeProfileId = UUID_RE.test(astrologerId);
      const approved = looksLikeProfileId
        ? await prisma.astrologerProfile.findUnique({ where: { id: astrologerId } })
        : null;
      if (!approved?.approved) {
        request.log.warn(
          { astrologerId, userId },
          '[astrology] refused consult/start against a non-onboarded astrologer id',
        );
        return reply.code(409).send({
          code: 'ASTROLOGER_NOT_BOOKABLE',
          error:
            'This astrologer is not available for consultation. Browse approved astrologers at /astrology/astrologers/live.',
        });
      }

      // AW-02 (P0), the other half of the same door. Closing it against the
      // invented 15 left it closed against the real 3 as well:
      // `startConsultation` resolved ids ONLY against the in-memory fixture
      // (`astro_001`..`astro_015`), and the gate above admits nothing but an
      // approved AstrologerProfile UUID — which that fixture can never contain.
      // Every genuinely onboarded astrologer came back 400 'Astrologer not
      // found.'. Refusing to sell someone who does not exist is only half the
      // fix; the people who DO exist have to be sellable.
      //
      // The real profile is merged in AHEAD of the fixture (the fixture stays
      // as the fallback branch and is not deleted — it still backs
      // GET /specializations and getReviews).
      const presence = getAstrologerPresence(approved.userId);
      if (!presence.online) {
        // Distinct from ASTROLOGER_NOT_BOOKABLE on purpose: this astrologer is
        // real and approved, they are simply not at their desk. Saying "not
        // found" about a person who exists sends the devotee away for good.
        return reply.code(409).send({
          code: 'ASTROLOGER_OFFLINE',
          error: `${approved.displayName} is not online right now. Book a slot instead, or see who is online at /astrology/astrologers/live.`,
        });
      }

      const result = astrologyService.startConsultation(userId, astrologerId, mode, {
        id: approved.id,
        userId: approved.userId,
        name: approved.displayName,
        specializations: approved.specialties ?? [],
        perMinuteRate: Number(approved.pricePerMinute),
        isOnline: presence.online,
        // AstrologerProfile carries no busy signal; presence is the only
        // availability fact we have, and it is not invented here.
        isBusy: false,
      });

      if ('error' in result) {
        return reply.code(400).send({ error: result.error });
      }

      return { session: result };
    }
  );

  // ─── POST /kundli ──────────────────────────────────────────────────────────
  // Legacy shape used by existing web UI. Kept for backward compatibility.

  server.post('/kundli', async (request, reply) => {
    const body = request.body as {
      birthDate?: string;
      birthTime?: string;
      birthPlace?: string;
      name?: string;
      // New shape (Zod-validated path).
      dob?: string;
      tob?: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };

    // If caller used the v2 shape (dob/tob/location|lat/lng), route to the new lib.
    if (body.dob && body.tob && (body.location || (body.latitude !== undefined && body.longitude !== undefined))) {
      const parsed = KundliInputSchema.safeParse(body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid kundli input.' });
      }
      const result = await generateKundli(parsed.data);
      // Best-effort analytics — never block on this.
      void prisma.kundliRequest
        .create({
          data: {
            userId: request.currentUser?.id ?? null,
            dob: new Date(parsed.data.dob),
            tob: parsed.data.tob,
            location: parsed.data.location ?? `${parsed.data.latitude},${parsed.data.longitude}`,
            signature: result.signature,
          },
        })
        .catch(() => undefined);
      return { kundli: result };
    }

    if (!body.birthDate || !body.birthTime || !body.birthPlace) {
      return reply
        .code(400)
        .send({ error: 'Provide either {dob, tob, location} or {birthDate, birthTime, birthPlace}.' });
    }

    const kundli = await astrologyService.getKundliAsync(body.birthDate, body.birthTime, body.birthPlace, body.name);
    return { kundli };
  });

  // ─── GET /horoscope/daily ──────────────────────────────────────────────────
  // 24h-cached daily horoscope per sun sign. Pre-warmed by master-cron.

  server.get('/horoscope/daily', async (request, reply) => {
    const parsed = HoroscopeQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: parsed.error.errors[0]?.message ?? 'Invalid query.',
        validSigns: SIGNS,
      });
    }
    try {
      const horoscope = await getDailyHoroscope(parsed.data);
      return { horoscope };
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed to load horoscope.' });
    }
  });

  // ─── POST /horoscope/prewarm ───────────────────────────────────────────────
  // Cron-only endpoint. Token-gated via CRON_SECRET to prevent abuse.
  // P0 #PUB-04 (2026-07-09): gated through requireCronSecretHeader —
  // constant-time compare + default-deny when CRON_SECRET is unset (the old
  // inline check used `!==` (timing oracle) AND skipped auth when unset).

  server.post('/horoscope/prewarm', { preHandler: [requireCronSecretHeader] }, async () => {
    const result = await prewarmDailyHoroscopes();
    return { prewarmed: result };
  });

  // ─── GET /horoscope/all ────────────────────────────────────────────────────
  // All 12 rashis summary (must be before :rashi param route)

  server.get('/horoscope/all', async (request, reply) => {
    const horoscopes = astrologyService.getAllHoroscopes();
    return { horoscopes };
  });

  // ─── GET /horoscope/:rashi ─────────────────────────────────────────────────
  // Daily horoscope for a specific rashi

  server.get('/horoscope/:rashi', async (request, reply) => {
    const { rashi } = request.params as { rashi: string };
    const horoscope = astrologyService.getDailyHoroscope(rashi);

    if (!horoscope) {
      return reply.code(404).send({ error: 'Rashi not found. Use English name (e.g., aries, taurus).' });
    }

    return { horoscope };
  });

  // ─── GET /compatibility ────────────────────────────────────────────────────
  // Compatibility check between two rashis

  server.get('/compatibility', async (request, reply) => {
    const { rashi1, rashi2 } = request.query as {
      rashi1?: string;
      rashi2?: string;
    };

    if (!rashi1 || !rashi2) {
      return reply
        .code(400)
        .send({ error: 'Both rashi1 and rashi2 query parameters are required.' });
    }

    const result = astrologyService.getCompatibility(rashi1, rashi2);

    if (!result) {
      return reply
        .code(404)
        .send({ error: 'One or both rashis not found. Use English names (e.g., aries, taurus).' });
    }

    return { compatibility: result };
  });

  // ─── POST /ask ─────────────────────────────────────────────────────────────
  // AI Astrologer chat — answers astrology questions

  server.post('/ask', async (request, reply) => {
    const { message, birthDetails } = request.body as {
      message?: string;
      birthDetails?: {
        name?: string;
        date?: string;
        time?: string;
        place?: string;
      };
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return reply.code(400).send({ error: 'message is required.' });
    }

    if (message.length > 2000) {
      return reply.code(400).send({ error: 'Message too long. Maximum 2000 characters.' });
    }

    try {
      const result = await astrologyService.askAstrologer(message.trim(), birthDetails);
      return result;
    } catch (error: any) {
      server.log.error(error, 'AI Astrologer error');
      const fallback = astrologyService.getAstrologerFallback(message.trim());
      return {
        response: fallback.text,
        source: fallback.matched ? 'fallback-keyword' : 'fallback-default',
      };
    }
  });

  // ─── Consultation list / patch / start-call ──────────────────────

  server.get('/consultations', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const role = (request.query as { role?: string }).role ?? 'astrologer';
    const consultations = await astrologyService.listConsultations({ userId, role });
    return { consultations };
  });

  server.patch('/consultations/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ status: z.enum(['COMPLETED', 'CANCELLED']) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid' });
    const me = request.currentUser!;
    try {
      const updated = await astrologyService.updateConsultation(id, parsed.data.status, {
        userId: me.id,
        isAdmin: me.roles.includes('ADMIN'),
      });
      return { consultation: updated };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Not found';
      if (msg.includes('Not authorized')) return reply.code(403).send({ error: msg });
      return reply.code(404).send({ error: msg });
    }
  });

  server.post('/consultations/:id/start-call', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const me = request.currentUser!;
    try {
      const result = await astrologyService.startCall(id, {
        userId: me.id,
        isAdmin: me.roles.includes('ADMIN'),
      });
      return { roomUrl: result.roomUrl };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Not found';
      if (msg.includes('Not authorized')) return reply.code(403).send({ error: msg });
      return reply.code(404).send({ error: msg });
    }
  });
}
