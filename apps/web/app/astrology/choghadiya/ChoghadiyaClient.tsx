'use client';

import { useState, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import {
 computeChoghadiya,
 CITY_OPTIONS,
 type ChoghadiyaDay,
 type ChoghadiyaPeriod,
 type ChoghadiyaQuality,
} from '../../../lib/choghadiya';
import { DateInput } from '../../../components/ui/DateInput';
import { buttonClass } from '../../../components/ui/button-recipe';

const QUALITY_STYLE: Record<ChoghadiyaQuality, { border: string; bg: string; pill: string; label: string }> = {
 auspicious:   { border: 'border-emerald-300', bg: 'bg-emerald-50/60', pill: 'bg-emerald-200 text-emerald-900', label: 'Auspicious' },
 inauspicious: { border: 'border-rose-300',    bg: 'bg-rose-50/60',    pill: 'bg-rose-200 text-rose-900',       label: 'Inauspicious' },
 neutral:      { border: 'border-gray-300',    bg: 'bg-gray-50/60',    pill: 'bg-gray-200 text-gray-800',       label: 'Neutral' },
};

function todayISO(): string {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ChoghadiyaClient() {
 const [date, setDate] = useState(todayISO());
 const [cityLabel, setCityLabel] = useState('Delhi');
 const city = useMemo(() => CITY_OPTIONS.find((c) => c.label === cityLabel) ?? CITY_OPTIONS[0]!, [cityLabel]);

 const result: ChoghadiyaDay | null = useMemo(
  () => computeChoghadiya({ date, lat: city.lat, lng: city.lng, tz: city.tz, city: city.label }),
  [date, city],
 );

 function onSubmit(e: FormEvent) {
  e.preventDefault();
 }

 return (
  <div>
   <form
    onSubmit={onSubmit}
    className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-white to-saffron-50/30 p-5 shadow-sm sm:p-6"
   >
    <div className="grid gap-4 sm:grid-cols-2">
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Date</span>
      <DateInput
       value={date}
       onChange={(v) => setDate(v)}
       required
      />
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">City</span>
      <select
       value={cityLabel}
       onChange={(e) => setCityLabel(e.target.value)}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {CITY_OPTIONS.map((c) => (
        <option key={c.label} value={c.label}>{c.label}</option>
       ))}
      </select>
     </label>
    </div>
    <p className="mt-3 text-xs text-gray-500">
     Sunrise/sunset via Almanac for Computers (~1 min accuracy — sufficient for 90-minute period
     granularity). Each day-period = (sunset − sunrise) / 8; each night-period = (next sunrise − sunset) / 8.
    </p>
   </form>

   {result && (
    <div className="mt-8 space-y-6">
     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 shadow-md">
      <p className="text-xs uppercase tracking-wider text-gray-700">{result.weekday} · {result.city}</p>
      <h2 className="mt-1 font-serif text-2xl text-gray-900">{result.date}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
       <Stat label="Sunrise" value={result.sunrise} />
       <Stat label="Sunset" value={result.sunset} />
       <Stat label="Next sunrise" value={result.nextSunrise} />
      </div>

      {result.currentPeriod && (
       <div className={`mt-5 rounded-xl border-2 p-4 ${QUALITY_STYLE[result.currentPeriod.quality].border} ${QUALITY_STYLE[result.currentPeriod.quality].bg}`}>
        <p className="text-xs uppercase tracking-wider text-gray-600">Right now</p>
        <p className="mt-1 font-serif text-xl text-gray-900">
         {result.currentPeriod.kind} <span className="text-sm font-normal text-gray-600">· {result.currentPeriod.startTime} → {result.currentPeriod.endTime}</span>
        </p>
        <p className="mt-1 text-sm text-gray-700">{result.currentPeriod.bestFor}</p>
       </div>
      )}

      {result.nextAuspicious && (!result.currentPeriod || result.currentPeriod.quality !== 'auspicious') && (
       <p className="mt-3 text-sm text-gray-700">
        <span className="font-semibold">Next auspicious window:</span>{' '}
        {result.nextAuspicious.kind} at {result.nextAuspicious.startTime} → {result.nextAuspicious.endTime}
       </p>
      )}
     </div>

     <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-6">
      <h3 className="font-serif text-lg text-gray-900">☀ Day Choghadiya (sunrise → sunset)</h3>
      <div className="mt-3 space-y-2">
       {result.day.map((p) => (
        <PeriodRow key={`d-${p.index}`} p={p} />
       ))}
      </div>
     </div>

     <div className="rounded-2xl border border-indigo-300 bg-indigo-50/40 p-6">
      <h3 className="font-serif text-lg text-gray-900">🌙 Night Choghadiya (sunset → next sunrise)</h3>
      <div className="mt-3 space-y-2">
       {result.night.map((p) => (
        <PeriodRow key={`n-${p.index}`} p={p} />
       ))}
      </div>
     </div>

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
      <p className="text-sm text-gray-800">
       Want a pandit-picked muhurat for a wedding, griha pravesh, or business launch?
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
        Ask a Pandit Live
       </Link>
       <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Free Kundli
       </Link>
       <Link href="/panchang" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Today's Panchang
       </Link>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function Stat({ label, value }: { label: string; value: string }) {
 return (
  <div className="rounded-xl border border-gray-200 bg-white/90 p-3 text-center">
   <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
   <p className="mt-0.5 font-serif text-lg text-gray-900">{value}</p>
  </div>
 );
}

function PeriodRow({ p }: { p: ChoghadiyaPeriod }) {
 const s = QUALITY_STYLE[p.quality];
 return (
  <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 ${
   p.isCurrent ? 'ring-2 ring-saffron-400 ring-offset-1' : ''
  } ${s.border} ${s.bg}`}>
   <div className="flex flex-wrap items-center gap-2">
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.pill}`}>{s.label}</span>
    <span className="font-serif text-base font-semibold text-gray-900">{p.kind}</span>
    {p.isCurrent && (
     <span className="rounded-full bg-saffron-600 px-2 py-0.5 text-xs font-bold text-white">NOW</span>
    )}
   </div>
   <div className="text-xs text-gray-700">
    {p.startTime} → {p.endTime}
    <span className="ml-2 opacity-70">{p.ruler}</span>
   </div>
  </div>
 );
}
