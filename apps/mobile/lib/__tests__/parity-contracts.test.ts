/**
 * app-web-parity P1 regression suite (PAR-08 .. PAR-19).
 *
 * Every assertion below is pinned to a VERBATIM response captured from the
 * running API on 2026-08-13 (fixtures/live-api-2026-08-13.json). The class of
 * bug these guard against is always the same one: a screen reads an envelope
 * key the server has never sent, TypeScript agrees because the hook declares a
 * fabricated interface, and the screen then renders either zero rows, a
 * confident zero, or — worst — a hardcoded mock that looks like real inventory.
 *
 * Two rules every selector here obeys:
 *   1. Read the key the server actually sends.
 *   2. An unrecognised shape yields empty/null, never invented data.
 */

import { describe, it, expect } from 'vitest';
import fixtures from './fixtures/live-api-2026-08-13.json';
import {
  selectPanchang,
  selectTemplePortalDashboard,
  selectTemplePortalOfferings,
  selectTemplePortalStreams,
  selectWellnessSessions,
  buildWellnessSessionInput,
  WellnessSessionInputError,
  selectPriestProfile,
  selectPortalCows,
  selectAstrologerDashboard,
  selectStoreProducts,
  selectCart,
  buildYatraInquiry,
  YatraInquiryError,
} from '../api-contracts';
import { describePlatformFlagSupport } from '../platform-flags';

// ─── PAR-08: home-screen panchang ────────────────────────────────────────────

describe('PAR-08 selectPanchang', () => {
  const body = fixtures.panchangToday.body;

  it('reads the FLAT payload — there is no `data` wrapper', () => {
    const p = selectPanchang(body);
    expect(p).not.toBeNull();
    expect(p!.tithi).toBe('Amavasya');
    expect(p!.nakshatra).toBe('Ashlesha');
    expect(p!.sunrise).toBe('05:45');
    expect(p!.sunset).toBe('18:55');
  });

  it('reads `rahuKaal`, not `rahukaal`', () => {
    expect(Object.keys(body)).toContain('rahuKaal');
    expect(Object.keys(body)).not.toContain('rahukaal');
    expect(selectPanchang(body)!.rahuKaal).toBe('12:20 - 13:58');
  });

  it('flattens the shubhMuhurat OBJECT into renderable label/window strings', () => {
    // The screen rendered `{panchang.shubhMuhurat}` straight into <Text>.
    // shubhMuhurat is an object, and React throws
    // "Objects are not valid as a React child" for that — the home screen
    // crashes the moment a real panchang row arrives.
    expect(typeof body.shubhMuhurat).toBe('object');
    const muhurats = selectPanchang(body)!.muhurats;
    expect(muhurats).toHaveLength(3);
    for (const m of muhurats) {
      expect(typeof m.label).toBe('string');
      expect(typeof m.window).toBe('string');
      expect(m.window.length).toBeGreaterThan(0);
    }
    expect(muhurats.map((m) => m.label)).toContain('Abhijit Muhurat');
  });

  it('returns null for an error body instead of a fabricated day', () => {
    expect(selectPanchang({ statusCode: 500, error: 'Internal Server Error' })).toBeNull();
    expect(selectPanchang(undefined)).toBeNull();
    expect(selectPanchang({ data: { tithi: 'Dwadashi' } })).toBeNull();
  });
});

// ─── PAR-09: temple manager portal ───────────────────────────────────────────

describe('PAR-09 temple portal selectors', () => {
  it('dashboard reads stats off the SCOPED /temple-portal/dashboard payload', () => {
    const vm = selectTemplePortalDashboard(fixtures.templePortalDashboard.body);
    expect(vm).not.toBeNull();
    expect(vm!.stats.totalBookings).toBe(0);
    expect(vm!.stats.totalStreams).toBe(0);
    // profile is null for a manager with no linked temple — say so, do not
    // borrow the public catalogue's 20 temples and call them "yours".
    expect(vm!.templeName).toBeNull();
    expect(vm!.hasTemple).toBe(false);
  });

  it('offerings read `offerings`, and resolve puja names from the catalogue', () => {
    expect(Object.keys(fixtures.templePortalPujas.body)).toEqual(['offerings']);
    expect(selectTemplePortalOfferings(fixtures.templePortalPujas.body, [])).toEqual([]);

    const withRow = {
      offerings: [
        {
          id: 'off_1',
          templeId: 't1',
          pujaTypeId: 'pt_1',
          priceOverride: '2500',
          nriPrice: null,
          assignedPriestId: null,
          availableSlots: ['08:00'],
          maxBookingsPerSlot: 3,
          isActive: true,
        },
      ],
    };
    const rows = selectTemplePortalOfferings(withRow, [
      {
        id: 'pt_1',
        slug: 'rudrabhishek',
        name: 'Rudrabhishek',
        durationMinutes: 60,
        priceInr: 1100,
        nriPriceInr: 9900,
        samagriIncluded: true,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Rudrabhishek');
    // priceOverride wins over the catalogue base price, and arrives as a
    // Decimal STRING.
    expect(rows[0]!.priceInr).toBe(2500);
    expect(rows[0]!.isActive).toBe(true);
  });

  it('offerings fall back to the puja id, never to an invented name', () => {
    const rows = selectTemplePortalOfferings(
      { offerings: [{ id: 'o1', pujaTypeId: 'unknown-id', isActive: false }] },
      [],
    );
    expect(rows[0]!.name).toBe('Puja unknown-id');
    expect(rows[0]!.priceInr).toBeNull();
  });

  it('streams read `streams` off /temple-portal/darshan (a scoped route)', () => {
    expect(Object.keys(fixtures.templePortalDarshan.body)).toEqual(['streams']);
    expect(selectTemplePortalStreams(fixtures.templePortalDarshan.body)).toEqual([]);
    const rows = selectTemplePortalStreams({
      streams: [
        {
          id: 's1',
          templeId: 't1',
          title: 'Mangala Aarti',
          status: 'live',
          playbackUrl: 'https://example.test/a.m3u8',
          viewerCount: 12,
          scheduledStart: null,
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.isLive).toBe(true);
    expect(rows[0]!.viewerCount).toBe(12);
  });
});

// ─── PAR-10: wellness sessions ───────────────────────────────────────────────

describe('PAR-10 selectWellnessSessions', () => {
  const body = fixtures.wellnessSessions.body;

  it('reads `data` — the endpoint has never returned `sessions`', () => {
    expect(Object.keys(body)).toEqual(['data']);
    const rows = selectWellnessSessions(body);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.title).toBe('QA Deep Hatha Yoga');
  });

  it('maps the real field names (durationMinutes / scheduledAt / priceInr)', () => {
    const row = selectWellnessSessions(body)[0]!;
    expect(row.durationMinutes).toBe(60);
    expect(row.scheduledAt).toBe('2026-08-15T08:20:33.901Z');
    // Decimal columns arrive as strings.
    expect(row.priceInr).toBe(1000);
    expect(row.capacity).toBe(10);
    expect(row.status).toBe('SCHEDULED');
  });

  it('does not invent a level or a participant count', () => {
    const row = selectWellnessSessions(body)[0]! as unknown as Record<string, unknown>;
    expect(row.level).toBeUndefined();
    expect(row.participants).toBeUndefined();
  });

  it('yields [] on the wrong envelope rather than mock classes', () => {
    expect(selectWellnessSessions({ sessions: [{ id: 'x', title: 'Fake' }] })).toEqual([]);
    expect(selectWellnessSessions(undefined)).toEqual([]);
  });
});

describe('PAR-10 buildWellnessSessionInput', () => {
  const base = {
    title: 'Morning Hatha Yoga',
    description: 'Gentle 60-minute flow',
    type: 'yoga',
    durationMinutes: '60',
    capacity: '12',
    priceInr: '500',
    scheduledAt: '2099-01-01T08:00:00.000Z',
  };

  it('sends the field names and enum case POST /wellness/sessions requires', () => {
    // The form posted {type:'yoga', duration:60, level:'beginner',
    // startTime:…} — four wrong keys against a schema that wants
    // {type:'YOGA'|…, durationMinutes, capacity, priceInr, scheduledAt}. Every
    // create 400'd, and `level` is not a column at all.
    const body = buildWellnessSessionInput(base);
    expect(body.type).toBe('YOGA');
    expect(body.durationMinutes).toBe(60);
    expect(body.capacity).toBe(12);
    expect(body.priceInr).toBe(500);
    expect(body.scheduledAt).toBe('2099-01-01T08:00:00.000Z');
    expect(Object.keys(body).sort()).toEqual(
      ['capacity', 'description', 'durationMinutes', 'priceInr', 'scheduledAt', 'title', 'type'].sort(),
    );
  });

  it('rejects a past scheduledAt — the server refuses it', () => {
    expect(() =>
      buildWellnessSessionInput({ ...base, scheduledAt: '2020-01-01T08:00:00.000Z' }),
    ).toThrow(WellnessSessionInputError);
  });

  it('rejects the short title and empty description the schema forbids', () => {
    expect(() => buildWellnessSessionInput({ ...base, title: 'Om' })).toThrow(
      WellnessSessionInputError,
    );
    expect(() => buildWellnessSessionInput({ ...base, description: '  ' })).toThrow(
      WellnessSessionInputError,
    );
  });

  it('requires capacity and price — the form never collected them', () => {
    expect(() => buildWellnessSessionInput({ ...base, capacity: '' })).toThrow(
      WellnessSessionInputError,
    );
    expect(() => buildWellnessSessionInput({ ...base, priceInr: '' })).toThrow(
      WellnessSessionInputError,
    );
    // Free classes are legitimate; zero must pass.
    expect(buildWellnessSessionInput({ ...base, priceInr: '0' }).priceInr).toBe(0);
  });

  it('maps an unknown type to OTHER rather than sending an invalid enum', () => {
    expect(buildWellnessSessionInput({ ...base, type: 'sound bath' }).type).toBe('OTHER');
    expect(buildWellnessSessionInput({ ...base, type: 'pranayama' }).type).toBe('PRANAYAMA');
  });
});

// ─── PAR-11: priest profile ──────────────────────────────────────────────────

describe('PAR-11 selectPriestProfile', () => {
  const body = fixtures.priestProfile.body;

  it('reads the FLAT profile — `data.profile` is undefined and blanked the screen', () => {
    expect(Object.keys(body)).not.toContain('profile');
    const p = selectPriestProfile(body);
    expect(p).not.toBeNull();
    expect(p!.displayName).toBe('Demo Pandit');
    expect(p!.experienceYears).toBe(8);
    expect(p!.specializations).toHaveLength(3);
    expect(p!.languages).toEqual(['Hindi', 'English']);
    expect(p!.temples).toHaveLength(1);
  });

  it('reads ratingAvg/ratingCount (the screen looked for `rating`)', () => {
    const p = selectPriestProfile(body)!;
    expect(p.rating).toBe(4.61);
    expect(p.ratingCount).toBe(43);
  });

  it('surfaces only verification facts the API actually returns', () => {
    const p = selectPriestProfile(body)!;
    expect(p.aadhaarVerified).toBe(true);
    expect(p.verificationStatus).toBe('approved');
    // The payload carries no bank or GST state. The screen used to print
    // "Bank Account Not linked" / "GST Pending Review" for every pandit on
    // earth off `?? false`. Unknown must stay unknown.
    expect(p.bankLinked).toBeNull();
    expect(p.gstStatus).toBeNull();
  });

  it('returns null on a 401/404 body', () => {
    expect(selectPriestProfile({ statusCode: 401, error: 'Unauthorized' })).toBeNull();
    expect(selectPriestProfile(null)).toBeNull();
  });
});

// ─── PAR-12: gaushala cow registry ───────────────────────────────────────────

describe('PAR-12 selectPortalCows', () => {
  it('reads the SCOPED registry (empty for a manager who owns no cows)', () => {
    expect(selectPortalCows(fixtures.gaushalaPortalCowsEmpty.body)).toEqual([]);
  });

  it('maps the Cow model fields a scoped row actually carries', () => {
    const rows = selectPortalCows(fixtures.gaushalaPortalCowsOneRow.body);
    expect(rows).toHaveLength(1);
    const cow = rows[0]!;
    expect(cow.name).toBe('Audit Probe');
    expect(cow.tagNumber).toBe('AUDIT-PAR12-TMP');
    expect(cow.ageYears).toBe(4);
    expect(cow.healthStatus).toBe('healthy');
  });

  it('never reports an adoption status — the Cow model has no such column', () => {
    const cow = selectPortalCows(
      fixtures.gaushalaPortalCowsOneRow.body,
    )[0]! as unknown as Record<string, unknown>;
    expect(cow.adoptionStatus).toBeUndefined();
  });

  it('a PUBLIC /gaushala/cows row does not masquerade as an owned cow', () => {
    // The public feed is every gaushala's herd (19 rows across 5 gaushalas) and
    // uses `age`, not `ageYears`, and carries a foreign gaushalaId. Mapping it
    // must not silently manufacture ageYears or a tag number.
    const rows = selectPortalCows(fixtures.gaushalaPublicCows.body);
    expect(rows[0]!.ageYears).toBeNull();
    expect(rows[0]!.tagNumber).toBeUndefined();
  });
});

// ─── PAR-13: astrologer portal dashboard ─────────────────────────────────────

describe('PAR-13 selectAstrologerDashboard', () => {
  it('returns null for the live 500 body instead of confident zeros', () => {
    expect(fixtures.astrologerPortalDashboard.status).toBe(500);
    expect(selectAstrologerDashboard(fixtures.astrologerPortalDashboard.body)).toBeNull();
  });

  it('reads the keys the route really sends on success', () => {
    // The screen read stats.todayCount / earningsToday / monthEarnings /
    // ratingCount and data.todayConsultations. None of those exist:
    // astrologer-portal.ts:133 sends
    // {profile, stats:{consultationsToday, earningsTodayInr, earningsMonthInr,
    //  totalEarningsInr, totalConsultations, rating, pricePerMinute, approved,
    //  activeClients}, upcomingSessions[]}.
    const vm = selectAstrologerDashboard({
      profile: { id: 'p1', displayName: 'Demo Astrologer', approved: true },
      stats: {
        totalConsultations: 7,
        rating: 4.5,
        pricePerMinute: 25,
        approved: true,
        consultationsToday: 2,
        earningsTodayInr: 1500,
        earningsMonthInr: 9000,
        totalEarningsInr: 24000,
        activeClients: 3,
      },
      upcomingSessions: [
        {
          id: 'c1',
          reference: 'AC-1',
          minutes: 30,
          amount_inr: 750,
          scheduled_at: '2026-08-14T05:00:00.000Z',
          status: 'confirmed',
          jitsiUrl: 'https://meet.jit.si/room',
        },
      ],
    });
    expect(vm).not.toBeNull();
    expect(vm!.consultationsToday).toBe(2);
    expect(vm!.earningsTodayInr).toBe(1500);
    expect(vm!.earningsMonthInr).toBe(9000);
    expect(vm!.rating).toBe(4.5);
    expect(vm!.upcoming).toHaveLength(1);
    expect(vm!.upcoming[0]!.amountInr).toBe(750);
    expect(vm!.upcoming[0]!.jitsiUrl).toBe('https://meet.jit.si/room');
  });
});

// ─── PAR-16: store products + real cart ──────────────────────────────────────

describe('PAR-16 store selectors', () => {
  it('maps rating, reviews, discount and MRP from the API, not from a mock', () => {
    const rows = selectStoreProducts(fixtures.storeProducts.body);
    expect(rows).toHaveLength(3);
    const gita = rows.find((p) => p.handle === 'bhagavad-gita-deluxe-edition')!;
    expect(gita.priceInr).toBe(349);
    expect(gita.compareAtPriceInr).toBe(599);
    expect(gita.discountPercent).toBe(42);
    expect(gita.rating).toBe(4.9);
    expect(gita.reviewCount).toBe(2100);
    expect(gita.tag).toBe('Bestseller');
    expect(gita.inStock).toBe(true);
    expect(gita.imageUrl).toContain('https://');
  });

  it('leaves rating/discount null when the row omits them — no positional mock', () => {
    const rows = selectStoreProducts({
      products: [{ id: 'p9', handle: 'plain', title: 'Plain Item', price: 100 }],
    });
    expect(rows[0]!.rating).toBeNull();
    expect(rows[0]!.reviewCount).toBeNull();
    expect(rows[0]!.compareAtPriceInr).toBeNull();
    expect(rows[0]!.discountPercent).toBeNull();
  });

  it('selectCart unwraps the `cart` envelope on GET /store/cart', () => {
    expect(Object.keys(fixtures.storeCartEmpty.body)).toEqual(['cart']);
    const cart = selectCart(fixtures.storeCartEmpty.body);
    expect(cart).not.toBeNull();
    expect(cart!.itemCount).toBe(0);
    expect(cart!.items).toEqual([]);
    expect(cart!.deliveryFee).toBe(49);
  });

  it('selectCart unwraps the same envelope on POST /store/cart/items', () => {
    // The mutation replies {message, cart} — the hook types it as a bare Cart,
    // so a naive `data.itemCount` would be undefined and the badge would never
    // move even though the item really was added.
    const cart = selectCart(fixtures.storeAddToCart.body)!;
    expect(cart.itemCount).toBe(1);
    expect(cart.items[0]!.title).toBe('Bhagavad Gita (Hindi-English, Deluxe Edition)');
    expect(cart.items[0]!.quantity).toBe(1);
    expect(cart.items[0]!.subtotal).toBe(349);
    expect(cart.total).toBeGreaterThan(0);
  });

  it('selectCart returns null (not an empty cart) when the call failed', () => {
    expect(selectCart({ statusCode: 401, error: 'Unauthorized' })).toBeNull();
    expect(selectCart(undefined)).toBeNull();
  });
});

// ─── PAR-18: yatra destination inquiry ───────────────────────────────────────

describe('PAR-18 buildYatraInquiry', () => {
  const base = {
    yatraSlug: 'kedarnath',
    yatraTitle: 'Kedarnath Yatra',
    packageTier: 'standard' as const,
    startDate: '2026-09-10',
    travelersCount: '2',
    name: 'Asha Verma',
    email: 'asha@example.com',
    phone: '+919812345678',
    pickupCity: 'Delhi',
    notes: 'Elderly parents travelling',
  };

  it('builds a body that satisfies the /api/v1/yatra-inquiry zod schema', () => {
    const body = buildYatraInquiry(base);
    expect(body.yatraSlug).toBe('kedarnath');
    expect(body.packageTier).toBe('standard');
    expect(body.travelersCount).toBe(2);
    expect(body.totalInr).toBe(0); // destination inquiry — no quote yet
    expect(body.buyer.name).toBe('Asha Verma');
    expect(body.buyer.email).toBe('asha@example.com');
    expect(body.buyer.phone).toBe('+919812345678');
  });

  it('rejects a bad email before the request is sent', () => {
    expect(() => buildYatraInquiry({ ...base, email: 'nope' })).toThrow(YatraInquiryError);
  });

  it('rejects an empty name and an out-of-range traveller count', () => {
    expect(() => buildYatraInquiry({ ...base, name: '  ' })).toThrow(YatraInquiryError);
    expect(() => buildYatraInquiry({ ...base, travelersCount: '0' })).toThrow(YatraInquiryError);
    expect(() => buildYatraInquiry({ ...base, travelersCount: '51' })).toThrow(YatraInquiryError);
  });

  it('requires a start date — the schema has no default', () => {
    expect(() => buildYatraInquiry({ ...base, startDate: '' })).toThrow(YatraInquiryError);
  });
});

// ─── PAR-19: admin feature flags ─────────────────────────────────────────────

describe('PAR-19 describePlatformFlagSupport', () => {
  it('reports that no endpoint can persist a platform flag', () => {
    const support = describePlatformFlagSupport();
    expect(support.canWrite).toBe(false);
    expect(support.message).toMatch(/cannot be changed/i);
  });

  it('lists no `stripe` flag — the Stripe rail was removed from the API', () => {
    const ids = describePlatformFlagSupport().readableFlags.map((f) => f.id);
    expect(ids).not.toContain('stripe');
  });

  it('only exposes a flag whose value can be read from a real endpoint', () => {
    for (const flag of describePlatformFlagSupport().readableFlags) {
      expect(flag.source).toMatch(/^\/api\/v1\//);
    }
  });
});
