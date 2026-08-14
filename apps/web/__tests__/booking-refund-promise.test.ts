/**
 * DB-06 (prod sweep 2026-08-12) — checkout promised a refund that does not exist.
 *
 * Captured live from the Payment step, immediately above "Pay ₹1,151 with
 * Razorpay": "Secure Payment · Video Proof Guaranteed · 100% Money-Back".
 * The puja detail page carried the same claim as a trust badge:
 * "Money-Back Guarantee / 100% refund if not satisfied".
 *
 * Nothing in the API implements a dissatisfaction refund. What ships is a
 * ladder (cancellation.service.ts DEFAULT_CANCEL_POLICY) on top of a hard 24h
 * block (booking.service.ts cancelBooking), so a devotee who cancels 30 hours
 * out gets 75%, and one who is simply unhappy after the puja gets nothing.
 * An unconditional "100% refund if not satisfied" at the moment of payment is
 * a misrepresentation, and it guarantees a dispute the moment support has to
 * refuse it.
 *
 * These tests lock:
 *   - the web copy constants stay in lockstep with the API ladder
 *   - neither consumer surface advertises an unconditional money-back
 *   - both render the real guarantee, from the one shared module
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  FULL_REFUND_HOURS_BEFORE,
  CANCELLATION_CUTOFF_HOURS,
  PARTIAL_REFUND_PERCENT,
  REFUND_DAYS_LABEL,
  CANCELLATION_BADGE_LABEL,
  CANCELLATION_BADGE_DESC,
  CANCELLATION_POLICY_SENTENCE,
} from '../lib/cancellation-policy';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const readRepo = (rel: string) => readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');

/**
 * Comments explain why a string was removed and therefore quote it. Only what
 * the page actually renders is under test, so strip block and line comments
 * before asserting on copy.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const wizardSrc = read('app/pujas/book/page.tsx');
const detailSrc = read('app/pujas/[slug]/page.tsx');
const wizardCopy = stripComments(wizardSrc);
const detailCopy = stripComments(detailSrc);

describe('DB-06 — the web promise mirrors the API ladder that actually runs', () => {
  const cancelSrc = readRepo('apps/api/src/services/cancellation.service.ts');
  const bookingSrc = readRepo('apps/api/src/services/booking.service.ts');

  it('the full-refund tier is still 48h+ at 100%', () => {
    const m = cancelSrc.match(
      /minHoursBefore:\s*48,\s*refundFraction:\s*1(?:\.0)?\b/,
    );
    expect(m, 'API 48h/100% tier not found — the mirror cannot be verified').toBeTruthy();
    expect(FULL_REFUND_HOURS_BEFORE).toBe(48);
  });

  it('the partial tier is still 24h at 75%', () => {
    const m = cancelSrc.match(/minHoursBefore:\s*24,\s*refundFraction:\s*0\.75\b/);
    expect(m, 'API 24h/75% tier not found — the mirror cannot be verified').toBeTruthy();
    expect(CANCELLATION_CUTOFF_HOURS).toBe(24);
    expect(PARTIAL_REFUND_PERCENT).toBe(75);
  });

  it('refund timeline matches the API refundDaysLabel', () => {
    const m = cancelSrc.match(/refundDaysLabel:\s*'([^']+)'/);
    expect(m).toBeTruthy();
    expect(REFUND_DAYS_LABEL).toBe(m![1]);
  });

  it('the 24h hard block still exists, so 50%/25% stay unreachable and unadvertised', () => {
    expect(bookingSrc).toContain(
      'Cancellation is not allowed within 24 hours of the scheduled puja time.',
    );
    for (const copy of [
      CANCELLATION_BADGE_LABEL,
      CANCELLATION_BADGE_DESC,
      CANCELLATION_POLICY_SENTENCE,
    ]) {
      expect(copy).not.toMatch(/50%|25%/);
    }
  });

  it('no consumer copy promises a refund for dissatisfaction', () => {
    for (const copy of [
      CANCELLATION_BADGE_LABEL,
      CANCELLATION_BADGE_DESC,
      CANCELLATION_POLICY_SENTENCE,
    ]) {
      expect(copy).not.toMatch(/not satisfied|money[- ]back/i);
    }
  });
});

describe('DB-06 — the payment step no longer badges "100% Money-Back"', () => {
  it('the wizard does not render an unconditional money-back claim', () => {
    expect(wizardCopy).not.toMatch(/100%\s*Money-Back/i);
    expect(wizardCopy).not.toMatch(/Money-Back Guarantee/i);
  });

  it('the wizard states the real guarantee from the shared module', () => {
    expect(wizardSrc).toMatch(/from '[^']*lib\/cancellation-policy'/);
    expect(wizardSrc).toContain('CANCELLATION_BADGE_LABEL');
  });

  it('the trust strip keeps the two claims that ARE true', () => {
    expect(wizardSrc).toContain('Secure Payment');
    expect(wizardSrc).toContain('Video Proof Guaranteed');
  });

  it('the terms checkbox states the refund ladder, not just the 24h cut-off', () => {
    expect(wizardSrc).toContain('CANCELLATION_POLICY_SENTENCE');
    expect(wizardCopy).not.toMatch(
      /I understand that cancellation is allowed up to 24 hours before/i,
    );
  });
});

describe('DB-06 — the puja detail badge no longer says "100% refund if not satisfied"', () => {
  it('the detail page drops the dissatisfaction promise', () => {
    expect(detailCopy).not.toMatch(/100% refund if not satisfied/i);
    expect(detailCopy).not.toMatch(/Money-Back Guarantee/i);
  });

  it('the detail badge is sourced from the shared module', () => {
    expect(detailSrc).toMatch(/from '[^']*lib\/cancellation-policy'/);
    expect(detailSrc).toContain('CANCELLATION_BADGE_LABEL');
    expect(detailSrc).toContain('CANCELLATION_BADGE_DESC');
  });
});
