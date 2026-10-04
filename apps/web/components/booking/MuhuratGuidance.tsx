'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  buildMuhuratView,
  fetchPujaMuhurat,
  parseRahuKaal,
  pujaTypeForSlug,
  type MuhuratView,
  type PujaMuhuratDay,
} from '../../lib/puja-muhurat';

export interface MuhuratGuidanceState extends MuhuratView {
  days: PujaMuhuratDay[];
}

/**
 * Loads muhurat days for a puja slug. Unsupported slugs never touch the API;
 * any failure leaves `days` empty so the picker behaves as it always did.
 */
export function useMuhuratGuidance(slug: string | undefined | null): MuhuratGuidanceState {
  const [days, setDays] = useState<PujaMuhuratDay[]>([]);

  useEffect(() => {
    const pujaType = pujaTypeForSlug(slug);
    if (!pujaType) {
      setDays([]);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    fetchPujaMuhurat(pujaType, controller.signal).then((d) => {
      if (!cancelled) setDays(d);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug]);

  const view = useMemo(() => buildMuhuratView(days), [days]);
  return { days, ...view };
}

interface MuhuratGuidanceProps {
  days: PujaMuhuratDay[];
  selectedDate: string;
}

/**
 * Shubh badge + bookable-window chips for the chosen date, with Rahu Kaal shown
 * greyed and struck through. Renders nothing when there is no guidance.
 */
export function MuhuratGuidance({ days, selectedDate }: MuhuratGuidanceProps) {
  const day = days.find((d) => d.date === selectedDate);

  if (days.length > 0 && !day) {
    return (
      <p className="mt-3 text-xs text-surface-500">
        Green dates are shubh muhurat for this puja.
      </p>
    );
  }
  if (!day || day.windows.length === 0) return null;

  const rahu = parseRahuKaal(day.rahuKaal);
  return (
    <div
      className="mt-3 rounded-lg border border-green-100 bg-green-50/60 p-3"
      data-testid="muhurat-guidance"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-800">
        <Sparkles className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
        Muhurat windows
        {day.grade === 'shubh' && (
          <span className="ml-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
            Shubh
          </span>
        )}
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Bookable muhurat windows">
        {day.windows.map((w) => (
          <li
            key={`${w.from}-${w.to}-${w.label}`}
            className="rounded-full border border-green-200 bg-white px-2.5 py-1 text-xs font-medium text-green-800"
          >
            {w.from}–{w.to}
            {w.label ? <span className="ml-1 text-green-700/80">{w.label}</span> : null}
          </li>
        ))}
        {rahu && (
          <li
            data-testid="muhurat-rahukaal"
            className="rounded-full border border-surface-200 bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-500"
          >
            <span className="line-through">
              {rahu.from}–{rahu.to}
            </span>
            <span className="ml-1">Rahu Kaal, avoid</span>
          </li>
        )}
      </ul>
      {rahu && (
        <p className="mt-2 text-xs text-surface-500">
          Rahu Kaal {rahu.from}–{rahu.to} is excluded from these windows.
        </p>
      )}
    </div>
  );
}
