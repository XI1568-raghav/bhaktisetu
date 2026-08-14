'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { checkManglik, MANGLIK_REMEDIES, CANCELLATION_RULES, type ManglikResult } from '../../../lib/manglik';
import { DateInput } from '../../../components/ui/DateInput';

type TimezoneOption = { value: number; label: string };

export default function ManglikClient({ options }: { options: TimezoneOption[] }) {
 const [dob, setDob] = useState('');
 const [time, setTime] = useState('12:00');
 const [tz, setTz] = useState(5.5);
 const [result, setResult] = useState<ManglikResult | null>(null);
 const [error, setError] = useState<string | null>(null);

 function onSubmit(e: FormEvent) {
  e.preventDefault();
  setError(null);
  if (!dob) {
   setError('Enter your date of birth.');
   return;
  }
  const r = checkManglik({ dob, time, timezoneOffset: tz });
  if (!r) {
   setError('Could not compute. Check date + time.');
   setResult(null);
   return;
  }
  setResult(r);
  setTimeout(() => {
   document.getElementById('mng-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
 }

 const severityStyle = !result
  ? ''
  : result.severity === 'poorna'
  ? 'border-red-400 bg-gradient-to-br from-red-50 to-rose-50'
  : result.severity === 'anshik'
  ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50'
  : 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50';

 const severityLabel = !result
  ? ''
  : result.severity === 'poorna'
  ? 'Poorna Manglik (full dosh)'
  : result.severity === 'anshik'
  ? 'Anshik Manglik (partial dosh)'
  : 'Not Manglik (no dosh)';

 const severityColor = !result
  ? ''
  : result.severity === 'poorna'
  ? 'text-red-800'
  : result.severity === 'anshik'
  ? 'text-amber-800'
  : 'text-emerald-800';

 return (
  <div>
   <form
    onSubmit={onSubmit}
    className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-white to-saffron-50/30 p-5 shadow-sm sm:p-6"
   >
    <div className="grid gap-4 sm:grid-cols-3">
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Date of birth</span>
      <DateInput value={dob} onChange={(v) => setDob(v)} required />
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
     Check Manglik Dosh
    </button>

    <p className="mt-3 text-xs text-gray-500">
     Chandra-lagna (moon) based check. Lagna-based check requires birth latitude + longitude;
     for that level of precision, get a pandit-grade kundli verification.
    </p>
   </form>

   {result && (
    <div id="mng-result" className="mt-8 space-y-6">
     <div className={`rounded-2xl border-2 p-6 shadow-md ${severityStyle}`}>
      <p className="text-xs uppercase tracking-wider text-gray-700">Result</p>
      <h2 className={`mt-2 font-serif text-3xl ${severityColor}`}>{severityLabel}</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-800">{result.reasoning}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
       <Cell label="Mars house from Moon" value={String(result.marsHouseFromMoon)} />
       <Cell label="Mars rashi" value={result.marsRashi} />
       <Cell label="Moon rashi (chandra-lagna)" value={result.moonRashi} />
       <Cell label="Mars longitude (sidereal)" value={`${result.marsLongitude.toFixed(2)}°`} />
      </div>
     </div>

     {result.isManglik && (
      <>
       <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-6">
        <h3 className="font-serif text-lg text-gray-900">Cancellation rules (check before remedy)</h3>
        <ul className="mt-3 space-y-1 text-sm text-gray-800">
         {CANCELLATION_RULES.map((r, i) => (
          <li key={i} className="flex gap-2">
           <span className="text-amber-700">•</span>
           <span>{r}</span>
          </li>
         ))}
        </ul>
        <p className="mt-3 text-xs text-gray-600">
         Even if the calculator says manglik, these traditional cancellation conditions may reduce or
         negate the effect. A pandit reading your full kundli will know which apply to you.
        </p>
       </div>

       <div className="rounded-2xl border border-saffron-300 bg-saffron-50/70 p-6">
        <h3 className="font-serif text-lg text-gray-900">Traditional remedies (Mangal Shanti)</h3>
        <ul className="mt-3 space-y-1 text-sm text-gray-800">
         {MANGLIK_REMEDIES.map((r, i) => (
          <li key={i} className="flex gap-2">
           <span className="text-saffron-700">•</span>
           <span>{r}</span>
          </li>
         ))}
        </ul>
       </div>
      </>
     )}

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
      <p className="text-sm text-gray-800">
       For marriage matching, the next step is comparing both kundlis. Want a pandit to read this
       result alongside your full Ashtakoot kundli milan?
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
       <Link href="/astrology/kundli-milan" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Free Kundli Milan
       </Link>
       <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Ask a Pandit Live
       </Link>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function Cell({ label, value }: { label: string; value: string }) {
 return (
  <div className="rounded-xl border border-gray-200 bg-white/80 p-3">
   <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
   <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
  </div>
 );
}
