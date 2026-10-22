'use client';

import { useEffect, useState } from 'react';
import { Bell, Calendar } from 'lucide-react';
import {
  currentAartiState,
  getScheduleForTemple,
  nextAartiLabel,
  nowMinutesIST,
  type AartiSlot,
} from '../lib/aarti-schedules';

function formatTime12h(time24: string): string {
  const [hStr, m] = time24.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m ?? '00'} ${ampm}`;
}

function classifySlot(slot: AartiSlot, nowMin: number): 'live' | 'completed' | 'upcoming' {
  if (nowMin >= slot.minutes && nowMin < slot.minutes + slot.durationMin) return 'live';
  if (nowMin >= slot.minutes + slot.durationMin) return 'completed';
  return 'upcoming';
}

export interface FallbackScheduleRow {
  time: string;
  event: string;
  status: string;
}

const LIVE_PILL = (
  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
    LIVE
  </span>
);

const REMIND = (
  <button className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-saffron-400 transition-colors">
    <Bell className="w-3.5 h-3.5" />
    Remind
  </button>
);

/**
 * "Today's Aarti Schedule" card of /darshan/[id].
 *
 * The slot list is static per temple; which slot is LIVE depends on the IST clock, so it is
 * resolved in the browser after load (the page is prerendered, see lib/darshan-client.ts).
 * Before the clock is read no slot is marked, which is truthful, instead of showing the
 * build moment's state.
 */
export default function DarshanAartiSchedule({
  templeSlugs,
  fallbackSchedule,
}: {
  templeSlugs: string[];
  fallbackSchedule: FallbackScheduleRow[];
}) {
  const schedule = templeSlugs.map((s) => getScheduleForTemple(s)).find(Boolean) ?? null;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const aartiNow = schedule && now ? currentAartiState(schedule.templeSlug, now) : null;
  const nowMin = now ? nowMinutesIST(now) : null;

  return (
    <div className="bg-surface-800 rounded-xl p-6 border border-surface-700">
      <div className="flex items-start justify-between mb-4 gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-saffron-400" />
          Today&rsquo;s Aarti Schedule
        </h2>
        {aartiNow && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
              aartiNow.current
                ? 'text-red-400 bg-red-400/10 border border-red-400/30'
                : 'text-saffron-300 bg-saffron-400/10 border border-saffron-400/30'
            }`}
          >
            {aartiNow.current && <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />}
            {nextAartiLabel(aartiNow)}
          </span>
        )}
      </div>
      <div className="space-y-0">
        {schedule
          ? schedule.slots.map((slot) => {
              const status = nowMin === null ? null : classifySlot(slot, nowMin);
              return (
                <div
                  key={slot.time}
                  className={`flex items-center gap-4 py-3 border-b border-surface-700/50 last:border-0 ${
                    status === 'live' ? 'bg-red-500/5 -mx-3 px-3 rounded' : ''
                  }`}
                >
                  <span className="text-sm text-surface-400 font-medium w-24 shrink-0">{formatTime12h(slot.time)}</span>
                  <span className="text-sm text-white flex-1">{slot.event}</span>
                  <div>
                    {status === 'live' ? (
                      LIVE_PILL
                    ) : status === 'completed' ? (
                      <span className="text-xs text-surface-600">Completed</span>
                    ) : status === 'upcoming' ? (
                      REMIND
                    ) : null}
                  </div>
                </div>
              );
            })
          : fallbackSchedule.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-surface-700/50 last:border-0"
              >
                <span className="text-sm text-surface-400 font-medium w-20 shrink-0">{item.time}</span>
                <span className="text-sm text-white flex-1">{item.event}</span>
                <div>
                  {item.status === 'live' ? (
                    LIVE_PILL
                  ) : item.status === 'completed' ? (
                    <span className="text-xs text-surface-600">Completed</span>
                  ) : (
                    REMIND
                  )}
                </div>
              </div>
            ))}
      </div>
      {schedule && (
        <p className="mt-3 text-xs text-surface-500">
          Schedule shown in IST. Slots auto-classify based on current Indian Standard Time.
        </p>
      )}
    </div>
  );
}
