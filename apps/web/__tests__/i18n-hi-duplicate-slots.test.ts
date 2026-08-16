/**
 * Audit I18N-05, catalog half — the same English string, translated once.
 *
 * en.json says "Live Darshan" in three different slots
 * (home.featLiveDarshan, home.liveDarshanLabel, darshan.pageTitle). hi.json
 * filled one of the three, so a Hindi visitor would have got 'लाइव दर्शन' on
 * the home feature card and the English words two components later — with
 * lib/t.ts correctly reporting `fallback: true` on a string it already had the
 * translation for, one key over.
 *
 * The rule this file pins is mechanical, not editorial, and that is the point.
 * NOTHING HERE IS A TRANSLATION: a slot may only be filled from a slot whose
 * ENGLISH IS BYTE-IDENTICAL and which a human already translated. There is no
 * "near enough" judgement to get wrong — the two slots say the same sentence in
 * English, so they say the same sentence in Hindi. Judgement calls (does
 * 'आज का विशेष' fit content.featured? does 'कथाएँ' fit content.tabArticle?)
 * were refused in __tests__/i18n-hi-catalog.test.ts and stay refused; this adds
 * no new ones.
 *
 * Provenance is unaffected and still enforced next door: every value below
 * already existed in hi.json and is already traced to human-authored Hindi in
 * app/hi/page.tsx or CONTENT_LABELS.hi.
 *
 * WHAT THIS DOES NOT DO: none of these slots is rendered in Hindi today,
 * because no surface calls `t(ns, locale)` with a locale yet — lib/i18n/server.ts
 * exports `getServerTranslations` and has zero call sites. This is catalog
 * readiness, and the coverage assertions at the bottom of
 * i18n-hi-catalog.test.ts are what keep it from being read as a finished
 * localisation.
 */

import { describe, it, expect } from 'vitest';

import en from '../lib/i18n/en.json';
import hi from '../lib/i18n/hi.json';
import { t } from '../lib/t';

const enDict = en as unknown as Record<string, Record<string, string>>;
const hiDict = hi as unknown as Record<string, Record<string, string>>;

/**
 * Slots whose English is byte-identical to a slot Hindi already covered. Left
 * side is the slot that was empty; `sameAs` is where its Hindi comes from.
 */
const DUPLICATE_ENGLISH_SLOTS: { slot: string; sameAs: string; hindi: string }[] = [
  { slot: 'nav.yatra', sameAs: 'terms.yatra', hindi: 'यात्रा' },
  { slot: 'common.all', sameAs: 'content.tabAll', hindi: 'सभी' },
  { slot: 'common.donate', sameAs: 'nav.donate', hindi: 'दान' },
  { slot: 'donations.donate', sameAs: 'nav.donate', hindi: 'दान' },
  { slot: 'footer.content', sameAs: 'nav.content', hindi: 'सामग्री' },
  { slot: 'home.contentTitle', sameAs: 'nav.content', hindi: 'सामग्री' },
  { slot: 'home.heroBadgeTemples', sameAs: 'nav.temples', hindi: 'मंदिर' },
  { slot: 'home.panchangTitle', sameAs: 'nav.panchang', hindi: 'पंचांग' },
  { slot: 'home.gauSevaTitle', sameAs: 'terms.gauSeva', hindi: 'गौ सेवा' },
  { slot: 'home.heroCtaSecondary', sameAs: 'footer.bookPuja', hindi: 'पूजा बुक करें' },
  { slot: 'pujas.pageTitle', sameAs: 'footer.bookPuja', hindi: 'पूजा बुक करें' },
  { slot: 'home.liveDarshanLabel', sameAs: 'home.featLiveDarshan', hindi: 'लाइव दर्शन' },
  { slot: 'darshan.pageTitle', sameAs: 'home.featLiveDarshan', hindi: 'लाइव दर्शन' },
  { slot: 'home.videoProof', sameAs: 'terms.videoProof', hindi: 'वीडियो प्रमाण' },
  { slot: 'pujas.videoProof', sameAs: 'terms.videoProof', hindi: 'वीडियो प्रमाण' },
];

function at(dict: Record<string, Record<string, string>>, dotted: string): string | undefined {
  const [ns, key] = dotted.split('.');
  return ns && key ? dict[ns]?.[key] : undefined;
}

describe('I18N-05 — a slot whose English twin is translated is not left in English', () => {
  it.each(DUPLICATE_ENGLISH_SLOTS)(
    '$slot carries the Hindi already approved for $sameAs',
    ({ slot, sameAs, hindi }) => {
      // The precondition that makes this mechanical rather than editorial.
      expect(at(enDict, slot), `${slot} missing from en.json`).toBe(at(enDict, sameAs));
      expect(at(hiDict, sameAs), `${sameAs} has no Hindi to copy`).toBe(hindi);

      expect(at(hiDict, slot)).toBe(hindi);
    },
  );

  it('serves them through the translator with no fallback', () => {
    for (const { slot, hindi } of DUPLICATE_ENGLISH_SLOTS) {
      const [ns, key] = slot.split('.') as [string, string];
      const tr = t(ns as Parameters<typeof t>[0], 'hi');
      const entry = tr.entry(key as never);
      expect(entry.text, slot).toBe(hindi);
      expect(entry.fallback, `${slot} still falls back to English`).toBe(false);
      expect(entry.lang, slot).toBe('hi');
    }
  });
});

describe('I18N-05 — one English string never gets two different Hindi renderings', () => {
  it('keeps every duplicated English slot consistent across namespaces', () => {
    const byEnglish = new Map<string, { slot: string; hindi: string }[]>();

    for (const [ns, entries] of Object.entries(enDict)) {
      for (const [key, english] of Object.entries(entries)) {
        const hindi = hiDict[ns]?.[key];
        if (!hindi) continue;
        const bucket = byEnglish.get(english) ?? [];
        bucket.push({ slot: `${ns}.${key}`, hindi });
        byEnglish.set(english, bucket);
      }
    }

    const divergent: string[] = [];
    for (const [english, slots] of byEnglish) {
      const distinct = [...new Set(slots.map((s) => s.hindi))];
      if (distinct.length > 1) {
        divergent.push(`${JSON.stringify(english)} -> ${distinct.join(' / ')}`);
      }
    }

    expect(divergent).toEqual([]);
  });
});
