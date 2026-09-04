/**
 * CM-13 (prod sweep 2026-08-12) — the homepage H1 states a JOB, and the hero
 * subtitle stops implying that proof arrives live.
 *
 * The finding had two halves. The CTA half already shipped (app/page.tsx:136-152
 * — one primary, the temple directory demoted to a text link because 15 of 20
 * temples have no bookable offering). This file closes the copy half.
 *
 * WHAT WAS SHIPPING, AND WHY EACH LINE WAS WRONG
 *
 *   heroTitle1   "Darshya, your bridge to"
 *   heroTitle2   "sacred traditions"
 *     An identity, not a job. A stranger who lands here learns who we are and
 *     still cannot tell what they can DO. CM-13's own recommendation is to
 *     state the job, and the A/B 'benefit' arm already in the tree
 *     (components/home/HeroCopyVariant.tsx:36-41) opens with a verb for exactly
 *     that reason. Worse, the accent treatment landed on the object of a
 *     preposition: title2 is rendered in --color-primary
 *     (HeroCopyVariant.tsx:67-69), so "sacred traditions" was the emphasised
 *     half of the sentence while carrying no claim of its own.
 *
 *   heroSubtitle "Live temple darshan. Authentic pujas with verified priests
 *                 and video proof. …"
 *     "video proof" sat one sentence away from "Live temple darshan", which
 *     reads as proof you can watch happen. It is not. The recording is uploaded
 *     AFTER the booking reaches `completed` — apps/api/src/services/
 *     booking.service.ts:1663-1667 refuses the upload in any other status. The
 *     homepage revamp already deleted "Live video proof" from the trust strip
 *     for this reason; the hero kept it.
 *
 *   heroBadge    "Early access, 1,000 founding devotees"
 *     A count nothing counted. Same class as the "200+ verified temples" and
 *     "500+ vetted pandits" that lib/platform-stats.ts:5-24 exists to stop: "a
 *     number only reaches a page if the API counted it. There is no default, no
 *     seed, no 'approximately', no rounding up." Nothing in this repo counts
 *     founding devotees, so the digits have to go rather than be re-sourced.
 *
 * WHY THE ASSERTIONS BELOW ARE SHAPED THE WAY THEY ARE
 *
 * The digit ban is total rather than per-claim. platform-stats allows a number
 * that something counted; a hero cannot, because nothing on this line re-fetches
 * and a supply figure printed in an H1 goes stale silently the first time supply
 * moves.
 *
 * The proof-timing check is a POSITIVE assertion (the copy must say WHEN the
 * video arrives) rather than a blocklist on the word "live". A blocklist would
 * have passed the shipping copy: "Live temple darshan." and "…video proof." are
 * two separate sentences, so no single clause ever held both words — and the
 * misreading happened across the full stop anyway.
 */

import { describe, it, expect } from 'vitest';

import en from '../lib/i18n/en.json';
import { CATALOGS, t } from '../lib/t';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../lib/i18n/locales';

/** Every key the hero renders, in render order (app/page.tsx:125-131). */
const HERO_KEYS = ['heroBadge', 'heroTitle1', 'heroTitle2', 'heroSubtitle'] as const;
type HeroKey = (typeof HERO_KEYS)[number];

const home = en.home as unknown as Record<string, string>;

/** The H1 as a devotee reads it — HeroCopyVariant.tsx:66-69 joins them with a space. */
const h1 = `${home.heroTitle1} ${home.heroTitle2}`;
const subtitle = home.heroSubtitle;
const heroBlob = HERO_KEYS.map((k) => home[k]).join(' — ');

/**
 * Verbs the product can honour on the very next click. Deliberately NOT "any
 * imperative": "Discover", "Explore" and "Experience" are imperatives too, and
 * each describes a mood rather than a job — CM-13 is precisely the complaint
 * that the hero described a mood. Every verb here names something the hero's own
 * primary CTA leads to (HomeHeroCta -> /pujas).
 */
const ACTIONABLE_OPENERS = /^(Book|Watch|Choose|Offer|Sponsor|Order)\b/;

/** Trailing sentence punctuation, so "…temple," is judged on the word "temple". */
const stripTail = (s: string) => s.trim().replace(/[\s,;:.–—-]+$/, '');

describe('CM-13 — the H1 states a job, not an identity', () => {
  it('does not open by naming the brand', () => {
    // "Darshya, your bridge to sacred traditions" tells a stranger who we are.
    // The brand is already in the nav, the logo, the tab title and the domain.
    expect(h1).not.toMatch(/^Darshya\b/);
  });

  it('opens with something a devotee can do here', () => {
    expect(home.heroTitle1).toMatch(ACTIONABLE_OPENERS);
  });

  it('does not leave the accented half dangling off a preposition', () => {
    // title2 receives the gradient/accent span, so it has to be the phrase worth
    // emphasising. "…your bridge to" + "sacred traditions" put the accent on the
    // object of a preposition — the highlighted words meant nothing without the
    // line above them.
    expect(stripTail(home.heroTitle1)).not.toMatch(
      /\b(to|of|for|with|into|at|on|in|by|and|or|the|a|an)$/i,
    );
    expect(stripTail(home.heroTitle2).split(/\s+/).length).toBeGreaterThanOrEqual(2);
  });
});

describe('CM-13 — the hero says WHEN the video arrives', () => {
  it('states the proof timing wherever it claims proof', () => {
    // Mandatory proof is a real, enforced claim (PujaType.videoProofMandatory
    // defaults true, and the pandit's payout is minted on upload —
    // booking.service.ts:1694-1706), so the claim stays. What it may not do is
    // leave the timing to the reader.
    expect(
      /\bproof\b|\brecording\b/i.test(heroBlob),
      'the hero dropped the video-proof claim entirely — that is a product decision, ' +
        'not a copy fix; change this test deliberately if that is intended',
    ).toBe(true);
    expect(subtitle).toMatch(/\bafter\b/i);
  });

  it('never puts the proof claim and the word "live" in one sentence', () => {
    for (const sentence of heroBlob.split(/(?<=[.;:—])\s+/)) {
      const both = /\blive\b/i.test(sentence) && /\bproof\b|\brecording\b/i.test(sentence);
      expect(both, `hero sentence implies live proof: "${sentence}"`).toBe(false);
    }
  });

  it('never uses the phrase "live video proof" in any form', () => {
    expect(heroBlob).not.toMatch(/live[\s-]*(video[\s-]*)?proof/i);
  });
});

describe('CM-13 — no claim the inventory cannot pay off', () => {
  /**
   * Every catalog, not just English: a translation is the easiest place for a
   * retired claim to survive, because nobody re-reads it.
   */
  const everyHeroString = (): { where: string; value: string }[] => {
    const out: { where: string; value: string }[] = [];
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const ns = (catalog as Record<string, Record<string, string>>).home ?? {};
      for (const key of HERO_KEYS) {
        const value = ns[key];
        if (typeof value === 'string') out.push({ where: `${locale}.home.${key}`, value });
      }
    }
    return out;
  };

  it('carries no digits — nothing behind this line counted anything', () => {
    const withDigits = everyHeroString().filter((s) => /\d/.test(s.value));
    expect(withDigits.map((s) => `${s.where} = ${s.value}`)).toEqual([]);
  });

  it('does not mention 80G — HAS_80G_VERIFIED is false', () => {
    const bad = everyHeroString().filter((s) => /80\s*-?\s*g\b/i.test(s.value));
    expect(bad.map((s) => s.where)).toEqual([]);
  });

  it('does not sell NRI pricing — no NRI rate is actually charged', () => {
    const bad = everyHeroString().filter((s) => /\bNRI\b/i.test(s.value));
    expect(bad.map((s) => s.where)).toEqual([]);
  });

  it('keeps the ritual register — no exclamation marks', () => {
    // docs/BRAND_GUIDELINES.md:188 — "Avoid exclamation marks in
    // spiritual/ritual contexts".
    const bad = everyHeroString().filter((s) => s.value.includes('!'));
    expect(bad.map((s) => s.where)).toEqual([]);
  });

  it('addresses a devotee, never a "user" or a "customer"', () => {
    // docs/BRAND_GUIDELINES.md:185.
    expect(heroBlob).not.toMatch(/\b(users?|customers?)\b/i);
  });
});

describe('CM-13 — the hero key set is the same in every supported locale', () => {
  /**
   * "The same key set" cannot mean "six catalogs each holding these four keys",
   * and asserting that would be asserting a bug into place. lib/t.ts:33-38 and
   * __tests__/i18n-hi-catalog.test.ts hold a deliberate architecture: hi is
   * partial, and ta/te/bn/mr have NO catalog at all on purpose, because "four
   * keys of Tamil under an English chrome" reads to a devotee as a finished
   * decision rather than an unfinished one (audit I-03).
   *
   * So the invariant that actually protects a devotee is the RESOLUTION one:
   * every supported locale must resolve all four hero keys to real copy, must
   * declare which language that copy is in, and must never let a catalog carry a
   * hero key en.json does not define.
   */
  it('resolves all four hero keys in all six locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const tr = t('home', locale);
      for (const key of HERO_KEYS) {
        const entry = tr.entry(key as HeroKey);
        expect(entry.text.length, `${locale}.${key} is empty`).toBeGreaterThan(0);
        // A missing key surfaces as the key NAME (lib/t.ts:135) — the one output
        // that would ship the literal "heroTitle1" to a devotee's screen.
        expect(entry.text, `${locale}.${key} resolved to the raw key name`).not.toBe(key);
      }
    }
  });

  it('declares which language the hero copy is actually in', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const tr = t('home', locale);
      for (const key of HERO_KEYS) {
        const entry = tr.entry(key as HeroKey);
        // Untranslated copy must be flagged English so it can be marked up
        // lang="en" — a screen reader would otherwise read English words with
        // the active locale's pronunciation rules.
        if (entry.fallback) expect(entry.lang).toBe(DEFAULT_LOCALE);
        else expect(entry.lang).toBe(locale);
      }
    }
  });

  it('never lets a catalog invent a hero key en.json does not have', () => {
    const orphans: string[] = [];
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const ns = (catalog as Record<string, Record<string, string>>).home ?? {};
      for (const key of Object.keys(ns)) {
        if (key.startsWith('hero') && !(key in home)) orphans.push(`${locale}.home.${key}`);
      }
    }
    expect(orphans).toEqual([]);
  });
});
