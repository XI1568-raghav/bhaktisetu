import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { generateInvoice, type InvoiceInput } from './pdf-invoice.js';

/**
 * LEG-10 (audit ledger F230) — the PDF this module renders used to head itself
 * with the statutory heading from section 31 of the CGST Act: the one pairing
 * the word "tax" with the word "invoice". A document bearing that heading is a
 * specific instrument. It must carry the supplier's GSTIN, legal name and
 * registered office, and it entitles the recipient to claim input tax credit.
 *
 * Darshya has no GSTIN and no registered entity (apps/web/lib/company.ts:
 * IS_INCORPORATED_VERIFIED false, HAS_GST_REGISTRATION_VERIFIED false, gstin
 * null), and there is no GSTIN, HSN/SAC code or tax-breakdown row anywhere on
 * the page. So the heading was a claim the document could not support, and a
 * recipient who relied on it for input tax credit would have the claim
 * disallowed.
 *
 * The fix is to say what the document actually is: proof of payment. These
 * tests pin that, and pin that the phrase cannot come back.
 *
 * HOW THESE ASSERTIONS AVOID BEING VACUOUS
 * ----------------------------------------
 * Three separate traps are closed deliberately:
 *
 * 1. pdf-lib Flate-compresses the page content stream AND writes every drawn
 *    string as a hex literal (`<44617273687961> Tj`). A plain byte scan of the
 *    buffer therefore "passes" every not-present assertion while proving
 *    nothing. `textOf` inflates each stream and decodes the hex operands, so
 *    what is asserted on is the text a devotee reads on the page. (Same
 *    technique, same reason, as pdf-receipt.80g.test.ts.)
 *
 * 2. If that extraction ever silently returned an empty string, every
 *    not-present assertion would still pass. So each not-present assertion is
 *    paired with a positive control on the same extracted string — the new
 *    title, the recipient's name, the receipt number. An extraction that
 *    returns nothing fails those loudly.
 *
 * 3. The source-scan guard at the bottom reads this module's own source. The
 *    documented hazard is that explanatory COMMENTS containing the banned
 *    phrase trip the guard, and the tempting "fix" is to strip comments before
 *    scanning — which can then pass vacuously. No stripper is used here.
 *    pdf-invoice.ts is worded so its prose never spells the phrase, and the
 *    guard's own regex is proved to fire against the literal pre-fix line.
 */

/** The phrase this document is forbidden to claim, in any spacing. */
const BANNED = /tax[\s\-_]*invoice/i;

/** The exact line that stood at pdf-invoice.ts:195 before the LEG-10 fix. */
const PRE_FIX_LINE =
  "page.drawText('DARSHYA TAX INVOICE', { x: left, y, size: 14, font: fontBold, color: TEXT });";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.join(HERE, 'pdf-invoice.ts');

/**
 * Everything pdf-lib actually drew onto the page, as readable text.
 */
function pageTextOf(buf: Buffer): string {
  const raw = buf.toString('latin1');
  let out = '';
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

const PUJA: InvoiceInput = {
  type: 'puja_booking',
  bookingNumber: 'BS-20260101-A1B2C',
  devoteeName: 'Ramesh Iyer',
  pujaName: 'Satyanarayan Puja',
  templeName: 'Shri Venkateswara Temple',
  templeCity: 'Tirupati',
  amountInr: 3499,
  createdAt: '2026-01-01',
};

const ASTRO: InvoiceInput = {
  type: 'astrology_consultation',
  consultationId: '4f1c2b7a-9d3e-4c88-b210-77aa9911ee00',
  devoteeName: 'Kavita Sharma',
  astrologerName: 'Pt. Shukla',
  durationMinutes: 30,
  amountInr: 999,
  createdAt: '2026-01-02',
};

const WELLNESS: InvoiceInput = {
  type: 'wellness_session',
  sessionId: '81cc0d5e-2211-4a90-8e77-b0c1d2e3f405',
  devoteeName: 'Anil Verma',
  instructorName: 'Meera Joshi',
  sessionTitle: 'Morning Pranayama',
  amountInr: 499,
  createdAt: '2026-01-03',
};

const STORE: InvoiceInput = {
  type: 'store_order',
  orderNumber: 'ORD-20260104-7788',
  customerName: 'Sunita Rao',
  items: [
    { name: 'Brass Diya', qty: 2, priceInr: 349 },
    { name: 'Rudraksha Mala', qty: 1, priceInr: 1299 },
  ],
  shippingAddress: '12 MG Road, Indiranagar, Bengaluru, Karnataka, 560038, India',
  totalInr: 1997,
  createdAt: '2026-01-04',
};

const ALL: Array<[string, InvoiceInput, string]> = [
  ['puja_booking', PUJA, 'Ramesh Iyer'],
  ['astrology_consultation', ASTRO, 'Kavita Sharma'],
  ['wellness_session', WELLNESS, 'Anil Verma'],
  ['store_order', STORE, 'Sunita Rao'],
];

describe('LEG-10 — the rendered document does not claim to be a statutory tax document', () => {
  it.each(ALL)(
    '%s: the page says RECEIPT and never the banned heading',
    async (_label, input, recipientName) => {
      const text = pageTextOf(await generateInvoice(input));

      // The finding itself, asserted FIRST so that a regression trips this
      // line rather than a positive control below it — the failure message
      // then names the actual defect.
      expect(text).not.toMatch(BANNED);

      // Positive controls. These are what stop the assertion above from
      // passing vacuously: if `pageTextOf` ever returned an empty string,
      // `not.toMatch` would be satisfied by nothing at all, and these fail.
      expect(text.length).toBeGreaterThan(200);
      expect(text).toContain('DARSHYA RECEIPT');
      expect(text).toContain(recipientName);
      expect(text).toContain('Receipt No.:');
    },
  );

  it('the document number is a receipt number, not an invoice number', async () => {
    const text = pageTextOf(await generateInvoice(PUJA));
    expect(text).toMatch(/RCP-PB-/);
    expect(text).not.toMatch(/INV-PB-/);
    // The old label is gone from the body, not just the header.
    expect(text).not.toContain('Invoice No.');
  });

  it('per-type document-number prefixes all survive the RCP- rename', async () => {
    const prefixes: Array<[InvoiceInput, RegExp]> = [
      [PUJA, /RCP-PB-/],
      [ASTRO, /RCP-AC-/],
      [WELLNESS, /RCP-WS-/],
      [STORE, /RCP-SO-/],
    ];
    for (const [input, re] of prefixes) {
      expect(pageTextOf(await generateInvoice(input))).toMatch(re);
    }
  });

  it('drops the claim that the amount already includes tax', async () => {
    const text = pageTextOf(await generateInvoice(PUJA));
    expect(text).not.toMatch(/inclusive of all applicable taxes/i);
    expect(text).toContain('No tax was added or collected');
    expect(text).toContain('no input tax credit');
  });

  it('the footer calls the artifact a receipt', async () => {
    const text = pageTextOf(await generateInvoice(STORE));
    expect(text).toContain('Computer-generated receipt');
    expect(text).not.toMatch(/Computer-generated invoice/i);
  });

  it('carries no GSTIN, HSN/SAC or tax-breakdown row to give the claim colour', async () => {
    const text = pageTextOf(await generateInvoice(STORE));
    expect(text).not.toMatch(/GSTIN/i);
    expect(text).not.toMatch(/\bHSN\b/i);
    expect(text).not.toMatch(/\bSAC\b/i);
    expect(text).not.toMatch(/\bCGST\b|\bSGST\b|\bIGST\b/i);
  });
});

describe('LEG-10 — the PDF metadata agrees with the page', () => {
  it('titles itself a receipt in the document properties', async () => {
    const doc = await PDFDocument.load(await generateInvoice(PUJA));

    const title = doc.getTitle() ?? '';
    const subject = doc.getSubject() ?? '';

    // Positive control: metadata was actually written and read back.
    expect(title).toContain('RCP-PB-');
    expect(title).toMatch(/receipt/i);

    expect(title).not.toMatch(BANNED);
    expect(subject).not.toMatch(BANNED);
  });
});

describe('LEG-10 — the phrase cannot come back into the source', () => {
  it('the guard regex actually fires on the pre-fix line (guard is not vacuous)', () => {
    // Without this, a typo in BANNED would make the scan below pass on any
    // input at all. The regex is proved against the exact string it exists to
    // catch, plus the spacing variants someone might reintroduce it in.
    expect(PRE_FIX_LINE).toMatch(BANNED);
    expect('TAX INVOICE').toMatch(BANNED);
    expect('Tax Invoice').toMatch(BANNED);
    expect('tax-invoice').toMatch(BANNED);
    expect('tax_invoice').toMatch(BANNED);
    expect('taxinvoice').toMatch(BANNED);
    // And does not fire on wording the file legitimately uses.
    expect('input tax credit').not.toMatch(BANNED);
    expect('statutory tax document').not.toMatch(BANNED);
  });

  it('pdf-invoice.ts source contains the phrase nowhere — comments included', () => {
    const src = fs.readFileSync(SOURCE_PATH, 'utf8');

    // Positive control: the right file was read, and it is non-empty. Asserted
    // on a symbol that exists both before and after the fix, so this control
    // cannot mask the scan below.
    expect(src.length).toBeGreaterThan(500);
    expect(src).toContain('export async function generateInvoice');

    // The guard. Scanned raw — no comment-stripping step exists here on
    // purpose: stripping is the documented route to a vacuous guard, so the
    // module's prose is instead worded to never spell the phrase.
    expect(src).not.toMatch(BANNED);

    // And the fix is actually present, not merely the phrase absent.
    expect(src).toContain("'DARSHYA RECEIPT'");
  });
});
