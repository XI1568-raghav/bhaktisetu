'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { computeDasha, DASHA_LORD_PLANET_HINDI, DASHA_LORD_NATURE, type DashaResult } from '../../../lib/dasha-vimshottari';

type TimezoneOption = { value: number; label: string };

const LORD_COLOR: Record<string, string> = {
 Ketu: 'bg-stone-100 text-stone-800 border-stone-300',
 Venus: 'bg-rose-100 text-rose-800 border-rose-300',
 Sun: 'bg-amber-100 text-amber-800 border-amber-300',
 Moon: 'bg-sky-100 text-sky-800 border-sky-300',
 Mars: 'bg-red-100 text-red-800 border-red-300',
 Rahu: 'bg-violet-100 text-violet-800 border-violet-300',
 Jupiter: 'bg-yellow-100 text-yellow-800 border-yellow-300',
 Saturn: 'bg-slate-200 text-slate-800 border-slate-400',
 Mercury: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export default function DashaClient({ options }: { options: TimezoneOption[] }) {
 const [dob, setDob] = useState('');
 const [time, setTime] = useState('12:00');
 const [tz, setTz] = useState(5.5);
 const [result, setResult] = useState<DashaResult | null>(null);
 const [error, setError] = useState<string | null>(null);

 function onSubmit(e: FormEvent) {
  e.preventDefault();
  setError(null);
  if (!dob) {
   setError('Enter your date of birth.');
   return;
  }
  const r = computeDasha({ dob, time, timezoneOffset: tz });
  if (!r) {
   setError('Could not compute. Check date + time.');
   setResult(null);
   return;
  }
  setResult(r);
  setTimeout(() => {
   document.getElementById('dasha-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
 }

 return (
  <div>
   <form
    onSubmit={onSubmit}
    className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-white to-saffron-50/30 p-5 shadow-sm sm:p-6"
   >
    <div className="grid gap-4 sm:grid-cols-3">
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Date of birth</span>
      <input
       type="date"
       value={dob}
       onChange={(e) => setDob(e.target.value)}
       required
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      />
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Time of birth</span>
      <input
       type="time"
       value={time}
       onChange={(e) => setTime(e.target.value)}
       required
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      />
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Timezone</span>
      <select
       value={tz}
       onChange={(e) => setTz(Number(e.target.value))}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {options.map((o) => (
        <option key={o.label} value={o.value}>{o.label}</option>
       ))}
      </select>
     </label>
    </div>

    {error && (
     <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
    )}

    <button
     type="submit"
     className="mt-4 w-full rounded-full bg-saffron-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-saffron-700 sm:w-auto"
    >
     Compute My Dasha
    </button>

    <p className="mt-3 text-[11px] text-gray-500">
     Vimshottari 120-yr cycle per Brihat Parashara Hora Shastra. Computed from your janma
     nakshatra position. For ceremonial muhurat or remedial recommendations consult a pandit.
    </p>
   </form>

   {result && (
    <div id="dasha-result" className="mt-8 space-y-6">
     <div className="rounded-2xl border-2 border-saffron-400 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 shadow-md">
      <p className="text-xs uppercase tracking-wider text-saffron-700">Birth dasha</p>
      <p className="mt-2 font-serif text-lg text-gray-900">
       You were born in the <span className="font-bold">{result.janmaLord}</span>{' '}
       ({DASHA_LORD_PLANET_HINDI[result.janmaLord]}) mahadasha
      </p>
      <p className="mt-1 text-sm text-gray-700">
       Janma nakshatra: <span className="font-semibold">{result.janmaNakshatra}</span> · Balance
       at birth: <span className="font-semibold">{result.birthBalanceYears.toFixed(2)} years</span>
      </p>
     </div>

     {result.currentMahadasha && (
      <div className="rounded-2xl border-2 border-saffron-300 bg-white p-6 shadow-sm">
       <p className="text-xs uppercase tracking-wider text-saffron-700">Current mahadasha (today)</p>
       <div className="mt-2 flex flex-wrap items-baseline gap-x-4">
        <h3 className="font-serif text-3xl text-gray-900">{result.currentMahadasha.lord}</h3>
        <span className="font-serif text-xl text-saffron-700">
         {DASHA_LORD_PLANET_HINDI[result.currentMahadasha.lord]}
        </span>
       </div>
       <p className="mt-2 text-sm text-gray-700">
        {result.currentMahadasha.startDate} → {result.currentMahadasha.endDate}{' '}
        ({result.currentMahadasha.years.toFixed(1)} yrs)
       </p>
       <p className="mt-3 text-sm leading-relaxed text-gray-800">
        <span className="font-semibold">Themes:</span> {DASHA_LORD_NATURE[result.currentMahadasha.lord]}
       </p>

       {result.currentAntardasha && (
        <div className="mt-5 rounded-xl border border-saffron-200 bg-saffron-50/50 p-4">
         <p className="text-xs uppercase tracking-wider text-saffron-700">
          Current antardasha (sub-period)
         </p>
         <p className="mt-1 font-serif text-lg text-gray-900">
          {result.currentMahadasha.lord} — {result.currentAntardasha.lord}
         </p>
         <p className="text-xs text-gray-600">
          {result.currentAntardasha.startDate} → {result.currentAntardasha.endDate}{' '}
          ({result.currentAntardasha.years.toFixed(2)} yrs)
         </p>
        </div>
       )}

       {result.currentMahadasha.antardashas && (
        <details className="mt-4">
         <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
          All 9 antardashas in current mahadasha
         </summary>
         <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {result.currentMahadasha.antardashas.map((ad) => (
           <div
            key={ad.lord}
            className={`rounded-lg border p-2 text-xs ${
             ad.isCurrent ? 'border-saffron-500 bg-saffron-100 font-semibold' : 'border-gray-200 bg-white'
            }`}
           >
            <div className="flex items-center justify-between">
             <span>{result.currentMahadasha!.lord}—{ad.lord}</span>
             <span className="text-[10px] text-gray-500">{ad.years.toFixed(1)}y</span>
            </div>
            <div className="text-[10px] text-gray-500">{ad.startDate} → {ad.endDate}</div>
           </div>
          ))}
         </div>
        </details>
       )}
      </div>
     )}

     <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
       Full 120-year Vimshottari timeline
      </p>
      <div className="mt-3 space-y-2">
       {result.timeline.map((md, i) => {
        const cls = LORD_COLOR[md.lord] || 'bg-gray-100 text-gray-800 border-gray-300';
        return (
         <div
          key={`${md.lord}-${i}`}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 ${
           md.isCurrent ? 'ring-2 ring-saffron-400 ring-offset-1' : ''
          } ${cls}`}
         >
          <div className="flex items-center gap-2">
           <span className="font-serif text-base font-bold">{md.lord}</span>
           <span className="text-xs opacity-70">{DASHA_LORD_PLANET_HINDI[md.lord]}</span>
           {md.isCurrent && (
            <span className="rounded-full bg-saffron-600 px-2 py-0.5 text-[10px] font-bold text-white">
             NOW
            </span>
           )}
          </div>
          <div className="text-xs">
           {md.startDate} → {md.endDate}{' '}
           <span className="opacity-70">({md.years.toFixed(1)} yrs)</span>
          </div>
         </div>
        );
       })}
      </div>
     </div>

     <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 text-center">
      <p className="text-sm text-gray-800">
       Want a pandit to interpret what your {result.currentMahadasha?.lord || result.janmaLord} dasha
       means for career, marriage, health + remedies?
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700">
        Ask a Pandit Live
       </Link>
       <Link href="/astrology/kundli" className="rounded-full border border-amber-300 bg-white px-5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">
        Full Free Kundli
       </Link>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
