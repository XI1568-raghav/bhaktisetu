/**
 * Locale-aware translation lookup.
 *
 * Audit I-01 / I18N-02 (2026-08-12): this file used to be 30 lines that
 * hard-imported en.json and closed over it at MODULE scope —
 * `const dict = en[ns]` — so `t(ns)` could only ever return English. None of
 * the three exports accepted a locale, so no caller could request one and no
 * amount of translated copy could have been delivered.
 *
 * What changed: a locale parameter, a CATALOGS map, and per-key fallback to
 * English. The existing keys and all 9 call sites keep working unchanged —
 * `t(ns)` still means English.
 *
 * THE FALLBACK IS DELIBERATELY NOT SILENT. When a key is missing from the
 * active locale we still render the English string (a blank UI would be
 * worse), but `entry()` reports `fallback: true` and `lang: 'en'` so the caller
 * can mark it up as English — which is both the truthful thing to show a user
 * and the correct thing for a screen reader, which would otherwise read
 * English words with Hindi pronunciation rules. `localeCoverage()` exists so a
 * surface can tell the user how much of it is actually translated instead of
 * implying a finished localisation.
 *
 * CATALOG PROVENANCE — hi.json is intentionally partial (67 of 384 keys). Every
 * string in it is lifted from Hindi already authored by a human elsewhere in
 * this repo (app/hi/page.tsx and the CONTENT_LABELS.hi block in
 * components/LanguageSwitcher.tsx). Nothing here is machine-translated, and the
 * legal footer labels (Privacy Policy, Terms of Service, Refund Policy,
 * Shipping Policy) are deliberately LEFT OUT: a mistranslated refund policy is
 * worse than an English one. Filling the remaining keys is a content decision
 * for the owner, not a code change.
 *
 * That provenance rule is no longer only a comment: __tests__/i18n-hi-catalog
 * asserts every non-English string appears verbatim in one of those two
 * human-authored sources, so a machine translation cannot be added without the
 * build failing. ta/te/bn/mr still have NO catalog (0 of 384 each) on purpose —
 * a handful of translated words under an English chrome reads as a deliberate
 * choice rather than an unfinished one, which is the harm I-03 measured.
 */

import en from './i18n/en.json';
import hi from './i18n/hi.json';
import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n/locales';

type Messages = typeof en;
type Namespace = keyof Messages;

/** A non-English catalog may cover any subset of en.json. It may never add keys. */
type Catalog = {
  [K in Namespace]?: Partial<Record<keyof Messages[K], string>>;
};

/**
 * Every catalog the app can serve. A locale with no entry here resolves to
 * English with `fallback: true` on every key and 0% coverage — it degrades
 * honestly rather than pretending.
 */
export const CATALOGS: Partial<Record<Locale, Catalog>> = {
  en: en as Catalog,
  hi: hi as Catalog,
};

export interface TranslationEntry {
  /** The string to render. Never empty — falls back to English, then to the key. */
  text: string;
  /** The language `text` is ACTUALLY in. Use it for lang="…" on the element. */
  lang: Locale;
  /** True when the active locale had no translation and English was substituted. */
  fallback: boolean;
}

export interface LocaleCoverage {
  total: number;
  translated: number;
  /** 0..1. Report this to users rather than implying a complete translation. */
  ratio: number;
}

type Translator<N extends Namespace> = ((key: keyof Messages[N]) => string) & {
  raw: (key: keyof Messages[N]) => unknown;
  /** The locale this translator was built for (not necessarily the one every string is in). */
  locale: Locale;
  /** True when the key resolves in the active locale rather than falling back. */
  has: (key: keyof Messages[N]) => boolean;
  /** Full resolution result, including whether it fell back and to which language. */
  entry: (key: keyof Messages[N]) => TranslationEntry;
  coverage: () => LocaleCoverage;
};

function namespaceCoverage(locale: Locale, ns: Namespace): LocaleCoverage {
  const base = en[ns] as Record<string, unknown>;
  const total = Object.keys(base).length;
  if (locale === DEFAULT_LOCALE) return { total, translated: total, ratio: 1 };

  const localized = (CATALOGS[locale]?.[ns] ?? {}) as Record<string, unknown>;
  const translated = Object.keys(base).filter(
    (k) => typeof localized[k] === 'string' && (localized[k] as string).length > 0,
  ).length;

  return { total, translated, ratio: total === 0 ? 1 : translated / total };
}

/** Truthful whole-app coverage for a locale. Drives the user-facing disclosure. */
export function localeCoverage(locale: Locale): LocaleCoverage {
  let total = 0;
  let translated = 0;
  for (const ns of Object.keys(en) as Namespace[]) {
    const c = namespaceCoverage(locale, ns);
    total += c.total;
    translated += c.translated;
  }
  return { total, translated, ratio: total === 0 ? 1 : translated / total };
}

function build<N extends Namespace>(ns: N, locale: Locale = DEFAULT_LOCALE): Translator<N> {
  const active: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const base = en[ns] as Record<string, unknown>;
  const localized = (CATALOGS[active]?.[ns] ?? {}) as Record<string, unknown>;
  const isDefault = active === DEFAULT_LOCALE;

  const entry = (key: keyof Messages[N]): TranslationEntry => {
    const k = key as string;

    if (!isDefault) {
      const hit = localized[k];
      if (typeof hit === 'string' && hit.length > 0) {
        return { text: hit, lang: active, fallback: false };
      }
    }

    const fallbackText = base[k];
    if (typeof fallbackText === 'string') {
      // Rendered in English even though `active` is not English — say so.
      return { text: fallbackText, lang: DEFAULT_LOCALE, fallback: !isDefault };
    }

    // Unknown key: surface the key itself, exactly as the previous implementation did.
    return { text: k, lang: DEFAULT_LOCALE, fallback: !isDefault };
  };

  const fn = ((key: keyof Messages[N]) => entry(key).text) as Translator<N>;

  // Non-string values (arrays/objects in en.json) still come back raw, preferring
  // the active locale when it has one.
  fn.raw = (key) => {
    const k = key as string;
    const hit = isDefault ? undefined : localized[k];
    return hit !== undefined ? hit : base[k];
  };
  fn.locale = active;
  fn.has = (key) => !entry(key).fallback;
  fn.entry = entry;
  fn.coverage = () => namespaceCoverage(active, ns);

  return fn;
}

export function getTranslations<N extends Namespace>(
  ns: N,
  locale: Locale = DEFAULT_LOCALE,
): Promise<Translator<N>> {
  return Promise.resolve(build(ns, locale));
}

export function useTranslations<N extends Namespace>(
  ns: N,
  locale: Locale = DEFAULT_LOCALE,
): Translator<N> {
  return build(ns, locale);
}

export function t<N extends Namespace>(
  ns: N,
  locale: Locale = DEFAULT_LOCALE,
): Translator<N> {
  return build(ns, locale);
}
