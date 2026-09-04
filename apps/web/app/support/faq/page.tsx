'use client';

import { Suspense, useMemo, useState } from 'react';
import RouteFallback from '../../../components/ui/RouteFallback';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowLeft, LifeBuoy, X } from 'lucide-react';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import {
  FAQ_ITEMS,
  FAQ_SECTIONS,
  FAQ_SECTION_FOR_CATEGORY,
  CATEGORY_MAP,
  type TicketCategory,
} from '../../../lib/support';

/**
 * I-09 (prod sweep 2026-08-12) — THIS PAGE IS A LINK TARGET, NOT JUST A LIST.
 *
 * Every "article" on /help and /support pointed here with `?q=<question>`, and
 * the eight category tiles on /support pointed here with `?cat=<id>`. Neither
 * parameter was read: the search box was seeded from `useState('')` and nothing
 * ever looked at the URL. So ~50 links across the two help surfaces all landed
 * on the same unfiltered list of 33 answers, several of them naming an article
 * that did not exist anywhere. The read path is the whole fix — a devotee who
 * followed a link about refunds must land on the answer about refunds.
 *
 * Read-only by design: typing in the box filters without rewriting the URL, so
 * no navigation is triggered per keystroke. The URL is an entry point here, not
 * a piece of state to round-trip.
 */

function isTicketCategory(value: string | null): value is TicketCategory {
  return Boolean(value && value in FAQ_SECTION_FOR_CATEGORY);
}

function FaqContent() {
  const searchParams = useSearchParams();
  const catParam = searchParams.get('cat');
  const category = isTicketCategory(catParam) ? catParam : null;
  const sectionFilter = category ? FAQ_SECTION_FOR_CATEGORY[category] : null;

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

  const filteredBySection = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bySection: Record<string, typeof FAQ_ITEMS> = {};
    FAQ_SECTIONS.forEach((s) => (bySection[s] = []));
    FAQ_ITEMS.forEach((item) => {
      if (sectionFilter && item.section !== sectionFilter) return;
      if (q) {
        const match =
          item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
        if (!match) return;
      }
      bySection[item.section]?.push(item);
    });
    return bySection;
  }, [query, sectionFilter]);

  const totalMatches = Object.values(filteredBySection).reduce((sum, arr) => sum + arr.length, 0);
  const filtering = Boolean(query.trim()) || Boolean(sectionFilter);

  return (
    <div className="min-h-[100dvh] bg-[#faf7f0]">
      <section className="bg-gradient-to-b from-[#fdf6e7] to-[#faf7f0] border-b border-amber-200/40 py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to support
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-100 text-saffron-800 text-xs font-medium mb-4">
            <LifeBuoy className="w-3.5 h-3.5" />
            FAQ
          </div>
          <h1 className={`${H1.catalogue} mb-3`}>
            Frequently asked questions
          </h1>
          <p className="text-surface-600 mb-6">
            {FAQ_ITEMS.length} answers across {FAQ_SECTIONS.length} categories.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search FAQ..."
              aria-label="Search the FAQ"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-surface-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm"
            />
          </div>

          {sectionFilter && (
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-surface-600 bg-white border border-surface-200 rounded-full pl-3 pr-2 py-1">
              Showing {CATEGORY_MAP[category!]?.name ?? sectionFilter}
              <Link
                href="/support/faq"
                aria-label="Clear category filter"
                className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-surface-100 text-surface-500"
              >
                <X className="w-3 h-3" />
              </Link>
            </p>
          )}

          {filtering && (
            <p className="mt-3 text-xs text-surface-500">
              {totalMatches} result{totalMatches === 1 ? '' : 's'}
              {query.trim() ? ` for "${query}"` : ''}
            </p>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          {FAQ_SECTIONS.map((section) => {
            const items = filteredBySection[section] ?? [];
            if (items.length === 0 && filtering) return null;
            return (
              <div key={section}>
                <h2 className="text-lg font-semibold text-surface-900 mb-4">{section}</h2>
                {items.length === 0 ? (
                  <p className="text-sm text-surface-500">No items in this section.</p>
                ) : (
                  <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100 overflow-hidden">
                    {items.map((item) => (
                      <details key={item.id} id={item.id} className="group" open={totalMatches === 1}>
                        <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-amber-50/40 list-none">
                          <span className="font-medium text-surface-900 text-base">
                            {item.question}
                          </span>
                          <span className="text-saffron-600 group-open:rotate-45 transition-transform text-xl leading-none">
                            +
                          </span>
                        </summary>
                        <div className="px-4 pb-4 text-sm text-surface-600 leading-relaxed">
                          {item.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filtering && totalMatches === 0 && (
            <div className="bg-white rounded-xl border border-surface-200 p-10 text-center">
              <h3 className="font-semibold text-surface-900 mb-1">No results found</h3>
              <p className="text-sm text-surface-500 mb-4">
                Try different keywords, browse the{' '}
                <Link href="/help" className="text-saffron-700 underline">
                  help centre
                </Link>
                , or raise a ticket and we&apos;ll answer directly.
              </p>
              <Link
                href="/support/ticket/new"
                className={buttonClass('primary', 'md')}
              >
                Raise a ticket
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function FaqPage() {
  // useSearchParams needs a Suspense boundary for this page to prerender.
  // CM-15: the fallback was an empty min-h-[100dvh] div — one blank viewport
  // baked into the prerendered HTML for every cold visitor.
  return (
      <Suspense fallback={<RouteFallback label="Loading help centre…" className="min-h-[100dvh] bg-[#faf7f0]" />}>
      <FaqContent />
    </Suspense>
  );
}
