import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMISSION_RATES, chargedCommissionRate } from '../lib/pricing';

/**
 * PM-08 (prod sweep 2026-08-12, P1/money) — four platform take rates were
 * simultaneously authoritative and nothing reconciled them.
 *
 *   schema.prisma Priest.commissionRate @default(0.70)  → platform takes 30%
 *   take-rate doctrine (2026-08-06)                     → uniform 20%
 *   darshya-gtm-master-plan.md                          → "fixed at 15-18% forever"
 *   PROJECT_CONTEXT.md immutable rule 3                 → "20-40% per temple"
 *   https://darshya.online/pricing                      → a 30/20/15/10 tier ladder
 *
 * A pandit recruited on the 15-18% pitch, reading 30% on the pricing page and
 * actually charged 30% by the schema concludes the platform raised the rate on
 * them — the failure the GTM plan itself names as unrecoverable.
 *
 * The CODE side is now one number: 20% platform / 80% provider, everywhere.
 * PM-03 corrected the schema default to 0.80 and shipped the migration; the
 * /pricing table publishes `chargedRate` only. Nothing tied those together, so
 * any one of them could drift back silently — a schema default is not covered
 * by a single unit test elsewhere in this repo, and the web page and the API
 * live in different packages with no shared constant.
 *
 * This is that tie. It reads each authority at its source and requires them to
 * agree. It is deliberately strict: if the owner changes the take rate, this
 * test is the checklist of every place that has to change with it.
 *
 * STILL THE OWNER'S DECISION, and out of scope for a test: the three PROSE
 * authorities. PROJECT_CONTEXT.md rule 3 still says 20-40%, the GTM master plan
 * still says 15-18%, and neither is reconciled here — amending them is a
 * business decision on a document, not a code change.
 */

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));
const readRepo = (rel: string) => readFileSync(path.resolve(__dirname_, '../../..', rel), 'utf8');

/** The one number. Platform take, as a fraction. */
const PLATFORM_TAKE = 0.2;
const PROVIDER_SHARE = 1 - PLATFORM_TAKE;

describe('PM-08 — every take rate in code reconciles to one published number', () => {
  it('the pandit schema default pays the provider share', () => {
    const schema = readRepo('apps/api/prisma/schema.prisma');
    const line = schema.split(/\r?\n/).find((l) => /^\s*commissionRate\s+Float/.test(l));
    expect(line, 'Priest.commissionRate declaration not found').toBeDefined();
    const m = line!.match(/@default\((\d*\.?\d+)\)/);
    expect(m, 'Priest.commissionRate has no default').toBeTruthy();
    expect(Number(m![1])).toBeCloseTo(PROVIDER_SHARE, 10);
  });

  it('the booking-service fallback share agrees with the schema default', () => {
    const src = readRepo('apps/api/src/services/booking.service.ts');
    const m = src.match(/export const DEFAULT_PRIEST_SHARE\s*=\s*(\d*\.?\d+)/);
    expect(m, 'DEFAULT_PRIEST_SHARE not found').toBeTruthy();
    expect(Number(m![1])).toBeCloseTo(PROVIDER_SHARE, 10);
  });

  it('the store schema default takes the same platform cut', () => {
    const schema = readRepo('apps/api/prisma/schema.prisma');
    const line = schema.split(/\r?\n/).find((l) => /^\s*commission\s+Decimal/.test(l));
    expect(line, 'StoreProfile.commission declaration not found').toBeDefined();
    const m = line!.match(/@default\((\d*\.?\d+)\)/);
    expect(m, 'StoreProfile.commission has no default').toBeTruthy();
    expect(Number(m![1])).toBeCloseTo(PLATFORM_TAKE, 10);
  });

  it('the astrologer rate takes the same platform cut', () => {
    const src = readRepo('apps/api/src/services/astrologer.service.ts');
    const m = src.match(/export const ASTROLOGER_PLATFORM_RATE\s*=\s*(\d*\.?\d+)/);
    expect(m, 'ASTROLOGER_PLATFORM_RATE not found').toBeTruthy();
    expect(Number(m![1])).toBeCloseTo(PLATFORM_TAKE, 10);
  });

  it('the wellness rate takes the same platform cut', () => {
    const src = readRepo('apps/api/src/routes/wellness-sessions.ts');
    const m = src.match(/WELLNESS_PLATFORM_COMMISSION\s*=\s*Number\(\s*process\.env\.WELLNESS_PLATFORM_COMMISSION\s*\?\?\s*'(\d*\.?\d+)'/);
    expect(m, 'WELLNESS_PLATFORM_COMMISSION default not found').toBeTruthy();
    expect(Number(m![1])).toBeCloseTo(PLATFORM_TAKE, 10);
  });

  it('the published /pricing table charges every commissioned role the same rate', () => {
    const charged = COMMISSION_RATES.map((r) => r.chargedRate).filter(
      (r): r is number => typeof r === 'number',
    );
    expect(charged.length).toBeGreaterThan(0);
    for (const rate of charged) {
      expect(rate).toBe(PLATFORM_TAKE * 100);
    }
  });

  it('every commissioned role reads back the same charged rate through the public helper', () => {
    for (const row of COMMISSION_RATES) {
      const rate = chargedCommissionRate(row.role);
      if (rate === null) continue; // roles that are not charged at all
      expect(rate, `${row.role} charged rate`).toBe(PLATFORM_TAKE * 100);
    }
  });

  it('every published rate names the code that actually charges it', () => {
    for (const row of COMMISSION_RATES) {
      if (row.chargedRate === null) continue;
      expect(row.chargedRateSource, `${row.role} source`).toBeTruthy();
      expect(row.chargedRateSource, `${row.role} source`).toMatch(/apps\/api/);
    }
  });

  /**
   * The temple share is a SEPARATE, opposite-direction flow — temple-payout
   * mints a payout TO the temple; no Commission row ever charges one. It is
   * pinned here only so that a future edit cannot quietly fold it into the
   * take rate and make the platform's real cut 25%.
   */
  it('the temple revenue share is a payout, not a take, and is not 20%', () => {
    const src = readRepo('apps/api/src/services/temple-payout.service.ts');
    const m = src.match(/export const DEFAULT_TEMPLE_SHARE_RATE\s*=\s*(\d*\.?\d+)/);
    expect(m, 'DEFAULT_TEMPLE_SHARE_RATE not found').toBeTruthy();
    expect(Number(m![1])).toBeCloseTo(0.05, 10);

    const templeRow = COMMISSION_RATES.find((r) => r.role === 'temple');
    expect(templeRow?.chargedRate ?? null).toBeNull();
  });
});
