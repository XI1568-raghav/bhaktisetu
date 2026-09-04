import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FestivalInfo } from '../lib/festivals';

/**
 * CM-10 (prod sweep 2026-08-12) — "raw enum values are shown to customers".
 *
 * The /pujas half of this finding (pujaCategoryLabel) was closed in an earlier
 * wave. The HOME + CARD half was not, and a DOM measurement on 2026-08-20 found
 * it still leaking:
 *
 *   NextFestivalStrip  rendered textContent
 *     "TodayNext festivalRaksha Bandhan रक्षाबंधन
 *      Wednesday, 19 August · None (sibling bond)
 *      Book satyanarayan katha Learn more"
 *
 *   Two defects in one strip, both above the fold on the homepage:
 *     1. `Book {firstPuja.replace(/-/g, ' ')}` prints the raw catalogue SLUG.
 *        Across the 60-festival calendar 40 festivals render such a CTA, in 7
 *        distinct strings, 6 of them multi-word lowercase: "Book satyanarayan
 *        katha", "Book pitru dosh nivaran puja", "Book navgraha shanti puja",
 *        "Book sunderkand path", "Book ganesh puja", "Book lakshmi puja".
 *     2. `{dateStr} · {f.deity}` prints the calendar's placeholder deity
 *        verbatim — "None (sibling bond)" (raksha-bandhan) and "Various (river
 *        deities)" (maha-kumbh). "None" is a data sentinel, not copy.
 *
 *   LessonCard  rendered textContent "beginner5 minT" — the raw
 *   'beginner' | 'intermediate' | 'advanced' union straight into the pill. The
 *   /learn-sanskrit section heading above it applies `capitalize`; the pill
 *   does not, so the same value reads "Beginner" in one place and "beginner"
 *   two lines below.
 *
 *   MyProviderProfileCard renders an unbounded provider `bio` under
 *   `line-clamp-2` — the same "clamp prose written for a detail page" shape the
 *   finding calls out on the puja card. CSS clamp cuts mid-word and leaves the
 *   whole string in the DOM/accessibility tree.
 *
 * These assertions are DOM assertions, not source greps, so no comment can
 * satisfy them and no comment can trip them.
 */

const LIVE_CATALOGUE = new Set([
  'ganesh-puja',
  'hanuman-chalisa-path',
  'lakshmi-puja',
  'maha-mrityunjay-jaap',
  'navgraha-shanti-puja',
  'pitru-dosh-nivaran-puja',
  'ram-charit-manas-path',
  'rudrabhishek',
  'satyanarayan-katha',
  'sunderkand-path',
]);

const FIXTURE: FestivalInfo = {
  slug: 'test-festival',
  name: 'Test Festival',
  sanskrit: 'परीक्षा',
  date2026: '2026-12-25',
  deity: 'None (sibling bond)',
  description: 'A fixture.',
  rituals: [],
  // Alias of the real 'satyanarayan-katha' — exercises the resolver too.
  pujasAvailable: ['satyanarayan-puja'],
  fastingType: 'none',
  significance: 'A fixture.',
};

vi.mock('../lib/festivals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/festivals')>();
  return { ...actual, nextFestival: () => FIXTURE };
});

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'live-token' } }),
}));

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/** Words that only ever appear inside a catalogue slug. */
const SLUG_WORDS = new Set(
  [...LIVE_CATALOGUE].flatMap((s) => s.split('-')).filter((w) => w.length > 2),
);

/**
 * Every run of two-or-more consecutive ALL-LOWERCASE catalogue words in a piece
 * of rendered text. "satyanarayan katha" is a de-hyphenated slug; "Satyanarayan
 * Katha" is a name a human wrote.
 */
function lowercaseSlugRuns(text: string): string[] {
  const runs: string[] = [];
  let run: string[] = [];
  for (const w of text.split(/[^A-Za-z]+/).filter(Boolean)) {
    if (w === w.toLowerCase() && SLUG_WORDS.has(w)) run.push(w);
    else {
      if (run.length >= 2) runs.push(run.join(' '));
      run = [];
    }
  }
  if (run.length >= 2) runs.push(run.join(' '));
  return runs;
}

describe('lib/enum-labels — one map from stored value to reader-facing words', () => {
  it('labels every live catalogue slug without leaking the separator', async () => {
    const { pujaSlugLabel } = await import('../lib/enum-labels');
    for (const slug of LIVE_CATALOGUE) {
      const label = pujaSlugLabel(slug);
      expect(label, slug).not.toMatch(/[-_]/);
      // Every word starts capitalised — no "satyanarayan katha".
      for (const w of label.split(' ')) expect(w[0], `${slug} -> ${label}`).toMatch(/[A-Z]/);
    }
    expect(pujaSlugLabel('satyanarayan-katha')).toBe('Satyanarayan Katha');
    expect(pujaSlugLabel('maha-mrityunjay-jaap')).toBe('Maha Mrityunjay Jaap');
    expect(pujaSlugLabel('rudrabhishek')).toBe('Rudrabhishek');
  });

  it('title-cases a slug that is not in the map rather than passing it through', async () => {
    const { pujaSlugLabel } = await import('../lib/enum-labels');
    expect(pujaSlugLabel('brand-new-havan')).toBe('Brand New Havan');
    expect(pujaSlugLabel('special_occasion')).toBe('Special Occasion');
  });

  it('returns an empty string for an absent value so callers can skip the chip', async () => {
    const { pujaSlugLabel, humanizeEnum, lessonLevelLabel } = await import('../lib/enum-labels');
    expect(pujaSlugLabel(null)).toBe('');
    expect(pujaSlugLabel('   ')).toBe('');
    expect(humanizeEnum(undefined)).toBe('');
    expect(lessonLevelLabel(null)).toBe('');
  });

  it('never lets an underscore or a hyphen through humanizeEnum', async () => {
    const { humanizeEnum } = await import('../lib/enum-labels');
    for (const raw of ['special_occasion', 'video_reel', 'STORE_OWNER', 'one-meal', 'in_progress']) {
      expect(humanizeEnum(raw), raw).not.toMatch(/[-_]/);
    }
    expect(humanizeEnum('video_reel')).toBe('Video Reel');
    expect(humanizeEnum('STORE_OWNER')).toBe('Store Owner');
  });

  it('labels the three lesson levels', async () => {
    const { lessonLevelLabel } = await import('../lib/enum-labels');
    expect(lessonLevelLabel('beginner')).toBe('Beginner');
    expect(lessonLevelLabel('intermediate')).toBe('Intermediate');
    expect(lessonLevelLabel('advanced')).toBe('Advanced');
  });
});

describe('lib/copy — card copy is a sentence, not a clipped excerpt', () => {
  it('returns short copy untouched', async () => {
    const { cardBlurb } = await import('../lib/copy');
    expect(cardBlurb('90-minute Shiva abhishek at Kashi. Prasad to your door.')).toBe(
      '90-minute Shiva abhishek at Kashi. Prasad to your door.',
    );
  });

  it('keeps the first WHOLE sentence of a long excerpt instead of clipping mid-word', async () => {
    const { cardBlurb } = await import('../lib/copy');
    const excerpt =
      'Rudrabhishek is the ceremonial bathing of a Shiva linga. ' +
      'The Shri Rudram and Chamakam of the Taittiriya Samhita are recited throughout, '.repeat(12);
    const out = cardBlurb(excerpt);
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out).toBe('Rudrabhishek is the ceremonial bathing of a Shiva linga.');
    expect(out).not.toMatch(/\s…$/);
  });

  it('cuts on a word boundary and marks the cut when no sentence fits', async () => {
    const { cardBlurb } = await import('../lib/copy');
    const out = cardBlurb('word '.repeat(80));
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out.endsWith('…')).toBe(true);
    // No half word before the ellipsis.
    expect(out.replace(/…$/, '').trimEnd().split(' ').pop()).toBe('word');
  });

  it('collapses newlines and empty input', async () => {
    const { cardBlurb } = await import('../lib/copy');
    expect(cardBlurb('a\n\n  b')).toBe('a b');
    expect(cardBlurb(null)).toBe('');
    expect(cardBlurb('   ')).toBe('');
  });

  it('deityLine drops the "None"/"Various" sentinel but keeps the meaning', async () => {
    const { deityLine } = await import('../lib/copy');
    expect(deityLine('None (sibling bond)')).toBe('Sibling bond');
    expect(deityLine('Various (river deities)')).toBe('River deities');
    expect(deityLine('None')).toBe('');
    expect(deityLine('N/A')).toBe('');
    expect(deityLine('Vishnu')).toBe('Vishnu');
    expect(deityLine('Shiva / Parvati / Moon')).toBe('Shiva / Parvati / Moon');
    expect(deityLine(null)).toBe('');
  });
});

describe('CM-10 · NextFestivalStrip renders copy, not catalogue rows', () => {
  it('names the puja in the CTA instead of printing its slug', async () => {
    const { default: NextFestivalStrip } = await import('../components/home/NextFestivalStrip');
    const { container } = render(await NextFestivalStrip({ catalogueSlugs: LIVE_CATALOGUE }));

    const cta = screen.getByRole('link', { name: /^Book / });
    expect(cta.textContent?.trim()).toBe('Book Satyanarayan Katha');
    expect(cta).toHaveAttribute('href', '/pujas/satyanarayan-katha');
    expect(lowercaseSlugRuns(container.textContent ?? '')).toEqual([]);
  });

  it('does not print the calendar placeholder "None" as the festival deity', async () => {
    const { default: NextFestivalStrip } = await import('../components/home/NextFestivalStrip');
    const { container } = render(await NextFestivalStrip({ catalogueSlugs: LIVE_CATALOGUE }));
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\bNone\b/);
    expect(text).toContain('Sibling bond');
  });

  it('still falls back to the browse link when the catalogue is unreadable', async () => {
    const { default: NextFestivalStrip } = await import('../components/home/NextFestivalStrip');
    render(await NextFestivalStrip({ catalogueSlugs: new Set<string>() }));
    expect(screen.getByRole('link', { name: /browse pujas/i })).toHaveAttribute('href', '/pujas');
  });
});

describe('CM-10 · LessonCard shows a level, not an enum member', () => {
  it.each([
    ['beginner', 'Beginner'],
    ['intermediate', 'Intermediate'],
    ['advanced', 'Advanced'],
  ] as const)('renders %s as %s', async (level, label) => {
    const { default: LessonCard } = await import('../components/LessonCard');
    const { container } = render(
      <LessonCard id="l1" title="Devanagari basics" level={level} minutes={5} />,
    );
    expect(container.textContent).toContain(label);
    expect(container.textContent).not.toContain(level);
  });
});

describe('CM-10 · MyProviderProfileCard bio is a blurb, not a clamped essay', () => {
  it('renders one sentence of a long bio instead of putting the whole essay in the DOM', async () => {
    const bio =
      'Pandit Sharma has served at Kashi Vishwanath for 22 years. ' +
      'He was initiated into the Rudram tradition by his grandfather and has performed over four thousand abhishekams since. '.repeat(
        8,
      );
    expect(bio.length).toBeGreaterThan(900);

    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ profile: { id: 'p1', templeName: 'Pandit Sharma', bio, approved: true } }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const { default: MyProviderProfileCard } = await import(
      '../components/MyProviderProfileCard'
    );
    render(
      <MyProviderProfileCard role="PANDIT" onboardingSlug="priest" publicListingType="pandit" />,
    );

    const heading = await screen.findByText('Pandit Sharma');
    const card = heading.closest('div.bg-\\[var\\(--color-surface\\)\\]') ?? document.body;
    const rendered = card.textContent ?? '';
    expect(rendered).not.toContain(bio.slice(0, 400));
    expect(rendered).toContain('Pandit Sharma has served at Kashi Vishwanath for 22 years.');

    const bioNode = [...document.querySelectorAll('p')].find((p) =>
      p.textContent?.startsWith('Pandit Sharma has served'),
    );
    expect(bioNode, 'bio paragraph missing').toBeTruthy();
    expect(bioNode!.textContent!.length).toBeLessThanOrEqual(140);
  });
});
