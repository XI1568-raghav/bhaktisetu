/**
 * legal-content wave 3 — the same contracts as legal-pricing-wave3.test.ts,
 * asserted against RENDERED output.
 *
 * A source grep catches a stale sentence. It does not catch a page that reads
 * the right constant and prints the wrong thing, and it does not catch a count
 * that quietly falls back to a remembered figure when the API is down — which
 * is the defect class this sweep keeps finding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { PublicStats } from '../lib/live-stats';

const stats = vi.hoisted(() => ({ value: { templeCount: 20, pujaTypeCount: 10 } as PublicStats }));

vi.mock('../lib/live-stats', () => ({
  fetchPublicStats: async () => stats.value,
}));

import { COMPANY } from '../lib/company';
import {
  REFUND_SETTLEMENT_BANDS,
  PARTIAL_REFUND_PERCENT,
  FULL_REFUND_HOURS_BEFORE,
  CANCELLATION_CUTOFF_HOURS,
} from '../lib/cancellation-policy';
import { FAQ_GROUPS } from '../lib/faqs';

import RefundsPage from '../app/refunds/page';
import TermsPage from '../app/terms/page';
import ContactPage from '../app/contact/page';
import WhyDarshya from '../app/why-darshya/page';
import NRIPujasPillarPage from '../app/nri-pujas/page';

const textOfAsync = async (node: Promise<React.ReactElement>) =>
  render(await node).container.textContent ?? '';
const textOf = (node: React.ReactElement) => render(node).container.textContent ?? '';

beforeEach(() => {
  cleanup();
  stats.value = { templeCount: 20, pujaTypeCount: 10 };
});

describe('LEG-19 — the settlement table renders once and is quoted everywhere', () => {
  it('/refunds prints every band from the module', () => {
    const t = textOf(RefundsPage());
    for (const band of REFUND_SETTLEMENT_BANDS) {
      expect(t).toContain(band.method);
      expect(t).toContain(band.label);
    }
  });

  it('the FAQ answer quotes the same bands rather than its own', () => {
    const answers = FAQ_GROUPS.flatMap((g) => g.faqs.map((f) => f.a)).join(' ');
    for (const band of REFUND_SETTLEMENT_BANDS) {
      expect(answers).toContain(`${band.method}: ${band.label}`);
    }
    expect(answers).not.toContain('usually instant');
    expect(answers).not.toContain('3-7 working days');
  });

  it('/nri-pujas quotes the same bands', async () => {
    const t = await textOfAsync(NRIPujasPillarPage());
    for (const band of REFUND_SETTLEMENT_BANDS) {
      expect(t).toContain(`${band.method}: ${band.label}`);
    }
  });

  it('/why-darshya no longer prints a fourth timeline', () => {
    const t = textOf(WhyDarshya());
    expect(t).not.toContain('3-7 day processing');
  });
});

describe('LEG-16 — no page prints an unverified grievance alias', () => {
  it('/refunds and /contact publish the staffed inbox instead', () => {
    if (COMPANY.HAS_GRIEVANCE_INBOX_VERIFIED) return;
    for (const page of [textOf(RefundsPage()), textOf(ContactPage())]) {
      expect(page).not.toContain(COMPANY.grievance.email);
      expect(page).toContain(COMPANY.supportEmail);
    }
  });
});

describe('LEG-06 — no rendered surface promises an automatic refund', () => {
  it('/why-darshya drops the unconditional repayment and names the real hour', () => {
    const t = textOf(WhyDarshya());
    expect(t).not.toContain('refund you in full');
    expect(t).toContain(`${COMPANY.refunds.missingVideoEscalationHours} hours after your slot`);
  });

  it('/terms states the video window as a target, with the sweep beside it', () => {
    const t = textOf(TermsPage());
    expect(t).not.toContain('delivered within 48 hours');
    expect(t).toContain(COMPANY.refunds.videoProofTargetLabel);
    expect(t).toContain(`${COMPANY.refunds.missingVideoEscalationHours} hours after the`);
  });
});

describe('LEG-13 — /nri-pujas prints counted numbers', () => {
  it('renders the live counts in place of "50+" and "30+ temple cities"', async () => {
    const t = await textOfAsync(NRIPujasPillarPage());
    expect(t).not.toContain('50+');
    expect(t).not.toContain('30+ temple cities');
    expect(t).toContain('10 pujas');
    expect(t).toContain('20 listed temples');
  });

  it('OMITS a count it could not read rather than inventing one', async () => {
    stats.value = { templeCount: null, pujaTypeCount: null };
    const t = await textOfAsync(NRIPujasPillarPage());
    expect(t).not.toContain('50+');
    expect(t).not.toMatch(/\d+\s+pujas at/);
    expect(t).not.toMatch(/\d+\s+listed temples/);
    expect(t).toContain('Pick from pujas at listed temples');
  });
});

describe('LEG-01/LEG-03 — the straggler surfaces render the engine ladder', () => {
  const ladder = new RegExp(
    `${FULL_REFUND_HOURS_BEFORE}h or more before your puja for a full refund, or ` +
      `${CANCELLATION_CUTOFF_HOURS}-${FULL_REFUND_HOURS_BEFORE}h before for ${PARTIAL_REFUND_PERCENT}%`,
  );

  it('the FAQ answer carries the partial band, not a blanket full refund', () => {
    const answers = FAQ_GROUPS.flatMap((g) => g.faqs.map((f) => f.a)).join(' ');
    expect(answers).toMatch(ladder);
    expect(answers).not.toContain(
      'up to 24 hours before the scheduled puja time for a full refund',
    );
  });

  it('/nri-pujas carries the partial band', async () => {
    const t = await textOfAsync(NRIPujasPillarPage());
    expect(t).toMatch(ladder);
    expect(t).not.toContain('Free cancellation up to 24 hours before');
  });

  it('/why-darshya carries the partial band', () => {
    const t = textOf(WhyDarshya());
    expect(t).toMatch(ladder);
    expect(t).not.toContain('Cancellation up to 24h before');
  });
});
