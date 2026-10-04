'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Globe, Home, CheckCircle2 } from 'lucide-react';
import { userFacingMessage } from '../../lib/friendly-error';

interface Gurukul {
  id: string; slug: string; name: string; description: string;
  city: string; state: string;
  tradition: string;
  isResidential: boolean; isOnline: boolean; acceptsMinors: boolean;
  isVerified: boolean;
}

function apiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return b.replace(/\/$/, '');
}

export default function GurukulsListClient() {
  const [items, setItems] = useState<Gurukul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    state: '', tradition: '', residential: '', online: '', acceptsMinors: '', q: '',
  });

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setLoading(true);
    fetch(`${apiBase()}/api/v1/gurukuls?${params.toString()}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { setItems(data.gurukuls ?? []); setError(null); })
      .catch((e) => setError(userFacingMessage(e, 'Failed to load')))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      <aside className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-surface-700">Search</label>
          <input
            type="text"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="name, tradition..."
            className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-surface-700">Tradition</label>
          <select value={filters.tradition} onChange={(e) => setFilters({ ...filters, tradition: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm">
            <option value="">All</option>
            <option>Advaita</option><option>Vishishtadvaita</option><option>Dvaita</option>
            <option>Smarta</option><option>Shaiva</option><option>Shakta</option><option>Vaishnava</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-surface-700">Mode</label>
          <div className="mt-1 space-y-1 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={filters.residential === 'true'} onChange={(e) => setFilters({ ...filters, residential: e.target.checked ? 'true' : '' })} /> Residential</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filters.online === 'true'} onChange={(e) => setFilters({ ...filters, online: e.target.checked ? 'true' : '' })} /> Online</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filters.acceptsMinors === 'true'} onChange={(e) => setFilters({ ...filters, acceptsMinors: e.target.checked ? 'true' : '' })} /> Accepts minors</label>
          </div>
        </div>
      </aside>

      <section>
        {loading && <p className="text-sm text-surface-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-surface-500">No gurukuls match these filters.</p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((g) => (
            <Link key={g.id} href={`/gurukuls/${g.slug}`} className="block p-4 bg-white border border-surface-200 rounded-xl hover:border-saffron-400 transition-colors">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="font-bold text-surface-900 flex-1">{g.name}</h3>
                {g.isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>
              <p className="text-xs text-saffron-700 font-semibold mb-2">{g.tradition}</p>
              <p className="text-sm text-surface-600 line-clamp-2 mb-2">{g.description}</p>
              <div className="flex items-center gap-3 text-xs text-surface-500 flex-wrap">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{g.city}, {g.state}</span>
                {g.isResidential && <span className="inline-flex items-center gap-1"><Home className="w-3 h-3" />Residential</span>}
                {g.isOnline && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />Online</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
