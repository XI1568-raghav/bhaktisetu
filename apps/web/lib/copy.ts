/**
 * CM-10 (prod sweep 2026-08-12) — card copy shaping.
 *
 * The other half of the finding: "card and hero copy is a 1,144-character
 * scripture excerpt". `GET /api/v1/pujas/types` ships descriptions averaging
 * 1,144 characters (72.5% of the 15,767-byte payload) and the card renders
 * them under `line-clamp-2` — about 110 visible characters, 9.6% of what was
 * sent, cut wherever the box happens to end:
 *
 *   "Rudrabhishek is the ceremonial bathing of a Shiva linga performed while
 *    reciting the Shri Rudram and Chamakam …"
 *
 * A CSS clamp is not copy. It cuts mid-word, it leaves the whole essay in the
 * DOM and the accessibility tree, and the reader gets a fragment rather than a
 * finished thought. `cardBlurb` keeps the first WHOLE sentence when one fits,
 * which is the closest thing to a written blurb that can be derived from prose
 * nobody wrote for a card.
 *
 * This is a mitigation, not the fix. The real fix is a `shortDescription`
 * column returned by the list endpoint (see the CM-10 ledger note) — an
 * apps/api contract change. Until it exists, no web-side edit can invent a
 * benefit-first blurb, and `cardBlurb` at least makes what IS rendered a
 * complete sentence.
 */

/** Longest card blurb we will render, in characters (ellipsis included). */
export const CARD_BLURB_MAX = 140;

/**
 * A card-length one-liner from arbitrary prose.
 *
 * - whitespace is collapsed (source prose is often multi-paragraph);
 * - text already within the budget is returned untouched;
 * - otherwise the first sentence is used when it fits, so the reader gets a
 *   finished thought rather than a clipped one;
 * - failing that, the text is cut on a WORD boundary and marked with `…`.
 *
 * The return value is never longer than `max` and never ends mid-word.
 */
export function cardBlurb(text: string | null | undefined, max = CARD_BLURB_MAX): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;

  // First sentence, when the writer gave us one that fits.
  const sentence = clean.match(/^.*?[.!?](?=\s|$)/)?.[0]?.trim();
  if (sentence && sentence.length <= max) return sentence;

  const window = clean.slice(0, max - 1);
  const cut = window.lastIndexOf(' ');
  const body = (cut > 0 ? window.slice(0, cut) : window).replace(/[\s,;:.\-–—]+$/, '');
  return `${body}…`;
}

/**
 * Values the festival calendar uses where a festival has no presiding deity.
 * `lib/festivals.ts` is editorial data, not an enum, and it stores these as
 * prose sentinels — "None (sibling bond)" for Raksha Bandhan, "Various (river
 * deities)" for Maha Kumbh. The homepage strip printed them verbatim, so the
 * only time-sensitive CTA on the site read "Wednesday, 19 August · None
 * (sibling bond)".
 */
const DEITY_SENTINELS = /^(none|n\/a|na|various|unknown|tbd)\b/i;

/**
 * The deity line for a festival, or `''` when the calendar has no deity to
 * name and the caller should omit the segment entirely.
 *
 * A sentinel that carries a parenthetical keeps the parenthetical — "None
 * (sibling bond)" is the calendar saying *this festival is about the sibling
 * bond*, which is worth printing; the word "None" is not.
 */
export function deityLine(deity: string | null | undefined): string {
  if (!deity) return '';
  const clean = deity.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (!DEITY_SENTINELS.test(clean)) return clean;

  const inner = clean.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (!inner) return '';
  return inner.charAt(0).toUpperCase() + inner.slice(1);
}
