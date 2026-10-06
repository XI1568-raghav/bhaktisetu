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
import {
  HAS_ADOPTION_EXTRAS,
  HAS_COMPANION_VETTING,
  HAS_HOME_PUJA_INCLUSIONS,
  HAS_PACKAGE_INCLUSIONS,
  HAS_PUJA_MATERIALS_PROMISE,
  HAS_VERIFIED_INSTRUCTORS,
  HAS_VERIFIED_TESTIMONIALS,
} from '../lib/launch-gates';
import {
  HOME_PUJA_MATERIALS_RE,
  homePujaCategories,
  homePujaFaq,
  homePujaIncluded,
  homePujaTierDetails,
  marriagePricingTiers,
  marriageAddOnList,
  marriageTierIncludes,
} from '../lib/home-pujas';

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
 *   5-9. (2026-10-05, second sweep) Claims with no code behind them are gated
 *      behind lib/launch-gates.ts flags (false today) or reworded: gaushala
 *      adoption extras, home-puja inclusions, yatra / wellness package
 *      inclusions, yatra companion vetting, store returns. While a flag is
 *      false the claim must not render; flipping it restores the old copy.
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
    expect(nriPujas).toMatch(/Prasad is delivered within India only/i);
    expect(nriPujas).not.toMatch(/write to us first/i);
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


/**
 * 5-9. Second sweep: claims with no code behind them.
 * The gate constants are false today. The tests pin (a) that they ARE false
 * (flipping one is a deliberate act that must update this file), and (b) that
 * every ungated occurrence of the claim is gone from the source.
 */
describe('5. launch gates are closed until the feature behind each exists', () => {
  it('all seven gates are false', () => {
    expect([
      HAS_ADOPTION_EXTRAS,
      HAS_HOME_PUJA_INCLUSIONS,
      HAS_PUJA_MATERIALS_PROMISE,
      HAS_PACKAGE_INCLUSIONS,
      HAS_COMPANION_VETTING,
      HAS_VERIFIED_TESTIMONIALS,
      HAS_VERIFIED_INSTRUCTORS,
    ]).toEqual([false, false, false, false, false, false, false]);
  });

  it('the API mirror of the gates is closed too', () => {
    const api = read(join(repoRoot, 'apps/api/src/lib/launch-gates.ts'));
    expect(api).toMatch(/HAS_ADOPTION_EXTRAS\s*=\s*false/);
    expect(api).toMatch(/HAS_WELLNESS_PROGRAM_PACKAGES\s*=\s*false/);
  });
});

describe('6. gaushala adoption extras (donor wall, certificate, updates, visits)', () => {
  const EXTRA_LINES = [
    'Name on gaushala donor wall',
    'Digital seva certificate',
    'Weekly photo & video updates',
    'Digital certificate with cow details',
    'Monthly health report',
    'Framed certificate with cow photo',
    'Premium framed certificate',
    'Name plaque at gaushala',
    'Annual Gau Puja invitation',
    'Visit your cow anytime',
  ];

  /** The extras may only appear after an `extras:` key, never after `features:`. */
  function expectExtrasParked(defs: string, quote: string) {
    for (const line of EXTRA_LINES) {
      const at = defs.indexOf(`${quote}${line}${quote}`);
      if (at === -1) continue;
      const before = defs.slice(0, at);
      expect(before.lastIndexOf('extras:'), `${line} must sit under extras`).toBeGreaterThan(before.lastIndexOf('features:'));
    }
  }

  it('web plan list parks the extras and renders them only as "Coming soon"', () => {
    const src = web('app/gaushala/page.tsx');
    expect(src).toMatch(/HAS_ADOPTION_EXTRAS/);
    const defs = src.slice(src.indexOf('const adoptionPlanDefs'), src.indexOf('const adoptionPlans ='));
    expect(defs.length).toBeGreaterThan(100);
    expectExtrasParked(defs, '"');
    expect(src).toMatch(/Coming soon:/);
  });

  it('web plan features promise only cow care and the receipt', () => {
    const src = web('app/gaushala/page.tsx');
    const defs = src.slice(src.indexOf('const adoptionPlanDefs'), src.indexOf('const adoptionPlans ='));
    const featureLines = [...defs.matchAll(/features:\s*\[([^\]]*)\]/g)].map((m) => m[1]);
    expect(featureLines).toHaveLength(4);
    for (const f of featureLines) {
      expect(f).toMatch(/RECEIPT_FEATURE/);
      expect(f).not.toMatch(/certificate|wall|photo|video|visit|plaque|invitation|health report/i);
    }
  });

  it('gaushala hero, badges and cow page do not promise updates, visits or a timeline while gated', () => {
    const idx = web('app/gaushala/page.tsx');
    expect(idx).toMatch(/Photo updates, certificates and visits are coming soon/);
    expect(idx).toMatch(/label: HAS_ADOPTION_EXTRAS \? "Visit Anytime" : "Gaushala Visits"/);
    expect(idx).toMatch(/sub: HAS_ADOPTION_EXTRAS \? "Open-door policy" : "Coming soon"/);
    const cow = web('app/gaushala/[id]/page.tsx');
    expect(cow).toMatch(/Photo updates from the gaushala are coming soon/);
    expect(cow).toMatch(/LISTING_IS_SAMPLE \|\| !HAS_ADOPTION_EXTRAS/);
  });

  it('the 80G promise stays tied to the verified flag (a receipt that cannot carry it makes no tax claim)', () => {
    expect(web('app/gaushala/page.tsx')).toMatch(/HAS_80G\s*\?\s*"80G tax receipt"/);
    const api = stripComments(read(join(repoRoot, 'apps/api/src/services/gaushala.service.ts')));
    expect(api).toMatch(/HAS_80G\s*\?\s*'80G tax receipt'/);
  });

  it('API plans: extras reach `features` only behind HAS_ADOPTION_EXTRAS, else `comingSoon`', () => {
    const api = stripComments(read(join(repoRoot, 'apps/api/src/services/gaushala.service.ts')));
    expect(api).toMatch(/HAS_ADOPTION_EXTRAS/);
    expect(api).toMatch(/comingSoon: extras/);
    const defs = api.slice(api.indexOf('const ADOPTION_PLAN_DEFS'), api.indexOf('const ADOPTION_PLANS:'));
    expect(defs.length).toBeGreaterThan(100);
    expectExtrasParked(defs, "'");
  });

  it('provider-facing and comparison copy makes no weekly-tracking or donor-photo promise', () => {
    expect(web('app/why-darshya/page.tsx')).not.toMatch(/weekly tracking/i);
    expect(web('app/list-gaushala/page.tsx')).not.toMatch(/Monthly photos build/i);
    expect(read(join(repoRoot, 'apps/mobile/app/(onboard)/list-gaushala.tsx'))).not.toMatch(/Monthly photos build/i);
  });
});

describe('7. puja inclusions (home puja samagri / prasadam, temple puja materials)', () => {
  it('home-puja pages gate their inclusion copy and say details are confirmed on the call', () => {
    for (const rel of [
      'app/pujas/home-puja/page.tsx',
      'app/pujas/home-puja/[slug]/page.tsx',
      'app/pujas/home-puja/book/BookHomePujaClient.tsx',
    ]) {
      expect(web(rel), rel).toMatch(/HAS_HOME_PUJA_INCLUSIONS/);
    }
    const slug = web('app/pujas/home-puja/[slug]/page.tsx');
    expect(slug).toMatch(/HOME_PUJA_CONFIRMED_ON_CALL/);
    expect(slug).not.toMatch(/\} verified/);
    expect(slug).not.toMatch(/Verified specialists/);
  });

  it('while gated, no home-puja category renders a samagri / prasad / idol / ghee promise', () => {
    expect(HAS_HOME_PUJA_INCLUSIONS).toBe(false);
    for (const cat of homePujaCategories) {
      for (const item of homePujaIncluded(cat)) expect(item, `${cat.slug}: ${item}`).not.toMatch(HOME_PUJA_MATERIALS_RE);
      for (const tier of ['basic', 'standard', 'premium'] as const) {
        expect(homePujaTierDetails(cat, tier), `${cat.slug}/${tier}`).toEqual([]);
      }
      for (const f of homePujaFaq(cat)) expect(`${f.q} ${f.a}`, cat.slug).not.toMatch(HOME_PUJA_MATERIALS_RE);
    }
  });

  it('the ceremony rites survive the filter (the page keeps its content)', () => {
    for (const cat of homePujaCategories) expect(homePujaIncluded(cat).length, cat.slug).toBeGreaterThan(0);
  });

  it('while gated, no marriage tier promises samagri', () => {
    for (const tier of marriagePricingTiers) {
      for (const item of marriageTierIncludes(tier)) expect(item, `${tier.slug}: ${item}`).not.toMatch(HOME_PUJA_MATERIALS_RE);
    }
    const src = web('app/pujas/marriage/page.tsx');
    expect(src).toMatch(/HAS_HOME_PUJA_INCLUSIONS \? 'Full samagri'/);
    expect(src).toMatch(/confirmed by our team on the call/);
  });

  it('/pujas index cards no longer print an unqualified "Samagri included"', () => {
    const src = web('app/pujas/(index)/page.tsx');
    expect(src).not.toMatch(/>\s*(Full )?[Ss]amagri included\s*</);
    expect(src).toMatch(/HAS_HOME_PUJA_INCLUSIONS \? 'Samagri included'/);
  });

  it('temple puja pages gate "Samagri included" / "materials arranged by the temple"', () => {
    const slug = web('app/pujas/[slug]/page.tsx');
    expect(slug).toMatch(/HAS_PUJA_MATERIALS_PROMISE && puja\.samagriIncluded/);
    expect(slug).toMatch(/Your booking covers the puja fee, the platform fee and the optional prasad add-on/);
    const city = web('app/puja/[city]/[slug]/page.tsx');
    expect(city).toMatch(/HAS_PUJA_MATERIALS_PROMISE &&/);
    expect(city).not.toContain("What\\'s included");
    expect(city).not.toMatch(/aim to share within 24-48 hours/);
  });
});

describe('8. yatra / wellness / yatra-packages inclusions and companions', () => {
  it('/yatra-packages: no all-inclusive promise, seed-script text or ungated /book link', () => {
    const list = web('app/yatra-packages/page.tsx');
    expect(list).toMatch(/HAS_PACKAGE_INCLUSIONS|HAS_VERIFIED_TESTIMONIALS/);
    expect(list).not.toMatch(/Run the seed script/);
    const detail = web('app/yatra-packages/[slug]/page.tsx');
    expect(detail).toMatch(/INCLUSIONS_ON_ENQUIRY/);
    expect(detail).toMatch(/mailto:care@darshya\.online/);
    const at = detail.indexOf('/book`}');
    expect(detail.slice(0, at)).toMatch(/HAS_PACKAGE_INCLUSIONS \? \(\s*<Link/);
  });

  it('/yatra and /yatra/[slug]: stay / meals / transport / guide / helicopter / add-ons are behind the gate', () => {
    const idx = web('app/yatra/page.tsx');
    expect(idx).toMatch(/HAS_PACKAGE_INCLUSIONS \? 'Inclusions listed per package' : 'Inclusions confirmed on enquiry'/);
    expect(idx).toMatch(/HAS_PACKAGE_INCLUSIONS && y\.helicopterAvailable/);
    const slug = web('app/yatra/[slug]/page.tsx');
    expect((slug.match(/HAS_PACKAGE_INCLUSIONS && yatra\.helicopterAvailable/g) ?? []).length).toBe(2);
    expect(slug).toMatch(/\(HAS_PACKAGE_INCLUSIONS \? pkg\.includes : \[\]\)/);
    expect(slug).toMatch(/HAS_PACKAGE_INCLUSIONS && \(\s*<div className="flex flex-wrap gap-3 text-xs"/);
    expect(slug).toMatch(/HAS_PACKAGE_INCLUSIONS \? 'Book' : 'Enquire about'/);
    expect(slug).toMatch(/\{HAS_PACKAGE_INCLUSIONS && \(\s*<>\s*\n?\s*<div className="mt-8">\s*<p[^>]*>Popular add-ons/);
  });

  it('/yatra/plan: the dead "Request Advisor Quote" button and the 24-hour quote promise are gone', () => {
    const src = web('app/yatra/plan/page.tsx');
    expect(src).not.toMatch(/within 24 hours/);
    expect(src).not.toMatch(/<button className=\{buttonClass\('primary', 'md', 'mt-4 w-full btn-press'\)\}>\s*Request Advisor Quote/);
    expect(src).toMatch(/mailto:care@darshya\.online/);
  });

  it('/wellness: every certified / thousands / free-session / recorded-library / every-day claim sits inside the gate', () => {
    const src = web('app/wellness/page.tsx');
    expect(src).not.toMatch(/Verified instructors on Darshya/);
    const re = /certified instructors|thousands of practitioners|first guided meditation session is free|growing library|every morning and evening/gi;
    let hits = 0;
    for (const m of src.matchAll(re)) {
      hits += 1;
      expect(src.slice(Math.max(0, m.index! - 300), m.index!), m[0]).toMatch(/HAS_PACKAGE_INCLUSIONS|HAS_VERIFIED_TESTIMONIALS/);
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('API /wellness/programs withholds certificate / workbook / recording features while gated', () => {
    const api = stripComments(read(join(repoRoot, 'apps/api/src/routes/wellness.ts')));
    expect(api).toMatch(/HAS_WELLNESS_PROGRAM_PACKAGES/);
    expect(api).toMatch(/programs: filtered\.map\(publicProgram\)/);
    expect(api).toMatch(/program: publicProgram\(program\)/);
  });

  it('yatra companions: no ID / police / first-aid / location promise outside the gate', () => {
    expect(HAS_COMPANION_VETTING).toBe(false);
    const comp = web('app/yatra/companion/page.tsx');
    expect(comp).toMatch(/Companions are not yet listed/);
    expect(comp).not.toMatch(/Tell us your dates and we will call you/);
    // every occurrence sits after (and so inside) a HAS_COMPANION_VETTING gate
    for (const claim of ['police verification', 'Background checked before listing', 'Location shared with family', 'first-aid', 'ID check required']) {
      for (const m of comp.matchAll(new RegExp(claim, 'gi'))) {
        const before = comp.slice(0, m.index!);
        const gateAt = Math.max(before.lastIndexOf('{HAS_COMPANION_VETTING && ('), before.lastIndexOf('HAS_COMPANION_VETTING\n ?'), before.lastIndexOf('HAS_COMPANION_VETTING ?'), before.lastIndexOf('{HAS_COMPANION_VETTING\n ?'));
        expect(gateAt, `${claim} @${m.index}`).toBeGreaterThan(-1);
      }
    }
    const yatra = web('app/yatra/page.tsx');
    expect(yatra).toMatch(/not yet listed on Darshya/);
    expect(yatra).toMatch(/\{HAS_COMPANION_VETTING && \(\s*<div data-reveal="glow"/);
  });
});

describe('9. store returns', () => {
  const refunds = web('app/refunds/page.tsx');

  it('/refunds promises no automated return, no 48-hour window, no free return shipping', () => {
    expect(refunds).not.toMatch(/Returnable Items|may be returned within 7 days|we cover return shipping|contact us within 48 hours/i);
    expect(refunds).toMatch(/contact\s+support within 7 days of delivery/i);
    expect(refunds).toMatch(/there is no automated return\s+process/i);
    expect(refunds).toMatch(/we review each\s+case/i);
  });

  it('terms, shipping and the support FAQ use the same 7-day, review-each-case wording', () => {
    expect(web('app/terms/page.tsx')).not.toMatch(/may be returned within 7 days/);
    expect(web('app/terms/page.tsx')).toMatch(/we review each case/);
    expect(web('app/shipping/page.tsx')).not.toMatch(/within 48\s+hours/);
    expect(web('app/shipping/page.tsx')).toMatch(/within 7\s+days of delivery/);
    const support = web('lib/support.ts');
    expect(support).not.toMatch(/Yes, within 7 days of delivery if the item/);
    expect(support).toMatch(/There is no automated return process/);
  });

  it('support intake exists, so pointing people at it is backed', () => {
    expect(readdirSync(join(webRoot, 'app/support/ticket'))).toContain('new');
    expect(read(join(repoRoot, 'apps/api/src/routes/support.ts'))).toMatch(/server\.post\('\/tickets'/);
  });

  it('store pages no longer badge "Easy Returns"', () => {
    expect(web('components/store/ProductDetail.tsx')).not.toMatch(/Easy Returns/);
    expect(web('app/store/seller/[id]/page.tsx')).not.toMatch(/Easy Returns/);
  });
});

describe('10. weddings, marriage tiers, sample instructors, gated adoption (2026-10-06)', () => {
  const SERVICE_RE = /\blive\b|photograph|narration|multilingual|consultation|coordinat|satyanarayan/i;

  it('/weddings and /weddings/packages do not promise a shipped samagri kit', () => {
    for (const rel of ['app/weddings/page.tsx', 'app/weddings/packages/page.tsx']) {
      const src = web(rel);
      for (const m of src.matchAll(/shipped/gi)) {
        const before = src.slice(Math.max(0, m.index! - 900), m.index!);
        expect(before, `${rel}: ungated "shipped"`).toMatch(/HAS_PACKAGE_INCLUSIONS|HAS_VERIFIED_TESTIMONIALS/);
      }
      expect(src, rel).toMatch(/HAS_PACKAGE_INCLUSIONS|HAS_VERIFIED_TESTIMONIALS/);
    }
    const packages = web('app/weddings/packages/page.tsx');
    expect(packages).toMatch(/HAS_PACKAGE_INCLUSIONS\s*\?\s*\['Full samagri kit shipped/);
    expect(packages).not.toMatch(/Photographer co-ordination'\s*,\s*\n\s*\],/);
  });

  it('/weddings keeps the sourceless couple quotes behind HAS_VERIFIED_TESTIMONIALS', () => {
    expect(HAS_VERIFIED_TESTIMONIALS).toBe(false);
    const src = web('app/weddings/page.tsx');
    const idx = src.indexOf('From recent couples');
    expect(idx).toBeGreaterThan(0);
    expect(src.slice(0, idx)).toMatch(/\{HAS_VERIFIED_TESTIMONIALS && \(\s*<section[^>]*>\s*<h2[^>]*>$/);
  });

  it('wedding metadata and structured data do not advertise a samagri kit', () => {
    const src = web('app/weddings/page.tsx');
    const head = src.slice(0, src.indexOf('export default'));
    expect(head).not.toMatch(/samagri kit|full samagri|shipped/i);
  });

  it('/wellness/instructors/[id]: fixture credentials, years, ratings and reviews sit behind HAS_VERIFIED_INSTRUCTORS', () => {
    expect(HAS_VERIFIED_INSTRUCTORS).toBe(false);
    const src = web('app/wellness/instructors/[id]/page.tsx');
    expect(src).toMatch(/SAMPLE_INSTRUCTOR_NOTE/);
    expect(src).toMatch(/HAS_VERIFIED_INSTRUCTORS &&[\s\S]{0,200}years experience/);
    expect(src).toMatch(/HAS_VERIFIED_INSTRUCTORS && \(\s*<div className="mt-6">\s*<h3[^>]*>\s*Certifications/);
    expect(src).toMatch(/HAS_VERIFIED_INSTRUCTORS && \(\s*<>\s*\{\}\s*<section/);
    expect(src).toMatch(/HAS_VERIFIED_INSTRUCTORS\s*\?\s*inst\.bio/);
    expect(src).toMatch(/HAS_VERIFIED_INSTRUCTORS\s*\?\s*inst\.bio\.slice/);
  });

  it('no visible title, heading, button, card or sitemap text says "Adopt a Cow" while the programme is gated', () => {
    expect(HAS_ADOPTION_EXTRAS).toBe(false);
    for (const abs of [...walk(join(webRoot, 'app')), ...walk(join(webRoot, 'components')), ...walk(join(webRoot, 'lib'))]) {
      if (!/\.(tsx?|json)$/.test(abs)) continue;
      const src = abs.endsWith('.json') ? read(abs) : stripComments(read(abs));
      expect(src, relative(webRoot, abs)).not.toMatch(/adopt[ -]a[ -]cow/i);
    }
    expect(web('app/gaushala/page.tsx')).toMatch(/title: "Gau Seva — Support a Gaushala"/);
  });

  it('/pujas/marriage tiers list rites and pandit count only: no live chanting, photography, narration or consultations', () => {
    expect(HAS_HOME_PUJA_INCLUSIONS).toBe(false);
    for (const tier of marriagePricingTiers) {
      const items = marriageTierIncludes(tier);
      expect(items.length, tier.slug).toBeGreaterThan(0);
      for (const item of items) expect(item, `${tier.slug}: ${item}`).not.toMatch(SERVICE_RE);
    }
    for (const a of marriageAddOnList()) expect(a).not.toMatch(SERVICE_RE);
    const src = web('app/pujas/marriage/page.tsx');
    expect(src).toMatch(/marriageAddOnList\(\)\.map/);
    expect(src).not.toMatch(/marriageAddOns\.map/);
    expect(src).not.toMatch(/: 'Yes\. Traditional and Grand tiers include English narration/);
  });

  it('the marriage booking wizard offers only the gated add-on list, not the raw one', () => {
    const book = web('app/pujas/marriage/book/page.tsx');
    expect(book).toMatch(/marriageAddOnList\(\)/);
    expect(book).not.toMatch(/marriageAddOns\b/);
    expect(marriageAddOnList()).not.toContain('Destination wedding travel');
  });
});
