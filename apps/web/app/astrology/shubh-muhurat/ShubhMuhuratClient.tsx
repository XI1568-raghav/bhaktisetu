'use client';

import { useState, useMemo, FormEvent } from 'react';
import { DateInput } from '../../../components/ui/DateInput';
import Link from 'next/link';
import { CITY_OPTIONS } from '../../../lib/hora';
import {
 computeShubhMuhurat,
 EVENT_OPTIONS,
 type EventType,
 type MuhuratResult,
 type MuhuratWindow,
} from '../../../lib/shubh-muhurat';

const VERDICT_STYLE: Record<MuhuratWindow['verdict'], { border: string; bg: string; pill: string; label: string }> = {
 excellent: { border: 'border-emerald-400', bg: 'bg-emerald-50/70', pill: 'bg-emerald-200 text-emerald-900', label: 'Excellent' },
 good:      { border: 'border-blue-400',    bg: 'bg-blue-50/60',    pill: 'bg-blue-200 text-blue-900',       label: 'Good' },
 fair:      { border: 'border-amber-400',   bg: 'bg-amber-50/60',   pill: 'bg-amber-200 text-amber-900',     label: 'Fair' },
 avoid:     { border: 'border-rose-400',    bg: 'bg-rose-50/60',    pill: 'bg-rose-200 text-rose-900',       label: 'Avoid' },
};

const PLANET_GLYPH: Record<string, string> = {
 Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

function todayISO(): string {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ShubhMuhuratClient() {
 const [date, setDate] = useState(todayISO());
 const [cityLabel, setCityLabel] = useState('Delhi');
 const [event, setEvent] = useState<EventType>('marriage');
 const [showAll, setShowAll] = useState(false);

 const city = useMemo(() => CITY_OPTIONS.find((c) => c.label === cityLabel) ?? CITY_OPTIONS[0]!, [cityLabel]);

 const result: MuhuratResult | null = useMemo(
  () => computeShubhMuhurat({ date, lat: city.lat, lng: city.lng, tz: city.tz, city: city.label, event }),
  [date, city, event],
 );

 const selectedEvent = EVENT_OPTIONS.find((e) => e.value === event)!;

 function onSubmit(e: FormEvent) {
  e.preventDefault();
 }

 return (
  <div>
   <form
    onSubmit={onSubmit}
    className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-white to-saffron-50/30 p-5 shadow-sm sm:p-6"
   >
    <div className="grid gap-4 sm:grid-cols-3">
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Date</span>
      <DateInput value={date} onChange={(v) => setDate(v)} />
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">City</span>
      <select
       value={cityLabel}
       onChange={(e) => setCityLabel(e.target.value)}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {CITY_OPTIONS.map((c) => (
        <option key={c.label} value={c.label}>{c.label}</option>
       ))}
      </select>
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Event</span>
      <select
       value={event}
       onChange={(e) => setEvent(e.target.value as EventType)}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {EVENT_OPTIONS.map((e) => (
        <option key={e.value} value={e.value}>{e.label}</option>
       ))}
      </select>
     </label>
    </div>
    <p className="mt-3 text-[11px] text-gray-500">
     Composite scoring overlays Choghadiya kind + Hora planet match + Rahu/Yamaganda/Gulika avoidance.
     Ideal planets for {selectedEvent.label.toLowerCase()}: {selectedEvent.idealPlanets.join(' · ')}.
    </p>
   </form>

   {result && (
    <div className="mt-8 space-y-6">
     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 shadow-md">
      <p className="text-xs uppercase tracking-wider text-gray-700">{result.weekday} · {result.city} · {result.eventLabel}</p>
      <h2 className="mt-1 font-serif text-2xl text-gray-900">{result.date}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
       <Stat label="Sunrise" value={result.sunrise} />
       <Stat label="Sunset" value={result.sunset} />
       <Stat label="Top score today" value={`${result.topWindows[0]?.score ?? 0}/100`} />
      </div>
     </div>

     <div>
      <div className="flex items-end justify-between">
       <h3 className="font-serif text-xl text-gray-900">Top 6 windows ranked</h3>
       <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="text-xs font-semibold text-saffron-700 hover:text-saffron-900"
       >
        {showAll ? 'Hide all 24 windows ↑' : 'Show all 24 windows ↓'}
       </button>
      </div>
      <div className="mt-3 grid gap-3">
       {result.topWindows.map((w, i) => <WindowCard key={i} w={w} rank={i + 1} />)}
      </div>
     </div>

     {showAll && (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
       <h4 className="font-serif text-base text-gray-900">All 24 horas (by time)</h4>
       <div className="mt-3 grid gap-2">
        {result.allWindows.map((w, i) => <WindowRow key={i} w={w} />)}
       </div>
      </div>
     )}

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
      <p className="text-sm text-gray-800">
       Want a pandit to confirm + perform the puja inside this muhurat?
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/astrology/choghadiya" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Choghadiya
       </Link>
       <Link href="/astrology/hora" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Hora
       </Link>
       <Link href="/astrology/rahu-kalam" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Rahu Kalam
       </Link>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function Stat({ label, value }: { label: string; value: string }) {
 return (
  <div className="rounded-xl border border-gray-200 bg-white/90 p-3 text-center">
   <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
   <p className="mt-0.5 font-serif text-lg text-gray-900">{value}</p>
  </div>
 );
}

function WindowCard({ w, rank }: { w: MuhuratWindow; rank: number }) {
 const s = VERDICT_STYLE[w.verdict];
 return (
  <div className={`rounded-xl border-2 p-4 ${s.border} ${s.bg}`}>
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2">
     <span className="rounded-full bg-saffron-600 px-2 py-0.5 text-[10px] font-bold text-white">#{rank}</span>
     <span className="font-mono text-sm font-semibold text-gray-900">{w.startTime} → {w.endTime}</span>
     <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.pill}`}>{s.label}</span>
    </div>
    <div className="flex items-center gap-2">
     <span className="text-lg">{PLANET_GLYPH[w.horaPlanet] ?? ''}</span>
     <span className="font-serif text-sm text-gray-800">{w.horaPlanet} hora · {w.choghadiyaName}</span>
     <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-800">{w.score}/100</span>
    </div>
   </div>
   {(w.reasons.length > 0 || w.warnings.length > 0) && (
    <div className="mt-2 flex flex-wrap gap-1.5">
     {w.reasons.map((r, i) => (
      <span key={`r-${i}`} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">+ {r}</span>
     ))}
     {w.warnings.map((wn, i) => (
      <span key={`w-${i}`} className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-800">⚠ {wn}</span>
     ))}
    </div>
   )}
  </div>
 );
}

function WindowRow({ w }: { w: MuhuratWindow }) {
 const s = VERDICT_STYLE[w.verdict];
 return (
  <div className={`rounded-lg border px-3 py-2 ${s.border} ${s.bg}`}>
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2">
     <span className="font-mono text-xs text-gray-800">{w.startTime}→{w.endTime}</span>
     <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${s.pill}`}>{s.label}</span>
    </div>
    <div className="flex items-center gap-2">
     <span className="text-xs text-gray-700">{PLANET_GLYPH[w.horaPlanet] ?? ''} {w.horaPlanet}</span>
     <span className="text-xs text-gray-600">· {w.choghadiyaName}</span>
     <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-800">{w.score}</span>
    </div>
   </div>
  </div>
 );
}
