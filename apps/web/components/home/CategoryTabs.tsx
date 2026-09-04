'use client';

import { useState, useId } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CATEGORY_TREE, type CategoryKey } from '../../lib/category-tree';

/**
 * PLAN §2 — the consolidation of WorshipStrip + WisdomStrip + ConsultStrip.
 *
 * WHY THIS REPLACES THREE SECTIONS
 *
 * Measured on the live homepage (darshya.online, 1280x800, 2026-09-01): the
 * page is 8,851px / 25 sections / 11.1 screens on desktop, and 14,043px /
 * 16.6 screens at 390x844. Folds 2.9-5.8 present the five categories, and then
 * folds 6.3-9.1 present them AGAIN — roughly 2,900px, about a third of the
 * document, saying what the bento and the Live Darshan / Puja+Astrology
 * sections already said. "Live Darshan" appears as a heading three separate
 * times; the word "darshan" appears 14 times in body copy.
 *
 * Nothing is removed from the information architecture. Every destination in
 * CATEGORY_TREE is still exactly one tap from this block — the same links the
 * header mega-menu offers. What is removed is two screens of scrolling past
 * content the visitor has already been shown.
 *
 * WHY IT READS FROM CATEGORY_TREE
 *
 * The three strips hardcoded their own copy, which is how they drifted: the
 * old WorshipStrip advertised "live aarti from 200+ temples" against 20 seeded
 * temples, and cow adoption "from Rs 500 a month" against a plan table whose
 * cheapest monthly tier is Rs 3,000 (DF-05 / DF-06). Reading the one tree the
 * header already reads means the homepage cannot disagree with the navigation
 * about what exists — including the tax-exemption flag the tree already applies
 * to its Donate entry, so this block inherits that honesty gate for free and
 * never names the exemption itself.
 *
 * ACCESSIBILITY — the two defects the audit found in the existing nav, not
 * repeated here: HN-08 (dropdown triggers never updated aria-expanded, so
 * screen readers were told a menu was closed while it was open) and HN-09
 * (skip link moved the hash but not focus). This is a real tablist:
 * aria-selected tracks state, panels are labelled by their tab, arrow keys
 * move between tabs, and only the active panel is in the tree.
 */

const ORDER: CategoryKey[] = ['worship', 'library', 'astrology', 'yatra', 'shop'];

const ACCENT: Record<string, string> = {
  saffron: 'var(--color-primary)',
  indigo: '#4f46e5',
  emerald: '#16a34a',
  amber: '#D4A438',
};

export default function CategoryTabs({
  liveDarshanTemples,
}: {
  /**
   * Server-resolved count. `null` when the count could not be established —
   * in which case the copy renders with NO digit rather than falling back to
   * a marketing figure, which is the CM-11 contract.
   */
  liveDarshanTemples: number | null;
}) {
  const [active, setActive] = useState<CategoryKey>('worship');
  const baseId = useId();
  const cats = ORDER.map((k) => CATEGORY_TREE.find((c) => c.key === k)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  );

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    // `noUncheckedIndexedAccess` is on, and it is right to be: ORDER and
    // CATEGORY_TREE could drift apart, and a non-null assertion here would
    // turn that into a runtime crash on an arrow key.
    const next = cats[(index + delta + cats.length) % cats.length];
    if (!next) return;
    setActive(next.key);
    document.getElementById(`${baseId}-tab-${next.key}`)?.focus();
  }

  const current = cats.find((c) => c.key === active) ?? cats[0];
  // Nothing resolved from the tree at all — render nothing rather than a
  // heading above an empty grid.
  if (!current) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="container-wide">
        <div className="mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-primary)' }}
          >
            Explore
          </p>
          <h2
            className="text-xl sm:text-2xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Everything else on Darshya
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Browse by category"
          className="flex gap-1 overflow-x-auto border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          {cats.map((c, i) => {
            const on = c.key === active;
            return (
              <button
                key={c.key}
                id={`${baseId}-tab-${c.key}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={`${baseId}-panel-${c.key}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(c.key)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="tap-safe whitespace-nowrap px-4 text-sm font-medium transition-colors"
                style={{
                  color: on ? 'var(--color-text)' : 'var(--color-text-muted)',
                  borderBottom: `2px solid ${on ? ACCENT[c.accentColor] ?? 'var(--color-primary)' : 'transparent'}`,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div
          id={`${baseId}-panel-${current.key}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${current.key}`}
          className="pt-5"
        >
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {current.tagline}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {current.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="group rounded-xl p-3.5 transition-all card-hover"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  className="block text-sm font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {item.label}
                </span>
                <span
                  className="mt-0.5 block text-xs leading-snug"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {item.description}
                </span>
              </Link>
            ))}
          </div>

          {current.key === 'worship' && (
            <p className="mt-3 text-xs" style={{ color: 'var(--color-text-faint)' }}>
              {/* Digit-free when the count is unavailable — CM-11. */}
              {liveDarshanTemples === null
                ? 'Live aarti streams from verified temples.'
                : `${liveDarshanTemples} temple${liveDarshanTemples === 1 ? '' : 's'} streaming live aarti right now.`}
            </p>
          )}

          <Link
            href={`/${current.key === 'library' ? 'content' : current.key}`}
            className="tap-safe mt-4 items-center gap-1.5 text-xs font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            All of {current.label} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
