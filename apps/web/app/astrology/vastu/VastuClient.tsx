'use client';

import { useState, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import { buttonClass } from '../../../components/ui/button-recipe';
import {
 DISHAS,
 ROOMS,
 computeVastu,
 suggestIdealLayout,
 type Direction,
 type RoomType,
 type VastuResult,
 type Placement,
} from '../../../lib/vastu';

const VERDICT_STYLE: Record<Placement['verdict'], { border: string; bg: string; pill: string; label: string }> = {
 excellent:   { border: 'border-emerald-400', bg: 'bg-emerald-50/70', pill: 'bg-emerald-200 text-emerald-900', label: 'Excellent' },
 good:        { border: 'border-blue-400',    bg: 'bg-blue-50/60',    pill: 'bg-blue-200 text-blue-900',       label: 'Good' },
 acceptable:  { border: 'border-amber-400',   bg: 'bg-amber-50/60',   pill: 'bg-amber-200 text-amber-900',     label: 'Acceptable' },
 avoid:       { border: 'border-rose-400',    bg: 'bg-rose-50/60',    pill: 'bg-rose-200 text-rose-900',       label: 'Avoid' },
};

const DIRECTION_GLYPH: Record<Direction, string> = {
 N: '↑', NE: '↗', E: '→', SE: '↘', S: '↓', SW: '↙', W: '←', NW: '↖',
};

const DEFAULT_ROOMS: RoomType[] = ['pooja-room', 'main-entrance', 'kitchen', 'master-bedroom', 'toilet', 'water-tank'];

export default function VastuClient() {
 const [facing, setFacing] = useState<Direction>('E');
 const [selections, setSelections] = useState<Record<RoomType, Direction>>(() => {
  const ideal = suggestIdealLayout();
  const out = {} as Record<RoomType, Direction>;
  for (const r of DEFAULT_ROOMS) out[r] = ideal[r];
  return out;
 });

 const result: VastuResult = useMemo(() => {
  const rooms = (Object.entries(selections) as Array<[RoomType, Direction]>).map(([room, chosen]) => ({ room, chosen }));
  return computeVastu({ facing, rooms });
 }, [facing, selections]);

 function setRoomDir(room: RoomType, dir: Direction) {
  setSelections((s) => ({ ...s, [room]: dir }));
 }

 function toggleRoom(room: RoomType) {
  setSelections((s) => {
   if (room in s) {
    const { [room]: _removed, ...rest } = s;
    return rest as Record<RoomType, Direction>;
   }
   const ideal = suggestIdealLayout();
   return { ...s, [room]: ideal[room] };
  });
 }

 function loadIdealLayout() {
  const ideal = suggestIdealLayout();
  const out = {} as Record<RoomType, Direction>;
  for (const r of DEFAULT_ROOMS) out[r] = ideal[r];
  setSelections(out);
 }

 function onSubmit(e: FormEvent) { e.preventDefault(); }

 const activeRooms = Object.keys(selections) as RoomType[];

 return (
  <div>
   <form
    onSubmit={onSubmit}
    className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-white to-saffron-50/30 p-5 shadow-sm sm:p-6"
   >
    <div className="grid gap-4 sm:grid-cols-2">
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Plot / main entrance faces</span>
      <select
       value={facing}
       onChange={(e) => setFacing(e.target.value as Direction)}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {DISHAS.map((d) => (
        <option key={d.code} value={d.code}>{DIRECTION_GLYPH[d.code]} {d.name} ({d.sanskrit}) — {d.deity}</option>
       ))}
      </select>
     </label>
     <div className="flex items-end justify-end">
      <button
       type="button"
       onClick={loadIdealLayout}
       className="rounded-full border border-saffron-400 bg-white px-4 py-2 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
      >
       Load ideal layout (Mayamatam default)
      </button>
     </div>
    </div>

    <div className="mt-5">
     <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Rooms to check</p>
     <div className="mt-2 flex flex-wrap gap-2">
      {ROOMS.map((r) => {
       const active = r.value in selections;
       return (
        <button
         type="button"
         key={r.value}
         onClick={() => toggleRoom(r.value)}
         className={`rounded-full px-3 py-1 text-xs font-semibold border ${active ? 'border-saffron-500 bg-saffron-100 text-saffron-900' : 'border-gray-300 bg-white text-gray-700 hover:border-saffron-300'}`}
        >
         {active ? '✓ ' : '+ '}{r.label}
        </button>
       );
      })}
     </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
     {activeRooms.map((roomVal) => {
      const def = ROOMS.find((r) => r.value === roomVal)!;
      return (
       <label key={roomVal} className="block rounded-xl border border-gray-200 bg-white/80 p-3">
        <span className="text-sm font-semibold text-gray-900">{def.label}</span>
        <span className="ml-2 text-xs text-saffron-700">{def.sanskrit}</span>
        <select
         value={selections[roomVal]}
         onChange={(e) => setRoomDir(roomVal, e.target.value as Direction)}
         className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        >
         {DISHAS.map((d) => (
          <option key={d.code} value={d.code}>{DIRECTION_GLYPH[d.code]} {d.name} ({d.sanskrit})</option>
         ))}
        </select>
       </label>
      );
     })}
    </div>

    <p className="mt-4 text-xs text-gray-500">
     Composite scoring per Mayamatam + Vishwakarma Prakash + Brihat Samhita. Ideal direction +40, acceptable +20, avoid −50, baseline +50, clamped 0–100.
    </p>
   </form>

   <div className="mt-8 space-y-6">
    <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 shadow-md">
     <p className="text-xs uppercase tracking-wider text-gray-700">
      Facing {DIRECTION_GLYPH[result.facing]} {result.facingDisha.name} ({result.facingDisha.sanskrit}) · {result.facingDisha.deity} disha
     </p>
     <h2 className="mt-1 font-serif text-2xl text-gray-900">
      Overall score {result.overallScore}/100 · <span className="capitalize">{result.verdict.replace('-', ' ')}</span>
     </h2>
     <p className="mt-2 text-sm text-gray-700">{result.facingDisha.significance}</p>
    </div>

    <div>
     <h3 className="font-serif text-xl text-gray-900">Per-room placement</h3>
     <div className="mt-3 grid gap-3">
      {result.placements.map((p) => <PlacementCard key={p.room} p={p} />)}
     </div>
    </div>

    {result.strengths.length > 0 && (
     <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5">
      <h4 className="font-serif text-base text-emerald-900">Strengths in your layout</h4>
      <ul className="mt-2 space-y-1 text-sm text-emerald-800">
       {result.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
      </ul>
     </div>
    )}

    {result.dosha.length > 0 && (
     <div className="rounded-2xl border border-rose-300 bg-rose-50/60 p-5">
      <h4 className="font-serif text-base text-rose-900">Vastu doshas to correct</h4>
      <ul className="mt-2 space-y-1 text-sm text-rose-800">
       {result.dosha.map((d, i) => <li key={i}>⚠ {d}</li>)}
      </ul>
      <p className="mt-3 text-xs text-rose-700">A Vastu pandit can prescribe remedies (yantra placement, colour correction, mirror placement, copper-pyramid) without structural change for most doshas.</p>
     </div>
    )}

    <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
     <p className="text-sm text-gray-800">Want a Vastu pandit to inspect your floor plan + prescribe remedies?</p>
     <div className="mt-3 flex flex-wrap justify-center gap-3">
      <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
       Ask a Pandit Live
      </Link>
      <Link href="/astrology/shubh-muhurat" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
       Shubh Muhurat
      </Link>
      <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
       Kundli
      </Link>
     </div>
    </div>
   </div>
  </div>
 );
}

function PlacementCard({ p }: { p: Placement }) {
 const s = VERDICT_STYLE[p.verdict];
 return (
  <div className={`rounded-xl border-2 p-4 ${s.border} ${s.bg}`}>
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2">
     <span className="text-lg">{DIRECTION_GLYPH[p.chosen]}</span>
     <span className="font-serif text-base font-semibold text-gray-900">{p.roomLabel}</span>
     <span className="text-xs text-saffron-700">{p.roomSanskrit}</span>
     <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.pill}`}>{s.label}</span>
    </div>
    <div className="flex items-center gap-2">
     <span className="font-mono text-xs text-gray-700">{p.disha.name} · {p.disha.deity}</span>
     <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-800">{p.score}/100</span>
    </div>
   </div>
   <p className="mt-2 text-xs leading-relaxed text-gray-700">{p.reasoning}</p>
  </div>
 );
}
