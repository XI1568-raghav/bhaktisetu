/**
 * CM-10 — display labels for the enum values `GET /api/v1/search` ships inside
 * its `subtitle` strings.
 *
 * The endpoint composes subtitles from raw columns:
 *
 *   apps/api/src/routes/search.ts
 *     pujas:   subtitle: p.deity ?? p.category ?? ''
 *     content: subtitle: `${c.type}${c.deity ? ` · ${c.deity}` : ''}`
 *
 * `p.category` is the PujaCategory enum, so any puja with a null deity — the
 * ancestral and occasion rites are exactly that shape — arrives as the literal
 * `special_occasion`. `c.type` is the ContentType enum, so `video_reel` arrives
 * the same way. Both search surfaces render `{subtitle}` verbatim, which is how
 * a database column with an underscore in it ends up in the header typeahead of
 * a storefront.
 *
 * Relabelling belongs here rather than in the API because the subtitle is a
 * presentation string: the same row is a chip on /pujas, a line under a
 * typeahead hit, and a card subtitle on /search. `lib/puja-labels.ts` and
 * `lib/content-type-labels.ts` already own the vocabulary; this module only
 * decides which half of a composed subtitle is an enum.
 */

import { pujaCategoryLabel } from '../lib/puja-labels';
import { CONTENT_TYPE_LABELS } from '../lib/content-type-labels';

/** How the API joins a content type to a deity. */
const JOINER = ' · ';

/**
 * Title-case a snake_case / kebab-case token. Mirrors the private helper in
 * lib/puja-labels.ts; kept local so this module can tell "pujaCategoryLabel
 * matched the map" apart from "pujaCategoryLabel merely title-cased my input",
 * which is the difference between an enum token and a deity name.
 */
function humanise(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * The subtitle of a puja hit.
 *
 * The value is either a deity name (real data — returned untouched, hyphens and
 * casing intact) or a PujaCategory member. Only a mapped category or a value
 * carrying an underscore is rewritten, so "Hanuman" stays "Hanuman" and
 * "special_occasion" becomes "Special occasions".
 */
export function pujaSubtitleLabel(raw?: string | null): string {
  const value = (raw ?? '').trim();
  if (!value) return '';

  const mapped = pujaCategoryLabel(value);
  if (mapped && mapped !== humanise(value)) return mapped;
  if (value.includes('_')) return mapped || value;
  return value;
}

/** The label for one ContentType member, without the "All Content" fallback. */
function contentTypeChip(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return '';
  return CONTENT_TYPE_LABELS[key] ?? humanise(raw.trim());
}

/**
 * The subtitle of a content hit.
 *
 * The API composes `type · deity`. Only the leading type is an enum; the deity
 * half is real data and is carried through unchanged. `contentTypeLabel()` is
 * deliberately NOT used: its unknown-value fallback is "All Content", which is
 * the right heading for an unfiltered library page and a nonsense subtitle for
 * a single result.
 */
export function contentSubtitleLabel(raw?: string | null): string {
  const value = (raw ?? '').trim();
  if (!value) return '';

  const [type, ...rest] = value.split(JOINER);
  const label = contentTypeChip(type ?? '');
  if (!label) return value;
  return [label, ...rest].join(JOINER);
}
