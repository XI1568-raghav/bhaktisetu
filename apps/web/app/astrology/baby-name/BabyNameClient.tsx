'use client';

import { useState } from 'react';
import Link from 'next/link';
import { nakshatraNameReport, type NakshatraNameReport, type Gender } from '../../../lib/baby-names';

type Opt = { slug: string; label: string };

export default function BabyNameClient({ options }: { options: Opt[] }) {
 const [slug, setSlug] = useState('');
 const [gender, setGender] = useState<Gender>('all');
 const [report, setReport] = useState<NakshatraNameReport | null>(null);
 const [error, setError] = useState('');

 function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  if (!slug) {
   setError('Please pick a nakshatra (birth star).');
   return;
  }
  const r = nakshatraNameReport(slug, gender);
  if (!r) {
   setError('Could not resolve that nakshatra. Try again.');
   return;
  }
  setReport(r);
  if (typeof window !== 'undefined') {
   setTimeout(() => document.getElementById('baby-name-result')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }
 }

 function onReset() {
  setSlug('');
  setGender('all');
  setReport(null);
  setError('');
 }

 return (
  <div>
   <form onSubmit={onSubmit} className="rounded-2xl border border-saffron-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="grid gap-5 sm:grid-cols-2">
     <div>
      <label className="block text-sm font-semibold text-gray-900">
       Baby&rsquo;s birth nakshatra <span className="text-red-500">*</span>
      </label>
      <p className="mt-0.5 text-xs text-gray-500">From the panchang for the date + time of birth. Ask a pandit if unsure.</p>
      <select
       value={slug}
       onChange={(e) => setSlug(e.target.value)}
       className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       <option value="">— Select nakshatra —</option>
       {options.map((o) => (
        <option key={o.slug} value={o.slug}>{o.label}</option>
       ))}
      </select>
     </div>
     <div>
      <label className="block text-sm font-semibold text-gray-900">Gender</label>
      <p className="mt-0.5 text-xs text-gray-500">Filters the curated name list.</p>
      <div className="mt-2 inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
       {(['boy', 'girl', 'all'] as Gender[]).map((g) => (
        <button
         type="button"
         key={g}
         onClick={() => setGender(g)}
         className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
          gender === g ? 'bg-saffron-600 text-white shadow' : 'text-gray-700 hover:bg-gray-50'
         }`}
        >
         {g === 'boy' ? 'Boy' : g === 'girl' ? 'Girl' : 'All'}
        </button>
       ))}
      </div>
     </div>
    </div>

    {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

    <div className="mt-5 flex flex-wrap items-center gap-3">
     <button
      type="submit"
      className="rounded-full bg-saffron-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-saffron-300"
     >
      Show Name Suggestions
     </button>
     {report && (
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

   {report && (
    <div id="baby-name-result" className="mt-8 scroll-mt-20 space-y-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
       <div>
        <p className="text-xs uppercase tracking-wider text-saffron-700">Birth Nakshatra</p>
        <p className="mt-1 font-serif text-3xl text-gray-900">{report.nakshatra.name}</p>
        <p className="mt-0.5 text-saffron-700">{report.nakshatra.sanskritName}</p>
       </div>
       <div className="text-right text-xs text-gray-700">
        <p><span className="font-semibold">Lord:</span> {report.nakshatra.lord}</p>
        <p><span className="font-semibold">Deity:</span> {report.nakshatra.deity}</p>
        <p><span className="font-semibold">Gana:</span> {report.nakshatra.gana}</p>
       </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{report.nakshatra.qualities}</p>
     </div>

     <div className="grid gap-4 sm:grid-cols-2">
      {report.padas.map((p) => (
       <PadaCard key={p.pada} pada={p.pada} syllable={p.syllable} names={p.names} />
      ))}
     </div>

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want a custom name shortlist with full kundli match?</p>
      <p className="mt-2 text-sm text-gray-700">
       A verified pandit-numerologist will match nakshatra-pada syllable + name-number vibration +
       graha balance + family deity tradition before finalizing the namakaran.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask Pandit Live
       </Link>
       <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Free Kundli
       </Link>
       <Link href="/astrology/numerology" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Check Name Number
       </Link>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function PadaCard({ pada, syllable, names }: { pada: number; syllable: string; names: { name: string; meaning: string; deity?: string; gender: 'boy' | 'girl' }[] }) {
 return (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
   <div className="flex items-baseline justify-between">
    <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Pada {pada}</p>
    <p className="font-serif text-3xl font-bold text-saffron-700">{syllable}</p>
   </div>
   <p className="mt-1 text-xs text-gray-500">Names beginning with this sound</p>

   {names.length === 0 ? (
    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
     No curated names yet for syllable <strong>&ldquo;{syllable}&rdquo;</strong>. This is a rarer
     starting sound — consult a pandit for a traditional name from your family deity or kuldevta lineage.
    </p>
   ) : (
    <ul className="mt-3 space-y-2">
     {names.map((n) => (
      <li key={n.name} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
       <div className="flex items-baseline justify-between gap-2">
        <p className="font-serif text-lg font-semibold text-gray-900">{n.name}</p>
        <div className="flex shrink-0 items-center gap-1.5">
         {n.deity && (
          <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-semibold text-saffron-800">
           {n.deity}
          </span>
         )}
         <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          n.gender === 'boy' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'
         }`}>
          {n.gender === 'boy' ? '♂ Boy' : '♀ Girl'}
         </span>
        </div>
       </div>
       <p className="mt-0.5 text-xs leading-relaxed text-gray-700">{n.meaning}</p>
      </li>
     ))}
    </ul>
   )}
  </div>
 );
}
