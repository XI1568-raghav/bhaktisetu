// Above-the-fold conversion hook: shows the next upcoming Hindu festival
// with a days-until countdown and a CTA to book a related puja. Pulls from
// the static festival calendar in lib/festivals.ts — zero-cost render.
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { nextFestival } from '../../lib/festivals';

function daysUntil(iso: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const target = new Date(iso);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function NextFestivalStrip() {
  const f = nextFestival();
  if (!f) return null;

  const days = daysUntil(f.date2026);
  const label =
    days === 0 ? 'Today' :
    days === 1 ? 'Tomorrow' :
    days < 0 ? 'Recently' :
    `In ${days} days`;

  const dateStr = new Date(f.date2026).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const firstPuja = f.pujasAvailable[0];

  return (
    <section className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-saffron-200 bg-gradient-to-r from-saffron-50 via-amber-50 to-saffron-50 p-5 sm:p-6 hover:border-saffron-300 transition">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link
              href={`/festival/${f.slug}`}
              className="flex items-center gap-4 min-w-0 flex-1 group"
            >
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-saffron-600 text-white">
                <Calendar className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-1">
                  Next festival
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-surface-900 truncate group-hover:underline">
                  {f.name}{' '}
                  <span className="text-base font-serif text-surface-500 ml-1">{f.sanskrit}</span>
                </h2>
                <p className="text-sm text-surface-700 truncate">
                  {dateStr} · {f.deity}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              {firstPuja ? (
                <Link
                  href={`/pujas/${firstPuja}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-saffron-600 text-white text-sm font-semibold hover:bg-saffron-700"
                >
                  Book {firstPuja.replace(/-/g, ' ')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : null}
              <Link
                href={`/festival/${f.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-saffron-700 hover:underline"
              >
                Learn more <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
