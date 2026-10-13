import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { generate80GReceipt, is80GEligible } from './pdf-receipt.js';
import { donationReceiptEmail } from './email.js';

/**
 * COM-02 (prod sweep 2026-08-12, P0/trust) — every 80G receipt Darshya issued
 * asserted Section 80G eligibility with no donee registration number and no
 * donee PAN.
 *
 * The PDF printed "80G Income Tax Exemption" as its subtitle and "Eligible for
 * deduction under Section 80G of the Income Tax Act, 1961." UNCONDITIONALLY,
 * while the two facts that make that true — `gaushala80GNumber` and
 * `gaushalaPan` — were both rendered behind `if (...)`. Those values come from
 * `gaushala_profiles.regn_80g` / `.pan`, which are READ in exactly one place
 * (donations.ts) and WRITTEN NOWHERE: no admin form, no portal field, no seed,
 * no migration default. They are NULL for every gaushala, and the temple branch
 * never queries them at all. So the assertion was false on 100% of receipts
 * ever issued, and PROJECT_CONTEXT.md immutable business rule 7 says plainly:
 * "80G receipt requires donee 80G regn + PAN."
 *
 * A donor claiming that deduction has it disallowed. The claim is now derived
 * from the data instead of asserted over it.
 *
 * These tests scan the rendered PDF bytes, not the source: pdf-lib writes
 * WinAnsi text into an uncompressed content stream, so the literal sentence is
 * present in the file exactly when it is printed on the page. Re-adding the
 * claim in any code path fails this.
 */

const BASE = {
  donorName: 'Test Donor',
  donorEmail: 'donor@example.test',
  amountInr: 5100,
  donationDate: '01 January 2026',
  receiptNumber: 'DR-20260101-AAAA',
  paymentMode: 'UPI' as const,
  gaushalaName: 'Shri Krishna Gaushala',
};

const CLAIM = 'Eligible for deduction under Section 80G';
const DISCLAIMER = 'not valid for a Section 80G deduction';

/**
 * Everything pdf-lib actually wrote onto the page.
 *
 * The page content stream is Flate-compressed AND every drawn string is written
 * as a hex literal (`<44617273687961> Tj`), so a plain byte scan silently
 * "passes" every not-present assertion — which would make this whole file
 * vacuous. Inflate each stream, then decode the hex operands, so what is
 * asserted on is the text a donor would read on the page.
 */
async function textOf(data: Parameters<typeof generate80GReceipt>[0]): Promise<string> {
  const buf = await generate80GReceipt(data);
  const raw = buf.toString('latin1');
  let out = raw;
  const re = /[^d]stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) continue;
    const chunk = Buffer.from(raw.slice(start, end), 'latin1');
    let inflated: string;
    try {
      inflated = zlib.inflateSync(chunk).toString('latin1');
    } catch {
      continue; // font programs and other raw data
    }
    out +=
      '\n' +
      inflated.replace(/<([0-9A-Fa-f]+)>/g, (whole, hex: string) => {
        if (hex.length % 2 !== 0) return whole;
        return Buffer.from(hex, 'hex').toString('latin1');
      });
  }
  return out;
}

describe('COM-02 — the 80G assertion is derived from the donee data, never assumed', () => {
  it('is80GEligible requires BOTH the registration number and the donee PAN', () => {
    expect(is80GEligible({})).toBe(false);
    expect(is80GEligible({ gaushala80GNumber: 'AAATS1234QF20214' })).toBe(false);
    expect(is80GEligible({ gaushalaPan: 'AAATS1234Q' })).toBe(false);
    expect(is80GEligible({ gaushala80GNumber: '   ', gaushalaPan: '   ' })).toBe(false);
    expect(
      is80GEligible({ gaushala80GNumber: 'AAATS1234QF20214', gaushalaPan: 'AAATS1234Q', companyHas80G: true }),
    ).toBe(true);
    // The platform flag (HAS_80G, false today) outranks donee data on file.
    expect(
      is80GEligible({ gaushala80GNumber: 'AAATS1234QF20214', gaushalaPan: 'AAATS1234Q' }),
    ).toBe(false);
    expect(
      is80GEligible({ gaushala80GNumber: 'AAATS1234QF20214', gaushalaPan: 'AAATS1234Q', companyHas80G: false }),
    ).toBe(false);
  });

  it('prints no 80G claim when the donee has neither registration nor PAN (today: every donee)', async () => {
    const text = await textOf(BASE);
    expect(text).not.toContain(CLAIM);
    expect(text).toContain(DISCLAIMER);
  });

  it('prints no 80G claim when only the registration number is on file', async () => {
    const text = await textOf({ ...BASE, gaushala80GNumber: 'AAATS1234QF20214' });
    expect(text).not.toContain(CLAIM);
  });

  it('prints no 80G claim when only the donee PAN is on file', async () => {
    const text = await textOf({ ...BASE, gaushalaPan: 'AAATS1234Q' });
    expect(text).not.toContain(CLAIM);
  });

  it('prints no claim and no registration block when both donee facts exist but the platform flag is off', async () => {
    const text = await textOf({
      ...BASE,
      gaushala80GNumber: 'AAATS1234QF20214',
      gaushalaPan: 'AAATS1234Q',
    });
    expect(text).not.toContain(CLAIM);
    expect(text).not.toContain('80G Registration');
    expect(text).toContain(DISCLAIMER);
  });

  it('prints the 80G claim once both facts are on file', async () => {
    const text = await textOf({
      ...BASE,
      gaushala80GNumber: 'AAATS1234QF20214',
      gaushalaPan: 'AAATS1234Q',
      companyHas80G: true,
    });
    expect(text).toContain(CLAIM);
    expect(text).toContain('80G Registration: AAATS1234QF20214');
    expect(text).not.toContain(DISCLAIMER);
  });

  /**
   * The covering email carried the same assertion in plain words — "Your 80G
   * tax receipt PDF is attached" — so fixing only the PDF would leave the donor
   * told the opposite of what the attachment says.
   */
  it('the covering email does not call the attachment an 80G receipt when it is not one', () => {
    const tpl = donationReceiptEmail({
      donorName: 'Test Donor',
      amount: '₹5,100',
      gaushalaName: 'Shri Krishna Gaushala',
      receiptNumber: 'DR-20260101-AAAA',
      date: '01 January 2026',
      is80G: false,
    });
    expect(tpl.html).not.toMatch(/80G/);
    expect(tpl.text).not.toMatch(/80G/);
  });

  it('the covering email does say 80G when the donee is registered', () => {
    const tpl = donationReceiptEmail({
      donorName: 'Test Donor',
      amount: '₹5,100',
      gaushalaName: 'Shri Krishna Gaushala',
      receiptNumber: 'DR-20260101-AAAA',
      date: '01 January 2026',
      is80G: true,
    });
    expect(tpl.html).toMatch(/80G/);
    expect(tpl.text).toMatch(/80G/);
  });

  it('the document heading does not advertise an exemption the receipt cannot support', async () => {
    const ineligible = await textOf(BASE);
    expect(ineligible).not.toContain('80G Income Tax Exemption');

    const eligible = await textOf({
      ...BASE,
      gaushala80GNumber: 'AAATS1234QF20214',
      gaushalaPan: 'AAATS1234Q',
    });
    expect(eligible).toContain('80G Income Tax Exemption');
  });
});
