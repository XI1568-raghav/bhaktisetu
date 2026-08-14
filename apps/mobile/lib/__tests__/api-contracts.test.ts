/**
 * Contract tests for the mobile app's API adapters.
 *
 * Every fixture in ./fixtures/live-api-2026-08-12.json is a VERBATIM response
 * captured from the running API (http://127.0.0.1:4000) on 2026-08-12 with the
 * seeded demo accounts. Only long prose fields are elided (marked "…[elided]").
 * Keys, key names, nesting and every number are exactly what the server sent.
 *
 * These tests exist because the app↔API contract drifted silently in seven
 * places (audit findings PAR-01..PAR-07): the screens read envelope keys the
 * API has never returned, and TypeScript could not catch it because the hooks
 * declared fabricated interfaces. Each `describe` below pins one real envelope.
 */
import { describe, it, expect } from 'vitest';

/**
 * Reads a field off a real payload the way the OLD screen code did, with no
 * guard, so the test can assert the crash rather than merely describe it.
 */
function unguarded(payload: unknown, key: string): { toLocaleString(l: string): string } {
  return (payload as Record<string, { toLocaleString(l: string): string }>)[key]!;
}
import fixtures from './fixtures/live-api-2026-08-12.json';
import {
  selectBookings,
  selectBookingTotal,
  selectAddresses,
  selectPriestDashboard,
  selectAdminDashboard,
  formatInr,
  selectLiveStreams,
  selectUpcomingDarshan,
  selectStreamDetail,
  buildDonationOrderInput,
  DonationInputError,
  selectTemples,
  selectPujaTypes,
} from '../api-contracts';

describe('PAR-02 — devotee bookings + addresses envelope', () => {
  it('the API envelope has no `data` key at all (the accessor the screens used)', () => {
    expect(Object.keys(fixtures.userBookings.body)).toEqual([
      'success',
      'bookings',
      'pagination',
    ]);
    expect(
      (fixtures.userBookings.body as unknown as Record<string, unknown>).data,
    ).toBeUndefined();
    expect(Object.keys(fixtures.userAddresses.body)).toEqual(['success', 'addresses']);
    expect(
      (fixtures.userAddresses.body as unknown as Record<string, unknown>).data,
    ).toBeUndefined();
  });

  it('selectBookings reads `.bookings` off the real payload', () => {
    const rows = selectBookings(fixtures.userBookings.body);
    expect(rows.length).toBe(3); // fixture keeps the first 3 of the page
    expect(rows[0]!.bookingNumber).toBeTruthy();
  });

  it('selectBookingTotal reports the paginated total, not the page length', () => {
    // The screen subtitle said "N total" off a 10-row page. The truth is 81.
    expect(fixtures.userBookings.body.pagination.total).toBe(81);
    expect(selectBookingTotal(fixtures.userBookings.body)).toBe(81);
  });

  it('selectAddresses reads `.addresses` off the real payload', () => {
    expect(selectAddresses(fixtures.userAddresses.body)).toHaveLength(2);
  });

  it('returns [] — not fabricated rows — for an unexpected shape', () => {
    expect(selectBookings(undefined)).toEqual([]);
    expect(selectBookings({ data: [{ id: 'x' }] })).toEqual([]);
    expect(selectAddresses(null)).toEqual([]);
  });
});

describe('PAR-03 — priest dashboard envelope', () => {
  it('the API returns nested earnings/bookings, never the flat fields the screen read', () => {
    const body = fixtures.priestDashboard.body as unknown as Record<string, unknown>;
    expect(Object.keys(body)).toEqual([
      'priest',
      'earnings',
      'bookings',
      'upcomingBookings',
    ]);
    expect(body.earningsToday).toBeUndefined();
    expect(body.earningsThisMonth).toBeUndefined();
    expect(body.todayBookings).toBeUndefined();
  });

  it('the old render expression crashes on the real payload', () => {
    expect(() =>
      unguarded(fixtures.priestDashboard.body, 'earningsToday').toLocaleString('en-IN'),
    ).toThrow(TypeError);
  });

  it('selectPriestDashboard maps the real nested payload', () => {
    const vm = selectPriestDashboard(fixtures.priestDashboard.body);
    expect(vm).not.toBeNull();
    expect(vm!.displayName).toBe('Demo Pandit');
    expect(vm!.upcomingBookings).toBe(35);
    expect(vm!.completedBookings).toBe(13);
    expect(vm!.totalBookings).toBe(51);
    expect(vm!.earningsThisMonth).toBe(0);
    // `pending` arrives as the STRING "2310" (Prisma Decimal → string).
    expect(vm!.earningsPending).toBe(2310);
    expect(vm!.rating).toBeCloseTo(4.61, 2);
    expect(vm!.ratingCount).toBe(43);
  });

  it('returns null for a missing/failed response instead of inventing money', () => {
    expect(selectPriestDashboard(undefined)).toBeNull();
    expect(selectPriestDashboard({})).toBeNull();
  });
});

describe('PAR-04 — admin dashboard envelope', () => {
  it('the API has no totalBookings / activeTemples', () => {
    const body = fixtures.adminDashboard.body as unknown as Record<string, unknown>;
    expect(Object.keys(body)).toEqual([
      'totalUsers',
      'usersByRole',
      'totalRevenue',
      'pendingApprovals',
      'activeSubscriptions',
      'recentTransactions',
    ]);
    expect(body.totalBookings).toBeUndefined();
    expect(body.activeTemples).toBeUndefined();
  });

  it('the old render expression crashes on the real payload', () => {
    expect(() =>
      unguarded(fixtures.adminDashboard.body, 'totalBookings').toLocaleString('en-IN'),
    ).toThrow(TypeError);
  });

  it('selectAdminDashboard maps the real payload', () => {
    const vm = selectAdminDashboard(fixtures.adminDashboard.body);
    expect(vm).not.toBeNull();
    expect(vm!.totalUsers).toBe(23);
    expect(vm!.totalRevenue).toBe(26869);
    expect(vm!.pendingApprovals).toBe(0);
    expect(vm!.activeSubscriptions).toBe(7);
    expect(vm!.usersByRole.PANDIT).toBe(3);
  });

  it('formatInr renders four-figure revenue honestly, not as ₹0.3L', () => {
    // The old StatCard did (26869 / 100000).toFixed(1) + 'L' => "₹0.3L".
    expect(formatInr(26869)).toBe('₹26,869');
    expect(formatInr(0)).toBe('₹0');
  });

  it('returns null rather than the 12,450-user FALLBACK when the fetch fails', () => {
    expect(selectAdminDashboard(undefined)).toBeNull();
    expect(selectAdminDashboard({ totalUsers: 'nope' })).toBeNull();
  });
});

describe('PAR-05 — darshan stream route + shape', () => {
  it('the bare /darshan/:id route does not exist', () => {
    expect(fixtures.darshanStreamBareRoute.status).toBe(404);
    expect(fixtures.darshanStreamBareRoute.body.message).toContain('not found');
  });

  it('/darshan/:id/stream returns a FLAT payload with playbackUrl', () => {
    expect(fixtures.darshanStreamRealRoute.status).toBe(200);
    const body = fixtures.darshanStreamRealRoute.body as unknown as Record<string, unknown>;
    expect(Object.keys(body)).toContain('playbackUrl');
    expect(body.streamUrl).toBeUndefined(); // what the player read
    expect(body.data).toBeUndefined(); // the envelope the hook declared
    expect(body.temple).toBeUndefined(); // player read data.temple.deity
  });

  it('selectStreamDetail maps playbackUrl + templeName + status', () => {
    const vm = selectStreamDetail(fixtures.darshanStreamRealRoute.body);
    expect(vm).not.toBeNull();
    expect(vm!.playbackUrl).toBe('https://stream.darshya.online/tirumala-tirupati');
    expect(vm!.templeName).toBe('Tirumala Tirupati Devasthanam');
    expect(vm!.status).toBe('offline');
    expect(vm!.isLive).toBe(false);
  });

  it('selectLiveStreams reads `.streams` and lifts the nested temple fields', () => {
    const rows = selectLiveStreams(fixtures.darshanLive.body);
    expect(rows.length).toBe(fixtures.darshanLive.body.streams.length);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.templeName).toBe('Tirumala Tirupati Devasthanam');
    expect(rows[0]!.deity).toBe('Lord Venkateswara');
    expect(rows[0]!.templeSlug).toBe('tirumala-tirupati');
    expect(rows[0]!.playbackUrl).toContain('.m3u8');
    expect(rows[0]!.isLive).toBe(true);
  });

  it('selectUpcomingDarshan reads the `upcoming` slot list, a different shape', () => {
    // /live returns upcoming entries as {templeSlug,nextSlot,startsInMin} —
    // NOT stream rows. The app used to render four fabricated "scheduled"
    // stream cards instead.
    const rows = selectUpcomingDarshan(fixtures.darshanLive.body);
    expect(rows.length).toBe(fixtures.darshanLive.body.upcoming.length);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.templeSlug).toBeTruthy();
    expect(rows[0]!.nextSlot).toBeTruthy();
    expect(typeof rows[0]!.startsInMin).toBe('number');
    // Sorted soonest-first so the screen does not reorder arbitrarily.
    const mins = rows.map((r) => r.startsInMin);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });

  it('selectUpcomingDarshan returns [] when there is no upcoming block', () => {
    expect(selectUpcomingDarshan({ streams: [], total: 0 })).toEqual([]);
    expect(selectUpcomingDarshan(undefined)).toEqual([]);
  });

  it('does not invent streams when the list is empty or malformed', () => {
    expect(selectLiveStreams({ streams: [], total: 0 })).toEqual([]);
    expect(selectLiveStreams(undefined)).toEqual([]);
    expect(selectStreamDetail(fixtures.darshanStreamBareRoute.body)).toBeNull();
  });
});

describe('PAR-06 — donation create-order request body', () => {
  it('the field the app sent (`amount`) is rejected by the API', () => {
    expect(fixtures.donationAmountField.status).toBe(400);
    expect(
      fixtures.donationAmountField.body.details.fieldErrors.amountInr,
    ).toEqual(['Required']);
  });

  it('amountInr alone is still rejected — a donee is mandatory', () => {
    expect(fixtures.donationAmountInrOnly.status).toBe(400);
    expect(
      fixtures.donationAmountInrOnly.body.details.fieldErrors.causeKind,
    ).toBeTruthy();
  });

  it('the accepted body shape returns an order', () => {
    expect(fixtures.donationCorrect.status).toBe(200);
    expect(fixtures.donationCorrect.body.razorpayOrderId).toBeTruthy();
    expect(fixtures.donationCorrect.body.donationId).toBeTruthy();
  });

  it('buildDonationOrderInput emits amountInr + causeKind + the donee id', () => {
    const input = buildDonationOrderInput({
      amount: '101',
      causeKind: 'gaushala',
      gaushalaId: 'gs_001',
      donorPan: '',
      dedication: '',
    });
    expect(input).toEqual({ amountInr: 101, causeKind: 'gaushala', gaushalaId: 'gs_001' });
    expect((input as unknown as Record<string, unknown>).amount).toBeUndefined();
  });

  it('emits templeId for a temple cause', () => {
    const input = buildDonationOrderInput({
      amount: '2100',
      causeKind: 'temple',
      templeId: 'd1e712f6-e3af-4a5e-8e4d-27b46026dc4d',
      donorPan: 'ABCDE1234F',
    });
    expect(input).toEqual({
      amountInr: 2100,
      causeKind: 'temple',
      templeId: 'd1e712f6-e3af-4a5e-8e4d-27b46026dc4d',
      donorPan: 'ABCDE1234F',
    });
  });

  it('rejects client-side exactly what the server rejects, with the same rules', () => {
    expect(() =>
      buildDonationOrderInput({ amount: '100', causeKind: 'gaushala', gaushalaId: 'gs_001' }),
    ).toThrow(DonationInputError); // server min is ₹101
    expect(() =>
      buildDonationOrderInput({ amount: '101', causeKind: 'gaushala' }),
    ).toThrow(DonationInputError); // no donee
    expect(() =>
      buildDonationOrderInput({ amount: '10.5', causeKind: 'gaushala', gaushalaId: 'gs_001' }),
    ).toThrow(DonationInputError); // server requires whole rupees
    expect(() =>
      buildDonationOrderInput({
        amount: '2000',
        causeKind: 'gaushala',
        gaushalaId: 'gs_001',
        donorPan: 'notapan',
      }),
    ).toThrow(DonationInputError);
  });
});

describe('PAR-07 — catalogue envelopes and prices', () => {
  it('/temples and /pujas/types have no `data` key', () => {
    expect(Object.keys(fixtures.temples.body)).toEqual([
      'temples',
      'total',
      'page',
      'limit',
      'totalPages',
    ]);
    expect((fixtures.temples.body as unknown as Record<string, unknown>).data).toBeUndefined();
    expect(Object.keys(fixtures.pujaTypes.body)).toEqual([
      'pujaTypes',
      'total',
      'page',
      'limit',
      'totalPages',
    ]);
    expect((fixtures.pujaTypes.body as unknown as Record<string, unknown>).data).toBeUndefined();
  });

  it('selectTemples reads `.temples` and carries the slug the web route needs', () => {
    const rows = selectTemples(fixtures.temples.body);
    expect(rows.length).toBe(3);
    expect(rows[0]!.slug).toBe('tirumala-tirupati');
    expect(rows[0]!.deity).toBe('Lord Venkateswara');
    expect(rows[0]!.location).toContain('Tirupati');
  });

  it('selectTemples exposes the API total (20), not the rendered page length', () => {
    expect(fixtures.temples.body.total).toBe(20);
  });

  it('selectPujaTypes binds price to basePrice/nriPrice — the app used to invent them', () => {
    const rows = selectPujaTypes(fixtures.pujaTypes.body);
    expect(rows).toHaveLength(10);
    const satya = rows.find((p) => p.slug === 'satyanarayan-katha')!;
    expect(satya.priceInr).toBe(1501); // the app hardcoded ₹2,100
    expect(satya.nriPriceInr).toBe(13999);
    const sunder = rows.find((p) => p.slug === 'sunderkand-path')!;
    expect(sunder.priceInr).toBe(1101); // the app hardcoded ₹551
    // The app advertised a puja that is not in the catalogue at all.
    expect(rows.find((p) => /atharvashirsha/i.test(p.name))).toBeUndefined();
    expect(rows.find((p) => p.slug === 'ganesh-puja')).toBeTruthy();
  });

  it('returns [] on a bad shape rather than a mock catalogue', () => {
    expect(selectTemples({ data: [{ id: 1, name: 'Fake Temple' }] })).toEqual([]);
    expect(selectPujaTypes(undefined)).toEqual([]);
  });
});
