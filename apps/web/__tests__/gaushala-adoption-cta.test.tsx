/**
 * LC-09 (prod sweep 2026-08-12, P1) — every "Select Plan" button on /gaushala
 * was a bare <button> with no onClick, inside a plain <div> with no wrapping
 * link. All four adoption tiers (₹51 / ₹3,000 / ₹30,000 / ₹2,25,000) were dead:
 * the only monetisation CTA on the gau-seva page went nowhere, with no
 * fallback navigation.
 *
 * TASKS.md records issue #230 as having wired these into /donations with a
 * planId prefill. That landed on the COW DETAIL page
 * (app/gaushala/[id]/page.tsx:546) only — the index grid was left behind, which
 * is the half-shipped-contract pattern this sweep keeps finding.
 *
 * Two halves are asserted here, because wiring only the first one would send
 * the devotee to a page that silently drops the plan they picked:
 *   1. the index CTA is a real link carrying ?planId=
 *   2. /donations keeps that planId when the devotee then picks a gaushala,
 *      so the amount is still prefilled on the form that takes the money.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import GaushalaPage from '../app/gaushala/page';

// The approved-provider strip is an async server component that fetches; it is
// not what this finding is about.
vi.mock('../components/ApprovedProvidersStrip', () => ({
  ApprovedProvidersStrip: () => null,
}));

const EXPECTED_PLANS = ['plan_daily', 'plan_monthly', 'plan_annual', 'plan_lifetime'];

function planCtas(): HTMLAnchorElement[] {
  return screen
    .getAllByRole('link')
    .filter((a) => (a.textContent ?? '').trim() === 'Select Plan') as HTMLAnchorElement[];
}

describe('LC-09 — /gaushala adoption CTAs', () => {
  it('renders one real link per adoption tier, not a dead button', () => {
    render(<GaushalaPage />);

    const deadButtons = screen
      .queryAllByRole('button')
      .filter((b) => (b.textContent ?? '').trim() === 'Select Plan');
    expect(deadButtons).toHaveLength(0);

    const ctas = planCtas();
    expect(ctas).toHaveLength(EXPECTED_PLANS.length);
  });

  it('each CTA deep-links into the donation flow with its own planId', () => {
    render(<GaushalaPage />);
    const hrefs = planCtas().map((a) => a.getAttribute('href') ?? '');

    for (const href of hrefs) {
      expect(href.startsWith('/donations?')).toBe(true);
    }
    const planIds = hrefs.map((h) => new URLSearchParams(h.split('?')[1]).get('planId'));
    expect(planIds).toEqual(EXPECTED_PLANS);
  });

  it('every planId the CTAs send is priced by the donations page', () => {
    // Both sides of the contract: a planId the donation page cannot price
    // would land the devotee on an empty amount field with no explanation.
    const donations = readFileSync(
      path.resolve(__dirname, '..', 'app', 'donations', 'page.tsx'),
      'utf8',
    );
    const map = /PLAN_AMOUNTS:\s*Record<string,\s*number>\s*=\s*\{([\s\S]*?)\}/.exec(donations);
    expect(map).toBeTruthy();
    for (const id of EXPECTED_PLANS) {
      expect(map![1]).toContain(id);
    }
  });

  it('the /donations directory carries planId through to the cause it links to', () => {
    // Without this the prefill dies at the first click: /donations?planId=… is
    // the LIST view (no causeId yet), and each cause card rebuilt its own href.
    const donations = readFileSync(
      path.resolve(__dirname, '..', 'app', 'donations', 'page.tsx'),
      'utf8',
    );
    const donateHrefs = donations.match(/donateHref=\{`[^`]+`\}/g) ?? [];
    expect(donateHrefs.length).toBeGreaterThan(0);
    for (const h of donateHrefs) {
      expect(h).toContain('planQuery');
    }
  });
});
