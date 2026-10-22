'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import DarshanScheduleRemindButton from './DarshanScheduleRemindButton';
import { darshanScheduleRows, type DarshanScheduleRow } from '../lib/darshan-schedule';

/**
 * Today's aarti table for /darshan.
 *
 * LIVE / Completed / Upcoming depends on the IST clock, so it is graded in the visitor's
 * browser after load. The page itself is prerendered (a per-request render would blow the
 * Cloudflare Worker's 10 ms CPU budget). Until the clock has been read the status cell is
 * left empty rather than showing a build-time guess, which would be wrong for 23 h a day.
 */
export default function DarshanScheduleTable({ initialRows }: { initialRows: DarshanScheduleRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    const grade = () => {
      setRows(darshanScheduleRows());
      setGraded(true);
    };
    grade();
    const timer = window.setInterval(grade, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[var(--color-border)] text-sm font-semibold text-surface-400">
        <div className="col-span-2">Time</div>
        <div className="col-span-4">Temple</div>
        <div className="col-span-3">Event</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1"></div>
      </div>

      {rows.map((row, i) => {
        const reminderId = `schedule:${row.time}:${row.temple}:${row.event}`;
        const status = graded ? row.status : null;
        return (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 border-b border-[var(--color-border)]/50 last:border-0 text-sm items-center hover:bg-surface-200/30 transition-colors"
          >
            <div className="md:col-span-2 text-surface-500 font-medium">
              <span className="md:hidden text-surface-500 text-xs mr-2">Time:</span>
              {row.time}
            </div>
            <div className="md:col-span-4 text-surface-800 font-medium">
              <span className="md:hidden text-surface-500 text-xs mr-2">Temple:</span>
              {row.temple}
            </div>
            <div className="md:col-span-3 text-surface-400">
              <span className="md:hidden text-surface-500 text-xs mr-2">Event:</span>
              {row.event}
            </div>
            <div className="md:col-span-2">
              {status === 'live' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                  LIVE
                </span>
              ) : status === 'completed' ? (
                <span className="text-xs text-surface-600">Completed</span>
              ) : status === 'upcoming' ? (
                <span className="text-xs text-surface-500">Upcoming</span>
              ) : null}
            </div>
            <div className="md:col-span-1 md:text-right">
              {status === 'live' ? (
                <a
                  href={row.href}
                  className="text-saffron-400 hover:text-saffron-300 inline-flex"
                  aria-label={`Watch ${row.temple} ${row.event} now`}
                >
                  <Play className="w-4 h-4" />
                </a>
              ) : status === 'upcoming' ? (
                <DarshanScheduleRemindButton reminderId={reminderId} label={`${row.temple} ${row.event}`} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
