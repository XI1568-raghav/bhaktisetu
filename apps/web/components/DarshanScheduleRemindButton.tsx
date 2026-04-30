'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

const REMINDERS_KEY = 'poojly_darshan_reminders';

function readReminders(): string[] {
 if (typeof window === 'undefined') return [];
 try {
  const raw = window.localStorage.getItem(REMINDERS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
 } catch {
  return [];
 }
}

function writeReminders(ids: string[]) {
 try {
  window.localStorage.setItem(REMINDERS_KEY, JSON.stringify(ids));
 } catch {
  /* no-op */
 }
}

export default function DarshanScheduleRemindButton({
 reminderId,
 label,
}: {
 reminderId: string;
 label: string;
}) {
 const [reminded, setReminded] = useState(false);
 const [toast, setToast] = useState<string | null>(null);

 useEffect(() => {
  setReminded(readReminders().includes(reminderId));
 }, [reminderId]);

 useEffect(() => {
  if (!toast) return;
  const t = setTimeout(() => setToast(null), 3000);
  return () => clearTimeout(t);
 }, [toast]);

 function toggle() {
  const current = readReminders();
  const next = current.includes(reminderId)
   ? current.filter((s) => s !== reminderId)
   : [...current, reminderId];
  writeReminders(next);
  setReminded(next.includes(reminderId));
  setToast(next.includes(reminderId) ? `Reminder set for ${label}` : `Reminder cleared for ${label}`);
 }

 return (
  <>
   <button
    type="button"
    onClick={toggle}
    aria-pressed={reminded}
    aria-label={reminded ? `Cancel reminder for ${label}` : `Set reminder for ${label}`}
    className={`transition-colors ${
     reminded ? 'text-saffron-600 hover:text-saffron-700' : 'text-surface-600 hover:text-surface-400'
    }`}
   >
    <Bell className={`w-4 h-4 ${reminded ? 'fill-saffron-500' : ''}`} />
   </button>
   {toast && (
    <div
     role="status"
     aria-live="polite"
     className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-surface-800/95 px-4 py-2 text-sm font-medium text-white shadow-warm-md"
    >
     {toast}
    </div>
   )}
  </>
 );
}
