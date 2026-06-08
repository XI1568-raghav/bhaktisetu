'use client';

import { useState, FormEvent } from 'react';
import { DateInput } from '../../../components/ui/DateInput';
import Link from 'next/link';
import {
 computeSadeSati,
 SADE_SATI_REMEDIES,
 SADE_SATI_DOS_DONTS,
 type SadeSatiResult,
 type SadeSatiPhaseKind,
} from '../../../lib/sade-sati';

type TimezoneOption = { value: number; label: string };

const PHASE_STYLE: Record<SadeSatiPhaseKind, { border: string; bg: string; text: string; pill: string }> = {
 'rising':     { border: 'border-amber-400', bg: 'bg-gradient-to-br from-amber-50 to-yellow-50', text: 'text-amber-900', pill: 'bg-amber-200 text-amber-900' },
 'peak':       { border: 'border-red-400',   bg: 'bg-gradient-to-br from-red-50 to-rose-50',     text: 'text-red-900',   pill: 'bg-red-200 text-red-900' },
 'setting':    { border: 'border-amber-400', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', text: 'text-amber-900', pill: 'bg-amber-200 text-amber-900' },
 'dhaiya-4th': { border: 'border-purple-400', bg: 'bg-gradient-to-br from-purple-50 to-violet-50', text: 'text-purple-900', pill: 'bg-purple-200 text-purple-900' },
 'dhaiya-8th': { border: 'border-purple-400', bg: 'bg-gradient-to-br from-purple-50 to-violet-50', text: 'text-purple-900', pill: 'bg-purple-200 text-purple-900' },
 'normal':     { border: 'border-emerald-400', bg: 'bg-gradient-to-br from-emerald-50 to-green-50', text: 'text-emerald-900', pill: 'bg-emerald-200 text-emerald-900' },
};

export default function SadeSatiClient({ options }: { options: TimezoneOption[] }) {
 const [dob, setDob] = useState('');
 const [time, setTime] = useState('12:00');
 const [tz, setTz] = useState(5.5);
 const [result, setResult] = useState<SadeSatiResult | null>(null);
 const [error, setError] = useState<string | null>(null);

 function onSubmit(e: FormEvent) {
  e.preventDefault();
  setError(null);
  if (!dob) {
   setError('Enter your date of birth.');
   return;
  }
  const r = computeSadeSati({ dob, time, timezoneOffset: tz });
  if (!r) {
   setError('Could not compute. Check date + time.');
   setResult(null);
   return;
  }
  setResult(r);
  setTimeout(() => {
   document.getElementById('ss-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
 }

 const style = result ? PHASE_STYLE[result.currentPhase] : null;
 const isInSadeSati = result && (result.currentPhase === 'rising' || result.currentPhase === 'peak' || result.currentPhase === 'setting');
 const isInDhaiya = result && (result.currentPhase === 'dhaiya-4th' || result.currentPhase === 'dhaiya-8th');

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
     Am I in Sade Sati?
    </button>

    <p className="mt-3 text-[11px] text-gray-500">
     Chandra-lagna based check using Saturn longitude (simplified Meeus VSOP87 ±1°), fully
     sufficient for 30°-wide rashi determination + 2.5-yr phase timing.
    </p>
   </form>

   {result && style && (
    <div id="ss-result" className="mt-8 space-y-6">
     <div className={`rounded-2xl border-2 p-6 shadow-md ${style.border} ${style.bg}`}>
      <p className="text-xs uppercase tracking-wider text-gray-700">Today's status</p>
      <h2 className={`mt-2 font-serif text-3xl ${style.text}`}>{result.currentPhaseLabel}</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-800">{result.reasoning}</p>
      <p className="mt-3 text-sm leading-relaxed text-gray-800">{result.currentPhaseDescription}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
       <Cell label="Your natal Moon rashi" value={result.moonRashi} />
       <Cell label="Saturn's rashi today" value={result.currentSaturnRashi} />
      </div>
     </div>

     {(isInSadeSati || isInDhaiya) && (
      <>
       <div className="rounded-2xl border border-saffron-300 bg-saffron-50/70 p-6">
        <h3 className="font-serif text-lg text-gray-900">Traditional remedies (Shani Shanti)</h3>
        <ul className="mt-3 space-y-1 text-sm text-gray-800">
         {SADE_SATI_REMEDIES.map((r, i) => (
          <li key={i} className="flex gap-2">
           <span className="text-saffron-700">•</span>
           <span>{r}</span>
          </li>
         ))}
        </ul>
       </div>

       <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5">
         <h3 className="font-serif text-base font-semibold text-emerald-900">Do</h3>
         <ul className="mt-3 space-y-1 text-sm text-gray-800">
          {SADE_SATI_DOS_DONTS.dos.map((d, i) => (
           <li key={i} className="flex gap-2">
            <span className="text-emerald-700">✓</span>
            <span>{d}</span>
           </li>
          ))}
         </ul>
        </div>
        <div className="rounded-2xl border border-rose-300 bg-rose-50/60 p-5">
         <h3 className="font-serif text-base font-semibold text-rose-900">Avoid</h3>
         <ul className="mt-3 space-y-1 text-sm text-gray-800">
          {SADE_SATI_DOS_DONTS.donts.map((d, i) => (
           <li key={i} className="flex gap-2">
            <span className="text-rose-700">✕</span>
            <span>{d}</span>
           </li>
          ))}
         </ul>
        </div>
       </div>
      </>
     )}

     <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
       All Sade Sati + Dhaiya phases in your lifetime (90 yrs from birth)
      </p>
      {result.phases.length === 0 ? (
       <p className="mt-3 text-sm text-gray-600">No Sade Sati or Dhaiya phases detected — extremely rare.</p>
      ) : (
       <div className="mt-3 space-y-2">
        {result.phases.map((p, i) => {
         const ps = PHASE_STYLE[p.kind];
         return (
          <div
           key={`${p.kind}-${i}`}
           className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 ${
            p.isCurrent ? 'ring-2 ring-saffron-400 ring-offset-1' : ''
           } ${ps.border} ${ps.bg}`}
          >
           <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ps.pill}`}>
             {p.kind === 'rising' ? 'Phase 1' : p.kind === 'peak' ? 'Phase 2' : p.kind === 'setting' ? 'Phase 3' : p.kind === 'dhaiya-4th' ? 'Dhaiya 4th' : 'Dhaiya 8th'}
            </span>
            <span className="text-sm font-semibold text-gray-900">{p.saturnRashi}</span>
            {p.isCurrent && (
             <span className="rounded-full bg-saffron-600 px-2 py-0.5 text-[10px] font-bold text-white">NOW</span>
            )}
           </div>
           <div className="text-xs text-gray-700">
            {p.startDate} → {p.endDate}
            <span className="ml-2 opacity-70">(age {p.ageStart.toFixed(1)} → {p.ageEnd.toFixed(1)})</span>
           </div>
          </div>
         );
        })}
       </div>
      )}
     </div>

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
      <p className="text-sm text-gray-800">
       Want a pandit to interpret your sade sati intensity against the rest of your kundli +
       prescribe a personalized Shani shanti puja?
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/pujas/maha-mrityunjaya" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Book Shani Shanti Puja
       </Link>
       <Link href="/astrology/dasha" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Check My Dasha
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
   <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
   <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
  </div>
 );
}
