'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Music,
  BookOpen,
  Headphones,
  Calendar,
  AlertCircle,
  Loader2,
  Play,
  ArrowRight,
} from 'lucide-react';
import { API_BASE_URL } from '../lib/api-config';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PersonalizedContentItem {
  id: string;
  type: string;
  title: string;
  slug: string;
  deity: string | null;
  imageUrl: string | null;
  durationSeconds: number | null;
}

interface PersonalizedContent {
  aarti: PersonalizedContentItem | null;
  mantra: PersonalizedContentItem | null;
  article: PersonalizedContentItem | null;
  festivalContent: PersonalizedContentItem | null;
}

// ─── Static fallback data ───────────────────────────────────────────────────────

const FALLBACK_CONTENT: PersonalizedContentItem[] = [
  {
    id: 'fallback-1',
    type: 'aarti',
    title: 'Om Jai Jagdish Hare',
    slug: 'om-jai-jagdish-hare',
    deity: 'Lord Vishnu',
    imageUrl: null,
    durationSeconds: 378,
  },
  {
    id: 'fallback-2',
    type: 'mantra',
    title: 'Gayatri Mantra - 108 times',
    slug: 'gayatri-mantra-108',
    deity: 'Goddess Gayatri',
    imageUrl: null,
    durationSeconds: 2700,
  },
  {
    id: 'fallback-3',
    type: 'article',
    title: 'The Significance of Sandhya Vandana',
    slug: 'significance-sandhya-vandana',
    deity: null,
    imageUrl: null,
    durationSeconds: null,
  },
  {
    id: 'fallback-4',
    type: 'bhajan',
    title: 'Achyutam Keshavam Krishna Damodaram',
    slug: 'achyutam-keshavam',
    deity: 'Lord Krishna',
    imageUrl: null,
    durationSeconds: 472,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: typeof Music; label: string; color: string; action: string }> = {
  aarti: {
    icon: Music,
    label: 'Aarti',
    color: 'bg-saffron-50 text-saffron-600',
    action: 'Listen',
  },
  mantra: {
    icon: Headphones,
    label: 'Mantra',
    color: 'bg-purple-50 text-purple-600',
    action: 'Listen',
  },
  article: {
    icon: BookOpen,
    label: 'Article',
    color: 'bg-blue-50 text-blue-600',
    action: 'Read',
  },
  bhajan: {
    icon: Music,
    label: 'Bhajan',
    color: 'bg-rose-50 text-rose-600',
    action: 'Listen',
  },
  chalisa: {
    icon: BookOpen,
    label: 'Chalisa',
    color: 'bg-amber-50 text-amber-600',
    action: 'Read',
  },
  story: {
    icon: BookOpen,
    label: 'Story',
    color: 'bg-teal-50 text-teal-600',
    action: 'Read',
  },
  festival: {
    icon: Calendar,
    label: 'Festival Special',
    color: 'bg-temple-gold/10 text-temple-gold',
    action: 'Read',
  },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.article!;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ForYouSection() {
  const [items, setItems] = useState<PersonalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPersonalizedContent = useCallback(async () => {
    setLoading(true);
    setError(false);

    // Try personalized content first (requires auth)
    try {
      const token =
        typeof window !== 'undefined'
          ? document.cookie
              .split('; ')
              .find((row) => row.startsWith('bs_access_token='))
              ?.split('=')[1]
          : null;

      if (token) {
        const res = await fetch(`${API_BASE_URL}/ai/personalize-content`, {
          headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
        });

        if (res.ok) {
          const data: PersonalizedContent = await res.json();
          const contentItems = [data.aarti, data.mantra, data.article, data.festivalContent].filter(
            Boolean,
          ) as PersonalizedContentItem[];

          if (contentItems.length > 0) {
            setItems(contentItems);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback: fetch generic daily content
      const dailyRes = await fetch(`${API_BASE_URL}/content/daily`);
      if (dailyRes.ok) {
        const dailyData = await dailyRes.json();
        const dailyItems = [dailyData.aarti, dailyData.mantra, dailyData.chalisa, dailyData.article].filter(
          Boolean,
        ) as PersonalizedContentItem[];

        if (dailyItems.length > 0) {
          setItems(dailyItems);
          setLoading(false);
          return;
        }
      }

      // Final fallback: static content
      setItems(FALLBACK_CONTENT);
    } catch {
      setError(true);
      setItems(FALLBACK_CONTENT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonalizedContent();
  }, [fetchPersonalizedContent]);

  return (
    <section className="py-16 bg-gradient-to-b from-saffron-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-temple-gold" />
              For You Today
            </h2>
            <p className="text-surface-500 mt-1">
              Personalized spiritual content curated just for you
            </p>
          </div>
          <a
            href="/content"
            className="hidden sm:inline-flex items-center gap-1 text-saffron-600 font-semibold hover:text-saffron-700 transition-colors"
          >
            Explore All <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-surface-100 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-16 rounded-full bg-surface-200" />
                </div>
                <div className="aspect-[4/3] rounded-xl bg-surface-100 mb-4" />
                <div className="h-5 w-3/4 rounded bg-surface-200 mb-2" />
                <div className="h-4 w-1/2 rounded bg-surface-100 mb-4" />
                <div className="h-9 w-full rounded-lg bg-surface-100" />
              </div>
            ))}
          </div>
        )}

        {/* Error with fallback */}
        {!loading && error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              Personalized picks are unavailable. Showing popular daily picks instead.
            </p>
          </div>
        )}

        {/* Content Grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((item) => {
              const config = getTypeConfig(item.type);
              const Icon = config.icon;
              return (
                <a
                  key={item.id}
                  href={`/content/${item.slug}`}
                  className="group rounded-2xl border border-surface-100 bg-white p-5 hover:shadow-xl hover:shadow-saffron-100/30 hover:border-saffron-200 transition-all duration-300"
                >
                  {/* Type Badge */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.color}`}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>

                  {/* Thumbnail / Placeholder */}
                  <div className="relative aspect-[4/3] rounded-xl bg-gradient-to-br from-saffron-100 to-amber-50 flex items-center justify-center overflow-hidden mb-4">
                    <Icon className="h-10 w-10 text-saffron-300" />
                    {/* Play overlay for audio content */}
                    {(item.type === 'aarti' || item.type === 'mantra' || item.type === 'bhajan') && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/15 transition-colors">
                        <div className="h-12 w-12 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <Play className="h-5 w-5 text-saffron-600 ml-0.5" />
                        </div>
                      </div>
                    )}
                    {item.durationSeconds && (
                      <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {formatDuration(item.durationSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-surface-900 group-hover:text-saffron-600 transition-colors text-sm line-clamp-2 mb-1">
                    {item.title}
                  </h3>

                  {/* Deity */}
                  {item.deity && (
                    <p className="text-xs text-surface-500 mb-3">{item.deity}</p>
                  )}
                  {!item.deity && <div className="mb-3" />}

                  {/* Action Button */}
                  <div className="mt-auto">
                    <span className="flex items-center justify-center gap-1.5 rounded-lg border border-saffron-200 bg-saffron-50 py-2 text-xs font-semibold text-saffron-700 group-hover:bg-saffron-600 group-hover:text-white group-hover:border-saffron-600 transition-all">
                      {config.action === 'Listen' ? (
                        <Headphones className="h-3.5 w-3.5" />
                      ) : (
                        <BookOpen className="h-3.5 w-3.5" />
                      )}
                      {config.action}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Mobile view-all link */}
        <div className="mt-6 text-center sm:hidden">
          <a
            href="/content"
            className="inline-flex items-center gap-1 text-saffron-600 font-semibold"
          >
            Explore Full Library <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
