/**
 * CM-10 (prod sweep 2026-08-12) — one place that turns a STORED value into the
 * words a devotee reads.
 *
 * The finding is "raw enum values like special_occasion are shown to
 * customers". Its /pujas half was closed by `lib/puja-labels.ts`
 * (`pujaCategoryLabel`), which is still the owner of the `puja_types.category`
 * column. This module is the same discipline for everything else, and a DOM
 * measurement on 2026-08-20 found two live leaks it had to cover:
 *
 *   - `components/home/NextFestivalStrip` built its homepage CTA as
 *     `Book {slug.replace(/-/g, ' ')}` → "Book satyanarayan katha". 40 of the
 *     60 calendar festivals render such a CTA, in 7 distinct strings, 6 of them
 *     multi-word lowercase. A de-hyphenated primary key is not a product name.
 *   - `components/LessonCard` printed the raw `'beginner' | 'intermediate' |
 *     'advanced'` union into its pill, two lines under a section heading that
 *     CSS-capitalises the same value — so one screen showed both "Beginner"
 *     and "beginner" for one enum member.
 *
 * The rule: a stored value reaches the DOM only through a function in here (or
 * through `pujaCategoryLabel`, which owns its own column). `humanizeEnum` is
 * the floor — an identifier that nobody has mapped yet is title-cased, so a
 * value added to the database tomorrow still cannot put an underscore on a
 * storefront.
 */

/**
 * Title-case a snake_case, kebab-case or SCREAMING_CASE identifier.
 *
 * Guaranteed never to return a string containing `_` or `-`: this is the last
 * line of defence for values nobody has written a label for.
 */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '';
  const words = value
    .trim()
    .split(/[_\-\s]+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Display names for the live `puja_types` catalogue, copied from the `name`
 * column each slug is seeded with (apps/api/prisma/seed.ts) rather than
 * invented here — the CTA and the page it lands on must say the same words.
 *
 * Every one of these happens to be the title-cased slug today, which is why
 * `humanizeEnum` is a safe fallback. The map still exists so the first name
 * that ISN'T (an acronym, a "&", a Devanagari form) has somewhere to live.
 */
export const PUJA_SLUG_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'ganesh-puja': 'Ganesh Puja',
  'hanuman-chalisa-path': 'Hanuman Chalisa Path',
  'lakshmi-puja': 'Lakshmi Puja',
  'maha-mrityunjay-jaap': 'Maha Mrityunjay Jaap',
  'navgraha-shanti-puja': 'Navgraha Shanti Puja',
  'pitru-dosh-nivaran-puja': 'Pitru Dosh Nivaran Puja',
  'ram-charit-manas-path': 'Ram Charit Manas Path',
  rudrabhishek: 'Rudrabhishek',
  'satyanarayan-katha': 'Satyanarayan Katha',
  'sunderkand-path': 'Sunderkand Path',
});

/**
 * The reader-facing name of a catalogue puja.
 *
 * An unmapped slug is title-cased rather than passed through — a puja added to
 * the catalogue tomorrow reads as "Chandi Homam", never as "chandi homam".
 * Absent/blank returns `''` so a caller can drop the element instead of
 * rendering an empty pill.
 */
export function pujaSlugLabel(slug: string | null | undefined): string {
  if (!slug) return '';
  const key = slug.trim().toLowerCase();
  if (!key) return '';
  return PUJA_SLUG_LABELS[key] ?? humanizeEnum(key);
}

/** Sanskrit-lesson difficulty. Mirrors the union in `components/LessonCard`. */
export const LESSON_LEVEL_LABELS: Readonly<Record<string, string>> = Object.freeze({
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
});

/** Reader-facing lesson level. Unmapped levels are title-cased. */
export function lessonLevelLabel(level: string | null | undefined): string {
  if (!level) return '';
  const key = level.trim().toLowerCase();
  if (!key) return '';
  return LESSON_LEVEL_LABELS[key] ?? humanizeEnum(key);
}
