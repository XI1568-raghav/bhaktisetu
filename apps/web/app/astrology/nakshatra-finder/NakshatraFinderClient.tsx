'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { findNakshatra, type NakshatraFinderResult } from '../../../lib/nakshatra-finder';
import { DateInput } from '../../../components/ui/DateInput';

type TimezoneOption = { value: number; label: string };

export default function NakshatraFinderClient({ options }: { options: TimezoneOption[] }) {
 const [dob, setDob] = useState('');
 const [time, setTime] = useState('12:00');
 const [tz, setTz] = useState(5.5);
 const [result, setResult] = useState<NakshatraFinderResult | null>(null);
 const [error, setError] = useState<string | null>(null);

 function onSubmit(e: FormEvent) {
  e.preventDefault();
  setError(null);
  if (!dob) {
   setError('Enter your date of birth.');
   return;
  }
  const r = findNakshatra({ dob, time, timezoneOffset: tz });
  if (!r) {
   setError('Could not compute. Check date + time format.');
   setResult(null);
   return;
  }
  setResult(r);
  setTimeout(() => {
   document.getElementById('nak-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <DateInput value={dob} onChange={(v) => setDob(v)} />
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
      <span className="mt-1 block text-[11px] text-gray-500">24-hour local time. If unknown, try 12:00.</span>
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Timezone</span>
      <select
       value={tz}
       onChange={(e) => setTz(Number(e.target.value))}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {options.map((o) => (
        <option key={o.label} value={o.value}>
         {o.label}
        </option>
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
     Find My Nakshatra
    </button>

    <p className="mt-3 text-[11px] text-gray-500">
     Pure Vedic compute — Meeus moon longitude + Lahiri ayanamsa. Accuracy ±0.3°, well within each
     nakshatra&rsquo;s 13°20&prime; span. For ceremonial muhurat-grade precision, verify with a pandit who
     runs full Drik panchang ephemeris.
    </p>
   </form>

   {result && (
    <div id="nak-result" className="mt-8">
     <div className="rounded-2xl border-2 border-saffron-400 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 shadow-md">
      <p className="text-xs uppercase tracking-wider text-saffron-700">Your janma nakshatra</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
       <h2 className="font-serif text-3xl text-gray-900">{result.nakshatra.name}</h2>
       <span className="font-serif text-xl text-saffron-700">{result.nakshatra.sanskritName}</span>
       <span className="rounded-full bg-saffron-200 px-3 py-0.5 text-xs font-bold text-saffron-900">
        Pada {result.pada}
       </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
       <Cell label="Rashi (moon sign)" value={result.rashi} />
       <Cell label="Nakshatra lord" value={result.nakshatra.lord} />
       <Cell label="Deity" value={result.nakshatra.deity} />
       <Cell label="Gana" value={result.nakshatra.gana} />
      </div>

      <div className="mt-4 rounded-xl border border-saffron-200 bg-white/70 p-4">
       <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Qualities</p>
       <p className="mt-1 text-sm text-gray-800">{result.nakshatra.qualities}</p>
      </div>

      <details className="mt-4 rounded-xl border border-saffron-200 bg-white/70 p-4">
       <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
        Computed values (advanced)
       </summary>
       <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-700">
        <dt className="font-semibold">Julian Day</dt>
        <dd>{result.julianDay.toFixed(4)}</dd>
        <dt className="font-semibold">Moon tropical longitude</dt>
        <dd>{result.moonTropicalLongitude.toFixed(3)}°</dd>
        <dt className="font-semibold">Lahiri ayanamsa</dt>
        <dd>{result.ayanamsa.toFixed(3)}°</dd>
        <dt className="font-semibold">Moon sidereal longitude</dt>
        <dd>{result.moonSiderealLongitude.toFixed(3)}°</dd>
        <dt className="font-semibold">Position in nakshatra</dt>
        <dd>{result.padaLongitude.toFixed(3)}° of 13.333°</dd>
       </dl>
      </details>

      <div className="mt-5 flex flex-wrap gap-3">
       <Link
        href={`/astrology/baby-name?nak=${result.nakshatra.slug}`}
        className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
       >
        Find baby names for {result.nakshatra.name} →
       </Link>
       <Link
        href="/astrology/kundli-milan"
        className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
       >
        Match kundli using this nakshatra
       </Link>
       <Link
        href="/astrology/kundli"
        className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
       >
        Full birth chart (kundli)
       </Link>
      </div>
     </div>

     <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/70 p-5 text-center">
      <p className="text-sm text-gray-800">
       Want pandit-grade Drik panchang precision + dasha + remedies for {result.nakshatra.name}?
      </p>
      <Link
       href="/ask-pandit"
       className="mt-3 inline-block rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
      >
       Ask a Pandit Live
      </Link>
     </div>
    </div>
   )}
  </div>
 );
}

function Cell({ label, value }: { label: string; value: string }) {
 return (
  <div className="rounded-xl border border-saffron-200 bg-white/70 p-3">
   <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
   <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
  </div>
 );
}
