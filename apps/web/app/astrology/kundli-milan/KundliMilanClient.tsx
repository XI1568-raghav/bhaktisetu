'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { computeMilan, type MilanReport } from '../../../lib/kundli-milan';
import { buttonClass } from '../../../components/ui/button-recipe';

type Option = { slug: string; label: string };
type Props = { options: Option[] };

const LEVEL_THEME: Record<MilanReport['verdictLevel'], { ring: string; chip: string; text: string; bg: string }> = {
 excellent: { ring: 'ring-emerald-400', chip: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700', bg: 'bg-emerald-50' },
 good: { ring: 'ring-green-400', chip: 'bg-green-100 text-green-800', text: 'text-green-700', bg: 'bg-green-50' },
 acceptable: { ring: 'ring-amber-400', chip: 'bg-amber-100 text-amber-800', text: 'text-amber-700', bg: 'bg-amber-50' },
 caution: { ring: 'ring-orange-400', chip: 'bg-orange-100 text-orange-800', text: 'text-orange-700', bg: 'bg-orange-50' },
 avoid: { ring: 'ring-red-400', chip: 'bg-red-100 text-red-800', text: 'text-red-700', bg: 'bg-red-50' },
};

export default function KundliMilanClient({ options }: Props) {
 const [maleNak, setMaleNak] = useState('');
 const [femaleNak, setFemaleNak] = useState('');
 const [maleManglik, setMaleManglik] = useState(false);
 const [femaleManglik, setFemaleManglik] = useState(false);
 const [report, setReport] = useState<MilanReport | null>(null);
 const [touched, setTouched] = useState(false);

 const canSubmit = maleNak && femaleNak;

 function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setTouched(true);
  if (!canSubmit) return;
  const r = computeMilan(maleNak, femaleNak, { maleManglik, femaleManglik });
  setReport(r);
  if (typeof window !== 'undefined') {
   setTimeout(() => {
    document.getElementById('milan-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
   }, 50);
  }
 }

 function onReset() {
  setMaleNak('');
  setFemaleNak('');
  setMaleManglik(false);
  setFemaleManglik(false);
  setReport(null);
  setTouched(false);
 }

 const theme = report ? LEVEL_THEME[report.verdictLevel] : null;
 const percent = report ? Math.round((report.total / report.maxTotal) * 100) : 0;

 const summaryText = useMemo(() => {
  if (!report) return '';
  return `Kundli Milan: ${report.male.name} ♂ × ${report.female.name} ♀ = ${report.total}/36 (${report.verdictLevel}). via darshya.online/astrology/kundli-milan`;
 }, [report]);

 function copySummary() {
  if (!summaryText || typeof navigator === 'undefined') return;
  navigator.clipboard?.writeText(summaryText).catch(() => {});
 }

 return (
  <div>
   <form
    onSubmit={onSubmit}
    className="rounded-2xl border border-saffron-200 bg-white p-5 shadow-sm sm:p-6"
   >
    <div className="grid gap-5 sm:grid-cols-2">
     <div>
      <label className="block text-sm font-semibold text-gray-900">
       Male partner&rsquo;s Nakshatra <span className="text-red-500">*</span>
      </label>
      <p className="mt-0.5 text-xs text-gray-500">Lunar mansion at birth (Moon nakshatra)</p>
      <select
       value={maleNak}
       onChange={(e) => setMaleNak(e.target.value)}
       className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       <option value="">Select nakshatra…</option>
       {options.map((o) => (
        <option key={o.slug} value={o.slug}>
         {o.label}
        </option>
       ))}
      </select>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-gray-700">
       <input
        type="checkbox"
        checked={maleManglik}
        onChange={(e) => setMaleManglik(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-saffron-600 focus:ring-saffron-500"
       />
       <span>Male is Manglik (Mars in 1/4/7/8/12 house) — optional</span>
      </label>
     </div>

     <div>
      <label className="block text-sm font-semibold text-gray-900">
       Female partner&rsquo;s Nakshatra <span className="text-red-500">*</span>
      </label>
      <p className="mt-0.5 text-xs text-gray-500">Lunar mansion at birth (Moon nakshatra)</p>
      <select
       value={femaleNak}
       onChange={(e) => setFemaleNak(e.target.value)}
       className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       <option value="">Select nakshatra…</option>
       {options.map((o) => (
        <option key={o.slug} value={o.slug}>
         {o.label}
        </option>
       ))}
      </select>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-gray-700">
       <input
        type="checkbox"
        checked={femaleManglik}
        onChange={(e) => setFemaleManglik(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-saffron-600 focus:ring-saffron-500"
       />
       <span>Female is Manglik (Mars in 1/4/7/8/12 house) — optional</span>
      </label>
     </div>
    </div>

    {touched && !canSubmit && (
     <p className="mt-4 text-xs text-red-600">Pick both nakshatras to compute the match.</p>
    )}

    <div className="mt-5 flex flex-wrap items-center gap-3">
     <button
      type="submit"
      className={buttonClass('primary', 'md', 'shadow-sm focus:outline-none focus:ring-2 focus:ring-saffron-300')}
     >
      Compute 36-Point Match
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
     <span className="text-xs text-gray-500">Don&rsquo;t know your nakshatra? <Link href="/astrology/kundli" className="text-saffron-700 hover:underline">Generate free kundli →</Link></span>
    </div>
   </form>

   {report && theme && (
    <div id="milan-result" className="mt-8 scroll-mt-20">
     <div className={`rounded-2xl border-2 border-transparent ring-2 ${theme.ring} ${theme.bg} p-6`}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
       <div className="text-center sm:text-left">
        <p className="text-xs uppercase tracking-wider text-gray-600">Ashtakoot Guna Match</p>
        <p className={`mt-1 text-5xl font-bold ${theme.text}`}>
         {report.total}<span className="text-2xl text-gray-500">/{report.maxTotal}</span>
        </p>
        <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${theme.chip}`}>
         {report.verdictLevel}
        </span>
       </div>
       <div className="flex flex-col items-center">
        <div className="relative h-24 w-24">
         <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#e6e2db" strokeWidth="3" />
          <circle
           cx="18"
           cy="18"
           r="16"
           fill="none"
           stroke="currentColor"
           strokeWidth="3"
           strokeDasharray={`${percent} 100`}
           strokeLinecap="round"
           className={theme.text}
          />
         </svg>
         <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">{percent}%</div>
        </div>
        <p className="mt-2 text-xs text-gray-500">of 36 points</p>
       </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-800">{report.verdict}</p>

      <div className="mt-5 grid gap-3 rounded-xl bg-white/70 p-4 text-sm sm:grid-cols-2">
       <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Male</p>
        <p className="font-semibold text-gray-900">{report.male.name} <span className="text-gray-500">({report.male.sanskrit})</span></p>
        <p className="text-xs text-gray-600">Rashi: {report.male.rashi}</p>
       </div>
       <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Female</p>
        <p className="font-semibold text-gray-900">{report.female.name} <span className="text-gray-500">({report.female.sanskrit})</span></p>
        <p className="text-xs text-gray-600">Rashi: {report.female.rashi}</p>
       </div>
      </div>
     </div>

     <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="grid grid-cols-12 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
       <div className="col-span-4 sm:col-span-3">Koota</div>
       <div className="col-span-3 sm:col-span-2 text-right">Score</div>
       <div className="col-span-5 sm:col-span-7">Aspect</div>
      </div>
      {report.gunas.map((g) => {
       const full = g.score === g.max;
       const zero = g.score === 0;
       return (
        <div key={g.name} className="grid grid-cols-12 gap-2 border-b border-gray-100 px-4 py-2.5 text-sm last:border-b-0">
         <div className="col-span-4 sm:col-span-3 font-medium text-gray-900">{g.name}</div>
         <div
          className={`col-span-3 sm:col-span-2 text-right font-mono font-semibold ${
           zero ? 'text-red-600' : full ? 'text-emerald-700' : 'text-gray-800'
          }`}
         >
          {g.score}/{g.max}
         </div>
         <div className="col-span-5 sm:col-span-7 text-xs leading-relaxed text-gray-600">{g.desc}</div>
        </div>
       );
      })}
     </div>

     {(report.hasNadiDosh || report.hasBhakootDosh || report.hasGanaDosh) && (
      <div className="mt-6 space-y-3">
       {report.hasNadiDosh && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
         <p className="text-sm font-semibold text-red-800">Nadi Dosh detected</p>
         <p className="mt-1 text-xs leading-relaxed text-red-900">
          Both partners share the same Nadi (Aadi/Madhya/Antya) — score 0/8. Traditionally indicates
          risk to progeny &amp; spouse health. Nadi-bhanga (cancellation) may apply if: same rashi
          but different nakshatra, same nakshatra but different padas, or the nakshatra falls in the
          same rashi for both. A pandit must verify the specific cancellation.
         </p>
        </div>
       )}
       {report.hasBhakootDosh && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
         <p className="text-sm font-semibold text-amber-800">Bhakoot Dosh detected</p>
         <p className="mt-1 text-xs leading-relaxed text-amber-900">
          Rashi-to-rashi distance falls in an inauspicious 6/8 or 2/12 pattern — score 0/7. Affects
          family welfare &amp; financial prosperity. Cancellation via Graha Maitri 4+/5 or rashi-lord
          friendship. Pandit consultation recommended.
         </p>
        </div>
       )}
       {report.hasGanaDosh && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
         <p className="text-sm font-semibold text-amber-800">Gana mismatch flagged</p>
         <p className="mt-1 text-xs leading-relaxed text-amber-900">
          Deva/Manushya/Rakshasa gana mismatch can cause temperament friction. Often cancels if
          rashi-lords are friends or if Nadi differs.
         </p>
        </div>
       )}
      </div>
     )}

     {report.manglikNote && (
      <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
       <p className="text-sm font-semibold text-orange-800">Manglik (Mangal Dosh) note</p>
       <p className="mt-1 text-xs leading-relaxed text-orange-900">{report.manglikNote}</p>
      </div>
     )}

     <div className="mt-6 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
      <p className="font-serif text-lg text-gray-900">Want the full picture?</p>
      <p className="mt-1 text-sm text-gray-700">
       Ashtakoot is one layer. Navamsa (D9), 7th-house lord, dasha timing, and Manglik cancellation
       need a verified pandit reviewing both charts together.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link
        href="/ask-pandit"
        className={buttonClass('primary', 'md')}
       >
        Ask a Pandit Live
       </Link>
       <Link
        href="/free-pandit-advice/kundli-milan"
        className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
       >
        Free Pandit Advice on Milan
       </Link>
       <button
        type="button"
        onClick={copySummary}
        className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
       >
        Copy Summary
       </button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
