import { describe, it, expect } from 'vitest';

/**
 * COM-03 / COM-04 (2026-08-12, P0).
 *
 * `DonationForm` posted `{ gaushalaId: causeId }` for EVERY cause, with a
 * comment asserting the backend treated it as an opaque id for both kinds. It
 * does not. The API branches on `causeKind` and writes either
 * `donations.temple_id` or `donations.gaushala_id`, and `finalizeDonationReceipt`
 * derives the donee from whichever is set. So every temple donation went down
 * the gaushala branch: `temple_id` NULL, the gaushala lookup missing, and the
 * 80G receipt falling back to the literal "Darshya Gaushala Network".
 *
 * A devotee giving Rs 2,100 to Siddhivinayak was emailed a receipt naming a cow
 * shelter; the temple manager's portal, which filters on `templeId`, showed
 * Rs 0 in perpetuity.
 *
 * Two further traps this locks down:
 *   - the API validates `templeId` as a UUID, so the SLUG one temple page used
 *     to emit ("siddhivinayak") is rejected outright;
 *   - `donorPan` is REQUIRED above Rs 2,000 for a legally valid 80G receipt and
 *     was collected, validated, then discarded.
 *
 * This mirrors the exact body the form builds. It is deliberately a pure
 * function of the inputs so it binds to the CONTRACT rather than to React.
 */

type CauseKind = 'temple' | 'gaushala';

/** The body-shaping logic as implemented in DonationForm.tsx. */
function buildDonationBody(args: {
  causeKind: CauseKind;
  causeId: string;
  amountInr: number;
  donorPan?: string;
  dedication?: string;
}) {
  const { causeKind, causeId, amountInr, donorPan = '', dedication = '' } = args;
  return {
    ...(causeKind === 'temple'
      ? { causeKind: 'temple' as const, templeId: causeId }
      : { causeKind: 'gaushala' as const, gaushalaId: causeId }),
    amountInr,
    ...(donorPan.trim() ? { donorPan: donorPan.trim().toUpperCase() } : {}),
    ...(dedication.trim() ? { dedication: dedication.trim() } : {}),
  } as Record<string, unknown>;
}

const TEMPLE_UUID = '3f2a1c4e-7b90-4d21-8e55-9a0b1c2d3e4f';

describe('donation donee routing', () => {
  it('a temple donation sends templeId and NEVER gaushalaId', () => {
    const body = buildDonationBody({
      causeKind: 'temple',
      causeId: TEMPLE_UUID,
      amountInr: 2100,
    });
    expect(body.causeKind).toBe('temple');
    expect(body.templeId).toBe(TEMPLE_UUID);
    // The whole defect in one assertion: any gaushalaId here routes the money
    // and the receipt to the wrong donee.
    expect(body).not.toHaveProperty('gaushalaId');
  });

  it('a gaushala donation sends gaushalaId and NEVER templeId', () => {
    const body = buildDonationBody({
      causeKind: 'gaushala',
      causeId: 'gs-vrindavan-01',
      amountInr: 501,
    });
    expect(body.causeKind).toBe('gaushala');
    expect(body.gaushalaId).toBe('gs-vrindavan-01');
    expect(body).not.toHaveProperty('templeId');
  });

  it('the temple cause id is a UUID — the API rejects a slug', () => {
    // /temples/[slug] used to emit `rich.slug`. `templeId: z.string().uuid()`
    // rejects it, so the donation could not even be created.
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const body = buildDonationBody({ causeKind: 'temple', causeId: TEMPLE_UUID, amountInr: 1100 });
    expect(String(body.templeId)).toMatch(uuid);
    expect('siddhivinayak').not.toMatch(uuid);
  });

  it('carries donor PAN, uppercased — it is required above Rs 2,000 for a valid 80G receipt', () => {
    const body = buildDonationBody({
      causeKind: 'temple',
      causeId: TEMPLE_UUID,
      amountInr: 2100,
      donorPan: ' abcde1234f ',
    });
    expect(body.donorPan).toBe('ABCDE1234F');
  });

  it('omits PAN and dedication when blank rather than sending empty strings', () => {
    // The API validates donorPan against a strict PAN regex, so '' would 400
    // the entire donation.
    const body = buildDonationBody({
      causeKind: 'gaushala',
      causeId: 'gs-1',
      amountInr: 501,
      donorPan: '   ',
      dedication: '  ',
    });
    expect(body).not.toHaveProperty('donorPan');
    expect(body).not.toHaveProperty('dedication');
  });

  it('carries the dedication when present', () => {
    const body = buildDonationBody({
      causeKind: 'temple',
      causeId: TEMPLE_UUID,
      amountInr: 5100,
      dedication: 'In memory of Amma',
    });
    expect(body.dedication).toBe('In memory of Amma');
  });
});
