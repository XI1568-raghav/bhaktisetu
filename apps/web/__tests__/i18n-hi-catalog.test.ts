/**
 * Audit I-03 / I18N-05 — the Hindi copy that was already written, finally in a
 * catalog something can read.
 *
 * The finding: "CONTENT_LABELS.hi authors 18 keys … ContentPageHeader.tsx reads
 * exactly three of them … the other 15 translated labels are never rendered
 * anywhere", and its fix says in as many words that this "is a wiring change
 * against copy that already exists — no new translation needed."
 *
 * THE SPLIT, STATED PLAINLY. That fix has two halves and this file closes one.
 *   - The RENDER half lives in components/ContentPageHeader.tsx and
 *     components/LanguageSwitcher.tsx, which belong to another lane. Those two
 *     files still read three labels out of eighteen.
 *   - The CATALOG half is here: the human-authored Hindi is lifted out of the
 *     component-local CONTENT_LABELS map and into lib/i18n/hi.json under the
 *     key names en.json already uses, so the render half becomes a one-line
 *     `t('content', locale)` swap instead of a copy hunt.
 *
 * PROVENANCE IS THE WHOLE POINT, AND IT IS NOW MACHINE-CHECKED. lib/t.ts:23-31
 * claims "Nothing here is machine-translated". That was a comment; below it is
 * an assertion. Every string in every non-English catalog must appear verbatim
 * inside a Hindi source a human wrote in this repo — app/hi/page.tsx and the
 * CONTENT_LABELS.hi block in components/LanguageSwitcher.tsx. A machine
 * translation cannot pass, because it would be a string that exists nowhere
 * else. Note the corpus deliberately EXCLUDES app/mr/page.tsx: Marathi is also
 * written in Devanagari, and letting Marathi copy vouch for a Hindi string is
 * exactly the kind of silent error this guard exists to stop.
 *
 * WHAT IS STILL MISSING IS COPY, NOT CODE — see the coverage assertions at the
 * bottom, which pin the real numbers so nobody can imply a finished
 * localisation. ta/te/bn/mr are still 0 of 374 and are deliberately left that
 * way: four keys of Tamil in an English chrome is the "looks deliberate, so the
 * user assumes the rest is untranslatable" harm I-03 describes.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import en from '../lib/i18n/en.json';
import hi from '../lib/i18n/hi.json';
import { CATALOGS, localeCoverage, t } from '../lib/t';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../lib/i18n/locales';

const hiDict = hi as unknown as Record<string, Record<string, string>>;
const enDict = en as unknown as Record<string, Record<string, string>>;

/**
 * The label-by-label move. Left side is the key CONTENT_LABELS.hi used inside
 * components/LanguageSwitcher.tsx; right side is `<en.json namespace>.<key>`,
 * the slot that copy renders into. Only 1:1 slots are listed — `stories`
 * ("कथाएँ") is NOT mapped onto content.tabArticle ("Articles") and
 * `todaysFeatured` ("आज का विशेष" — Today's Featured) is NOT mapped onto
 * content.featured ("Featured"), because near enough is how a catalog starts
 * lying. Those two, plus the seven CONTENT_LABELS keys with no en.json slot at
 * all (todaysFeaturedSubtitle, curatedCollections, title, deity, type, tracks,
 * tryDifferentSearch, checkBackSoon), are owner copy decisions.
 */
const CONTENT_LABEL_MOVES: { from: string; to: string; hindi: string }[] = [
  { from: 'pageTitle', to: 'content.pageTitle', hindi: 'भक्ति संगीत पुस्तकालय' },
  {
    from: 'pageSubtitle',
    to: 'content.pageSubtitle',
    hindi:
      'हजारों आरतियाँ, चालीसा, मंत्र, भजन और आध्यात्मिक कथाएँ खोजें। ऑनलाइन सुनें या ऑफलाइन के लिए डाउनलोड करें।',
  },
  { from: 'searchPlaceholder', to: 'content.search', hindi: 'शीर्षक, देवता या टैग से खोजें...' },
  { from: 'allContent', to: 'content.tabAll', hindi: 'सभी' },
  { from: 'aarti', to: 'content.tabAarti', hindi: 'आरती' },
  { from: 'chalisa', to: 'content.tabChalisa', hindi: 'चालीसा' },
  { from: 'mantra', to: 'content.tabMantra', hindi: 'मंत्र' },
  { from: 'bhajan', to: 'content.tabBhajan', hindi: 'भजन' },
  { from: 'views', to: 'content.views', hindi: 'दृश्य' },
  { from: 'likes', to: 'content.likes', hindi: 'पसंद' },
  { from: 'noContentFound', to: 'content.noContent', hindi: 'कोई सामग्री नहीं मिली।' },
];

/**
 * Devotional vocabulary lifted from the Hindi landing page. Every one of these
 * is the word's own Devanagari spelling as a human already wrote it in
 * app/hi/page.tsx — not a translation of the English gloss. The three
 * `terms` keys with no such source (prasad, kundli, horoscope) are absent on
 * purpose rather than guessed at.
 */
const LANDING_LIFTS: { to: string; hindi: string }[] = [
  { to: 'terms.temple', hindi: 'मंदिर' },
  { to: 'terms.puja', hindi: 'पूजा' },
  { to: 'terms.aarti', hindi: 'आरती' },
  { to: 'terms.darshan', hindi: 'दर्शन' },
  { to: 'terms.pandit', hindi: 'पंडित' },
  { to: 'terms.sankalp', hindi: 'संकल्प' },
  { to: 'terms.videoProof', hindi: 'वीडियो प्रमाण' },
  { to: 'terms.gauSeva', hindi: 'गौ सेवा' },
  { to: 'terms.yatra', hindi: 'यात्रा' },
  { to: 'terms.bhajan', hindi: 'भजन' },
  { to: 'terms.mantra', hindi: 'मंत्र' },
  { to: 'terms.chalisa', hindi: 'चालीसा' },
  { to: 'terms.muhurat', hindi: 'मुहूर्त' },
  { to: 'terms.tithi', hindi: 'तिथि' },
  { to: 'nav.donate', hindi: 'दान' },
  { to: 'common.search', hindi: 'खोजें' },
  { to: 'home.featLiveDarshan', hindi: 'लाइव दर्शन' },
];

function at(dict: Record<string, Record<string, string>>, dotted: string): string | undefined {
  const [ns, key] = dotted.split('.');
  return dict[ns]?.[key];
}

/**
 * Everything a human wrote in Hindi inside this repo, as one searchable blob.
 * LanguageSwitcher.tsx stores its Devanagari as \uXXXX escapes, so the escapes
 * are decoded before searching. A source that has been deleted is skipped
 * rather than failing the run — I18N-05's own fix ends with CONTENT_LABELS
 * gone, and this guard must survive that refactor.
 */
function humanHindiCorpus(): string {
  const sources = ['app/hi/page.tsx', 'components/LanguageSwitcher.tsx'];
  const parts: string[] = [];

  for (const rel of sources) {
    const abs = path.join(process.cwd(), rel);
    if (!fs.existsSync(abs)) continue;
    parts.push(
      fs
        .readFileSync(abs, 'utf8')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))),
    );
  }

  expect(parts.length, 'no human-authored Hindi source found to check provenance against').toBeGreaterThan(0);
  return parts.join('\n');
}

describe('I-03 / I18N-05 — the authored Hindi labels reach the catalog', () => {
  it.each(CONTENT_LABEL_MOVES)('CONTENT_LABELS.hi.$from is carried at $to', ({ to, hindi }) => {
    expect(at(hiDict, to)).toBe(hindi);
  });

  it.each(LANDING_LIFTS)('the Hindi landing supplies $to', ({ to, hindi }) => {
    expect(at(hiDict, to)).toBe(hindi);
  });

  it('serves them through the translator, not just from the file', () => {
    // The catalog is only worth anything if `t` actually resolves it and stops
    // reporting a fallback — that is the difference between copy existing and
    // copy being deliverable.
    const terms = t('terms', 'hi');
    expect(terms('sankalp')).toBe('संकल्प');
    expect(terms.entry('sankalp').fallback).toBe(false);
    expect(terms.entry('sankalp').lang).toBe('hi');

    // And an untranslated key in the same namespace still degrades honestly.
    expect(terms.entry('prasad').fallback).toBe(true);
    expect(terms.entry('prasad').lang).toBe('en');
    expect(terms('prasad')).toBe('Prasad');
  });
});

describe('catalog provenance — nothing here is machine-translated', () => {
  it('every non-English string appears verbatim in Hindi a human wrote in this repo', () => {
    const corpus = humanHindiCorpus();
    const unsourced: string[] = [];

    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      if (locale === DEFAULT_LOCALE) continue;
      for (const [ns, entries] of Object.entries(catalog as Record<string, Record<string, string>>)) {
        for (const [key, value] of Object.entries(entries)) {
          if (!corpus.includes(value)) unsourced.push(`${locale}.${ns}.${key} = ${value}`);
        }
      }
    }

    expect(unsourced).toEqual([]);
  });

  it('never invents a key en.json does not have (the catalog may be partial, never divergent)', () => {
    const orphans: string[] = [];
    for (const [ns, entries] of Object.entries(hiDict)) {
      if (!enDict[ns]) {
        orphans.push(ns);
        continue;
      }
      for (const key of Object.keys(entries)) {
        if (!(key in enDict[ns])) orphans.push(`${ns}.${key}`);
      }
    }
    expect(orphans).toEqual([]);
  });
});

describe('coverage is stated in numbers, not implied', () => {
  it('reports the real Hindi coverage rather than a claim of a translated product', () => {
    const cov = localeCoverage('hi');

    expect(cov.total).toBe(374);
    // The floor moves up only when real human copy lands. It is asserted, not
    // approximated, so a silent regression in hi.json fails the build.
    expect(cov.translated).toBeGreaterThanOrEqual(42);
    // …and it is nowhere near a finished translation. This ceiling is the
    // honest half: if it ever passes, the disclosure copy has to change too.
    expect(cov.ratio).toBeLessThan(0.5);
  });

  it('leaves ta/te/bn/mr at zero rather than half-translating them', () => {
    // Four keys of Tamil under an English chrome is the harm I-03 names — it
    // "looks deliberate, so the user assumes the rest is untranslatable rather
    // than unwired". Zero is disclosed by TranslationCoverageNotice; a token
    // few are not.
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE || locale === 'hi') continue;
      expect(localeCoverage(locale).translated, `${locale} catalog`).toBe(0);
    }
  });
});
