/**
 * PM-05 (prod sweep 2026-08-12, AREA pricing-market) — /uk quoted a fabricated
 * rupee column and a 9-10x NRI premium the platform does not charge.
 *
 * What was live at apps/web/app/uk/page.tsx:102-109 — a hardcoded SAMPLE_PUJAS
 * table — against GET /api/v1/pujas/types read on 2026-08-13:
 *
 *     row on /uk                        page ₹    live ₹    page £
 *     Rudrabhishek (Kashi Vishwanath)     2,500     1,100      240
 *     Satyanarayan Katha                  1,500     1,501      145
 *     Lakshmi Puja (Diwali)               2,100       901      200
 *     Mahamrityunjaya Jaap 11,000         5,500     2,501      525
 *     Shraadh Pitru Paksh                 3,100     2,501*     295
 *                                                   (*closest live SKU is
 *                                                    pitru-dosh-nivaran-puja;
 *                                                    no "Shraadh" SKU exists)
 *
 * The £ column came from `gbpFromInr(inr)`, whose default `multiplier = 10`
 * applied the "NRI pricing is 9-10x domestic" business rule client-side. That
 * rule is NOT applied server-side: booking.service charges `basePrice` to
 * everyone (the isNri price swap was deliberately removed, with a test pinning
 * it), so £240 stood against a puja the gateway is asked ₹1,100 for — about
 * £10.50. A 23x overstatement on the dedicated diaspora acquisition surface.
 *
 * Supporting copy asserted three things that are also not true: "Final price at
 * checkout reflects live FX and temple-specific fees" (there is no FX at
 * checkout — INR only — and no temple-specific fee), and "covers … USD/GBP
 * infrastructure" (Stripe was removed 2026-08-11; there is no USD/GBP rail).
 *
 * These tests hold the line on four things:
 *   1. every ₹ figure on the page comes from the live catalogue;
 *   2. the £ figure is a straight FX conversion of the amount ACTUALLY charged;
 *   3. the page makes no NRI-premium / live-FX / USD-GBP claim;
 *   4. an unreachable catalogue renders NO price table — never a fixture.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { gbpFromInr, pujaCatalogFromPayload, FX_INR_PER_GBP } from '../lib/pricing';
import { PLATFORM_FEE_INR } from '../lib/puja-pricing';

/** Verbatim shape + values of GET /api/v1/pujas/types on 2026-08-13. */
const LIVE_CATALOG = {
  pujaTypes: [
    { slug: 'rudrabhishek', name: 'Rudrabhishek', category: 'planetary', basePrice: '1100', nriPrice: '9999' },
    { slug: 'ganesh-puja', name: 'Ganesh Puja', category: 'special_occasion', basePrice: '751', nriPrice: '6999' },
    { slug: 'satyanarayan-katha', name: 'Satyanarayan Katha', category: 'special_occasion', basePrice: '1501', nriPrice: '13999' },
    { slug: 'maha-mrityunjay-jaap', name: 'Maha Mrityunjay Jaap', category: 'health', basePrice: '2501', nriPrice: '22999' },
    { slug: 'lakshmi-puja', name: 'Lakshmi Puja', category: 'prosperity', basePrice: '901', nriPrice: '8499' },
    { slug: 'navgraha-shanti-puja', name: 'Navgraha Shanti Puja', category: 'planetary', basePrice: '2101', nriPrice: '18999' },
    { slug: 'sunderkand-path', name: 'Sunderkand Path', category: 'devotional', basePrice: '1101', nriPrice: '9999' },
    { slug: 'hanuman-chalisa-path', name: 'Hanuman Chalisa Path', category: 'devotional', basePrice: '451', nriPrice: '3999' },
    { slug: 'ram-charit-manas-path', name: 'Ram Charit Manas Path', category: 'devotional', basePrice: '3501', nriPrice: '31999' },
    { slug: 'pitru-dosh-nivaran-puja', name: 'Pitru Dosh Nivaran Puja', category: 'ancestral', basePrice: '2501', nriPrice: '22999' },
  ],
};

const LIVE_INR = new Set(LIVE_CATALOG.pujaTypes.map((p) => Number(p.basePrice)));

/** The five rupee amounts the hardcoded table published. */
const FABRICATED_INR = [2500, 1500, 2100, 5500, 3100];
/** The five pound amounts the 10x multiplier produced. */
const FABRICATED_GBP = [240, 145, 200, 525, 295];

function stubCatalog(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    }),
  );
}

async function renderUk() {
  vi.resetModules();
  const UkPage = (await import('../app/uk/page')).default;
  return render(await UkPage());
}

/** Every "₹1,234" / "£240" style amount in the rendered document. */
function amounts(symbol: '₹' | '£'): number[] {
  const text = document.body.textContent ?? '';
  const re = new RegExp(`${symbol}\\s?([\\d,]+)`, 'g');
  const out: number[] = [];
  for (const m of text.matchAll(re)) {
    const n = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('PM-05 — gbpFromInr applies no NRI multiplier', () => {
  it('converts the amount actually charged, at the reference spot rate', () => {
    expect(FX_INR_PER_GBP).toBe(105);
    // ₹1,100 is what the gateway is asked for a Rudrabhishek. £10, not £240.
    expect(gbpFromInr(1100)).toBe(Math.round(1100 / FX_INR_PER_GBP));
    expect(gbpFromInr(1100)).toBe(10);
    expect(gbpFromInr(1501)).toBe(14);
  });

  it('produces none of the five 10x figures the page used to publish', () => {
    for (const inr of [1100, 1501, 901, 2501, 3501]) {
      expect(FABRICATED_GBP).not.toContain(gbpFromInr(inr));
    }
  });

  it('is non-negative and never rounds a real price to zero', () => {
    expect(gbpFromInr(0)).toBe(0);
    expect(gbpFromInr(-5)).toBe(0);
    expect(gbpFromInr(Number.NaN)).toBe(0);
    expect(gbpFromInr(40)).toBeGreaterThan(0);
  });
});

describe('PM-05 — the catalogue parser never invents a price', () => {
  it('parses the API string basePrice into a number', () => {
    const rows = pujaCatalogFromPayload(LIVE_CATALOG);
    expect(rows).toHaveLength(10);
    const rudra = rows.find((r) => r.slug === 'rudrabhishek');
    expect(rudra?.basePrice).toBe(1100);
    expect(typeof rudra?.basePrice).toBe('number');
  });

  it('DROPS a row whose price is missing or unparseable — never defaults it', () => {
    const rows = pujaCatalogFromPayload({
      pujaTypes: [
        { slug: 'ok', name: 'Ok', basePrice: '999' },
        { slug: 'no-price', name: 'No price' },
        { slug: 'junk', name: 'Junk', basePrice: 'free' },
        { slug: 'negative', name: 'Negative', basePrice: '-1' },
      ],
    });
    expect(rows.map((r) => r.slug)).toEqual(['ok']);
  });

  it('returns [] for a malformed payload rather than throwing', () => {
    expect(pujaCatalogFromPayload(null)).toEqual([]);
    expect(pujaCatalogFromPayload({ pujaTypes: 'nope' })).toEqual([]);
    expect(pujaCatalogFromPayload({})).toEqual([]);
  });
});

describe('PM-05 — /uk publishes only catalogue prices', () => {
  it('every rupee figure on the page is a live basePrice', async () => {
    stubCatalog(LIVE_CATALOG);
    await renderUk();
    const rendered = amounts('₹');
    expect(rendered.length).toBeGreaterThan(0);
    for (const inr of rendered) {
      // Two rupee figures on the page are legitimately not catalogue prices:
      // the FX reference rate, and the checkout platform fee. Both are read
      // from the constant they describe, asserted separately below.
      if (inr === FX_INR_PER_GBP || inr === PLATFORM_FEE_INR) continue;
      expect(LIVE_INR.has(inr), `₹${inr} is not in the live catalogue`).toBe(true);
    }
  });

  it('quotes the checkout platform fee from the constant checkout charges', async () => {
    stubCatalog(LIVE_CATALOG);
    await renderUk();
    // Both sides of the contract: if lib/puja-pricing changes the fee, this
    // sentence has to move with it or the page is quoting a stale total.
    expect(document.body.textContent ?? '').toContain(`₹${PLATFORM_FEE_INR} platform fee`);
  });

  it('publishes none of the five fabricated rupee figures', async () => {
    stubCatalog(LIVE_CATALOG);
    await renderUk();
    const text = document.body.textContent ?? '';
    for (const inr of FABRICATED_INR) {
      expect(text, `fabricated ₹${inr} still on the page`).not.toContain(
        `₹${inr.toLocaleString('en-IN')}`,
      );
    }
  });

  it('every pound figure is a straight conversion of the price charged', async () => {
    stubCatalog(LIVE_CATALOG);
    await renderUk();
    const gbp = amounts('£');
    expect(gbp.length).toBeGreaterThan(0);
    const maxHonest = Math.ceil(Math.max(...LIVE_INR) / FX_INR_PER_GBP);
    for (const g of gbp) {
      expect(
        g,
        `£${g} exceeds a straight FX conversion of the dearest live puja (£${maxHonest})`,
      ).toBeLessThanOrEqual(maxHonest);
    }
    for (const g of FABRICATED_GBP) {
      expect(gbp, `10x figure £${g} still published`).not.toContain(g);
    }
  });
});

describe('PM-05 — no claim the checkout does not honour', () => {
  it('makes no NRI-premium, live-FX or USD/GBP-infrastructure claim', async () => {
    stubCatalog(LIVE_CATALOG);
    await renderUk();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/9-10x/i);
    expect(text).not.toMatch(/live FX/i);
    expect(text).not.toMatch(/temple-specific fees/i);
    expect(text).not.toMatch(/USD\/GBP infrastructure/i);
  });

  it('still says plainly that billing is in INR', async () => {
    stubCatalog(LIVE_CATALOG);
    await renderUk();
    expect(document.body.textContent ?? '').toMatch(/billed in INR|charged in INR/i);
  });
});

describe('PM-05 — an unreachable catalogue shows no prices, not a fixture', () => {
  it('renders no price table when the catalogue fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await renderUk();
    expect(screen.queryByRole('table')).toBeNull();
    const text = document.body.textContent ?? '';
    for (const inr of FABRICATED_INR) {
      expect(text).not.toContain(`₹${inr.toLocaleString('en-IN')}`);
    }
    for (const g of FABRICATED_GBP) {
      expect(text).not.toContain(`£${g}`);
    }
  });

  it('says so honestly instead of going silent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await renderUk();
    expect(screen.getByTestId('uk-prices-unavailable')).toBeTruthy();
  });

  it('renders no price table when the catalogue is empty', async () => {
    stubCatalog({ pujaTypes: [] });
    await renderUk();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
