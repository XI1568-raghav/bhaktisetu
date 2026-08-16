'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search as SearchIcon, ArrowRight, BookOpen, Flame, Landmark } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api-config';
import { contentSubtitleLabel, pujaSubtitleLabel } from '../../components/SearchSubtitle';

/**
 * CM-12 (prod sweep 2026-08-12) — this page searched ONLY the static
 * /search-index.json of Sanskrit/Veda/Sanatan articles, under an H1 reading
 * "Search knowledge", while the header box that feeds it rotates placeholders
 * promising "Search puja, temple, kundli, saint…". Someone who already knows
 * they want Rudrabhishek typed it here and got scripture articles or nothing.
 *
 * The federated endpoint already existed — components/GlobalSearch.tsx calls
 * `${API_BASE_URL}/search?q=` and gets back { temples, pujas, content }. This
 * page now calls the same one, puts pujas first (they are the only results a
 * devotee can act on with money), and degrades to the article index alone if
 * the API is unreachable rather than showing an error wall.
 */
interface ApiHit {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  href: string;
}

/**
 * HN-03. `GET /api/v1/search` answers THREE buckets — `{ temples, pujas,
 * content }` (apps/api/src/routes/search.ts:107 maps `contentItem` rows to
 * `href: /content/<slug>`). This interface declared two, so the whole content
 * corpus — every aarti, chalisa, mantra and bhajan — was fetched and dropped.
 *
 * That is exactly the pair the sweep recorded as dead: /search?q=hanuman and
 * ?q=aarti both said "0 results" while the header typeahead over the SAME
 * endpoint returned /content/hanuman-chalisa and /content/bajrang-baan, and the
 * site serves a full /aarti page. Two surfaces, one endpoint, disagreeing
 * because one of them read two thirds of the payload.
 */
interface ApiResults {
  temples: ApiHit[];
  pujas: ApiHit[];
  content: ApiHit[];
}

const EMPTY_API_RESULTS: ApiResults = { temples: [], pujas: [], content: [] };

interface Entry {
  category: 'sanskrit' | 'ved' | 'sanatan';
  slug: string;
  title: string;
  summary: string;
  subTopic?: string;
}
interface Hit extends Entry { score: number }

const categoryLabel: Record<string, string> = {
  sanskrit: 'Sanskrit', ved: 'Vedas', sanatan: 'Sanatan Dharma',
};

function search(idx: Entry[], query: string, limit = 50): Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits: Hit[] = [];
  for (const e of idx) {
    const hay = `${e.title} ${e.summary} ${e.subTopic ?? ''} ${e.slug}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (!hay.includes(t)) { score = 0; break; }
      score += e.title.toLowerCase().includes(t) ? 3 : 1;
      if (e.summary.toLowerCase().includes(t)) score += 1;
    }
    if (score > 0) hits.push({ ...e, score });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return hits.slice(0, limit);
}

export default function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const [idx, setIdx] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<ApiResults>(EMPTY_API_RESULTS);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    fetch('/search-index.json')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: Entry[]) => setIdx(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setApi(EMPTY_API_RESULTS);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(trimmed)}&limit=8`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: { results?: Partial<ApiResults> }) => {
        if (cancelled) return;
        setApi({
          temples: Array.isArray(body.results?.temples) ? body.results!.temples! : [],
          pujas: Array.isArray(body.results?.pujas) ? body.results!.pujas! : [],
          // Absent bucket stays empty rather than being back-filled from
          // anywhere: a missing key is "the server did not say", not "there are
          // aartis and here they are".
          content: Array.isArray(body.results?.content) ? body.results!.content! : [],
        });
      })
      .catch(() => {
        // Catalogue search unavailable — fall back to the article index alone.
        // Never invent a puja result to fill the gap.
        if (!cancelled) setApi(EMPTY_API_RESULTS);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  const hits = useMemo(() => (idx ? search(idx, q, 50) : []), [idx, q]);
  const totalHits =
    hits.length + api.pujas.length + api.temples.length + api.content.length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = input.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-surface-900 mb-2">Search Darshya</h1>
      <p className="text-sm text-surface-600 mb-6">
        Pujas you can book, temples, and the Sanskrit / Veda / Sanatan Dharma library.
      </p>

      <form onSubmit={submit} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="rudrabhishek, kashi vishwanath, gayatri..."
            className="w-full pl-10 pr-3 py-2.5 border border-surface-200 rounded-lg"
            autoFocus
          />
        </div>
        <button type="submit" className="px-5 py-2.5 bg-saffron-600 text-white font-semibold rounded-lg hover:bg-saffron-700">
          Search
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!idx && !error && <p className="text-sm text-surface-500">Loading index...</p>}

      {idx && q && (
        <p className="text-sm text-surface-500 mb-4">{totalHits} result{totalHits === 1 ? '' : 's'} for &ldquo;{q}&rdquo;</p>
      )}

      {q && api.pujas.length > 0 && (
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">
            <Flame className="w-3.5 h-3.5" /> Pujas
          </h2>
          <div className="space-y-2">
            {api.pujas.map((r) => (
              <Link
                key={`puja-${r.id || r.slug}`}
                href={r.href || `/pujas/${r.slug}`}
                className="block p-4 bg-white border border-surface-200 rounded-xl hover:border-saffron-400 transition-colors"
              >
                <h3 className="font-bold text-surface-900">{r.name}</h3>
                {/*
                  CM-10: the API composes this from `p.deity ?? p.category`, so
                  a puja with no deity arrives as the raw PujaCategory member —
                  `special_occasion`. A deity name passes through untouched.
                */}
                {pujaSubtitleLabel(r.subtitle) && (
                  <p className="text-sm text-surface-600 mt-0.5">{pujaSubtitleLabel(r.subtitle)}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {q && api.temples.length > 0 && (
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">
            <Landmark className="w-3.5 h-3.5" /> Temples
          </h2>
          <div className="space-y-2">
            {api.temples.map((r) => (
              <Link
                key={`temple-${r.id || r.slug}`}
                href={r.href || `/temples/${r.slug}`}
                className="block p-4 bg-white border border-surface-200 rounded-xl hover:border-saffron-400 transition-colors"
              >
                <h3 className="font-bold text-surface-900">{r.name}</h3>
                {r.subtitle && <p className="text-sm text-surface-600 mt-0.5">{r.subtitle}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/*
        HN-03: aartis, chalisas, mantras and bhajans. This bucket was already on
        the wire and was being discarded, which is why the two most common
        devotional searches in this market — "hanuman" and "aarti" — both
        answered "0 results" on a site that serves full pages for both.
      */}
      {q && api.content.length > 0 && (
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">
            <BookOpen className="w-3.5 h-3.5" /> Aartis, chalisas &amp; mantras
          </h2>
          <div className="space-y-2">
            {api.content.map((r) => (
              <Link
                key={`content-${r.id || r.slug}`}
                href={r.href || `/content/${r.slug}`}
                className="block p-4 bg-white border border-surface-200 rounded-xl hover:border-saffron-400 transition-colors"
              >
                <h3 className="font-bold text-surface-900">{r.name}</h3>
                {/*
                  CM-10: `${c.type}${c.deity ? ' · ' + c.deity : ''}` — the
                  leading half is the ContentType enum (`video_reel`), the
                  trailing half is a real deity name and is kept verbatim.
                */}
                {contentSubtitleLabel(r.subtitle) && (
                  <p className="text-sm text-surface-600 mt-0.5">
                    {contentSubtitleLabel(r.subtitle)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {idx && q && totalHits === 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <p className="text-sm text-surface-700">No matches for &ldquo;{q}&rdquo;.</p>
          <p className="text-sm text-surface-500 mt-1">
            Try a shorter term, or start from a catalogue:
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/pujas"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-saffron-600 px-4 text-sm font-semibold text-white hover:bg-saffron-700"
            >
              Browse all pujas
            </Link>
            <Link
              href="/temples"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-surface-200 px-4 text-sm font-semibold text-surface-700 hover:border-saffron-400"
            >
              Browse temples
            </Link>
          </div>
        </div>
      )}

      {q && hits.length > 0 && (api.pujas.length > 0 || api.temples.length > 0 || api.content.length > 0) && (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">
          Library
        </h2>
      )}
      <div className="space-y-2">
        {hits.map((h) => (
          <Link
            key={`${h.category}-${h.slug}`}
            href={`/${h.category}/${h.slug}`}
            className="block p-4 bg-white border border-surface-200 rounded-xl hover:border-saffron-400 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{categoryLabel[h.category] ?? h.category}</span>
              {h.subTopic && <span className="text-xs text-surface-500">· {h.subTopic}</span>}
            </div>
            <h3 className="font-bold text-surface-900">{h.title}</h3>
            <p className="text-sm text-surface-600 line-clamp-2 mt-0.5">{h.summary}</p>
          </Link>
        ))}
      </div>

      {idx && !q && (
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {(['sanskrit', 'ved', 'sanatan'] as const).map((c) => (
            <Link key={c} href={`/${c}`} className="block p-4 bg-white border border-surface-200 rounded-xl hover:border-saffron-400">
              <h3 className="font-bold text-surface-900 mb-1">{categoryLabel[c]}</h3>
              <span className="inline-flex items-center gap-1 text-sm text-saffron-700 font-semibold">
                Browse <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
