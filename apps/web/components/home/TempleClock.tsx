'use client';

import { useEffect, useState, type JSX } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { nowMinutesIST } from '../../lib/aarti-schedules';
import { darshanScheduleRows } from '../../lib/darshan-schedule';
import {
  resolveTempleHour,
  minutesUntil,
  formatCountdown,
  type TempleHour,
} from '../../lib/temple-hours';

/**
 * The live line under the hero: which part of the day it is at the temples, and
 * which real aarti is next.
 *
 * WHY IT IS A CLIENT COMPONENT AND NOT SERVER-RENDERED. app/page.tsx sets
 * `export const revalidate = 3600`, so the page is prerendered and cached. A
 * server-side `new Date()` would bake the BUILD's clock into the HTML and serve
 * it for an hour — a devotee at 7pm would be told it is Madhyahna. Everything
 * time-dependent therefore resolves after mount, on the viewer's own tick.
 *
 * WHY IT DOES NOT SHIFT LAYOUT. The wrapper reserves its height from the first
 * server paint (`min-h-[1.5rem]`), so the text arriving at hydration costs no
 * CLS. The hero <h1> above it is the LCP candidate and is untouched — it is
 * never faded, revealed, transformed or deferred, because an opacity-0 LCP
 * candidate delays LCP by definition.
 *
 * WHY THE COUNTDOWN TICKS EVERY 30s AND IS NOT ANNOUNCED. A per-second counter
 * is a per-second re-render for a number nobody reads that precisely, and
 * `aria-live` on a ticking clock is hostile to a screen-reader user — it would
 * interrupt them twice a minute forever. The element is polite-silent by
 * default; a reader gets the value when they navigate to it.
 *
 * The temple and its href come from `darshanScheduleRows`, not from
 * AARTI_SCHEDULES directly, because every slug that module emits is held to
 * /darshan/[id]'s CHANNEL_BY_SLUG by darshan-schedule-links.test.ts. Reading the
 * raw schedules would let through a temple that publishes an aarti time but has
 * no stream, and the link would land on "Coming soon".
 */

const TICK_MS = 30_000;

interface ClockState {
  hourKey: TempleHour;
  hourName: string;
  hourGloss: string;
  event: string;
  temple: string;
  href: string;
  countdown: string;
  live: boolean;
}

function readClock(now: Date): ClockState | null {
  const minutes = nowMinutesIST(now);
  const hour = resolveTempleHour(minutes);
  const rows = darshanScheduleRows(now);
  if (!rows.length) return null;

  // An aarti in progress outranks the next one — "happening now" is the
  // stronger claim, and it is the moment a devotee is most likely to click.
  const liveRow = rows.find((r) => r.status === 'live');
  const nextRow =
    liveRow ??
    rows
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => minutesUntil(minutes, a.minutesIST) - minutesUntil(minutes, b.minutesIST))[0] ??
    // Every slot today is completed: the next one is tomorrow's first, which
    // minutesUntil already resolves correctly by wrapping midnight.
    rows.slice().sort((a, b) => minutesUntil(minutes, a.minutesIST) - minutesUntil(minutes, b.minutesIST))[0];

  if (!nextRow) return null;

  return {
    hourKey: hour.key,
    hourName: hour.name,
    hourGloss: hour.gloss,
    event: nextRow.event,
    temple: nextRow.temple,
    href: nextRow.href,
    live: nextRow.status === 'live',
    countdown: liveRow ? 'now' : formatCountdown(minutesUntil(minutes, nextRow.minutesIST)),
  };
}

export default function TempleClock(): JSX.Element {
  const [clock, setClock] = useState<ClockState | null>(null);

  useEffect(() => {
    const tick = () => setClock(readClock(new Date()));
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="mt-5 min-h-[1.5rem] text-xs"
      style={{ color: 'var(--color-text-muted)' }}
      data-temple-clock
    >
      {clock && (
        <Link
          href={clock.href}
          prefetch={false}
          className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-300"
        >
          <span
            className="inline-flex items-center gap-1.5 font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--tod-dot, var(--color-primary))' }}
            />
            {clock.hourName}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {clock.hourGloss} at the temples
          </span>
          <span aria-hidden="true">—</span>
          <span>
            {clock.event} at {clock.temple}{' '}
            <span className="font-medium" style={{ color: 'var(--color-text)' }}>
              {clock.live ? 'live now' : clock.countdown}
            </span>
          </span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
