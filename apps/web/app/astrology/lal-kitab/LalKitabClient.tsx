'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
 GRAHAS, PROBLEMS,
 diagnoseByProblem, getGraha, getHouseEffects,
 type GrahaCode, type LifeProblem, type HouseEffect,
} from '../../../lib/lal-kitab';

type Mode = 'problem' | 'graha';

const VERDICT_STYLE: Record<HouseEffect['verdict'], { border: string; bg: string; pill: string; label: string }> = {
 auspicious: { border: 'border-emerald-400', bg: 'bg-emerald-50/70', pill: 'bg-emerald-200 text-emerald-900', label: 'Auspicious' },
 neutral:    { border: 'border-amber-400',   bg: 'bg-amber-50/60',   pill: 'bg-amber-200 text-amber-900',     label: 'Mixed' },
 troubling:  { border: 'border-rose-400',    bg: 'bg-rose-50/60',    pill: 'bg-rose-200 text-rose-900',       label: 'Troubling' },
};

export default function LalKitabClient() {
 const [mode, setMode] = useState<Mode>('problem');
 const [problem, setProblem] = useState<LifeProblem>('career');
 const [graha, setGraha] = useState<GrahaCode>('shani');

 const problemResult = useMemo(() => diagnoseByProblem(problem), [problem]);
 const grahaData = useMemo(() => ({ g: getGraha(graha), houses: getHouseEffects(graha) }), [graha]);

 return (
  <div>
   <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-white to-saffron-50/30 p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap gap-2">
     <button
      type="button"
      onClick={() => setMode('problem')}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold border ${mode === 'problem' ? 'border-saffron-600 bg-saffron-600 text-white' : 'border-saffron-300 bg-white text-saffron-800 hover:bg-saffron-50'}`}
     >
      By life problem
     </button>
     <button
      type="button"
      onClick={() => setMode('graha')}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold border ${mode === 'graha' ? 'border-saffron-600 bg-saffron-600 text-white' : 'border-saffron-300 bg-white text-saffron-800 hover:bg-saffron-50'}`}
     >
      By graha
     </button>
    </div>

    {mode === 'problem' ? (
     <label className="mt-4 block">
      <span className="text-sm font-semibold text-gray-800">Pick your concern</span>
      <select
       value={problem}
       onChange={(e) => setProblem(e.target.value as LifeProblem)}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {PROBLEMS.map((p) => (
        <option key={p.value} value={p.value}>{p.label} ({p.sanskrit})</option>
       ))}
      </select>
     </label>
    ) : (
     <label className="mt-4 block">
      <span className="text-sm font-semibold text-gray-800">Pick the troubling graha</span>
      <select
       value={graha}
       onChange={(e) => setGraha(e.target.value as GrahaCode)}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {GRAHAS.map((g) => (
        <option key={g.code} value={g.code}>{g.name} ({g.sanskrit}) — {g.western}</option>
       ))}
      </select>
     </label>
    )}

    <p className="mt-4 text-xs text-gray-500">
     Tradition: Pt. Roop Chand Joshi&apos;s Lal Kitab (1939-1952). All upay are household-grade Farman.
     If a remedy involves heavy donation or expensive gemstone, consult a Lal Kitab pandit first.
    </p>
   </div>

   <div className="mt-8 space-y-6">
    {mode === 'problem' ? <ProblemView result={problemResult} /> : <GrahaView g={grahaData.g} houses={grahaData.houses} />}

    <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
     <p className="text-sm text-gray-800">Want a Lal Kitab pandit to read your full chart + custom Farman?</p>
     <div className="mt-3 flex flex-wrap justify-center gap-3">
      <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
       Ask a Pandit Live
      </Link>
      <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
       Free Kundli
      </Link>
      <Link href="/astrology/dasha" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
       Vimshottari Dasha
      </Link>
     </div>
    </div>
   </div>
  </div>
 );
}

function ProblemView({ result }: { result: ReturnType<typeof diagnoseByProblem> }) {
 return (
  <div>
   <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 shadow-md">
    <p className="text-xs uppercase tracking-wider text-gray-700">{result.problem.sanskrit}</p>
    <h2 className="mt-1 font-serif text-2xl text-gray-900">{result.problem.label}</h2>
    <p className="mt-2 text-sm text-gray-700">{result.problem.description}</p>
    <p className="mt-3 text-xs text-saffron-800">
     Per Lal Kitab tradition, this concern is most commonly triggered by:{' '}
     <span className="font-semibold">{result.grahas.map((x) => x.graha.name).join(' · ')}</span>.
     Run all 3 Farman per graha for at least 40 consecutive days for visible change.
    </p>
   </div>

   <div className="mt-5 space-y-5">
    {result.grahas.map(({ graha, troublingHouses }) => (
     <div key={graha.code} className="rounded-2xl border-2 border-saffron-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
       <h3 className="font-serif text-xl text-gray-900">
        {graha.name} <span className="text-saffron-700">({graha.sanskrit})</span> — {graha.western}
       </h3>
       <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-semibold text-saffron-800">{graha.nature}</span>
      </div>
      <p className="mt-1 text-xs text-gray-600">{graha.significance}</p>

      <div className="mt-3 grid gap-2 text-xs text-gray-700 sm:grid-cols-4">
       <div><span className="font-semibold">Day:</span> {graha.day}</div>
       <div><span className="font-semibold">Metal:</span> {graha.metal}</div>
       <div><span className="font-semibold">Colour:</span> {graha.color}</div>
       <div><span className="font-semibold">Stone:</span> {graha.gemstone}</div>
      </div>

      <div className="mt-4">
       <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Universal Farman for {graha.name}</p>
       <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-800">
        {graha.generalUpay.map((u, i) => <li key={i}>{u}</li>)}
       </ol>
      </div>

      {troublingHouses.length > 0 && (
       <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
         If {graha.name} is in any of these houses in your chart
        </p>
        <ul className="mt-2 space-y-2 text-xs text-gray-800">
         {troublingHouses.map((h) => (
          <li key={h.house} className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
           <p className="font-semibold text-rose-900">House {h.house} · {h.sanskrit}</p>
           <p className="mt-0.5">{h.effect}</p>
           <p className="mt-1 text-emerald-800"><span className="font-semibold">Specific Farman:</span> {h.upay}</p>
          </li>
         ))}
        </ul>
       </div>
      )}
     </div>
    ))}
   </div>
  </div>
 );
}

function GrahaView({ g, houses }: { g: ReturnType<typeof getGraha>; houses: HouseEffect[] }) {
 return (
  <div>
   <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 shadow-md">
    <p className="text-xs uppercase tracking-wider text-gray-700">{g.sanskrit} · {g.western}</p>
    <h2 className="mt-1 font-serif text-2xl text-gray-900">{g.name} — {g.nature} graha</h2>
    <p className="mt-2 text-sm text-gray-700">{g.significance}</p>
    <div className="mt-3 grid gap-2 text-xs text-gray-700 sm:grid-cols-5">
     <div><span className="font-semibold">Day:</span> {g.day}</div>
     <div><span className="font-semibold">Metal:</span> {g.metal}</div>
     <div><span className="font-semibold">Colour:</span> {g.color}</div>
     <div><span className="font-semibold">Stone:</span> {g.gemstone}</div>
     <div><span className="font-semibold">Deity:</span> {g.deity}</div>
    </div>
   </div>

   <div className="mt-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-5">
    <h3 className="font-serif text-lg text-emerald-900">Universal Farman for {g.name}</h3>
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-emerald-900">
     {g.generalUpay.map((u, i) => <li key={i}>{u}</li>)}
    </ol>
   </div>

   <div className="mt-5">
    <h3 className="font-serif text-xl text-gray-900">{g.name} in each of 12 houses</h3>
    <p className="text-xs text-gray-600">Find the house where {g.name} sits in your kundli → apply the matching Farman.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
     {houses.map((h) => {
      const s = VERDICT_STYLE[h.verdict];
      return (
       <div key={h.house} className={`rounded-xl border-2 p-3 ${s.border} ${s.bg}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
         <p className="font-semibold text-gray-900">House {h.house} · {h.sanskrit}</p>
         <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.pill}`}>{s.label}</span>
        </div>
        <p className="mt-1 text-xs text-gray-700">{h.effect}</p>
        <p className="mt-1 text-xs text-emerald-800"><span className="font-semibold">Farman:</span> {h.upay}</p>
       </div>
      );
     })}
    </div>
   </div>
  </div>
 );
}
