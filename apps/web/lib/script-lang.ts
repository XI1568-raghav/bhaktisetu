/**
 * I-07 (prod sweep 2026-08-12). The API ships correct-script temple and puja
 * names in `nameLocal`, but carries no column saying WHICH language each one is
 * in — so a caller that wants to set `lang` on the element has to infer it.
 *
 * Inferring from the script is sound here because the mapping is unambiguous in
 * this dataset: each of these blocks is used by exactly one of the languages the
 * product supports. It is NOT sound in general — Devanagari also writes Marathi,
 * Nepali, Konkani and Sanskrit, so `deva` text is tagged `hi` because that is
 * what the seed data actually contains, not because the script implies it.
 * If a `nameLocalLang` column is ever added, prefer it and delete this.
 *
 * Why bother: the page renders `lang="en"`, so without an override a screen
 * reader pronounces "काशी विश्वनाथ मंदिर" with an English voice, and font
 * matching picks the Latin face first. One attribute fixes both.
 */

/** Ordered so the first block found wins; blocks are mutually exclusive. */
const SCRIPT_RANGES: ReadonlyArray<readonly [RegExp, string]> = [
  [/[ऀ-ॿ]/u, 'hi'], // Devanagari
  [/[஀-௿]/u, 'ta'], // Tamil
  [/[ఀ-౿]/u, 'te'], // Telugu
  [/[ঀ-৿]/u, 'bn'], // Bengali
  [/[ಀ-೿]/u, 'kn'], // Kannada
  [/[ഀ-ൿ]/u, 'ml'], // Malayalam
  [/[઀-૿]/u, 'gu'], // Gujarati
  [/[଀-୿]/u, 'or'], // Odia
  [/[਀-੿]/u, 'pa'], // Gurmukhi
];

/**
 * BCP-47 tag for the script `text` is written in, or undefined when it is Latin
 * or empty — undefined so callers can spread it straight onto `lang` and
 * inherit the page value rather than asserting a wrong one.
 */
export function scriptLang(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  for (const [range, lang] of SCRIPT_RANGES) {
    if (range.test(text)) return lang;
  }
  return undefined;
}
