/**
 * CM-10 (P1, customer-mindset) — card and hero copy, derived rather than typed.
 *
 * THE DEFECT. `puja_types.description` is written for a detail page: the rows
 * average ~1,144 characters of scripture citation ("...as prescribed in the
 * Shiva Purana, Vidyeshwara Samhita..."). That single column was rendered as
 * (a) the catalogue card blurb, (b) the hero paragraph above the price, and
 * (c) the `description` of the Product JSON-LD. An earlier pass put
 * `line-clamp-2` / `line-clamp-3` over (a) and (b), which hides the wall of
 * text from a sighted reader and changes nothing else: the full string is
 * still in the DOM, still read out in full by a screen reader, still shipped
 * over the wire on every card in the grid, and still the machine-readable
 * product description Google quotes.
 *
 * WHY NOT JUST WRITE A BLURB. The right long-term fix is a real
 * `shortDescription` column on the puja type, authored per puja and returned
 * by `GET /api/v1/pujas/types` — that is an apps/api contract change and is
 * recorded as such. Until it exists no web-side edit may INVENT marketing copy
 * for a specific ritual: a blurb that promises something the puja does not
 * include would be a worse defect than a long one.
 *
 * WHAT THIS DOES INSTEAD. It derives a blurb deterministically from the copy
 * that already exists — whole leading sentences, up to a budget, never a
 * mid-word cut — so the card says something true, in the author's own words,
 * in about a tweet. When `shortDescription` lands, `pujaCardBlurb` becomes a
 * fallback for rows that do not have one yet, and nothing else changes.
 *
 * Deliberately NOT a naive `slice(0, n)`: that produces "…performed as prescr"
 * on a storefront, which is the same class of unfinished-software signal as
 * the raw `special_occasion` enum this finding also covers.
 */

/** Default budget: long enough to be a sentence, short enough for a card. */
export const CARD_BLURB_MAX = 140;

/** Budget for the hero paragraph, which has more room than a card. */
export const HERO_BLURB_MAX = 220;

const SENTENCE_END = /([.!?])(\s+|$)/;

/**
 * Whole leading sentences from `text`, up to `max` characters.
 *
 * - Whitespace and newlines are collapsed, so a multi-paragraph description
 *   cannot smuggle a line break into a one-line card.
 * - At least one sentence is always returned when there is any text: if the
 *   first sentence alone is over budget it is cut at the last word boundary
 *   inside the budget and given a single ellipsis.
 * - Returns '' for empty/absent input, so callers can skip the element rather
 *   than render an empty paragraph.
 */
export function pujaCardBlurb(
  text: string | null | undefined,
  max: number = CARD_BLURB_MAX,
): string {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  if (flat.length <= max) return flat;

  // Split into sentences, keeping the terminator with its sentence.
  const sentences: string[] = [];
  let rest = flat;
  while (rest.length > 0) {
    const m = SENTENCE_END.exec(rest);
    const terminator = m?.[1];
    if (!m || m.index === undefined || terminator === undefined) {
      sentences.push(rest);
      break;
    }
    const end = m.index + terminator.length;
    sentences.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
  }

  let out = '';
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;

  // The first sentence alone is over budget — cut on a word boundary.
  const clipped = flat.slice(0, max);
  const lastSpace = clipped.lastIndexOf(' ');
  const body = (lastSpace > max * 0.5 ? clipped.slice(0, lastSpace) : clipped).replace(
    /[\s,;:.!?—-]+$/,
    '',
  );
  return `${body}…`;
}
