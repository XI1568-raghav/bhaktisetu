import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scriptLang } from '../../lib/script-lang';

/**
 * I-07 (prod sweep 2026-08-12, P1) — the API ships correct-script localized
 * names for 20/20 temples and the web rendered 0 of them.
 *
 * The data was never the gap. `Temple.nameLocal` exists in the schema, both the
 * list and detail payloads select it, `apps/web/lib/api.ts` types it on
 * TempleListItem AND TempleDetail, and the seed carries real literals
 * ('काशी विश्वनाथ मंदिर', 'తిరుమల తిరుపతి దేవస్థానం', 'கபாலீஸ்வரர் கோயில்' …).
 * Every temple surface simply read `.name` and stopped. The puja pages had been
 * rendering their own `nameLocal` for months, so the treatment already existed
 * one directory over.
 *
 * The source assertion below is deliberately narrow: it checks that the detail
 * page references `nameLocal` at all. A richer DOM test would need the whole
 * page's server-component data flow stubbed, which buys little — the defect was
 * a total absence, not a rendering subtlety.
 */

const PAGE = join(__dirname, '..', '..', 'app', 'temples', '[slug]', 'page.tsx');

/** Comments are not code. Four guards in this sweep matched their own docs. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('I-07 — temples render their localized name', () => {
  it('the temple detail page renders nameLocal, not just name', () => {
    const src = stripComments(readFileSync(PAGE, 'utf8'));
    expect(src).toMatch(/\{\s*temple\.nameLocal\s*&&/);
    expect(src).toMatch(/\{\s*temple\.nameLocal\s*\}/);
  });

  it('tags the localized name with its own language, since the page is lang="en"', () => {
    const src = stripComments(readFileSync(PAGE, 'utf8'));
    expect(src).toMatch(/lang=\{scriptLang\(temple\.nameLocal\)\}/);
  });

  describe('scriptLang', () => {
    it.each([
      ['काशी विश्वनाथ मंदिर', 'hi'],
      ['கபாலீஸ்வரர் கோயில்', 'ta'],
      ['తిరుమల తిరుపతి దేవస్థానం', 'te'],
      ['ଜଗନ୍ନାଥ ମନ୍ଦିର', 'or'],
      ['ಇಸ್ಕಾನ್ ದೇವಾಲಯ', 'kn'],
    ])('tags %s as %s', (text, lang) => {
      expect(scriptLang(text)).toBe(lang);
    });

    it('returns undefined for Latin so the element inherits the page language', () => {
      // Not '' and not 'en' — undefined omits the attribute entirely, which is
      // the only value that means "inherit" rather than "assert English".
      expect(scriptLang('Kashi Vishwanath Temple')).toBeUndefined();
    });

    it('returns undefined for null and empty input', () => {
      expect(scriptLang(null)).toBeUndefined();
      expect(scriptLang('')).toBeUndefined();
    });
  });
});
