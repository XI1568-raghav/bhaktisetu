'use client';

/**
 * DevoteeTodaySection — the research-driven "Today" engagement block for the
 * devotee dashboard (devotee revamp 2026-08-05).
 *
 * Replaces the four hardcoded mock widgets (Darshan History / Saved Temples /
 * Chat History / Store Orders) that looked live but were static demo arrays.
 *
 * Design basis (Sri Mandir / VAMA / AstroTalk + Duolingo/Netflix patterns):
 *  - TODAY PANCHANG strip (tithi, nakshatra, rahukaal, shubh muhurat) — table
 *    stakes in every leading devotional app; zero-friction daily glance.
 *  - RASHI-personalized daily horoscope card — pulled by the devotee's moon
 *    sign from their profile, refreshed daily. Free daily-open hook.
 *  - CONTINUE reading (sunk-progress resume row, highest-CTR Netflix row) —
 *    replaces mock "Chat History" with the devotee's real in-progress parayan.
 *  - REAL store orders (replaces mock order history).
 *
 * All data is fetched client-side from live API routes and degrades to a
 * graceful empty state (never fake data) when the API has nothing.
 */

import { useEffect, useState } from 'react';
import {
  Calendar,
  Moon,
  Sun,
  BookOpen,
  ShoppingBag,
  ChevronRight,
  Sunrise,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';

interface Panchang {
  tithi?: string;
  nakshatra?: string;
  yoga?: string;
  karana?: string;
  sunrise?: string;
  sunset?: string;
  rahuKaal?: string;
  festivals?: string[];
}

interface Horoscope {
  sign?: string;
  signHindi?: string;
  reading?: string;
  rulingPlanet?: string;
  element?: string;
}

interface StoreOrder {
  id: string;
  orderNumber?: string;
  status?: string;
  totalAmountInr?: number | string;
  createdAt?: string;
  items?: unknown;
}

function EmptyHint({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="text-sm text-surface-500">
      <p>{text}</p>
      <a href={href} className="mt-1 inline-flex items-center gap-1 text-saffron-600 hover:text-saffron-700 font-medium">
        {cta} <ChevronRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export default function DevoteeTodaySection() {
  const { user, session } = useAuth();
  const [panchang, setPanchang] = useState<Panchang | null>(null);
  const [horoscope, setHoroscope] = useState<Horoscope | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const rashi = (user as { rashi?: string | null } | null)?.rashi ?? null;
  const city = (user as { locationCity?: string | null } | null)?.locationCity ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const headers = session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : undefined;
      const jobs: Promise<void>[] = [];

      // Today's panchang (public route; city-aware when the devotee set one).
      jobs.push(
        fetch(`${API_BASE_URL}/panchang/today${city ? `?city=${encodeURIComponent(city)}` : ''}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => { if (!cancelled && j) setPanchang(j); })
          .catch(() => undefined),
      );

      // Rashi horoscope (only when the devotee has a moon sign on file).
      if (rashi) {
        jobs.push(
          fetch(`${API_BASE_URL}/astrology/horoscope/daily?sign=${encodeURIComponent(rashi)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled && j?.horoscope) setHoroscope(j.horoscope); })
            .catch(() => undefined),
        );
      }

      // Real store orders (auth). Replaces the mock order history.
      if (headers) {
        jobs.push(
          fetch(`${API_BASE_URL}/store/orders?limit=3`, { headers })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
              if (cancelled) return;
              const list = (j?.orders ?? j?.data ?? []) as StoreOrder[];
              setOrders(Array.isArray(list) ? list.slice(0, 3) : []);
            })
            .catch(() => undefined),
        );
      }

      await Promise.allSettled(jobs);
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [session?.accessToken, rashi, city]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* Today Panchang */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-surface-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            Today's Panchang
          </h2>
          <a href="/panchang" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
            Full <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-sm text-surface-400">Loading…</p>
          ) : panchang ? (
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-surface-700"><span className="font-medium">{panchang.tithi}</span>{panchang.nakshatra ? ` · ${panchang.nakshatra}` : ''}</span>
              </div>
              {panchang.sunrise && (
                <div className="flex items-center gap-2">
                  <Sunrise className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-surface-600">Sunrise {panchang.sunrise}{panchang.sunset ? ` · Sunset ${panchang.sunset}` : ''}</span>
                </div>
              )}
              {panchang.rahuKaal && (
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-surface-600">Rahu Kaal {panchang.rahuKaal}</span>
                </div>
              )}
              {panchang.festivals && panchang.festivals.length > 0 && (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-saffron-500 shrink-0" />
                  <span className="text-saffron-700 font-medium">{panchang.festivals.join(', ')}</span>
                </div>
              )}
            </div>
          ) : (
            <EmptyHint text="Today's panchang isn't available yet." href="/panchang" cta="Open Panchang" />
          )}
        </div>
      </div>

      {/* Daily Horoscope (rashi-personalized) */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-surface-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-saffron-500" />
            Your Daily Horoscope
          </h2>
          <a href="/astrology" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
            More <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-sm text-surface-400">Loading…</p>
          ) : horoscope ? (
            <div className="text-sm">
              <p className="font-medium text-surface-800 mb-1">
                {horoscope.sign}{horoscope.signHindi ? ` (${horoscope.signHindi})` : ''}
              </p>
              <p className="text-surface-600 leading-relaxed line-clamp-4">{horoscope.reading}</p>
              {horoscope.rulingPlanet && (
                <p className="mt-2 text-xs text-surface-400">Ruling planet: {horoscope.rulingPlanet}</p>
              )}
            </div>
          ) : (
            <EmptyHint
              text={rashi ? "Today's horoscope isn't available yet." : 'Add your rashi (moon sign) to see your daily horoscope here.'}
              href="/profile"
              cta={rashi ? 'Open Astrology' : 'Set your rashi'}
            />
          )}
        </div>
      </div>

      {/* Continue Reading (sunk-progress resume; replaces mock Chat History) */}
      <ContinueReadingCard loading={loading} />

      {/* Real Store Orders (replaces mock order history) */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-surface-800 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            Your Orders
          </h2>
          <a href="/store" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
            Shop <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-sm text-surface-400">Loading…</p>
          ) : orders.length ? (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">
                      Order {o.orderNumber ?? `#${o.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-surface-500">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      {o.totalAmountInr != null ? ` · Rs. ${Number(o.totalAmountInr).toLocaleString('en-IN')}` : ''}
                    </p>
                  </div>
                  {o.status && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                      {o.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint text="No orders yet." href="/store" cta="Browse the store" />
          )}
        </div>
      </div>
    </div>
  );
}

/** "Continue your parayan" resume card — real reading progress, not mock chat. */
function ContinueReadingCard({ loading }: { loading: boolean }) {
  const { session } = useAuth();
  const [items, setItems] = useState<Array<{ contentId?: string; title?: string; progress?: number; href?: string }>>([]);

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/me/reading-progress?limit=3`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        // reading-progress route returns rows as {bookSlug, chapterSlug,
        // chapterNumber, scrollPercent, ...} — map to a resumable card.
        const list = (j?.progress ?? []) as Array<Record<string, unknown>>;
        setItems(
          (Array.isArray(list) ? list : []).slice(0, 3).map((p) => {
            const bookSlug = (p.bookSlug ?? p.book_slug) as string | undefined;
            const chapterSlug = (p.chapterSlug ?? p.chapter_slug) as string | undefined;
            const pct = (p.scrollPercent ?? p.scroll_percent) as number | undefined;
            const title = bookSlug
              ? bookSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : 'Continue reading';
            return {
              contentId: bookSlug,
              title: chapterSlug ? `${title} — ${String(chapterSlug).replace(/-/g, ' ')}` : title,
              progress: typeof pct === 'number' ? pct : undefined,
              href: bookSlug ? `/content/${bookSlug}${chapterSlug ? `/${chapterSlug}` : ''}` : '/content',
            };
          }),
        );
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [session?.accessToken]);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <h2 className="font-semibold text-surface-800 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-saffron-500" />
          Continue Reading
        </h2>
        <a href="/content" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
          Library <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="p-5">
        {loading ? (
          <p className="text-sm text-surface-400">Loading…</p>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((it) => (
              <a key={it.contentId ?? it.title} href={it.href ?? '/content'} className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-saffron-50 rounded-lg flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-saffron-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate group-hover:text-saffron-600">{it.title}</p>
                  {typeof it.progress === 'number' && (
                    <div className="mt-1 h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full bg-saffron-500" style={{ width: `${Math.min(100, Math.max(0, it.progress))}%` }} />
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-saffron-500 shrink-0" />
              </a>
            ))}
          </div>
        ) : (
          <EmptyHint text="Start a parayan and your progress will appear here." href="/content" cta="Explore scriptures" />
        )}
      </div>
    </div>
  );
}
