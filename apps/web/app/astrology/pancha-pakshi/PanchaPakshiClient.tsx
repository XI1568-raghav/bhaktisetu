'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
 ALL_NAKSHATRAS_FOR_DROPDOWN,
 ELEMENT_COLOR,
 getBirdByNakshatra,
 PANCHA_PAKSHI_BIRDS,
} from '../../../lib/pancha-pakshi';

export default function PanchaPakshiClient() {
 const [nakshatra, setNakshatra] = useState<string>('Bharani');

 const myBird = useMemo(() => getBirdByNakshatra(nakshatra), [nakshatra]);

 return (
  <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
   <div className="rounded-2xl border-2 border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
    <p className="text-xs uppercase tracking-wider text-saffron-700">Find your Pakshi by birth nakshatra</p>
    <p className="mt-1 font-serif text-2xl text-gray-900">Which bird rules you?</p>
    <p className="mt-1 text-sm text-gray-700">
     Don&apos;t know your nakshatra?{' '}
     <Link href="/astrology/nakshatra-finder" className="font-semibold text-saffron-700 underline">
      Find it free
     </Link>
    </p>

    <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
     <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-saffron-800">Birth nakshatra</label>
      <select
       value={nakshatra}
       onChange={(e) => setNakshatra(e.target.value)}
       className="mt-2 w-full rounded-xl border-2 border-saffron-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-saffron-500 focus:outline-none"
      >
       {ALL_NAKSHATRAS_FOR_DROPDOWN.map((n) => (
        <option key={n} value={n}>{n}</option>
       ))}
      </select>
     </div>
    </div>
   </div>

   {myBird && (
    <div className={`mt-6 rounded-2xl border-2 p-6 ${ELEMENT_COLOR[myBird.element]}`}>
     <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
       <p className="text-xs uppercase tracking-wider">Your Pakshi</p>
       <p className="mt-1 font-serif text-3xl font-bold">{myBird.name}</p>
       <p className="text-base">{myBird.sanskrit} · {myBird.tamil}</p>
      </div>
      <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold capitalize">
       {myBird.element} element · {myBird.planet}
      </span>
     </div>

     <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs font-semibold uppercase tracking-wider">Deity</p>
       <p className="mt-1 text-sm">{myBird.deity}</p>
      </div>
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs font-semibold uppercase tracking-wider">Lucky direction · color</p>
       <p className="mt-1 text-sm">{myBird.luckyDirection} · {myBird.luckyColor}</p>
      </div>
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs font-semibold uppercase tracking-wider">Lucky days</p>
       <p className="mt-1 text-sm">{myBird.luckyDays.join(', ')}</p>
      </div>
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs font-semibold uppercase tracking-wider">Bird-day cycle count</p>
       <p className="mt-1 text-sm">{myBird.dayCount} of 5-bird rotation</p>
      </div>
     </div>

     <div className="mt-4 rounded-xl bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider">Personality essence</p>
      <p className="mt-1 text-sm leading-relaxed">{myBird.personality}</p>
     </div>

     <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-white/70 p-4">
       <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Strengths</p>
       <ul className="mt-2 space-y-1 text-sm">
        {myBird.strengths.map((s) => <li key={s}>• {s}</li>)}
       </ul>
      </div>
      <div className="rounded-xl bg-white/70 p-4">
       <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">Watch-outs</p>
       <ul className="mt-2 space-y-1 text-sm">
        {myBird.weaknesses.map((w) => <li key={w}>• {w}</li>)}
       </ul>
      </div>
     </div>

     <div className="mt-4 rounded-xl bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider">Best-fit careers</p>
      <p className="mt-1 text-sm">{myBird.careers.join(' · ')}</p>
     </div>

     <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4">
       <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Compatible birds (allies)</p>
       <p className="mt-1 text-sm capitalize text-emerald-900">{myBird.compatibility.join(', ')}</p>
      </div>
      <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-4">
       <p className="text-xs font-semibold uppercase tracking-wider text-rose-900">Adversarial birds (avoid major work with)</p>
       <p className="mt-1 text-sm capitalize text-rose-900">{myBird.incompatibility.join(', ')}</p>
      </div>
     </div>

     <div className="mt-4 rounded-xl border-2 border-saffron-300 bg-saffron-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">Daily mantra</p>
      <p className="mt-2 font-serif text-xl text-saffron-900">{myBird.mantra}</p>
      <p className="text-xs italic text-saffron-800">{myBird.mantraEnglish}</p>
     </div>

     <div className="mt-4 rounded-xl bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider">Personal remedy / upay</p>
      <p className="mt-1 text-sm leading-relaxed">{myBird.remedy}</p>
     </div>

     <div className="mt-5 flex flex-wrap gap-3">
      <Link
       href={`/astrology/pancha-pakshi/${myBird.slug}`}
       className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
      >
       Full {myBird.name} guide →
      </Link>
      <Link
       href="/ask-pandit"
       className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
      >
       Consult a Vedic astrologer
      </Link>
     </div>
    </div>
   )}

   <div className="mt-10">
    <p className="text-center text-xs uppercase tracking-wider text-saffron-700">All 5 birds</p>
    <p className="mt-1 text-center font-serif text-2xl text-gray-900">The Pancha Pakshi</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
     {PANCHA_PAKSHI_BIRDS.map((b) => (
      <Link
       key={b.slug}
       href={`/astrology/pancha-pakshi/${b.slug}`}
       className={`group rounded-2xl border-2 p-4 transition hover:scale-105 ${ELEMENT_COLOR[b.element]}`}
      >
       <p className="font-serif text-lg font-bold">{b.name}</p>
       <p className="text-xs">{b.tamil}</p>
       <p className="mt-2 text-xs capitalize">{b.element} · {b.planet}</p>
       <p className="mt-2 text-xs italic">{b.deity.split('·')[0]?.trim() ?? b.deity}</p>
       <p className="mt-3 text-xs font-semibold opacity-80 group-hover:opacity-100">View profile →</p>
      </Link>
     ))}
    </div>
   </div>
  </section>
 );
}
