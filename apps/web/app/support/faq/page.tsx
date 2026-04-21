'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, LifeBuoy } from 'lucide-react';
import { FAQ_ITEMS, FAQ_SECTIONS } from '../../../lib/support';

export default function FaqPage() {
  const [query, setQuery] = useState('');

  const filteredBySection = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bySection: Record<string, typeof FAQ_ITEMS> = {};
    FAQ_SECTIONS.forEach((s) => (bySection[s] = []));
    FAQ_ITEMS.forEach((item) => {
      if (q) {
        const match =
          item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
        if (!match) return;
      }
      bySection[item.section]?.push(item);
    });
    return bySection;
  }, [query]);

  const totalMatches = Object.values(filteredBySection).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="min-h-screen bg-[#faf7f0]">
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
          <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold text-surface-900 tracking-tight mb-3">
            Frequently asked questions
          </h1>
          <p className="text-surface-600 mb-6">
            {FAQ_ITEMS.length}+ answers across {FAQ_SECTIONS.length} categories.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search FAQ..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-surface-200 focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none text-sm"
            />
          </div>

          {query && (
            <p className="mt-3 text-xs text-surface-500">
              {totalMatches} result{totalMatches === 1 ? '' : 's'} for &quot;{query}&quot;
            </p>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          {FAQ_SECTIONS.map((section) => {
            const items = filteredBySection[section] ?? [];
            if (items.length === 0 && query) return null;
            return (
              <div key={section}>
                <h2 className="text-lg font-semibold text-surface-900 mb-4">{section}</h2>
                {items.length === 0 ? (
                  <p className="text-sm text-surface-500">No items in this section.</p>
                ) : (
                  <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100 overflow-hidden">
                    {items.map((item) => (
                      <details key={item.id} className="group">
                        <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-amber-50/40 list-none">
                          <span className="font-medium text-surface-900 text-[15px]">
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

          {query && totalMatches === 0 && (
            <div className="bg-white rounded-xl border border-surface-200 p-10 text-center">
              <h3 className="font-semibold text-surface-900 mb-1">No results found</h3>
              <p className="text-sm text-surface-500 mb-4">
                Try different keywords, or raise a ticket and we&apos;ll answer directly.
              </p>
              <Link
                href="/support/ticket/new"
                className="inline-flex px-4 py-2 rounded-lg bg-saffron-600 hover:bg-saffron-700 text-white text-sm font-semibold"
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
