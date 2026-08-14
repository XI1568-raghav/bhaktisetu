/**
 * legal-content P1 sweep — the same contracts as legal-content-p1.test.ts, but
 * asserted against RENDERED text rather than source.
 *
 * Source greps catch a stale sentence; they do not catch a page that reads the
 * right constant and prints the wrong thing. These render the actual server
 * components and read the words a customer sees.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RefundsPage from '../app/refunds/page';
import ShippingPage from '../app/shipping/page';
import TermsPage from '../app/terms/page';
import PrivacyPage from '../app/privacy/page';
import { COMPANY } from '../lib/company';

const textOf = (node: React.ReactElement) => render(node).container.textContent ?? '';

describe('LEG-06 — /refunds renders the 72h manual-review process, not a 48h auto-refund', () => {
  const t = textOf(<RefundsPage />);

  it('states the real escalation window', () => {
    expect(COMPANY.refunds.missingVideoEscalationHours).toBe(72);
    expect(t).toContain(`No video proof ${COMPANY.refunds.missingVideoEscalationHours} hours`);
  });

  it('does not promise an automatic refund at 48 hours', () => {
    expect(t).not.toMatch(/Video proof not provided within 48 hours/);
  });

  it('says the refund is issued by review, not by the sweep', () => {
    expect(t).toMatch(/refund review queue/i);
  });
});

describe('LEG-12 — /shipping renders the fee the cart charges', () => {
  const t = textOf(<ShippingPage />);

  it('publishes the ₹499 threshold and the flat ₹49', () => {
    expect(COMPANY.store).toBeDefined();
    expect(t).toContain(`₹${COMPANY.store.freeDeliveryAboveInr}`);
    expect(t).toContain(`flat ₹${COMPANY.store.flatDeliveryFeeInr}`);
  });

  it('drops the ₹999 threshold and the weight band that no code implements', () => {
    expect(t).not.toContain('₹999');
    expect(t).not.toMatch(/based on weight and destination/);
  });
});

describe('LEG-05 — /terms renders one commission schedule', () => {
  const t = textOf(<TermsPage />);

  it('states the uniform 20% platform / 80% provider split', () => {
    expect(t).toMatch(/uniform 20%/);
    expect(t).toMatch(/remaining 80%/);
  });

  it('drops the third schedule, MedusaJS and the per-receipt 80G fee', () => {
    expect(t).not.toMatch(/MedusaJS/);
    expect(t).not.toMatch(/Astrology consultation: 30%/);
    expect(t).not.toMatch(/flat fee per 80G receipt/);
  });
});

describe('LEG-11 — /privacy and /refunds render one grievance SLA', () => {
  const privacy = textOf(<PrivacyPage />);
  const refunds = textOf(<RefundsPage />);

  it('both pages carry the same acknowledgement window', () => {
    const sla = `within ${COMPANY.grievance.acknowledgeHours} hours`;
    expect(privacy).toContain(sla);
    expect(refunds).toContain(sla);
  });

  it('both pages carry the same resolution window', () => {
    const resolve = `${COMPANY.grievance.resolveBusinessDays} business days`;
    expect(privacy).toContain(resolve);
    expect(refunds).toContain(resolve);
  });

  it('neither page still publishes the old conflicting promises', () => {
    expect(privacy).not.toMatch(/resolve within 30 days/);
    expect(refunds).not.toMatch(/respond within 15 business days\./);
  });

  it('does not imply a named officer exists while none is appointed', () => {
    expect(COMPANY.grievance.HAS_NAMED_OFFICER_VERIFIED).toBe(false);
    expect(privacy).toMatch(/has not yet been appointed/);
  });
});
