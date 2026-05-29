'use client';

import { useMemo, useState } from 'react';
import { SYMPTOM_CHECKERS, PITRA_DOSH_TYPES, diagnoseBySymptom, type LifeArea } from '../../../lib/pitra-dosh';

const SEVERITY_STYLE = {
 mild: 'border-amber-300 bg-amber-50 text-amber-900',
 moderate: 'border-orange-300 bg-orange-50 text-orange-900',
 severe: 'border-rose-300 bg-rose-50 text-rose-900',
} as const;

const SEVERITY_LABEL = {
 mild: 'Mild',
 moderate: 'Moderate',
 severe: 'Severe',
} as const;

export default function PitraDoshClient() {
 const [mode, setMode] = useState<'symptom' | 'reference'>('symptom');
 const [symptom, setSymptom] = useState<LifeArea>('progeny');
 const [doshSlug, setDoshSlug] = useState<string>(PITRA_DOSH_TYPES[0]!.slug);

 const result = useMemo(() => diagnoseBySymptom(symptom), [symptom]);
 const selectedDosh = useMemo(() => PITRA_DOSH_TYPES.find((d) => d.slug === doshSlug), [doshSlug]);

 return (
  <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
   <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-saffron-200 bg-saffron-50 p-2">
    <button
     type="button"
     onClick={() => setMode('symptom')}
     className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
      mode === 'symptom' ? 'bg-saffron-600 text-white' : 'bg-white text-saffron-700 hover:bg-saffron-100'
     }`}
    >
     Diagnose by life problem
    </button>
    <button
     type="button"
     onClick={() => setMode('reference')}
     className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
      mode === 'reference' ? 'bg-saffron-600 text-white' : 'bg-white text-saffron-700 hover:bg-saffron-100'
     }`}
    >
     Browse all 5 dosh types
    </button>
   </div>

   {mode === 'symptom' && (
    <div className="mt-8">
     <label className="block text-sm font-semibold text-gray-900">Pick your most pressing life concern</label>
     <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SYMPTOM_CHECKERS.map((s) => (
       <button
        key={s.slug}
        type="button"
        onClick={() => setSymptom(s.slug)}
        className={`rounded-xl border-2 p-3 text-left text-sm transition ${
         symptom === s.slug
          ? 'border-saffron-500 bg-saffron-50 text-saffron-900'
          : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300'
        }`}
       >
        <p className="font-semibold">{s.label}</p>
        <p className="mt-0.5 text-xs text-saffron-700">{s.sanskrit}</p>
       </button>
      ))}
     </div>

     {result && (
      <div className="mt-8 space-y-6">
       <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Self-check indicators</p>
        <p className="mt-1 font-serif text-xl text-gray-900">{result.checker.label}</p>
        <p className="mt-2 text-sm text-gray-700">{result.checker.description}</p>
        <ul className="mt-3 space-y-1 text-sm text-gray-800">
         {result.checker.indicators.map((ind) => <li key={ind}>• {ind}</li>)}
        </ul>
        <p className="mt-3 text-xs italic text-gray-600">
         If 3+ of the above match, consider getting a kundli analysis. The dosh types below are most likely.
        </p>
       </div>

       <div className="space-y-5">
        <p className="font-serif text-lg text-gray-900">Most likely dosh patterns ({result.doshes.length})</p>
        {result.doshes.map((d) => (
         <div key={d.slug} className={`rounded-2xl border-2 p-5 ${SEVERITY_STYLE[d.severity]}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
           <div>
            <p className="font-serif text-lg font-semibold">{d.name}</p>
            <p className="text-sm">{d.sanskrit}</p>
           </div>
           <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold">
            {SEVERITY_LABEL[d.severity]}
           </span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-wider">Graha combination</p>
          <p className="text-sm">{d.grahaCombination}</p>
          <p className="mt-3 text-xs uppercase tracking-wider">Karmic cause</p>
          <p className="text-sm" dangerouslySetInnerHTML={{ __html: d.cause }} />
          <p className="mt-3 text-xs uppercase tracking-wider">Top remedies</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">
           {d.remedies.slice(0, 4).map((r) => <li key={r}>{r}</li>)}
          </ol>
          <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 font-serif text-base text-saffron-900">{d.mantra}</p>
          <p className="text-xs italic">{d.mantraEnglish}</p>
         </div>
        ))}
       </div>
      </div>
     )}
    </div>
   )}

   {mode === 'reference' && (
    <div className="mt-8">
     <label className="block text-sm font-semibold text-gray-900">Pick a dosh type</label>
     <div className="mt-3 flex flex-wrap gap-2">
      {PITRA_DOSH_TYPES.map((d) => (
       <button
        key={d.slug}
        type="button"
        onClick={() => setDoshSlug(d.slug)}
        className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition ${
         doshSlug === d.slug
          ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
          : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300'
        }`}
       >
        {d.name}
       </button>
      ))}
     </div>

     {selectedDosh && (
      <div className={`mt-6 rounded-2xl border-2 p-6 ${SEVERITY_STYLE[selectedDosh.severity]}`}>
       <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
         <p className="font-serif text-2xl font-semibold">{selectedDosh.name}</p>
         <p className="text-base">{selectedDosh.sanskrit}</p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
         {SEVERITY_LABEL[selectedDosh.severity]} severity
        </span>
       </div>

       <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white/70 p-4">
         <p className="text-xs font-semibold uppercase tracking-wider">Graha combination</p>
         <p className="mt-1 text-sm">{selectedDosh.grahaCombination}</p>
         <p className="mt-2 text-xs">Houses: {selectedDosh.housesInvolved.join(', ')}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-4">
         <p className="text-xs font-semibold uppercase tracking-wider">Primary life areas affected</p>
         <p className="mt-1 text-sm capitalize">{selectedDosh.primaryAreas.join(' · ')}</p>
        </div>
       </div>

       <div className="mt-4 rounded-xl bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider">Karmic cause</p>
        <p className="mt-1 text-sm" dangerouslySetInnerHTML={{ __html: selectedDosh.cause }} />
       </div>

       <div className="mt-4 rounded-xl bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider">Symptoms / life patterns</p>
        <ul className="mt-2 space-y-1 text-sm">
         {selectedDosh.symptoms.map((s) => <li key={s} dangerouslySetInnerHTML={{ __html: '• ' + s }} />)}
        </ul>
       </div>

       <div className="mt-4 rounded-xl bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider">Remedies (in order of power)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
         {selectedDosh.remedies.map((r) => <li key={r}>{r}</li>)}
        </ol>
       </div>

       <div className="mt-4 rounded-xl border border-saffron-300 bg-saffron-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">Recite during remedy</p>
        <p className="mt-2 font-serif text-lg text-saffron-900">{selectedDosh.mantra}</p>
        <p className="text-xs italic text-saffron-800">{selectedDosh.mantraEnglish}</p>
       </div>
      </div>
     )}
    </div>
   )}
  </section>
 );
}
