'use client';

import { useEffect } from 'react';

/**
 * Highlights today's festival and dims past ones on /calendar and /calendar/<month>.
 *
 * The pages used to compare each festival with the SERVER clock, so they rendered per
 * request in the Cloudflare Worker (free plan: 10 ms CPU; a cold start is error 1102).
 * They are now prerendered without any date logic and served from assets. Every card
 * carries `data-fdate` (its date), `data-fpast` (the dimming class for that layout) and
 * its heading carries `data-ftitle`; this component applies the same classes the server
 * used to, once, in the visitor's browser. Classes are only added or removed, never React
 * state, so nothing here can cause a hydration mismatch.
 */
export function CalendarTodayMarkers({ year }: { year: number }) {
  useEffect(() => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const isCurrentYear = now.getFullYear() === year;
    document.querySelectorAll<HTMLElement>('[data-fdate]').forEach((el) => {
      const date = el.dataset.fdate ?? '';
      if (date === todayIso) {
        el.classList.remove('border-gray-200', 'bg-white');
        el.classList.add('border-saffron-400', 'bg-saffron-50');
        const title = el.querySelector<HTMLElement>('[data-ftitle]');
        if (title && !title.querySelector('[data-ftoday]')) {
          const badge = document.createElement('span');
          badge.setAttribute('data-ftoday', '');
          badge.className = 'ml-2 rounded bg-saffron-600 px-1.5 py-0.5 text-xs font-bold uppercase text-white';
          badge.textContent = 'Today';
          title.appendChild(badge);
        }
      } else if (isCurrentYear && date < todayIso) {
        el.classList.remove('bg-white');
        el.classList.add('bg-gray-50/50', ...(el.dataset.fpast ?? '').split(' ').filter(Boolean));
      }
    });
  }, [year]);
  return null;
}
