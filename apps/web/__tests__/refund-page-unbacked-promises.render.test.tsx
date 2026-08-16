/**
 * The same three contracts as refund-page-unbacked-promises.test.ts, asserted
 * against RENDERED output.
 *
 * A source guard catches a stale sentence. It does not catch a page that keeps
 * the honest wording in the file and renders the other branch — and section 5's
 * 80G paragraph is now a ternary on COMPANY.donationLegal.HAS_80G_VERIFIED, so
 * the branch that actually reaches a donor is the thing worth pinning. Same
 * reasoning legal-pricing-wave3-render.test.tsx applies to the wave-3 pages.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { COMPANY } from '../lib/company';
import RefundsPage from '../app/refunds/page';

const textOf = (node: React.ReactElement) => render(node).container.textContent ?? '';
const refundsText = textOf(<RefundsPage />);

describe('LEG-01 residue — the rendered consultation window matches the handler', () => {
  it('does not offer a 6-hour full-refund window', () => {
    expect(refundsText).not.toMatch(/6 hours before the scheduled session/i);
  });

  it('states a 24-hour notice requirement', () => {
    expect(refundsText).toMatch(/at least 24 hours/i);
  });
});

describe('LEG-01 residue — the rendered page offers no platform credit', () => {
  it('does not print a 10% platform credit anywhere', () => {
    expect(refundsText).not.toMatch(/10%\s*platform credit/i);
    expect(refundsText).not.toMatch(/platform credit for future bookings/i);
  });

  it('does not list credits as a refund settlement channel', () => {
    expect(refundsText).not.toMatch(/Applied instantly to your\s*Darshya wallet/i);
  });
});

describe('COM-16 / COM-02 residue — the rendered donation section', () => {
  it('does not claim the money is already with the beneficiary', () => {
    expect(refundsText).not.toMatch(/immediately allocated/i);
  });

  it('renders the honest branch while no 80G registration is on file', () => {
    // Premise: if the owner ever sets this true the other branch is correct
    // and this expectation should be the one that changes.
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(refundsText).toMatch(/not a Section 80G exemption certificate/i);
    expect(refundsText).not.toMatch(/claimed for tax benefit/i);
  });
});
