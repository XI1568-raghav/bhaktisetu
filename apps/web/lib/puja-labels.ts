/**
 * CM-10 (prod sweep 2026-08-12) — display labels for catalogue enum values.
 *
 * A page-text scan of /pujas found the literal strings "special_occasion" (x4),
 * "planetary" (x4), "ancestral" (x2), "prosperity" (x2) and "health" in the
 * card metadata row, and /pujas/<slug> printed the same raw value in its hero
 * chip. A database column with an underscore in it on a consumer storefront
 * reads as unfinished software at exactly the moment the buyer is deciding
 * whether these people can be trusted with ₹1,100.
 */

/** Live `puja_types.category` values (Postgres darshya_utf8, 2026-08-13). */
const CATEGORY_LABELS: Record<string, string> = {
  planetary: 'Planetary remedies',
  special_occasion: 'Special occasions',
  ancestral: 'Ancestral rites',
  prosperity: 'Prosperity',
  health: 'Health & healing',
  daily: 'Daily worship',
  memorial: 'Memorial rites',
  abhishekam: 'Abhishekam',
  homa: 'Homa & havan',
  path: 'Path & recitation',
};

/** Title-case an unmapped snake_case or kebab-case token. */
function humanise(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Human label for a puja category.
 *
 * An unmapped value is title-cased rather than passed through, so a category
 * added to the database tomorrow still cannot leak an underscore onto a
 * storefront. An empty/absent category returns an empty string — callers skip
 * the chip entirely rather than render a blank pill.
 */
export function pujaCategoryLabel(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.trim().toLowerCase();
  if (!key) return '';
  return CATEGORY_LABELS[key] ?? humanise(value.trim());
}
