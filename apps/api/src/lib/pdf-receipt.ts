import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfSafe } from './pdf-safe-text.js';
import { HAS_80G } from './eighty-g.js';

/**
 * Generates an 80G tax receipt PDF for gaushala donations. Uses pdf-lib
 * (pure JS, no native deps, works on Render free tier). Returns a Buffer
 * suitable for attaching to a Resend email or streaming as a download.
 *
 * 80G receipts in India must include:
 *   - Donee name + 80G registration number + PAN
 *   - Donor name + PAN (if available) + address
 *   - Donation amount in figures and words
 *   - Date of donation
 *   - Receipt number
 *   - Mode of payment
 *   - Authorized signatory line
 *
 * For an MVP we render the essentials and leave the signatory blank for
 * the gaushala admin to sign physically before mailing the original.
 */
export interface ReceiptData {
  donorName: string;
  donorPan?: string;
  donorAddress?: string;
  donorEmail: string;
  amountInr: number;
  donationDate: string;
  receiptNumber: string;
  paymentMode: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'Other';
  paymentReference?: string;
  gaushalaName: string;
  gaushala80GNumber?: string;
  gaushalaPan?: string;
  gaushalaAddress?: string;
  /**
   * Platform-level 80G flag. Defaults to `HAS_80G` (lib/eighty-g.ts, false until
   * the Section 80G(5) certificate is on file). Exposed so tests can exercise
   * both states; production callers leave it unset.
   */
  companyHas80G?: boolean;
}

/**
 * COM-02 (prod sweep 2026-08-12): whether THIS receipt may assert Section 80G.
 *
 * The document used to print "80G Income Tax Exemption" and "Eligible for
 * deduction under Section 80G of the Income Tax Act, 1961." unconditionally,
 * while the two facts that make either true were rendered behind `if`s.
 * `gaushala_profiles.regn_80g` / `.pan` are read in one place and written
 * nowhere — no admin form, no portal field, no seed, no migration default — so
 * both are NULL for every donee and the temple branch never even queries them.
 * The claim was therefore false on every receipt ever issued, against
 * PROJECT_CONTEXT.md immutable rule 7 ("80G receipt requires donee 80G regn +
 * PAN"), and a donor who claimed the deduction had it disallowed.
 *
 * Both facts, or no claim. A receipt is still a valid proof of payment without
 * them; it is simply not a tax instrument.
 */
export function is80GEligible(data: {
  gaushala80GNumber?: string | undefined;
  gaushalaPan?: string | undefined;
  companyHas80G?: boolean | undefined;
}): boolean {
  // Three facts, or no claim: the donee's registration, the donee's PAN, and the
  // platform-level flag (HAS_80G). Donee numbers on file never override the flag.
  const company = data.companyHas80G ?? HAS_80G;
  return !!(company && data.gaushala80GNumber?.trim() && data.gaushalaPan?.trim());
}

const SAFFRON = rgb(0.918, 0.345, 0.047); // matches brand #EA580C
const TEXT = rgb(0.24, 0.18, 0.12);
const MUTED = rgb(0.45, 0.4, 0.35);

function amountInWords(amount: number): string {
  // Indian-system to-words: handle up to lakhs/crores
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function under1000(n: number): string {
    if (n < 20) return ones[n] ?? '';
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`;
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + under1000(n % 100) : ''}`;
  }
  const intAmount = Math.round(amount);
  if (intAmount === 0) return 'Zero Rupees Only';
  let n = intAmount;
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const remainder = n;
  if (crore) parts.push(`${under1000(crore)} Crore`);
  if (lakh) parts.push(`${under1000(lakh)} Lakh`);
  if (thousand) parts.push(`${under1000(thousand)} Thousand`);
  if (remainder) parts.push(under1000(remainder));
  return parts.join(' ').trim() + ' Rupees Only';
}

export async function generate80GReceipt(input: ReceiptData): Promise<Buffer> {
  // Helvetica is WinAnsi-only; see pdf-safe-text.ts (Devanagari names used to throw).
  const data = pdfSafe(input);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 50;
  const right = 545;
  let y = 800;

  // Brand bar
  page.drawRectangle({ x: 0, y: 822, width: 595, height: 20, color: SAFFRON });

  // Header
  page.drawText('Darshya', { x: left, y, size: 22, font: fontBold, color: SAFFRON });
  page.drawText('India’s Devotional Super App', { x: left, y: y - 16, size: 9, font, color: MUTED });
  page.drawText('https://darshya.online', { x: left, y: y - 28, size: 9, font, color: MUTED });

  // COM-02: the subtitle is the first thing a donor reads and the first thing
  // an assessing officer reads. It states the exemption only when the donee
  // data behind it exists.
  const eligible80G = is80GEligible(data);

  y -= 60;
  page.drawText('OFFICIAL DONATION RECEIPT', { x: left, y, size: 14, font: fontBold, color: TEXT });
  page.drawText(
    eligible80G ? '80G Income Tax Exemption' : 'Proof of donation — not a tax exemption certificate',
    { x: left, y: y - 14, size: 10, font, color: MUTED },
  );

  // Receipt meta
  y -= 44;
  page.drawText(`Receipt No.:  ${data.receiptNumber}`, { x: left, y, size: 10, font, color: TEXT });
  page.drawText(`Date:  ${data.donationDate}`, { x: 380, y, size: 10, font, color: TEXT });

  // Divider
  y -= 18;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.8, 0.7) });

  // Donee section
  y -= 22;
  page.drawText('Received from', { x: left, y, size: 9, font, color: MUTED });
  y -= 14;
  page.drawText(clip(data.donorName, 64), { x: left, y, size: 12, font: fontBold, color: TEXT });
  if (data.donorPan) {
    y -= 14;
    page.drawText(`PAN: ${data.donorPan}`, { x: left, y, size: 10, font, color: TEXT });
  }
  if (data.donorAddress) {
    y -= 14;
    const lines = wrap(data.donorAddress, 78);
    for (const line of lines) {
      page.drawText(line, { x: left, y, size: 10, font, color: TEXT });
      y -= 12;
    }
  }
  // The email line used to sit 4pt under the name/PAN line and overprinted it.
  y -= data.donorAddress ? 4 : 16;
  page.drawText(`Email: ${data.donorEmail}`, { x: left, y, size: 10, font, color: MUTED });

  // Amount
  y -= 30;
  page.drawText('Amount donated', { x: left, y, size: 9, font, color: MUTED });
  y -= 18;
  page.drawText(`INR ${data.amountInr.toLocaleString('en-IN')}`, { x: left, y, size: 18, font: fontBold, color: SAFFRON });
  y -= 16;
  page.drawText(`(${amountInWords(data.amountInr)})`, { x: left, y, size: 10, font, color: TEXT });

  // Payment
  y -= 22;
  page.drawText(`Mode: ${data.paymentMode}${data.paymentReference ? `   Ref: ${data.paymentReference}` : ''}`, {
    x: left, y, size: 10, font, color: TEXT,
  });

  // Donee section
  y -= 30;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.8, 0.7) });
  y -= 22;
  page.drawText('Donee organisation', { x: left, y, size: 9, font, color: MUTED });
  y -= 14;
  page.drawText(clip(data.gaushalaName, 64), { x: left, y, size: 12, font: fontBold, color: TEXT });
  if (eligible80G && data.gaushala80GNumber) {
    y -= 14;
    page.drawText(`80G Registration: ${data.gaushala80GNumber}`, { x: left, y, size: 10, font, color: TEXT });
  }
  if (eligible80G && data.gaushalaPan) {
    y -= 14;
    page.drawText(`PAN: ${data.gaushalaPan}`, { x: left, y, size: 10, font, color: TEXT });
  }
  if (data.gaushalaAddress) {
    y -= 14;
    const lines = wrap(data.gaushalaAddress, 78);
    for (const line of lines) {
      page.drawText(line, { x: left, y, size: 10, font, color: TEXT });
      y -= 12;
    }
  }

  // Tax exemption note — COM-02: asserted only when the donee's 80G
  // registration number AND PAN are both on this receipt above. Without them
  // the deduction is disallowed at assessment, so saying so here is the only
  // honest line: the donor learns it from us, not from the department.
  y -= 26;
  if (eligible80G) {
    page.drawText('Eligible for deduction under Section 80G of the Income Tax Act, 1961.', {
      x: left, y, size: 9, font, color: MUTED,
    });
    y -= 12;
    page.drawText('Please retain this receipt for your tax records.', {
      x: left, y, size: 9, font, color: MUTED,
    });
  } else {
    page.drawText('This receipt is not valid for a Section 80G deduction: the donee and Darshya', {
      x: left, y, size: 9, font, color: MUTED,
    });
    y -= 12;
    page.drawText('do not both have a confirmed 80G registration and PAN on record.', {
      x: left, y, size: 9, font, color: MUTED,
    });
    y -= 12;
    page.drawText('Please retain this receipt as proof of your donation.', {
      x: left, y, size: 9, font, color: MUTED,
    });
  }

  // Signatory
  y -= 60;
  page.drawLine({ start: { x: left, y }, end: { x: left + 160, y }, thickness: 0.5, color: TEXT });
  y -= 12;
  page.drawText('Authorized signatory', { x: left, y, size: 9, font, color: MUTED });

  // Footer
  page.drawText('Computer-generated receipt — valid without signature when issued via Darshya.', {
    x: left, y: 40, size: 8, font, color: MUTED,
  });
  page.drawText('Generated at https://darshya.online   ·   support@darshya.online', {
    x: left, y: 28, size: 8, font, color: MUTED,
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

/** A name wider than the page ran off the A4 edge; clip it instead. */
function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}
