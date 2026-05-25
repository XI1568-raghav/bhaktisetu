'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search as SearchIcon, ArrowRight } from 'lucide-react';

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

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    fetch('/search-index.json')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: Entry[]) => setIdx(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const hits = useMemo(() => (idx ? search(idx, q, 50) : []), [idx, q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = input.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-surface-900 mb-2">Search knowledge</h1>
      <p className="text-sm text-surface-600 mb-6">Across Sanskrit, Vedas, and Sanatan Dharma articles.</p>

      <form onSubmit={submit} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="dharma, mantra, gayatri, atman..."
            className="w-full pl-10 pr-3 py-2.5 border border-surface-200 rounded-lg"
            autoFocus
          />
        </div>
        <button type="submit" className="px-5 py-2.5 bg-saffron-500 text-white font-semibold rounded-lg hover:bg-saffron-600">
          Search
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!idx && !error && <p className="text-sm text-surface-500">Loading index...</p>}

      {idx && q && (
        <p className="text-sm text-surface-500 mb-4">{hits.length} result{hits.length === 1 ? '' : 's'} for &ldquo;{q}&rdquo;</p>
      )}
      {idx && q && hits.length === 0 && (
        <p className="text-sm text-surface-500">No matches. Try a different term.</p>
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
