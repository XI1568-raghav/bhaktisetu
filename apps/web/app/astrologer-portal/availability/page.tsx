'use client';

import { useState, useEffect, useCallback } from 'react';
import {
 Save,
 Loader2,
 CheckCircle2,
 Clock,
 AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import {
 getAvailability,
 updateAvailability,
 type WeekAvailability,
 type DaySlots,
} from '../../../lib/astrologer-api';
import { H1 } from '../../../components/ui/heading-recipe';

// ─── Constants ──────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = [
 { key: 'morning' as const, label: 'Morning', time: '6 AM - 12 PM', icon: '' },
 { key: 'afternoon' as const, label: 'Afternoon', time: '12 PM - 5 PM', icon: '️' },
 { key: 'evening' as const, label: 'Evening', time: '5 PM - 10 PM', icon: '' },
];

const defaultAvailability: WeekAvailability = {
 Monday: { morning: true, afternoon: true, evening: false },
 Tuesday: { morning: true, afternoon: true, evening: true },
 Wednesday: { morning: false, afternoon: true, evening: true },
 Thursday: { morning: true, afternoon: true, evening: false },
 Friday: { morning: true, afternoon: true, evening: true },
 Saturday: { morning: true, afternoon: false, evening: false },
 Sunday: { morning: false, afternoon: false, evening: false },
};

// Best-effort coercion: backend stores availability as free-form JSON, so the
// blob may not match the WeekAvailability shape. Fall back to defaults if any
// day is missing/malformed instead of crashing the page.
function normalize(raw: unknown): WeekAvailability {
 if (!raw || typeof raw !== 'object') return defaultAvailability;
 const out: WeekAvailability = {};
 for (const day of DAYS) {
  const v = (raw as Record<string, unknown>)[day];
  if (v && typeof v === 'object') {
   const d = v as Partial<DaySlots>;
   out[day] = {
    morning: Boolean(d.morning),
    afternoon: Boolean(d.afternoon),
    evening: Boolean(d.evening),
   };
  } else {
   out[day] = defaultAvailability[day]!;
  }
 }
 return out;
}

// ─── Component ──────────────────────────────────────────────────

export default function AstrologerAvailabilityPage() {
 return (
  <AuthGuard allowedRoles={['astrologer', 'admin']}>
   <AstrologerAvailabilityPageContent />
  </AuthGuard>
 );
}

function AstrologerAvailabilityPageContent() {
 const { session } = useAuth();
 const token = session?.accessToken;

 const [availability, setAvailability] = useState<WeekAvailability>(defaultAvailability);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const load = useCallback(async () => {
  if (!token) return;
  setLoading(true);
  setError(null);
  try {
   const raw = await getAvailability(token);
   setAvailability(normalize(raw));
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed to load availability');
  } finally {
   setLoading(false);
  }
 }, [token]);

 useEffect(() => {
  if (!token) return;
  void load();
 }, [token, load]);

 function toggleSlot(day: string, slot: keyof DaySlots) {
  setAvailability((prev) => {
   const dayData = prev[day] ?? { morning: false, afternoon: false, evening: false };
   return {
    ...prev,
    [day]: { ...dayData, [slot]: !dayData[slot] },
   };
  });
  setSaved(false);
 }

 function toggleDay(day: string) {
  const daySlots = availability[day];
  if (!daySlots) return;
  const allOn = daySlots.morning && daySlots.afternoon && daySlots.evening;
  setAvailability((prev) => ({
   ...prev,
   [day]: { morning: !allOn, afternoon: !allOn, evening: !allOn },
  }));
  setSaved(false);
 }

 async function handleSave() {
  if (!token) return;
  setSaving(true);
  setError(null);
  try {
   await updateAvailability(token, availability);
   setSaved(true);
   setTimeout(() => setSaved(false), 3000);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Save failed');
  } finally {
   setSaving(false);
  }
 }

 const totalSlots = DAYS.reduce((sum, day) => {
  const d = availability[day];
  return sum + (d?.morning ? 1 : 0) + (d?.afternoon ? 1 : 0) + (d?.evening ? 1 : 0);
 }, 0);

 if (loading) {
  return (
   <div className="space-y-6 max-w-4xl">
    <div className="h-8 w-40 bg-surface-100 rounded animate-pulse" />
    <div className="bg-white rounded-xl border border-surface-100 p-6 space-y-3">
     {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-12 bg-surface-100 rounded animate-pulse" />
     ))}
    </div>
   </div>
  );
 }

 return (
  <div className="space-y-6 max-w-4xl">
   {/* Header */}
   <div className="flex items-center justify-between">
    <div>
     <h1 className={H1.portal}>Availability</h1>
     <p className="text-surface-500 mt-1">
      Set your available time slots for consultations. {totalSlots} slots active.
     </p>
    </div>
    <button
     onClick={() => void handleSave()}
     disabled={saving}
     className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
    >
     {saving ? (
      <Loader2 className="w-4 h-4 animate-spin" />
     ) : saved ? (
      <CheckCircle2 className="w-4 h-4" />
     ) : (
      <Save className="w-4 h-4" />
     )}
     {saved ? 'Saved!' : 'Save Schedule'}
    </button>
   </div>

   {error && (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
     <div className="flex-1">{error}</div>
     <button
      onClick={() => void load()}
      className="ml-2 text-xs font-medium text-red-700 underline hover:no-underline"
     >
      Retry
     </button>
    </div>
   )}

   {/* Slot Legend */}
   <div className="flex flex-wrap gap-4">
    {SLOTS.map((slot) => (
     <div key={slot.key} className="flex items-center gap-2 text-sm text-surface-600">
      <span>{slot.icon}</span>
      <span className="font-medium">{slot.label}</span>
      <span className="text-xs text-surface-400">({slot.time})</span>
     </div>
    ))}
   </div>

   {/* Schedule Grid */}
   <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
    <div className="hidden sm:grid grid-cols-5 gap-4 px-5 py-3 bg-surface-50 border-b border-surface-100">
     <div className="col-span-1 text-xs font-semibold text-surface-500 uppercase tracking-wider">Day</div>
     {SLOTS.map((slot) => (
      <div key={slot.key} className="col-span-1 text-xs font-semibold text-surface-500 uppercase tracking-wider text-center">
       {slot.label}
       <span className="block text-xs font-normal text-surface-400">{slot.time}</span>
      </div>
     ))}
     <div className="col-span-1 text-xs font-semibold text-surface-500 uppercase tracking-wider text-center">All Day</div>
    </div>

    <div className="divide-y divide-surface-50">
     {DAYS.map((day) => {
      const d = availability[day] ?? { morning: false, afternoon: false, evening: false };
      const allOn = d.morning && d.afternoon && d.evening;
      const anyOn = d.morning || d.afternoon || d.evening;

      return (
       <div key={day} className="px-5 py-4">
        <div className="hidden sm:grid grid-cols-5 gap-4 items-center">
         <div className="col-span-1">
          <span className={`text-sm font-medium ${anyOn ? 'text-surface-800' : 'text-surface-400'}`}>
           {day}
          </span>
         </div>
         {SLOTS.map((slot) => (
          <div key={slot.key} className="col-span-1 flex justify-center">
           <button
            onClick={() => toggleSlot(day, slot.key)}
            className={`w-full max-w-[120px] py-2.5 rounded-lg text-xs font-medium transition-all ${
             d[slot.key]
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-surface-100 text-surface-400 hover:bg-surface-200'
            }`}
           >
            {d[slot.key] ? 'Available' : 'Off'}
           </button>
          </div>
         ))}
         <div className="col-span-1 flex justify-center">
          <button
           onClick={() => toggleDay(day)}
           className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
            allOn
             ? 'bg-tulsi-green-dark text-white'
             : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
           }`}
          >
           {allOn ? 'All On' : 'Enable All'}
          </button>
         </div>
        </div>

        <div className="sm:hidden">
         <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-semibold ${anyOn ? 'text-surface-800' : 'text-surface-400'}`}>
           {day}
          </span>
          <button
           onClick={() => toggleDay(day)}
           className={`px-3 py-1 rounded-full text-xs font-medium ${
            allOn ? 'bg-tulsi-green-dark text-white' : 'bg-surface-100 text-surface-500'
           }`}
          >
           {allOn ? 'All On' : 'Enable All'}
          </button>
         </div>
         <div className="flex gap-2">
          {SLOTS.map((slot) => (
           <button
            key={slot.key}
            onClick={() => toggleSlot(day, slot.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
             d[slot.key] ? 'bg-purple-600 text-white' : 'bg-surface-100 text-surface-400'
            }`}
           >
            {slot.icon} {slot.label}
           </button>
          ))}
         </div>
        </div>
       </div>
      );
     })}
    </div>
   </div>

   <div className="bg-purple-50 rounded-xl p-4 flex items-start gap-3">
    <Clock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
    <div className="text-sm text-purple-800">
     <p className="font-medium">How it works</p>
     <p className="text-purple-600 mt-1">
      Devotees can book consultations only during your available slots. Each slot represents a time window
      when you accept new bookings. You can update this schedule anytime.
     </p>
    </div>
   </div>
  </div>
 );
}
