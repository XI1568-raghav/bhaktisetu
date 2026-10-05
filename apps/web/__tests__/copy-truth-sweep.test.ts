import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  REFUND_DAYS_LABEL,
  REFUND_INTERNATIONAL_CARD_LABEL,
  REFUND_INTERNATIONAL_NOTE,
  REFUND_SETTLEMENT_BANDS,
  REFUND_SETTLEMENT_SENTENCE,
} from '../lib/cancellation-policy';

/**
 * Copy-truth sweep (2026-10-05). Source-scan guards for statements the product
 * cannot back today. Comments are stripped before scanning, so the record of a
 * removed sentence never trips the guard that removed it.
 *
 * What is pinned here:
 *   1. /shipping promises only what exists (India-only store delivery, an
 *      optional flat prasad add-on) - no couriers, no international delivery.
 *   2. One refund-timing statement: web constants == API constants == the
 *      cancel-quote `refundDaysLabel`; "up to 14 business days" for
 *      international cards appears only as a bank/gateway timing.
 *   3. /nri-pujas and /nri make no unqualified card, country, delivery,
 *      WhatsApp or e-mail promises.
 *   4. A repo-wide ban list of unbacked superlatives / SLAs across web+mobile.
 */
const webRoot = join(__dirname, '..');
const repoRoot = join(webRoot, '..', '..');

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
const read = (abs: string) => readFileSync(abs, 'utf8');
const web = (rel: string) => stripComments(read(join(webRoot, rel)));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '__tests__' || name === 'e2e') continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.|\.d\.ts$/.test(name)) out.push(abs);
  }
  return out;
}

describe('1. /shipping states only what exists', () => {
  const src = web('app/shipping/page.tsx');

  it('names no courier and promises no international delivery', () => {
    expect(src).not.toMatch(/DHL|FedEx|India Post|Speed Post|Delhivery|Blue Dart|DTDC|Ekart/i);
    expect(src).not.toMatch(/7\s*(&ndash;|-|–)\s*15|international\s+(delivery|orders|prasad)/i);
    expect(src).not.toMatch(/ship(s|ped)? (store )?(products? )?(abroad|worldwide|internationally)/i);
  });

  it('says store delivery is India only', () => {
    expect(src).toMatch(/within India only/i);
  });

  it('describes prasad as an optional flat add-on at the real fee, with no date promised', () => {
    expect(src).toContain('PRASAD_DELIVERY_FEE_INR');
    expect(src).toMatch(/optional/i);
    expect(src).toMatch(/do not promise a delivery date/i);
  });

  it('invents no COD fee, cut-off time or tracking e-mail/SMS', () => {
    expect(src).not.toMatch(/&#8377;40|₹40|2:00 PM|SMS|Sundays/);
  });

  it('the privacy policy does not name couriers either', () => {
    expect(web('app/privacy/page.tsx')).not.toMatch(/India Post|Delhivery/);
  });
});

describe('2. one refund-timing statement', () => {
  const apiTiming = read(join(repoRoot, 'apps/api/src/lib/refund-timing.ts'));
  const apiCancel = read(join(repoRoot, 'apps/api/src/services/cancellation.service.ts'));

  it('the web label equals the API label equals the cancel-quote label', () => {
    const apiDays = apiTiming.match(/REFUND_DAYS_LABEL\s*=\s*'([^']+)'/);
    expect(apiDays).not.toBeNull();
    expect(REFUND_DAYS_LABEL).toBe(apiDays![1]);
    // The policy snapshot (and so `refundDaysLabel` in the cancel quote) is the
    // same literal.
    const quote = apiCancel.match(/refundDaysLabel:\s*'([^']+)'/);
    expect(quote).not.toBeNull();
    expect(quote![1]).toBe(apiDays![1]);
    expect(quote![1]).toBe(REFUND_DAYS_LABEL);
  });

  it('the international-card ceiling is mirrored exactly', () => {
    const apiIntl = apiTiming.match(/REFUND_INTERNATIONAL_CARD_LABEL\s*=\s*'([^']+)'/);
    expect(apiIntl).not.toBeNull();
    expect(REFUND_INTERNATIONAL_CARD_LABEL).toBe(apiIntl![1]);
  });

  it('the international figure is framed as card-issuer timing, never as a Darshya promise', () => {
    expect(REFUND_INTERNATIONAL_NOTE).toMatch(/card issuer/i);
    expect(REFUND_INTERNATIONAL_NOTE).toMatch(/not by Darshya/i);
    expect(REFUND_SETTLEMENT_SENTENCE).toContain(REFUND_DAYS_LABEL);
    expect(REFUND_SETTLEMENT_SENTENCE).toContain(REFUND_INTERNATIONAL_CARD_LABEL);
    expect(REFUND_SETTLEMENT_SENTENCE).toMatch(/not by Darshya/i);
    expect(REFUND_SETTLEMENT_BANDS).toHaveLength(2);
  });

  it('the quote route also publishes the international label', () => {
    expect(read(join(repoRoot, 'apps/api/src/routes/bookings.ts'))).toMatch(
      /refundInternationalCardLabel:\s*REFUND_INTERNATIONAL_CARD_LABEL/,
    );
  });

  it('no web surface keeps the retired 7-14 day international band or a 3-5 day refund', () => {
    const hits: string[] = [];
    for (const abs of [...walk(join(webRoot, 'app')), ...walk(join(webRoot, 'components')), ...walk(join(webRoot, 'lib'))]) {
      const code = stripComments(read(abs));
      if (/7\s*(-|–|&ndash;)\s*14 business days|refunds?[^.\n]{0,60}3\s*(-|–)\s*5 (business )?days|refund[^.\n]{0,40}within 1 hour|processed within 1 hour/i.test(code)) {
        hits.push(relative(webRoot, abs));
      }
    }
    expect(hits).toEqual([]);
  });

  it('every cancel / refund surface renders the shared constants', () => {
    for (const rel of ['app/bookings/view/page.tsx', 'app/refunds/page.tsx']) {
      expect(web(rel)).toMatch(/REFUND_INTERNATIONAL_NOTE/);
    }
    expect(web('app/bookings/view/page.tsx')).toMatch(/REFUND_DAYS_LABEL/);
  });

  it('API user-facing refund text names the same two figures', () => {
    for (const rel of ['apps/api/src/services/refund.service.ts', 'apps/api/src/lib/email.ts']) {
      const code = stripComments(read(join(repoRoot, rel)));
      expect(code, rel).toMatch(/REFUND_DAYS_LABEL/);
      expect(code, rel).toMatch(/REFUND_INTERNATIONAL_CARD_LABEL/);
      expect(code, rel).not.toMatch(/within 5-7 business days/);
    }
  });
});

describe('3. /nri-pujas and /nri promise only what the code can deliver', () => {
  const nriPujas = web('app/nri-pujas/page.tsx');
  const nri = web('app/nri/page.tsx');

  it('no unqualified "accepts international cards" claim', () => {
    expect(nriPujas).not.toMatch(/Razorpay accepts international cards/i);
    for (const [name, src] of [['nri-pujas', nriPujas], ['nri', nri]] as const) {
      for (const line of src.split('\n').filter((l) => /international card/i.test(l))) {
        expect(line, `${name}: ${line.trim()}`).toMatch(/where your card issuer|allows international|issuer and Razorpay|can take longer|not by Darshya/i);
      }
    }
  });

  it('no countries-served list, no delivery timeline, no live-puja promise', () => {
    expect(nriPujas).not.toMatch(/USA, UK, Canada, Australia, Singapore, UAE/);
    expect(nriPujas).not.toMatch(/Trusted by/i);
    expect(nriPujas).not.toMatch(/7-21 days|7-14 days|international delivery/i);
    expect(nriPujas).not.toMatch(/under 5 minutes|3 minutes online/);
  });

  it('no WhatsApp / e-mail notification promises', () => {
    for (const [name, src] of [['nri-pujas', nriPujas], ['nri', nri]] as const) {
      expect(src, name).not.toMatch(/video proof on WhatsApp|WhatsApp (link|confirmation|coordination)|notified by email|confirmation is emailed|emailed to you|by email within/i);
    }
  });

  it('points at the booking page for status instead', () => {
    expect(nriPujas).toMatch(/booking page always shows/i);
  });

  it('does not claim prasad reaches every country or a delivery window', () => {
    expect(nriPujas).toMatch(/do not promise delivery to any particular country/i);
  });
});

/**
 * 4. Repo-wide ban list. Each entry is a claim with no backing in the product.
 * `allow` lists files where the phrase is legitimate (a gated branch, a fact
 * about a real temple, internal admin data).
 */
const BANNED: Array<{ name: string; re: RegExp; allow?: RegExp }> = [
  { name: '100% verified', re: /100% verified/i },
  {
    name: 'Aadhaar-verified pandits (a payout gate, not a credential check)',
    re: /(pandits?|priests?) (is|are) aadhaar[- ]verified|aadhaar[- ]verified (pandits?|priests?)/i,
    allow: /api\/src\/lib\/pandit-vetting\.ts$/, // gated behind HAS_PANDIT_VETTING
  },
  { name: 'video proof guaranteed', re: /video proof guaranteed/i },
  { name: 'live video proof (it is a recording, not a stream)', re: /live video (proof|recording)/i },
  { name: 'temple / astrologer counts nothing backs', re: /\b(30|40|50|100|200)\+ (verified )?(temples|shrines|countries|verified astrologers)\b/i },
  { name: '24/7 or 24x7 support / availability', re: /24\/7 (support|coordinator|WA|available|via)|available 24\/7|24x7|24 ?hr live-stream/i },
  { name: 'emailed instantly', re: /emailed instantly|receipt emailed/i },
  { name: 'worldwide prasad', re: /prasad (ships|shipped) worldwide|worldwide prasad|ships worldwide/i },
  { name: 'stale commission range', re: /20\s*[–-]\s*40%|30\s*[–-]\s*45%/ },
  {
    name: 'support / coordinator response-time SLAs',
    re: /(reply|replies|respond|responds|call|calls|reach out|call you back|confirm)[^.\n]{0,25}within (the next )?(4|2|1) (working )?hours?|within (30|\d+) minutes|within 4 working hours|within 48 hours\.?["'`]/i,
    allow: /\/(admin|astrologer-portal|provider|store-admin|priest|temple-portal)\//,
  },
  { name: '"verified astrologers"', re: /verified (vedic )?astrologers?/i },
  { name: 'trusted by N', re: /trusted by [0-9]|[0-9][0-9,]*\+ (devotees|families)\b/i },
];

describe('4. repo-wide unbacked-claim ban list (web + mobile + api user strings)', () => {
  const files = [
    ...walk(join(webRoot, 'app')),
    ...walk(join(webRoot, 'components')),
    ...walk(join(webRoot, 'lib')).filter((f) => !/lib\/(tirthas|cities|temple-details|vrats|festivals|deities|sacred-mountains|muhurats|yatra-destinations|free-pandit-topics|pilgrimage-circuits)\.ts$/.test(f)),
    ...walk(join(repoRoot, 'apps/mobile/app')),
    ...walk(join(repoRoot, 'apps/mobile/lib')),
    join(repoRoot, 'apps/api/src/routes/support.ts'),
    join(repoRoot, 'apps/api/src/routes/gift-puja.ts'),
    join(repoRoot, 'apps/api/src/routes/antim-sanskar.ts'),
    join(repoRoot, 'apps/api/src/routes/outreach-webhook.ts'),
    join(repoRoot, 'apps/api/src/integrations/claude.ts'),
    join(webRoot, 'lib/i18n/en.json'),
  ];

  for (const rule of BANNED) {
    it(`no "${rule.name}"`, () => {
      const hits: string[] = [];
      for (const abs of files) {
        if (rule.allow?.test(abs)) continue;
        const raw = read(abs);
        const code = abs.endsWith('.json') ? raw : stripComments(raw);
        const lines = code.split('\n');
        lines.forEach((line, i) => {
          if (rule.re.test(line)) hits.push(`${relative(repoRoot, abs)}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
      }
      expect(hits).toEqual([]);
    });
  }

  it('support chat (API) and /support (web) agree on the international-card refund framing', () => {
    const api = stripComments(read(join(repoRoot, 'apps/api/src/routes/support.ts')));
    expect(api).toMatch(/REFUND_INTERNATIONAL_CARD_LABEL/);
    expect(api).not.toMatch(/Refunds reach your account in 3-5/);
  });

  it('store delivery is described as India-only wherever it is described', () => {
    const support = web('lib/support.ts');
    expect(support).not.toMatch(/7-14 (business )?days international|International: 7-14/i);
    expect(support).toMatch(/within India only/i);
  });
});
