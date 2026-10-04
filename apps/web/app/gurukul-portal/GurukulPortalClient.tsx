'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ClipboardList, Building2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { H1 } from '../../components/ui/heading-recipe';
import { buttonClass } from '../../components/ui/button-recipe';
import { userFacingMessage } from '../../lib/friendly-error';

interface Gurukul {
  id: string; slug: string; name: string; city: string; state: string;
  tradition: string; isVerified: boolean;
  programs: { id: string; name: string; durationMonths: number }[];
}

function apiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return b.replace(/\/$/, '');
}

export default function GurukulPortalClient() {
  const { isAuthenticated, session } = useAuth();
  const [items, setItems] = useState<Gurukul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !session?.accessToken) { setLoading(false); return; }
    fetch(`${apiBase()}/api/v1/gurukuls/mine/list`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { setItems(data.gurukuls ?? []); setError(null); })
      .catch((e) => setError(userFacingMessage(e, 'Failed to load')))
      .finally(() => setLoading(false));
  }, [isAuthenticated, session?.accessToken]);

  if (!isAuthenticated) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-surface-600">Please <Link href="/auth/login" className="text-saffron-700 font-semibold">sign in</Link> to access the gurukul portal.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className={H1.portal}>Gurukul portal</h1>
          <p className="text-sm text-surface-600">Manage your listings and review admission applications.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/gurukul-portal/applications" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-lg text-sm font-semibold text-surface-700 hover:border-saffron-400">
            <ClipboardList className="w-4 h-4" /> Applications
          </Link>
          <Link href="/become-gurukul" className={buttonClass('primary', 'md')}>
            <Plus className="w-4 h-4" /> Register new
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-surface-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <div className="p-8 bg-white border border-surface-200 rounded-xl text-center">
          <Building2 className="w-10 h-10 text-surface-400 mx-auto mb-2" />
          <p className="text-surface-700 mb-3">You haven&apos;t registered any gurukul yet.</p>
          <Link href="/become-gurukul" className={buttonClass('primary', 'md')}>Register your first</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((g) => (
          <div key={g.id} className="p-4 bg-white border border-surface-200 rounded-xl">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-surface-900">{g.name}</h3>
              {g.isVerified ? (
                <span className="text-xs text-emerald-700">Verified</span>
              ) : (
                <span className="text-xs text-amber-700">Pending review</span>
              )}
            </div>
            <p className="text-xs text-saffron-700 font-semibold mb-1">{g.tradition}</p>
            <p className="text-xs text-surface-500 mb-2">{g.city}, {g.state}</p>
            <p className="text-xs text-surface-600">{g.programs.length} program{g.programs.length === 1 ? '' : 's'}</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/gurukuls/${g.slug}`} className="text-sm text-saffron-700 font-semibold">View public page</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
