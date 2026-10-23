/**
 * TC-11 (P2, trust) — the two verification claims that survived the first pass.
 *
 * tc11-gaushala-verification-claims.test.tsx removed the `gs_00X` cards, the
 * "Verified" badges, the typed third-party credentials and the "personally
 * verified / complete financial transparency / audited & transparent" copy. Its
 * own closing comment reported what it deliberately did NOT close, and both
 * halves are still live:
 *
 *  1. THE REPLACEMENT COPY RE-ASSERTS VERIFICATION AND ADDS A PROMISE.
 *     The sample-listing disclaimer that DF-08 introduced reads "Your seva is
 *     assigned to a real cow at a verified partner gaushala when your
 *     contribution is confirmed." Every negative regex in the first pass
 *     ("personally verified", "Our Verified Gaushalas", "verified and audited
 *     regularly") walks straight past "verified partner gaushala". And the
 *     assignment half is new: the only endpoint that ever attached a cow to a
 *     donor was `POST /gaushala/adopt`, deleted under COM-19 and now guarded by
 *     apps/api/src/routes/gaushala.adopt-removed.test.ts. Nothing in the repo
 *     assigns a cow to anybody.
 *
 *  2. A FIXTURE DONEE IS PREFILLED INTO THE LIVE DONATION FLOW.
 *     app/gaushala/[id]/page.tsx built every donate CTA as
 *     `/donations?causeId=gs_001&causeKind=gaushala&causeName=Shri%20Krishna%20Gaushala`
 *     from the cow fixture, and labelled the primary button "Donate to Shri
 *     Krishna Gaushala". `gs_001` is not a row: `resolveGaushalaDonee()` refuses
 *     it and POST /donations/create-order answers 400 `gaushala_not_onboarded`.
 *     So the page names a real third-party organisation as the recipient of a
 *     donation it cannot receive, and the devotee fills a form that cannot
 *     succeed. The index page already does the right thing — it links to
 *     `/donations?planId=…`, the directory, where the devotee picks a gaushala
 *     that is actually approved.
 *
 * Assertions run against rendered output and against source with comments
 * stripped, so a note describing a removed claim cannot satisfy a guard.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('../components/ApprovedProvidersStrip', () => ({
  ApprovedProvidersStrip: () => <div data-testid="providers-strip" />,
}));

afterEach(cleanup);

const WEB = path.resolve(__dirname, '..');
const API = path.resolve(WEB, '../api');

function source(rel: string): string {
  return fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Real keys of `allCows`, i.e. three of the eight pages generateStaticParams
 * actually builds. `cow_002` is deliberately NOT here — it is not a key, so it
 * exercises the `?? defaultCow` fallback instead, which carries its own
 * "Shri Krishna Gaushala" and is covered separately below.
 */
const COW_IDS = ['cow_001', 'cow_003', 'cow_004'];

async function renderCow(id: string): Promise<HTMLElement> {
  const { default: CowDetailPage } = await import('../app/gaushala/[id]/page');
  const ui = await CowDetailPage({ params: Promise.resolve({ id }) });
  const { container } = render(ui);
  expect((container.textContent ?? '').length).toBeGreaterThan(500);
  return container;
}

function donateHrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('a[href^="/donations"]')).map(
    (a) => a.getAttribute('href') ?? '',
  );
}

describe('TC-11 — /gaushala claims no verification and promises no assignment', () => {
  it('does not call any gaushala a verified partner', async () => {
    const { default: Page } = await import('../app/gaushala/page');
    const { container } = render(<Page />);
    container.querySelectorAll('script').forEach((s) => s.remove());
    const text = container.textContent ?? '';
    expect(text.length).toBeGreaterThan(500);
    expect(text).not.toMatch(/verified partner/i);
    expect(text).not.toMatch(/verified gaushala/i);
  });

  it('does not promise the seva is assigned to a real cow', async () => {
    const { default: Page } = await import('../app/gaushala/page');
    const { container } = render(<Page />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/assigned to a real cow/i);
    // The disclosure that these are samples must survive the correction.
    expect(text).toMatch(/sample listings/i);
  });

  it('the endpoint that could have assigned a cow is deleted', () => {
    const routes = fs.readFileSync(path.join(API, 'src/routes/gaushala.ts'), 'utf8');
    expect(routes).not.toMatch(/['"]\/adopt['"]/);
    expect(
      fs.existsSync(path.join(API, 'src/routes/gaushala.adopt-removed.test.ts')),
    ).toBe(true);
  });
});

describe('TC-11 — no fixture gaushala reaches a live donate CTA', () => {
  it.each(COW_IDS)('%s: no donate link carries a fabricated donee', async (id) => {
    const container = await renderCow(id);
    const hrefs = donateHrefs(container);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const qs = new URLSearchParams(href.split('?')[1] ?? '');
      expect(qs.get('causeId'), href).toBeNull();
      expect(qs.get('causeName'), href).toBeNull();
    }
  });

  it.each(COW_IDS)('%s: the plan CTAs still carry their planId into /donations', async (id) => {
    const container = await renderCow(id);
    const planIds = donateHrefs(container)
      .map((h) => new URLSearchParams(h.split('?')[1] ?? '').get('planId'))
      .filter((p): p is string => p !== null);
    expect(planIds).toEqual(['plan_daily', 'plan_monthly', 'plan_annual', 'plan_lifetime']);
  });

  it('the primary CTA no longer names a fixture as the recipient', async () => {
    // cow_002 is not a key of allCows, so this also covers the `?? defaultCow`
    // fallback, whose record names Shri Krishna Gaushala too.
    await renderCow('cow_002');
    expect(screen.queryByText(/Donate to Kamdhenu Gaushala/i)).toBeNull();
    expect(screen.queryByText(/Donate to Shri Krishna Gaushala/i)).toBeNull();
  });

  it('the cow detail page discloses that the listing is a sample', async () => {
    const container = await renderCow('cow_001');
    expect(container.textContent ?? '').toMatch(/sample listing/i);
  });

  it('every planId the detail CTAs send is priced by the donations page', () => {
    const donations = source('app/donations/page.tsx');
    const map = /PLAN_AMOUNTS:\s*Record<string,\s*number>\s*=\s*\{([\s\S]*?)\}/.exec(donations);
    expect(map).toBeTruthy();
    for (const id of ['plan_daily', 'plan_monthly', 'plan_annual', 'plan_lifetime']) {
      expect(map![1]).toContain(id);
    }
  });

  it('the API really refuses a fixture gaushala id before any money moves', () => {
    const route = fs.readFileSync(path.join(API, 'src/routes/donations.ts'), 'utf8');
    expect(route).toMatch(/resolveGaushalaDonee/);
    expect(route).toMatch(/gaushala_not_onboarded/);
  });
});

describe('TC-11 — /gaushala/profile/[id], the DB-backed page, says approved not verified', () => {
  // This page is server-rendered from GET /gaushala/:id, so it is asserted on
  // source with comments stripped rather than by faking a fetch.
  const src = source('app/gaushala/profile/[id]/page.tsx');

  it('stamps no Verified badge on a column the product never writes', () => {
    expect(src).not.toMatch(/Verified gaushala/);
    expect(src).toMatch(/Listed gaushala/);
    expect(src).not.toMatch(/Approved gaushala/);
  });

  it('its meta description claims no verification and no direct settlement', () => {
    expect(src).not.toMatch(/Support a verified gaushala/i);
    expect(src).not.toMatch(/reaches the shelter directly/i);
  });

  it('the approval it does claim is the filter the endpoint actually applies', () => {
    const route = fs.readFileSync(path.join(API, 'src/routes/gaushala.ts'), 'utf8');
    expect(route).toMatch(/where:\s*\{\s*approved:\s*true/);
  });
});
