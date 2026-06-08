'use client';

import { useState } from 'react';
import Link from 'next/link';
import { computeNumerology, type NumerologyResult, type NumberMeaning } from '../../../lib/numerology';
import { DateInput } from '../../../components/ui/DateInput';

export default function NumerologyClient() {
 const [dob, setDob] = useState('');
 const [name, setName] = useState('');
 const [result, setResult] = useState<NumerologyResult | null>(null);
 const [error, setError] = useState('');

 function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  if (!dob || !name.trim()) {
   setError('Both date of birth and full name are required.');
   return;
  }
  const r = computeNumerology(dob, name);
  if (!r) {
   setError('Could not parse date. Use the date picker.');
   return;
  }
  setResult(r);
  if (typeof window !== 'undefined') {
   setTimeout(() => document.getElementById('numerology-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }
 }

 function onReset() {
  setDob('');
  setName('');
  setResult(null);
  setError('');
 }

 return (
  <div>
   <form onSubmit={onSubmit} className="rounded-2xl border border-saffron-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="grid gap-5 sm:grid-cols-2">
     <div>
      <label className="block text-sm font-semibold text-gray-900">
       Full birth name <span className="text-red-500">*</span>
      </label>
      <p className="mt-0.5 text-xs text-gray-500">Name on birth certificate. Middle names included.</p>
      <input
       type="text"
       value={name}
       onChange={(e) => setName(e.target.value)}
       placeholder="e.g. Raghav Kumar Sharma"
       className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      />
     </div>
     <div>
      <label className="block text-sm font-semibold text-gray-900">
       Date of birth <span className="text-red-500">*</span>
      </label>
      <p className="mt-0.5 text-xs text-gray-500">Local birth date (Indian Standard Time recommended).</p>
      <DateInput value={dob} onChange={(v) => setDob(v)} />
       max="2030-12-31"
       min="1900-01-01"
       className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      />
     </div>
    </div>

    {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

    <div className="mt-5 flex flex-wrap items-center gap-3">
     <button
      type="submit"
      className="rounded-full bg-saffron-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-saffron-300"
     >
      Compute My Numbers
     </button>
     {result && (
      <button
       type="button"
       onClick={onReset}
       className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
       Reset
      </button>
     )}
    </div>
   </form>

   {result && (
    <div id="numerology-result" className="mt-8 scroll-mt-20 space-y-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="text-xs uppercase tracking-wider text-saffron-700">Your Five Numbers</p>
      <p className="mt-1 font-serif text-lg text-gray-900">{result.input.name} · {result.input.dob}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
       <NumCell label="Life Path" n={result.lifePath} primary />
       <NumCell label="Birthday" n={result.birthday} />
       <NumCell label="Name (Chaldean)" n={result.nameChaldean} />
       <NumCell label="Soul Urge" n={result.nameSoul} />
       <NumCell label="Personality" n={result.namePersonality} />
      </div>
      <p className="mt-3 text-[11px] text-gray-500">Life-path reduction: {result.lifePathSteps}</p>
     </div>

     <MeaningCard tag="Life Path Number" sub="Central karmic theme of your life" m={result.meanings.lifePath} />
     <MeaningCard tag="Birthday Number" sub="Innate gift you were born with" m={result.meanings.birthday} />
     <MeaningCard tag="Name Number (Chaldean)" sub="Vibration your name actually carries" m={result.meanings.nameChaldean} />
     <MeaningCard tag="Soul Urge (Heart) Number" sub="What your deepest self really wants" m={result.meanings.nameSoul} />
     <MeaningCard tag="Personality Number" sub="The impression you make on others" m={result.meanings.namePersonality} />

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want a name-tweak or business-name consult?</p>
      <p className="mt-2 text-sm text-gray-700">
       Self-prescribing name changes is risky. A verified pandit-numerologist will compare these
       numbers with your kundli&rsquo;s graha balance before recommending any spelling tweak.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask Pandit Live
       </Link>
       <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Free Kundli
       </Link>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function NumCell({ label, n, primary }: { label: string; n: number; primary?: boolean }) {
 return (
  <div className={`rounded-xl border bg-white p-3 ${primary ? 'border-saffron-400 ring-2 ring-saffron-300' : 'border-gray-200'}`}>
   <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
   <p className={`mt-1 font-serif text-4xl font-bold ${primary ? 'text-saffron-700' : 'text-gray-900'}`}>{n}</p>
  </div>
 );
}

function MeaningCard({ tag, sub, m }: { tag: string; sub: string; m: NumberMeaning }) {
 return (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
   <div className="flex items-start justify-between gap-3">
    <div>
     <p className="text-[11px] font-semibold uppercase tracking-wider text-saffron-700">{tag} · {sub}</p>
     <p className="mt-1 font-serif text-2xl text-gray-900">
      Number <span className="text-saffron-700">{m.number}</span> — {m.title}
     </p>
    </div>
    {m.planet && (
     <span className="shrink-0 rounded-full bg-saffron-100 px-2.5 py-0.5 text-[11px] font-semibold text-saffron-800">
      {m.planet}
     </span>
    )}
   </div>

   <p className="mt-3 text-sm leading-relaxed text-gray-700">{m.short}</p>

   <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <Bucket title="Strengths" items={m.strengths} tone="emerald" />
    <Bucket title="Challenges" items={m.challenges} tone="amber" />
    <Bucket title="Best careers" items={m.careers} tone="indigo" />
    <Bucket title="Lucky days" items={m.luckyDays} tone="saffron" />
   </div>

   <div className="mt-4 grid gap-2 sm:grid-cols-2">
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
     <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Lucky colors</p>
     <p className="mt-1 text-sm text-gray-800">{m.luckyColors.join(' · ')}</p>
    </div>
    <div className="rounded-lg border border-saffron-200 bg-saffron-50 p-3">
     <p className="text-[11px] font-semibold uppercase tracking-wider text-saffron-700">Vedic remedy</p>
     <p className="mt-1 text-sm text-saffron-900">{m.spiritualNote}</p>
    </div>
   </div>
  </div>
 );
}

const TONE: Record<string, string> = {
 emerald: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
 amber: 'border-amber-200 bg-amber-50/40 text-amber-900',
 indigo: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
 saffron: 'border-saffron-200 bg-saffron-50/40 text-saffron-900',
};
const TONE_HEAD: Record<string, string> = {
 emerald: 'text-emerald-700', amber: 'text-amber-700', indigo: 'text-indigo-700', saffron: 'text-saffron-700',
};

function Bucket({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'amber' | 'indigo' | 'saffron' }) {
 return (
  <div className={`rounded-lg border p-3 ${TONE[tone]}`}>
   <p className={`text-[11px] font-semibold uppercase tracking-wider ${TONE_HEAD[tone]}`}>{title}</p>
   <ul className="mt-1 space-y-0.5 text-xs leading-relaxed">
    {items.map((it, i) => (
     <li key={i}>• {it}</li>
    ))}
   </ul>
  </div>
 );
}
