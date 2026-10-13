import { describe, it, expect } from 'vitest';
import { pdfSafeText, pdfSafe } from './pdf-safe-text.js';
import { generate80GReceipt } from './pdf-receipt.js';
import { generateInvoice } from './pdf-invoice.js';

// QA 2026-10-13: Helvetica is WinAnsi-only, so a Devanagari / emoji name made
// generate80GReceipt and generateInvoice THROW; the caller only logged it and the
// donor/devotee got no receipt email at all.
describe('pdfSafeText', () => {
  it('leaves WinAnsi text untouched', () => {
    expect(pdfSafeText("Ravi O'Brien — café")).toBe("Ravi O'Brien — café");
    expect(pdfSafeText('Rs ₹5')).toBe('Rs ?5');
  });

  it('transliterates Devanagari to readable Latin', () => {
    expect(pdfSafeText('राम शर्मा')).toBe('raam sharmaa');
    expect(pdfSafeText('काशी विश्वनाथ')).toBe('kaashee vishvanaath');
  });

  it('replaces characters it cannot draw with ?', () => {
    expect(pdfSafeText('Ram 🙏')).toBe('Ram ?');
  });

  it('pdfSafe walks nested values', () => {
    expect(pdfSafe({ a: 'राम', b: [{ c: 'x' }], n: 3 })).toEqual({ a: 'raam', b: [{ c: 'x' }], n: 3 });
  });
});

describe('PDF generators accept non-Latin names', () => {
  const base = {
    donorEmail: 'a@b.co', amountInr: 101, donationDate: '13 October 2026',
    receiptNumber: 'DR-20261013-ABCD', paymentMode: 'UPI' as const, gaushalaName: 'श्री गोशाला',
  };
  it('80G receipt renders for a Devanagari donor', async () => {
    const buf = await generate80GReceipt({ ...base, donorName: 'राम शर्मा' });
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
  it('payment receipt renders for Devanagari names', async () => {
    const buf = await generateInvoice({
      type: 'puja_booking', bookingNumber: 'BS-1', devoteeName: 'राम', pujaName: 'रुद्राभिषेक',
      templeName: 'काशी', templeCity: 'वाराणसी', amountInr: 1151, createdAt: '2026-10-13',
    });
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
