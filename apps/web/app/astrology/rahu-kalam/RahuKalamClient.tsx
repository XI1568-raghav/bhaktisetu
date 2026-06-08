'use client';

import { useState, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import {
import { DateInput } from '../../../components/ui/DateInput';
 computeRahuKalam,
 CITY_OPTIONS,
 type RahuKalamDay,
 type DoshaWindow,
} from '../../../lib/rahu-kalam';

const DOSHA_STYLE: Record<DoshaWindow['kind'], { border: string; bg: string; pill: string; accent: string }> = {
 rahu:      { border: 'border-rose-400',   bg: 'bg-rose-50/70',   pill: 'bg-rose-200 text-rose-900',     accent: 'text-rose-700' },
 yamaganda: { border: 'border-amber-400',  bg: 'bg-amber-50/70',  pill: 'bg-amber-200 text-amber-900',   accent: 'text-amber-700' },
 gulika:    { border: 'border-purple-400', bg: 'bg-purple-50/70', pill: 'bg-purple-200 text-purple-900', accent: 'text-purple-700' },
};

function todayISO(): string {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RahuKalamClient() {
 const [date, setDate] = useState(todayISO());
 const [cityLabel, setCityLabel] = useState('Delhi');
 const city = useMemo(() => CITY_OPTIONS.find((c) => c.label === cityLabel) ?? CITY_OPTIONS[0]!, [cityLabel]);

 const result: RahuKalamDay | null = useMemo(
  () => computeRahuKalam({ date, lat: city.lat, lng: city.lng, tz: city.tz, city: city.label }),
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
      <DateInput value={date} onChange={(v) => setDate(v)} />
       required
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
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
    <p className="mt-3 text-[11px] text-gray-500">
     Each octet = (sunset − sunrise) / 8 ≈ 90 minutes. Rahu / Yamaganda / Gulika octet
     position per weekday follows Muhurta Chintamani standard tables.
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
       <Stat label="Octet length" value={`${result.octetLengthMin.toFixed(0)} min`} />
      </div>

      {result.currentDosha && (
       <div className={`mt-5 rounded-xl border-2 p-4 ${DOSHA_STYLE[result.currentDosha.kind].border} ${DOSHA_STYLE[result.currentDosha.kind].bg}`}>
        <p className="text-[11px] uppercase tracking-wider text-gray-600">Right now — avoid important work</p>
        <p className="mt-1 font-serif text-xl text-gray-900">
         {result.currentDosha.label} <span className="text-sm font-normal text-gray-600">· {result.currentDosha.startTime} → {result.currentDosha.endTime}</span>
        </p>
        <p className="mt-1 text-sm text-gray-700">{result.currentDosha.avoid}</p>
       </div>
      )}

      {!result.currentDosha && result.nextDosha && (
       <p className="mt-3 text-sm text-gray-700">
        <span className="font-semibold">Next inauspicious window:</span>{' '}
        {result.nextDosha.label} at {result.nextDosha.startTime} → {result.nextDosha.endTime}
       </p>
      )}

      {!result.currentDosha && !result.nextDosha && (
       <p className="mt-3 text-sm text-emerald-700">
        ✓ All three doshas have passed for today — rest of the day is clear of Rahu / Yamaganda / Gulika.
       </p>
      )}
     </div>

     <div className="space-y-3">
      <h3 className="font-serif text-lg text-gray-900">Today's three inauspicious windows</h3>
      {result.windows.map((w) => (
       <WindowCard key={w.kind} w={w} />
      ))}
     </div>

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
      <p className="text-sm text-gray-800">
       Need a pandit to pick an exact muhurat for your wedding, vehicle puja, or business launch?
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/astrology/choghadiya" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Choghadiya Muhurat
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
   <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
   <p className="mt-0.5 font-serif text-lg text-gray-900">{value}</p>
  </div>
 );
}

function WindowCard({ w }: { w: DoshaWindow }) {
 const s = DOSHA_STYLE[w.kind];
 return (
  <div className={`rounded-xl border-2 p-4 ${s.border} ${s.bg} ${w.isCurrent ? 'ring-2 ring-saffron-400 ring-offset-1' : ''}`}>
   <div className="flex flex-wrap items-start justify-between gap-2">
    <div>
     <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.pill}`}>Inauspicious</span>
      <span className="font-serif text-lg font-semibold text-gray-900">{w.label}</span>
      <span className={`text-sm ${s.accent}`}>{w.sanskrit}</span>
      {w.isCurrent && (
       <span className="rounded-full bg-saffron-600 px-2 py-0.5 text-[10px] font-bold text-white">NOW</span>
      )}
     </div>
     <p className="mt-1 text-xs text-gray-600">Octet #{w.octet} of 8 · ruled by {w.ruler}</p>
    </div>
    <div className="text-right">
     <p className="font-mono text-base font-semibold text-gray-900">{w.startTime} → {w.endTime}</p>
    </div>
   </div>
   <p className="mt-2 text-sm text-gray-700">{w.avoid}</p>
  </div>
 );
}
