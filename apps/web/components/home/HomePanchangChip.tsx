'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../lib/api-config';

/**
 * "Aaj <tithi>, <nakshatra>" chip in the home hero.
 *
 * The home page is prerendered once at build time and served by Cloudflare as a
 * static asset (the Worker free plan cannot afford to start for it), so a date-
 * bound value baked into the HTML would be wrong from the next day on. The chip is
 * therefore read from the API in the browser, and simply absent until (or unless)
 * the answer arrives, exactly as it was absent when the server-side read failed.
 */
export default function HomePanchangChip() {
  const [chip, setChip] = useState<{ tithi: string; nakshatra: string } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_BASE_URL}/panchang/today`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { tithi?: unknown; nakshatra?: unknown } | null) => {
        if (ctrl.signal.aborted || !p) return;
        if (typeof p.tithi === 'string' && typeof p.nakshatra === 'string' && p.tithi && p.nakshatra) {
          setChip({ tithi: p.tithi, nakshatra: p.nakshatra });
        }
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  if (!chip) return null;
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
      style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
      data-testid="home-panchang-chip"
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }} />
      Aaj {chip.tithi}, {chip.nakshatra}
    </div>
  );
}
