'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import Link from 'next/link';
import { Flame, X, ArrowRight } from 'lucide-react';

import { buttonClass } from '../../components/ui/button-recipe';
import { nowMinutesIST } from '../../lib/aarti-schedules';
import { darshanScheduleRows, type DarshanScheduleRow } from '../../lib/darshan-schedule';

/**
 * The globally-mounted aarti reminder.
 *
 * It used to carry its own four-slot timetable (Mangal 04:30 / Shringar 07:00 /
 * Sandhya 18:00 / Shayan 21:00) that belonged to no temple in the product, and
 * it linked at /today — a page with no aarti section on it. So the highest-
 * intent moment in the app, "Sandhya Aarti starts in 00:04:12", was a countdown
 * to an invented slot that landed the devotee somewhere that could not show
 * them an aarti.
 *
 * Nothing new had to be built: lib/aarti-schedules.ts already holds the real
 * per-temple IST schedules (sourced from official temple sites, verified
 * 2026-05) and resolves the live slot, and lib/darshan-schedule.ts already
 * projects them into rows carrying a temple name and an href. That module is
 * the right source rather than AARTI_SCHEDULES directly, because every slug it
 * emits is held to /darshan/[id]'s CHANNEL_BY_SLUG by
 * darshan-schedule-links.test.ts — so this card cannot point at a "Coming
 * soon" panel. Reading AARTI_SCHEDULES raw would let through temples that
 * publish a schedule but have no stream.
 *
 * The old code also re-derived IST by hand and then did the arithmetic on a
 * synthetic LOCAL-time Date (new Date(y, m, d, …) + setHours). When the
 * VIEWER's own DST transition falls between now and the target — a devotee in
 * London at 00:30 IST on 25 Oct, target 04:30 IST — the local clock gains an
 * hour and the countdown overstated by 60 minutes. Everything below stays in
 * minutes-since-IST-midnight, which aarti-schedules.ts:159 derives through an
 * explicit Asia/Kolkata formatter, so there is no local-clock seam to cross.
 */

const DISMISS_KEY = 'darshya:sticky-aarti-cta:dismissed';
const SHOW_AFTER_PX = 800;
const MINUTES_PER_DAY = 24 * 60;

/**
 * How far ahead of a slot the reminder is allowed to appear.
 *
 * The published day has real gaps in it — nothing at all between 12:30 and
 * 18:30 IST, and again between 23:30 and 02:30. A countdown reading "06:12:44"
 * is not a reminder, it is a clock, and the previous version filled those gaps
 * by inventing a slot to count to. Outside the window the card renders nothing.
 */
const LEAD_WINDOW_MIN = 90;

/** Per-second while a countdown is actually on screen. */
const COUNTDOWN_POLL_MS = 1_000;

/**
 * Once a minute the rest of the time. Slot boundaries are minute-granular and
 * this is a 90-minute-lead reminder, so being up to 60s late to appear costs
 * nothing — and this component is mounted on every page behind ConsentGate, so
 * the idle case is the one that has to be cheap.
 */
const IDLE_POLL_MS = 60_000;

type AartiMoment =
  | { kind: 'live'; row: DarshanScheduleRow }
  | { kind: 'soon'; row: DarshanScheduleRow; secondsToStart: number };

/**
 * Which published aarti, if any, this devotee should be told about right now.
 * Returns null when nothing is live and nothing is close — there is no third
 * state in which a slot gets made up.
 */
function resolveMoment(now: Date): AartiMoment | null {
  // Sorted ascending by minutesIST — darshan-schedule.ts:88.
  const rows = darshanScheduleRows(now);

  const live = rows.find((r) => r.status === 'live');
  if (live) return { kind: 'live', row: live };

  const upcoming = rows.filter((r) => r.status === 'upcoming');
  const next = upcoming[0] ?? rows[0];
  if (!next) return null;

  const nowMin = nowMinutesIST(now);
  const minutesToStart =
    upcoming.length > 0
      ? next.minutesIST - nowMin
      : // Past the last slot of the IST day, wrap to tomorrow's first — the same
        // arithmetic currentAartiState() uses at aarti-schedules.ts:202-204, so
        // both surfaces agree on what "next" means across midnight.
        MINUTES_PER_DAY - nowMin + next.minutesIST;

  if (minutesToStart > LEAD_WINDOW_MIN) return null;

  // nowMinutesIST() is truncated to the minute; the seconds have to come from
  // somewhere else or the countdown would not move. getUTCSeconds() is the
  // right source: IST is a whole-minute offset (UTC+05:30, no DST), so the
  // second within the minute is identical in both zones and no host-local
  // clock is consulted.
  return {
    kind: 'soon',
    row: next,
    secondsToStart: minutesToStart * 60 - now.getUTCSeconds(),
  };
}

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function StickyAartiCta(): JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true);
      }
    } catch {
      /* sessionStorage unavailable, treat as not dismissed */
    }
  }, []);

  useEffect(() => {
    const onScroll = (): void => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const moment = useMemo(() => {
    return resolveMoment(new Date());
    // tick forces recompute on every poll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const pollMs = moment?.kind === 'soon' ? COUNTDOWN_POLL_MS : IDLE_POLL_MS;

  useEffect(() => {
    // Visibility-pause: only tick when tab is visible (Phase D P1 #8 battery drain fix).
    let id: number | null = null;
    const start = (): void => {
      if (id !== null) return;
      id = window.setInterval(() => setTick((t) => t + 1), pollMs);
    };
    const stop = (): void => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [pollMs]);

  const handleDismiss = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (dismissed) return null;
  // Nothing live, nothing close. The card is a real reminder or it is absent;
  // it is never a countdown to a slot no temple published.
  if (!moment) return null;

  const { row } = moment;
  // "live now" is a claim about the temple's published aarti window — the same
  // claim /darshan already makes from this data (nextAartiLabel,
  // aarti-schedules.ts:214) — not a claim about stream health, which this
  // component cannot see.
  const message =
    moment.kind === 'live'
      ? `${row.event} live now at ${row.temple}`
      : `${row.event} at ${row.temple} starts in ${formatCountdown(moment.secondsToStart)}`;

  // TD-07: this card used to sit at bottom-6 right-6, directly on top of the
  // chat launcher at bottom-5 right-5 — two overlays in one band, with the
  // consent bar underneath both, all inside the first 720px screen. It now
  // stacks clear of the 56px launcher instead of sharing its corner.
  return (
    <div
      className={`pointer-events-none fixed bottom-24 right-6 z-40 hidden md:block transition-all duration-500 ease-in ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <Link
        href={row.href}
        className={buttonClass('primary', 'md', 'pointer-events-auto group shadow-lg shadow-black/10 ring-1 ring-black/5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70')}
        aria-label={`${message}, watch the live darshan`}
      >
        <Flame className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight">{message}</span>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Dismiss aarti reminder for this session"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </Link>
    </div>
  );
}
