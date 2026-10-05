import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { __testing } from './bookings.js';

// NRI pricing (2026-10-05): POST /bookings/create-order takes an explicit
// `nriPricing` flag and forwards it to createBooking, which multiplies the puja
// price by 2.5 (still INR). It is a request flag, not a users.isNri lookup.

const { createOrderBodySchema } = __testing;

const base = {
  pujaSlug: 'rudrabhishek',
  templeOfferingId: '0f9a3d4c-2b41-4d6e-8a10-6f2c9b7e1d55',
  scheduledDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })(),
  scheduledTime: '06:00',
  devotees: [{ name: 'Arjun Sharma' }],
};

describe('create-order body: nriPricing', () => {
  it('defaults to false (domestic) when absent', () => {
    const r = createOrderBodySchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nriPricing).toBe(false);
  });
  it('accepts true', () => {
    const r = createOrderBodySchema.safeParse({ ...base, nriPricing: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nriPricing).toBe(true);
  });
  it('rejects a non-boolean', () => {
    expect(createOrderBodySchema.safeParse({ ...base, nriPricing: 'yes' }).success).toBe(false);
  });
});

describe('create-order handler forwards the flag', () => {
  it('passes body.nriPricing into bookingService.createBooking and keeps the order in INR', () => {
    const src = readFileSync(fileURLToPath(new URL('./bookings.ts', import.meta.url)), 'utf8');
    const start = src.indexOf("'/create-order'");
    const end = src.indexOf("'/from-offering'", start);
    const handler = src.slice(start, end);
    expect(handler).toMatch(/nriPricing:\s*body\.nriPricing/);
    expect(handler).not.toMatch(/currency:\s*'USD'/);
  });
});
