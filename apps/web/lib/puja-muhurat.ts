/**
 * Muhurat guidance for the puja booking date picker.
 *
 * Types are defined locally on purpose: apps/web must never take a VALUE import
 * of the `@poojly/shared` / `@poojly/api-client` barrels (every page 500s under
 * `next dev --turbopack`, and neither tsc nor vitest notices).
 *
 * Contract with the API (GET /panchang/puja-muhurat, apps/api/src/lib/puja-muhurat.ts):
 * the endpoint returns the TOP-N scored days of the horizon, not one entry per
 * day. Guidance is therefore advisory and sparse; every consumer must treat a
 * date with no entry as "no opinion", never as "bad".
 */

import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from './api-config';

export type PujaMuhuratType = 'GRIHA_PRAVESH' | 'SATYANARAYAN';
export type MuhuratGrade = 'shubh' | 'neutral' | 'avoid';

export interface MuhuratWindow {
  from: string;
  to: string;
  label: string;
}

export interface PujaMuhuratDay {
  date: string;
  grade: MuhuratGrade;
  score: number;
  windows: MuhuratWindow[];
  rahuKaal: string;
  flags: string[];
  reasons?: string[];
  warnings?: string[];
}

/**
 * Puja slugs that map to a classical muhurat ruleset. Everything else keeps a
 * muhurat-blind picker (no fabricated auspiciousness).
 */
export const PUJA_TYPE_BY_SLUG: Record<string, PujaMuhuratType> = {
  'griha-pravesh': 'GRIHA_PRAVESH',
  'griha-pravesh-puja': 'GRIHA_PRAVESH',
  'griha-pravesam': 'GRIHA_PRAVESH',
  satyanarayan: 'SATYANARAYAN',
  'satyanarayan-puja': 'SATYANARAYAN',
  'satyanarayan-katha': 'SATYANARAYAN',
  'satyanarayana-puja': 'SATYANARAYAN',
};

export function pujaTypeForSlug(slug: string | undefined | null): PujaMuhuratType | null {
  if (!slug) return null;
  return Object.prototype.hasOwnProperty.call(PUJA_TYPE_BY_SLUG, slug)
    ? PUJA_TYPE_BY_SLUG[slug]!
    : null;
}

/** The picker's own ceiling (today + 30 days). Asking for more is wasted work. */
export const MUHURAT_HORIZON_DAYS = 30;

function isDay(x: unknown): x is PujaMuhuratDay {
  if (typeof x !== 'object' || x === null) return false;
  const d = x as Record<string, unknown>;
  return (
    typeof d.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
    (d.grade === 'shubh' || d.grade === 'neutral' || d.grade === 'avoid') &&
    Array.isArray(d.windows)
  );
}

/**
 * Fetch muhurat days for a supported puja type. NEVER throws and never blocks:
 * a non-2xx, a network failure, a timeout or a malformed body all resolve to
 * `[]`, which the picker renders exactly as it did before this layer existed.
 */
export async function fetchPujaMuhurat(
  pujaType: PujaMuhuratType,
  signal?: AbortSignal,
): Promise<PujaMuhuratDay[]> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/panchang/puja-muhurat?pujaType=${encodeURIComponent(pujaType)}&days=${MUHURAT_HORIZON_DAYS}&limit=${MUHURAT_HORIZON_DAYS}`,
      { signal },
      DATA_FETCH_TIMEOUT_MS,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: unknown } | null;
    const results = body?.results;
    if (!Array.isArray(results)) return [];
    return results.filter(isDay).map((d) => ({
      ...d,
      windows: d.windows ?? [],
      rahuKaal: typeof d.rahuKaal === 'string' ? d.rahuKaal : '',
      flags: Array.isArray(d.flags) ? d.flags : [],
    }));
  } catch {
    return [];
  }
}

/** Why an `avoid` day cannot be picked, in words a screen reader can announce. */
export function avoidReason(day: PujaMuhuratDay): string {
  const first = day.warnings?.find((w) => w && w.trim());
  return first
    ? `Not recommended for this puja: ${first}`
    : 'Not recommended for this puja (inauspicious day).';
}

export interface MuhuratView {
  markers: Record<string, MuhuratGrade>;
  avoidDates: Set<string>;
  avoidReasons: Record<string, string>;
}

export function buildMuhuratView(days: PujaMuhuratDay[]): MuhuratView {
  const markers: Record<string, MuhuratGrade> = {};
  const avoidDates = new Set<string>();
  const avoidReasons: Record<string, string> = {};
  for (const d of days) {
    markers[d.date] = d.grade;
    if (d.grade === 'avoid') {
      avoidDates.add(d.date);
      avoidReasons[d.date] = avoidReason(d);
    }
  }
  return { markers, avoidDates, avoidReasons };
}

/** "HH:MM - HH:MM" to a display pair, or null if it is not that shape. */
export function parseRahuKaal(raw: string): { from: string; to: string } | null {
  const m = /^\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$/.exec(raw ?? '');
  return m ? { from: m[1]!, to: m[2]! } : null;
}
