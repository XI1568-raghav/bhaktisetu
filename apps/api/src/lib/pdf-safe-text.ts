/**
 * The receipt/invoice PDFs use pdf-lib's built-in Helvetica, which is WinAnsi
 * only. drawText THROWS on any other character, so a donor named in Devanagari
 * (or with an emoji in a name field) made generate80GReceipt / generateInvoice
 * fail outright: the caller logged the error and the donor got no receipt email
 * at all (measured 2026-10-13). Until a Unicode font is bundled, degrade
 * gracefully: transliterate Devanagari to readable Latin, keep every WinAnsi
 * character, and replace anything else with '?'. The email body and the DB keep
 * the original text.
 */

const INDEPENDENT_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o',
};
const MATRAS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o',
};
const CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l', 'क्ष': 'ksh', 'ज्ञ': 'gy', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'ज़': 'z',
};
const SIGNS: Record<string, string> = { 'ं': 'n', 'ँ': 'n', 'ः': 'h', '़': '', 'ऽ': '' };
const DIGITS = '०१२३४५६७८९';
const VIRAMA = '्';

/** Characters pdf-lib's WinAnsi (Helvetica) encoder can draw. */
function isWinAnsi(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  if (c === 0x09 || c === 0x0a || c === 0x0d) return true;
  if (c >= 0x20 && c <= 0x7e) return true;
  if (c >= 0xa0 && c <= 0xff) return true;
  return '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.includes(ch);
}

function transliterateDevanagari(input: string): string {
  const chars = Array.from(input.normalize('NFC'));
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1];
    if (INDEPENDENT_VOWELS[ch] !== undefined) { out += INDEPENDENT_VOWELS[ch]; continue; }
    if (SIGNS[ch] !== undefined) { out += SIGNS[ch]; continue; }
    const d = DIGITS.indexOf(ch);
    if (d >= 0) { out += String(d); continue; }
    if (CONSONANTS[ch] !== undefined) {
      let c = CONSONANTS[ch]!;
      // nukta forms are decomposed after NFC for some letters
      if (next === '़') i++;
      const after = chars[i + 1];
      if (after === VIRAMA) { out += c; i++; continue; }
      if (after && MATRAS[after] !== undefined) { out += c + MATRAS[after]; i++; continue; }
      // inherent 'a' - dropped at the end of a word (Hindi schwa deletion)
      const atWordEnd = !after || !/[ऀ-ॿ]/.test(after);
      out += atWordEnd ? c : c + 'a';
      continue;
    }
    if (ch === '।') { out += '.'; continue; }
    out += ch;
  }
  return out;
}

export function pdfSafeText(input: string): string {
  if (!input) return input;
  let s = /[ऀ-ॿ]/.test(input) ? transliterateDevanagari(input) : input;
  s = Array.from(s).map((ch) => (isWinAnsi(ch) ? ch : '?')).join('');
  return s;
}

/** Deep-copy `value` with every string made PDF-safe. */
export function pdfSafe<T>(value: T): T {
  if (typeof value === 'string') return pdfSafeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => pdfSafe(v)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, pdfSafe(v)]),
    ) as T;
  }
  return value;
}
