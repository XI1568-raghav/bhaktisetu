import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * TC-01 (P0, trust) — the two tax claims in the cs005 re-send mailer.
 *
 * `scripts/ops/cs005-resend-stale-leads.ts` re-sends 230 stale leads through
 * Resend. Two of its four bodies made claims the code contradicts:
 *
 *   temple:   "- Bhaktisetu Foundation: active 80G + CSR-1 in India"
 *   gaushala: "...monthly disbursement milta hai with 80G receipt for donor."
 *
 * `apps/web/lib/company.ts` records `HAS_80G_VERIFIED: false` and
 * `HAS_CSR1_VERIFIED: false` with `pan`, `eightyGNumber` and `csr1Number` all
 * `null`; `src/lib/pdf-receipt.ts` `is80GEligible()` needs a donee 80G number
 * AND PAN from `gaushala_profiles` columns no route writes. Every receipt the
 * platform has ever minted prints "Proof of donation — not a tax exemption
 * certificate".
 *
 * The CSR-1 half is the worse of the two: a corporate donor's own CSR
 * compliance would rest on it, and an email cannot be recalled.
 *
 * This file lives beside the script rather than under `src/` because
 * `apps/api/tsconfig.json` sets `rootDir: ./src`, so a `src` test importing
 * `scripts/` fails `tsc --noEmit` with TS6059. `vitest.config.ts` includes
 * `scripts/**\/*.test.ts`, so it runs either way.
 *
 * Both cases fail against the tree as it stood before this change.
 */

const LEAD = {
  id: 'lead_2',
  role: 'TEMPLE_MANAGER',
  name: 'Sharma',
  city: 'Varanasi',
  email: 'trust@example.org',
  status: 'EMAILED',
  contactCount: 1,
  lastContactedAt: '2026-06-01T00:00:00.000Z',
  metadata: null,
};

afterEach(() => {
  vi.doUnmock('../../../src/lib/eighty-g.js');
  vi.resetModules();
});

describe('TC-01 — the cs005 mailer claims no registration it does not hold', () => {
  it('neither the temple nor the gaushala body asserts 80G or CSR-1', async () => {
    const mod = await import('../cs005-resend-stale-leads.js');
    for (const templateKey of ['temple', 'gaushala'] as const) {
      const rendered = mod.renderTemplate({ lead: { ...LEAD }, templateKey });
      const blob = `${rendered.subject}\n${rendered.text}\n${rendered.html}`;
      // Guards against an empty render satisfying every negative below.
      expect(blob.length, templateKey).toBeGreaterThan(400);
      expect(blob, templateKey).toContain('Varanasi');
      expect(blob, `${templateKey} still asserts a registration`).not.toMatch(
        /active 80G|80G \+ CSR-1|with 80G receipt for donor/i,
      );
    }
  });

  it('the temple body states the registration status instead of omitting it', async () => {
    const mod = await import('../cs005-resend-stale-leads.js');
    const r = mod.renderTemplate({ lead: { ...LEAD }, templateKey: 'temple' });
    // A silent deletion would pass the negatives above; the prospect is
    // entitled to be told, not merely not-lied-to.
    expect(`${r.text}${r.html}`).toMatch(/80G ya CSR-1 registered nahi hai/i);
  });

  it('the gaushala body still promises a receipt, and says what it is not', async () => {
    const mod = await import('../cs005-resend-stale-leads.js');
    const r = mod.renderTemplate({ lead: { ...LEAD }, templateKey: 'gaushala' });
    const body = `${r.text}${r.html}`;
    expect(body).toMatch(/numbered receipt PDF/i);
    expect(body).toMatch(/tax-exemption certificate nahi/i);
    // The donee's own 80G number is still collected — that part was true.
    expect(body).toMatch(/80G regn \+ PAN bhejein/);
  });

  it('is a gate: both lines return verbatim when the registrations exist', async () => {
    const actual = await vi.importActual<typeof import('../../../src/lib/eighty-g.js')>(
      '../../../src/lib/eighty-g.js',
    );
    vi.doMock('../../../src/lib/eighty-g.js', () => ({
      ...actual,
      HAS_80G: true,
      HAS_CSR1: true,
      COMPLIANCE_LINE: 'Bhaktisetu Foundation: active 80G + CSR-1 in India',
    }));
    vi.resetModules();
    const mod = await import('../cs005-resend-stale-leads.js');
    const temple = mod.renderTemplate({ lead: { ...LEAD }, templateKey: 'temple' });
    expect(`${temple.text}${temple.html}`).toMatch(/active 80G \+ CSR-1 in India/);
    const gaushala = mod.renderTemplate({ lead: { ...LEAD }, templateKey: 'gaushala' });
    expect(`${gaushala.text}${gaushala.html}`).toMatch(/Donor ko 80G receipt milti hai/);
  });
});
