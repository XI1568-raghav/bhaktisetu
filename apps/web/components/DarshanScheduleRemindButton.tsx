'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';

/*
 * NOTIF-15 — this control used to be a bell that announced "Reminder set for
 * <slot>". It never set one. All it does, and all it has ever done, is push an
 * id into the localStorage array below: no API call, no push subscription, no
 * scheduled row. The server side needed to deliver one does exist in part
 * (PushSubscription, lib/fcm.ts, the master-cron notification pipeline), but
 * there is no DarshanReminder model and no endpoint to write to, so nothing
 * downstream could ever fire.
 *
 * The wording and the icon now describe the real behaviour — a device-local
 * bookmark. The storage key is unchanged on purpose: renaming a poojly_* key
 * would silently drop every slot devotees have already saved.
 */
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
  setToast(
   next.includes(reminderId)
    ? `Saved ${label} on this device`
    : `Removed ${label} from your saved slots`,
  );
 }

 return (
  <>
   <button
    type="button"
    onClick={toggle}
    aria-pressed={reminded}
    aria-label={
     reminded ? `Remove ${label} from your saved slots` : `Save ${label} on this device`
    }
    title="Saved on this device. Darshya does not send a notification for this yet."
    className={`transition-colors ${
     reminded ? 'text-saffron-600 hover:text-saffron-700' : 'text-surface-600 hover:text-surface-400'
    }`}
   >
    <Bookmark className={`w-4 h-4 ${reminded ? 'fill-saffron-500' : ''}`} />
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
