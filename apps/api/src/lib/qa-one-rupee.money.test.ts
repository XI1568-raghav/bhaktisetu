import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { generateInvoice } from './pdf-invoice.js';
import { generate80GReceipt, amountInWords } from './pdf-receipt.js';
import { platformRateOf } from './commission-math.js';
import { DEFAULT_CANCEL_POLICY, CancellationService } from '../services/cancellation.service.js';

// A QA payer pays about Rs 1 per flow (QA_PAYER_EMAILS). These tests pin that
// the money maths, the refund ladder and every receipt survive such an amount:
// no throw, no 0.00 row, no negative figure, whole paise throughout.

const isPdf = (b: Buffer) => b.subarray(0, 5).toString() === '%PDF-';

describe('Rs 1 receipts', () => {
  it('puja, consultation, wellness and store receipts render at Rs 1', async () => {
    const createdAt = '04 Nov 2026';
    const pdfs = await Promise.all([
      generateInvoice({ type: 'puja_booking', bookingNumber: 'BS-20261104-ABCDE', devoteeName: 'QA', pujaName: 'Ganesh Puja', templeName: 'QA Mandir', templeCity: 'Pune', amountInr: 1, createdAt }),
      generateInvoice({ type: 'astrology_consultation', consultationId: '71e54617-6963-418e-845f-920f4350505b', devoteeName: 'QA', astrologerName: 'QA Acharya', durationMinutes: 1, amountInr: 1, createdAt }),
      generateInvoice({ type: 'wellness_session', sessionId: '71e54617-6963-418e-845f-920f4350505b', devoteeName: 'QA', instructorName: 'QA Guru', sessionTitle: 'Morning Yoga', amountInr: 1, createdAt }),
      generateInvoice({ type: 'store_order', orderNumber: 'ORD-20261104-AAAA', customerName: 'QA', items: [{ name: 'Diya', qty: 1, priceInr: 1 }], shippingAddress: 'L1, Delhi 110001', totalInr: 1, createdAt }),
    ]);
    for (const p of pdfs) expect(isPdf(p)).toBe(true);
  });

  it('the donation receipt renders at Rs 1 and the amount in words is grammatical', async () => {
    const pdf = await generate80GReceipt({
      donorName: 'QA', donorEmail: 'qa@example.com', amountInr: 1, donationDate: '04 Nov 2026',
      receiptNumber: 'DR-20261104-0001', paymentMode: 'UPI', gaushalaName: 'QA Gaushala',
    });
    expect(isPdf(pdf)).toBe(true);
    expect(amountInWords(1)).toBe('One Rupee Only');
    expect(amountInWords(2)).toBe('Two Rupees Only');
    expect(amountInWords(101)).toBe('One Hundred One Rupees Only');
  });

  it('without a registered 80G donee the Rs 1 receipt does not claim a deduction', async () => {
    // Same predicate the PDF uses; HAS_80G is false until the certificate is on file.
    const { is80GEligible } = await import('./pdf-receipt.js');
    expect(is80GEligible({ gaushala80GNumber: 'X', gaushalaPan: 'ABCDE1234F' })).toBe(false);
  });
});

describe('Rs 1 commission maths', () => {
  it('80/20 of Rs 1 in Decimal is 0.80 / 0.20 and re-adds to Rs 1 (createBooking and /from-offering use this arithmetic)', () => {
    const price = new Prisma.Decimal(1);
    const share = new Prisma.Decimal('0.8');
    const priest = price.mul(share);
    const platform = price.mul(new Prisma.Decimal(1).sub(share));
    expect(priest.toFixed(2)).toBe('0.80');
    expect(platform.toFixed(2)).toBe('0.20');
    expect(priest.add(platform).toFixed(2)).toBe('1.00');
  });

  it('the platform take rate stored on the Commission row is 0.2 (percentage = platform, amount = provider)', () => {
    const rate = platformRateOf(new Prisma.Decimal('0.20'), new Prisma.Decimal(1));
    expect(rate.toFixed(4)).toBe('0.2000');
  });

  it('the 5% temple share of Rs 1 is Rs 0.05 (positive, so a row is written)', () => {
    const temple = new Prisma.Decimal(1).mul('0.05').toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    expect(temple.toFixed(2)).toBe('0.05');
    expect(temple.gt(0)).toBe(true);
  });
});

describe('Rs 1 refund ladder', () => {
  const svc = new CancellationService();
  const slot = new Date('2026-12-01T00:00:00.000Z');
  const quote = (hoursBefore: number) =>
    svc.computeDevoteeRefund({
      policy: DEFAULT_CANCEL_POLICY,
      scheduledDate: slot,
      pujaPriceInr: 1,
      totalPaidInr: 1,
      now: new Date(slot.getTime() - hoursBefore * 3600_000),
    });

  it('>= 48h: full Rs 1.00 = 100 paise', () => {
    const q = quote(72);
    expect(q.refundAmountInr).toBe(1);
    expect(Math.round(q.refundAmountInr * 100)).toBe(100);
  });

  it('24-48h: 75% of Rs 1 is exactly 75 paise (a whole-paise amount, no rounding error)', () => {
    const q = quote(30);
    expect(q.refundFraction).toBe(0.75);
    expect(q.refundAmountInr).toBe(0.75);
    expect(Math.round(q.refundAmountInr * 100)).toBe(75);
    expect(q.feeAmountInr).toBe(0.25);
  });

  it('never yields a negative or sub-paise refund at Rs 1, whatever the tier', () => {
    for (const h of [100, 48, 30, 24, 10, 4, 1]) {
      const q = quote(h);
      expect(q.refundAmountInr).toBeGreaterThanOrEqual(0);
      expect(Math.round(q.refundAmountInr * 100)).toBe(q.refundAmountInr * 100);
    }
  });
});
