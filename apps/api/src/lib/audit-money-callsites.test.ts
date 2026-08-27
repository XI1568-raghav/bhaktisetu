import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from './__mocks__/prisma.js';

/**
 * OPS-05 — the three assignment paths that mint an earning outside the
 * payment rails.
 *
 * `writePujaCommissionOnConfirm` (payment.service) is not the only mint. DI-05
 * added `mintProviderEarningForBooking`, called from three places where a
 * pandit is attached to an ALREADY-PAID booking:
 *
 *   booking.service.updateBookingStatus   (EARNING_ATTACH_STATUSES re-mint)
 *   dispatch.service.acceptOffer          (pandit wins a broadcast)
 *   priest.service.acceptBooking          (pandit accepts in his portal)
 *
 * Those are exactly the bookings whose pandit used to see Rs 0 — the temple
 * path and the dispatch path — so leaving them off the money trail would keep
 * the most historically defective mint invisible.
 *
 * `mintProviderEarningForBooking` returns a `MintOutcome` STRING, not the row
 * it wrote, and it takes the caller's `tx`. So the id has to be recovered after
 * the transaction commits, which is also the only place the audit write is
 * allowed to happen (recordMoneyEvent takes no `tx` on purpose — a failed
 * INSERT inside the caller's tx aborts it in Postgres and would roll back the
 * assignment). This helper is that post-commit step, in one place rather than
 * hand-copied into three services.
 */

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

vi.mock('./audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.commission.findFirst.mockResolvedValue({
    id: 'cm-1',
    amount: new Prisma.Decimal('4000.00'),
    providerId: 'user-priest-1',
  } as never);
});

function firstEvent(): Record<string, unknown> {
  const calls = recordMoneyEventSpy.mock.calls as unknown as Array<[Record<string, unknown>]>;
  return calls[0]![0];
}

describe('recordProviderEarningMinted', () => {
  it('records COMMISSION_MINTED with the real commission id after a mint', async () => {
    const { recordProviderEarningMinted } = await import('./audit-money-callsites.js');
    const { MONEY_EVENTS } = await import('./audit-money.js');

    await recordProviderEarningMinted({
      bookingId: 'bk-1',
      outcome: 'minted',
      rail: 'dispatch-accept-offer',
      actorType: 'provider',
      actorId: 'user-priest-1',
    });

    expect(recordMoneyEventSpy).toHaveBeenCalledTimes(1);
    const event = firstEvent();
    expect(event.eventType).toBe(MONEY_EVENTS.COMMISSION_MINTED);
    expect(event.subjectType).toBe('commission');
    expect(event.subjectId).toBe('cm-1');
    expect(event.commissionId).toBe('cm-1');
    expect(event.bookingId).toBe('bk-1');
    // The PROVIDER's earning in rupees, read off the row that was actually
    // written rather than recomputed — recomputing is how two writers drift.
    expect(String(event.amount)).toBe('4000');
    expect(event.statusAfter).toBe('PENDING');
    expect(event.idempotencyKey).toBe('cm-1');
    expect((event.metadata as Record<string, unknown>).rail).toBe('dispatch-accept-offer');
  });

  it.each([
    'no-provider-on-booking',
    'already-on-unified-rail',
    'already-on-legacy-rail',
    'no-captured-payment',
    'provider-has-no-user',
  ])('records NOTHING when the mint was skipped (%s)', async (outcome) => {
    const { recordProviderEarningMinted } = await import('./audit-money-callsites.js');

    await recordProviderEarningMinted({ bookingId: 'bk-1', outcome, rail: 'priest-accept' });

    // A skipped mint wrote no row. Logging one would report an earning that
    // does not exist — and `already-on-unified-rail` in particular means some
    // EARLIER call already minted and already logged it.
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
    expect(prismaMock.commission.findFirst).not.toHaveBeenCalled();
  });

  it('records nothing when the commission row cannot be found after the commit', async () => {
    const { recordProviderEarningMinted } = await import('./audit-money-callsites.js');
    prismaMock.commission.findFirst.mockResolvedValue(null as never);

    await recordProviderEarningMinted({ bookingId: 'bk-1', outcome: 'minted', rail: 'x' });

    // Better a missing row than a row claiming a commission id that is not
    // real: the trail is evidence, and a fabricated key is worse than a gap.
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });

  it('never throws when the lookup fails — a log must not fail an assignment', async () => {
    const { recordProviderEarningMinted } = await import('./audit-money-callsites.js');
    prismaMock.commission.findFirst.mockRejectedValue(new Error('connection reset') as never);

    await expect(
      recordProviderEarningMinted({ bookingId: 'bk-1', outcome: 'minted', rail: 'x' }),
    ).resolves.toBeUndefined();
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });

  it('never throws when the audit write itself rejects', async () => {
    const { recordProviderEarningMinted } = await import('./audit-money-callsites.js');
    recordMoneyEventSpy.mockRejectedValueOnce(new Error('audit table missing'));

    await expect(
      recordProviderEarningMinted({ bookingId: 'bk-1', outcome: 'minted', rail: 'x' }),
    ).resolves.toBeUndefined();
  });
});
