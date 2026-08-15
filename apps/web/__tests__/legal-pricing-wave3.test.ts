/**
 * legal-content wave 3 (prod-sweep-raw-2026-08-12) — the residue left after the
 * 2026-08-14 deploy (main @ 55c3acfe).
 *
 * LEG-19  four pages published four different refund settlement timelines.
 * LEG-16  privacy@/legal@ were gated behind HAS_SPECIALTY_INBOXES_VERIFIED but
 *         grievance@ — the statutory IT Rules 2021 Rule 3(2) channel — was not.
 * LEG-06  /refunds was rewritten to the real 72h regime; /why-darshya, /terms
 *         and /nri/ca kept the 48h guarantee and an unconditional auto-refund.
 * LEG-13  /about was rewired to live counts; /nri-pujas kept "50+ verified
 *         pujas across 30+ temple cities" against 10 puja types and 20 temples.
 * LEG-01  /refunds and /terms were reconciled onto lib/cancellation-policy;
 * LEG-03  /faqs, /nri-pujas and /why-darshya still promise a FULL refund for a
 *         cancellation "up to 24 hours before", which is more generous than the
 *         engine pays (75% in the 24-48h band). Only the straggler surfaces are
 *         pulled onto the already-published module here — the ladder VALUES
 *         remain the owner's call and are not touched.
 *
 * Source assertions, matching legal-content-p1/p2: the failure mode is a
 * published sentence that contradicts the engine, and a render test passes
 * happily on a page that renders the wrong sentence perfectly.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { COMPANY, grievanceOfficerLine, grievanceContactEmail } from '../lib/company';
import {
  REFUND_DAYS_LABEL,
  REFUND_SETTLEMENT_BANDS,
  REFUND_SETTLEMENT_SENTENCE,
  CANCELLATION_POLICY_SENTENCE,
  FULL_REFUND_HOURS_BEFORE,
  CANCELLATION_CUTOFF_HOURS,
  PARTIAL_REFUND_PERCENT,
} from '../lib/cancellation-policy';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

/**
 * Drop comment lines before grepping, exactly as legal-content-p2 does. These
 * files carry a written record of the sentence that was removed; without this
 * the record itself trips the assertion that the sentence is gone.
 */
const codeOnly = (src: string) =>
  src
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join('\n');

const faqsData = codeOnly(read('lib/faqs.ts'));
const nriPujas = codeOnly(read('app/nri-pujas/page.tsx'));
const whyDarshya = codeOnly(read('app/why-darshya/page.tsx'));
const terms = codeOnly(read('app/terms/page.tsx'));
const refundsPage = codeOnly(read('app/refunds/page.tsx'));
const nriCa = codeOnly(read('app/nri/ca/page.tsx'));
const companySrc = codeOnly(read('lib/company.ts'));

describe('LEG-19 — one published refund settlement table, quoted everywhere', () => {
  it('lib/cancellation-policy owns the settlement bands', () => {
    expect(REFUND_SETTLEMENT_BANDS.length).toBeGreaterThan(0);
    for (const band of REFUND_SETTLEMENT_BANDS) {
      expect(band.method.length).toBeGreaterThan(0);
      expect(band.label).toMatch(/business days/);
    }
  });

  it('the one-line form is derived from the bands, not retyped', () => {
    for (const band of REFUND_SETTLEMENT_BANDS) {
      expect(REFUND_SETTLEMENT_SENTENCE).toContain(band.method);
      expect(REFUND_SETTLEMENT_SENTENCE).toContain(band.label);
    }
  });

  it('the card band is the same figure the API publishes as refundDaysLabel', () => {
    // apps/api/src/services/cancellation.service.ts DEFAULT_CANCEL_POLICY
    // carries refundDaysLabel: '5-7 business days'. apps/web cannot import from
    // apps/api, so the web constant is cross-referenced instead.
    const apiPolicy = readFileSync(
      path.resolve(__dirname, '../../api/src/services/cancellation.service.ts'),
      'utf8',
    );
    const match = apiPolicy.match(/refundDaysLabel:\s*'([^']+)'/);
    expect(match).not.toBeNull();
    expect(REFUND_DAYS_LABEL).toBe(match![1]);
    expect(REFUND_SETTLEMENT_BANDS.some((b) => b.label === REFUND_DAYS_LABEL)).toBe(true);
  });

  it('the FAQ no longer publishes its own timeline', () => {
    expect(faqsData).not.toContain('3-7 working days');
    expect(faqsData).not.toContain('usually instant');
    expect(faqsData).toMatch(/REFUND_SETTLEMENT_SENTENCE/);
  });

  it('/nri-pujas no longer publishes its own timeline', () => {
    expect(nriPujas).not.toContain('within 5-7 business days');
    expect(nriPujas).toMatch(/REFUND_SETTLEMENT_SENTENCE|cancellation-policy/);
  });

  it('/why-darshya no longer publishes its own timeline', () => {
    expect(whyDarshya).not.toContain('3-7 day processing');
    expect(whyDarshya).toMatch(/REFUND_DAYS_LABEL|cancellation-policy/);
  });

  it('/refunds renders the bands rather than retyping them', () => {
    expect(refundsPage).toMatch(/REFUND_SETTLEMENT_BANDS/);
    expect(refundsPage).not.toContain('Net Banking:</strong> 5&ndash;10 business days');
  });
});

describe('LEG-16 — the grievance inbox is gated like every other alias', () => {
  it('company.ts declares a gate for it', () => {
    expect(typeof COMPANY.HAS_GRIEVANCE_INBOX_VERIFIED).toBe('boolean');
  });

  it('falls back to the staffed inbox while the gate is false', () => {
    if (!COMPANY.HAS_GRIEVANCE_INBOX_VERIFIED) {
      expect(grievanceContactEmail()).toBe(COMPANY.supportEmail);
    } else {
      expect(grievanceContactEmail()).toBe(COMPANY.grievance.email);
    }
  });

  it('the officer line publishes only the address the gate allows', () => {
    expect(grievanceOfficerLine()).toContain(grievanceContactEmail());
    if (!COMPANY.HAS_GRIEVANCE_INBOX_VERIFIED) {
      expect(grievanceOfficerLine()).not.toContain(COMPANY.grievance.email);
    }
  });

  it('the raw alias is reachable only through the helper', () => {
    // Every page renders grievanceOfficerLine(); nothing may read
    // COMPANY.grievance.email directly, or the gate is bypassable.
    const pages = [
      'app/privacy/page.tsx',
      'app/privacy/v2/page.tsx',
      'app/refunds/page.tsx',
      'app/contact/page.tsx',
      'app/account/privacy/page.tsx',
    ];
    for (const rel of pages) {
      expect(codeOnly(read(rel))).not.toMatch(/COMPANY\.grievance\.email/);
    }
  });
});

describe('LEG-06 — no surface promises an automatic refund the sweep never issues', () => {
  it('/why-darshya drops the unconditional "refund you in full"', () => {
    expect(whyDarshya).not.toMatch(/refund you in full/);
  });

  it('/why-darshya states the escalation hour the engine actually runs at', () => {
    expect(whyDarshya).toMatch(/missingVideoEscalationHours/);
  });

  it('/terms does not guarantee a 48-hour video delivery the code never checks', () => {
    expect(terms).not.toContain('delivered within 48 hours');
    expect(terms).toMatch(/missingVideoEscalationHours|videoProofTargetLabel/);
  });

  it('/nri/ca does not claim every proof-less booking is cancelled', () => {
    expect(nriCa).not.toContain('we cancel the booking and review it for a full refund');
  });

  it('company.ts owns the delivery target as well as the escalation hour', () => {
    expect(typeof COMPANY.refunds.videoProofTargetLabel).toBe('string');
    expect(COMPANY.refunds.missingVideoEscalationHours).toBe(72);
  });

  it('the escalation hour still matches the sweep in apps/api', () => {
    const svc = readFileSync(
      path.resolve(__dirname, '../../api/src/services/booking.service.ts'),
      'utf8',
    );
    expect(svc).toMatch(/staleHours\s*(=|:)\s*72/);
  });
});

describe('LEG-13 — /nri-pujas publishes counted numbers, not remembered ones', () => {
  it('drops the "50+ pujas across 30+ temple cities" claim', () => {
    expect(nriPujas).not.toContain('50+');
    expect(nriPujas).not.toContain('30+ temple cities');
  });

  it('reads its counts from the live API', () => {
    expect(nriPujas).toMatch(/fetchPublicStats|live-stats/);
  });
});

describe('LEG-01/LEG-03 straggler surfaces — no page out-promises the engine', () => {
  it('the module the reconciled pages already use is the only ladder authority', () => {
    expect(FULL_REFUND_HOURS_BEFORE).toBe(48);
    expect(CANCELLATION_CUTOFF_HOURS).toBe(24);
    expect(PARTIAL_REFUND_PERCENT).toBe(75);
    expect(CANCELLATION_POLICY_SENTENCE).toContain(`${PARTIAL_REFUND_PERCENT}%`);
  });

  it('the ladder still matches DEFAULT_CANCEL_POLICY in apps/api', () => {
    const apiPolicy = readFileSync(
      path.resolve(__dirname, '../../api/src/services/cancellation.service.ts'),
      'utf8',
    );
    expect(apiPolicy).toMatch(
      new RegExp(`minHoursBefore:\\s*${FULL_REFUND_HOURS_BEFORE},\\s*refundFraction:\\s*1(\\.0)?`),
    );
    expect(apiPolicy).toMatch(
      new RegExp(
        `minHoursBefore:\\s*${CANCELLATION_CUTOFF_HOURS},\\s*refundFraction:\\s*0\\.${PARTIAL_REFUND_PERCENT}`,
      ),
    );
  });

  it('the devotee-facing cutoff is the one the API enforces', () => {
    const svc = readFileSync(
      path.resolve(__dirname, '../../api/src/services/booking.service.ts'),
      'utf8',
    );
    expect(svc).toMatch(
      new RegExp(`hoursUntilPuja\\s*<\\s*${CANCELLATION_CUTOFF_HOURS}`),
    );
  });

  it('the FAQ no longer promises a full refund at the 24-hour mark', () => {
    expect(faqsData).not.toContain('up to 24 hours before the scheduled puja time for a full refund');
    expect(faqsData).toMatch(/CANCELLATION_POLICY_SENTENCE/);
  });

  it('/nri-pujas no longer promises free cancellation up to 24 hours before', () => {
    expect(nriPujas).not.toContain('Free cancellation up to 24 hours before');
    expect(nriPujas).toMatch(/CANCELLATION_POLICY_SENTENCE/);
  });

  it('/why-darshya no longer advertises a full refund inside the partial band', () => {
    expect(whyDarshya).not.toContain('Cancellation up to 24h before');
    expect(whyDarshya).toMatch(/CANCELLATION_BADGE_LABEL|CANCELLATION_POLICY_SENTENCE/);
  });

  it('the copy hour in company.ts agrees with the module the pages render', () => {
    expect(COMPANY.refunds.freeCancellationHoursBeforeService).toBe(CANCELLATION_CUTOFF_HOURS);
    expect(companySrc).toMatch(/CANCELLATION_CUTOFF_HOURS/);
  });
});
