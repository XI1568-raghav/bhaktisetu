'use client';

import { useState, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import { computeKaalSarp, KAAL_SARP_REMEDIES, type KaalSarpResult } from '../../../lib/kaal-sarp';
import { DateInput } from '../../../components/ui/DateInput';

const CITY_PRESETS = [
 { label: 'Delhi',     lat: 28.6139, lng: 77.2090, tz: 5.5 },
 { label: 'Mumbai',    lat: 19.0760, lng: 72.8777, tz: 5.5 },
 { label: 'Bengaluru', lat: 12.9716, lng: 77.5946, tz: 5.5 },
 { label: 'Kolkata',   lat: 22.5726, lng: 88.3639, tz: 5.5 },
 { label: 'Chennai',   lat: 13.0827, lng: 80.2707, tz: 5.5 },
 { label: 'Hyderabad', lat: 17.3850, lng: 78.4867, tz: 5.5 },
 { label: 'Ahmedabad', lat: 23.0225, lng: 72.5714, tz: 5.5 },
 { label: 'Pune',      lat: 18.5204, lng: 73.8567, tz: 5.5 },
 { label: 'Jaipur',    lat: 26.9124, lng: 75.7873, tz: 5.5 },
 { label: 'Varanasi',  lat: 25.3176, lng: 82.9739, tz: 5.5 },
 { label: 'New York',  lat: 40.7128, lng: -74.0060, tz: -5 },
 { label: 'London',    lat: 51.5074, lng: -0.1278, tz: 0 },
 { label: 'Toronto',   lat: 43.6532, lng: -79.3832, tz: -5 },
 { label: 'Dubai',     lat: 25.2048, lng: 55.2708, tz: 4 },
 { label: 'Singapore', lat: 1.3521,  lng: 103.8198, tz: 8 },
 { label: 'Sydney',    lat: -33.8688, lng: 151.2093, tz: 10 },
];

const SEVERITY_STYLE = {
 full:    { border: 'border-rose-400',    bg: 'bg-rose-50',    pill: 'bg-rose-200 text-rose-900',       label: 'Full Kaal Sarp present' },
 partial: { border: 'border-amber-400',   bg: 'bg-amber-50',   pill: 'bg-amber-200 text-amber-900',     label: 'Partial Kaal Sarp' },
 none:    { border: 'border-emerald-400', bg: 'bg-emerald-50', pill: 'bg-emerald-200 text-emerald-900', label: 'No Kaal Sarp dosh' },
};

export default function KaalSarpClient() {
 const [dob, setDob] = useState('1990-01-15');
 const [time, setTime] = useState('12:00');
 const [cityLabel, setCityLabel] = useState('Delhi');
 const [submitted, setSubmitted] = useState(false);

 const city = useMemo(() => CITY_PRESETS.find((c) => c.label === cityLabel) ?? CITY_PRESETS[0]!, [cityLabel]);

 const result: KaalSarpResult | null = useMemo(() => {
  if (!submitted) return null;
  try {
   return computeKaalSarp({
    dob, time,
    timezoneOffset: city.tz,
    latitude: city.lat, longitude: city.lng,
    placeLabel: city.label,
   });
  } catch (err) {
   console.error('Kaal Sarp compute error', err);
   return null;
  }
 }, [submitted, dob, time, city]);

 function onSubmit(e: FormEvent) {
  e.preventDefault();
  setSubmitted(true);
 }

 const sev = result ? SEVERITY_STYLE[result.severity] : SEVERITY_STYLE.none;

 return (
  <div>
   <form
    onSubmit={onSubmit}
    className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-white to-saffron-50/30 p-5 shadow-sm sm:p-6"
   >
    <div className="grid gap-4 sm:grid-cols-3">
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Date of birth</span>
      <DateInput value={dob} onChange={(v) => setDob(v)} required />
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Birth time (local)</span>
      <input
       type="time" value={time} onChange={(e) => setTime(e.target.value)} required
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      />
     </label>
     <label className="block">
      <span className="text-sm font-semibold text-gray-800">Place of birth</span>
      <select
       value={cityLabel} onChange={(e) => setCityLabel(e.target.value)}
       className="mt-1 w-full rounded-lg border border-saffron-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
       {CITY_PRESETS.map((c) => (
        <option key={c.label} value={c.label}>{c.label}</option>
       ))}
      </select>
     </label>
    </div>
    <p className="mt-3 text-[11px] text-gray-500">
     Accuracy ±0.5° (Meeus simplified). For ceremonial-grade precision, verify with a pandit running
     full Drik panchang ephemeris.
    </p>
    <button
     type="submit"
     className="mt-4 w-full rounded-lg bg-saffron-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-700 sm:w-auto sm:px-8"
    >
     Check Kaal Sarp Dosh
    </button>
   </form>

   {result && (
    <div className="mt-8 space-y-6">
     <div className={`rounded-2xl border-2 ${sev.border} ${sev.bg} p-6 shadow-md`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div>
        <p className="text-xs uppercase tracking-wider text-gray-700">Result · {result.input.placeLabel}</p>
        <h2 className="mt-1 font-serif text-2xl text-gray-900">
         {result.doshaPresent
          ? `${result.type?.sanskrit ?? ''} — ${result.type?.name ?? ''} Kaal Sarp`
          : 'No Kaal Sarp Dosh detected'}
        </h2>
        {result.doshaPresent && (
         <p className="mt-1 text-sm text-gray-700">
          Direction: <span className="font-semibold">{result.direction === 'forward' ? 'Anuloma (Rahu → Ketu)' : 'Pratiloma (Ketu → Rahu, reverse)'}</span>
          {' · '}Rahu in house <span className="font-semibold">{result.rahu.house}</span> ({result.rahu.sign})
         </p>
        )}
       </div>
       <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${sev.pill}`}>{sev.label}</span>
      </div>

      {result.doshaPresent && result.type && (
       <div className="mt-4 rounded-xl border border-white/60 bg-white/70 p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500">Theme</p>
        <p className="mt-0.5 font-serif text-base text-gray-900">{result.type.theme}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{result.type.effect}</p>
       </div>
      )}

      {result.partial && (
       <p className="mt-3 text-sm text-gray-700">
        <span className="font-semibold">Partial dosh:</span> {7 - result.planetsOutsideArc.length} of 7 planets
        sit inside the Rahu-Ketu arc. Outside: {result.planetsOutsideArc.join(', ')}. Some classical
        astrologers still prescribe Kaal Sarp remedies for partial cases.
       </p>
      )}

      {!result.doshaPresent && (
       <p className="mt-3 text-sm text-gray-700">
        Planets are scattered across both halves of the Rahu-Ketu axis ({result.planetsOutsideArc.length} outside).
        Pure Kaal Sarp Yoga does not form in your chart.
       </p>
      )}
     </div>

     <div className="rounded-2xl border border-gray-200 bg-white/80 p-6">
      <h3 className="font-serif text-lg text-gray-900">Planetary placements (sidereal · Lahiri)</h3>
      <div className="mt-3 overflow-x-auto">
       <table className="min-w-full text-sm">
        <thead>
         <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
          <th className="py-2 pr-3">Planet</th>
          <th className="py-2 pr-3">Sign (Rashi)</th>
          <th className="py-2 pr-3">House</th>
          <th className="py-2 pr-3">Longitude</th>
          <th className="py-2 pr-3">Inside arc?</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
         <tr className="bg-purple-50/40">
          <td className="py-2 pr-3 font-semibold text-purple-900">☊ Rahu</td>
          <td className="py-2 pr-3">{result.rahu.sign}</td>
          <td className="py-2 pr-3">{result.rahu.house}</td>
          <td className="py-2 pr-3 font-mono text-xs">{result.rahu.longitude.toFixed(2)}°</td>
          <td className="py-2 pr-3 text-purple-700">axis point</td>
         </tr>
         <tr className="bg-purple-50/40">
          <td className="py-2 pr-3 font-semibold text-purple-900">☋ Ketu</td>
          <td className="py-2 pr-3">{result.ketu.sign}</td>
          <td className="py-2 pr-3">{result.ketu.house}</td>
          <td className="py-2 pr-3 font-mono text-xs">{result.ketu.longitude.toFixed(2)}°</td>
          <td className="py-2 pr-3 text-purple-700">axis point</td>
         </tr>
         {result.planets.map((p) => (
          <tr key={p.name}>
           <td className="py-2 pr-3 font-semibold text-gray-900">{p.name}</td>
           <td className="py-2 pr-3">{p.sign}</td>
           <td className="py-2 pr-3">{p.house}</td>
           <td className="py-2 pr-3 font-mono text-xs">{p.longitude.toFixed(2)}°</td>
           <td className="py-2 pr-3">
            {p.insideArc
             ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">inside</span>
             : <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">outside</span>}
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
      <p className="mt-3 text-[11px] text-gray-500">
       Lagna (ascendant): {result.ascendantSign} at {result.ascendantLongitude.toFixed(2)}° · Ayanamsa {result.ayanamsa.toFixed(2)}°.
      </p>
     </div>

     {result.doshaPresent && result.remedies.length > 0 && (
      <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-amber-50 to-saffron-50 p-6">
       <h3 className="font-serif text-lg text-gray-900">Traditional remedies (Upaya)</h3>
       <ul className="mt-3 space-y-2 text-sm text-gray-800">
        {KAAL_SARP_REMEDIES.map((r, i) => (
         <li key={i} className="flex gap-2">
          <span className="text-saffron-600">·</span>
          <span>{r}</span>
         </li>
        ))}
       </ul>
       <p className="mt-3 text-[11px] text-gray-500">
        Remedies must be performed under a qualified pandit. Self-prescribed Kaal Sarp puja is not advised.
       </p>
      </div>
     )}

     <div className="rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 text-center">
      <p className="text-sm text-gray-800">Want a pandit to confirm the dosh and prescribe the right upaya?</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Generate Full Kundli
       </Link>
       <Link href="/astrology/manglik" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Check Manglik Dosh
       </Link>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
