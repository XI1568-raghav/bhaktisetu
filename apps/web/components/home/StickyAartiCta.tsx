'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame, X, ArrowRight } from 'lucide-react';

type AartiSlot = { label: string; hour: number; minute: number };

const AARTI_SLOTS: AartiSlot[] = [
  { label: 'Mangal Aarti', hour: 4, minute: 30 },
  { label: 'Shringar Aarti', hour: 7, minute: 0 },
  { label: 'Sandhya Aarti', hour: 18, minute: 0 },
  { label: 'Shayan Aarti', hour: 21, minute: 0 },
];

const DISMISS_KEY = 'darshya:sticky-aarti-cta:dismissed';
const SHOW_AFTER_PX = 800;

function nowInIST(): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

function nextAartiFrom(now: Date): { label: string; target: Date } {
  for (const slot of AARTI_SLOTS) {
    const candidate = new Date(now);
    candidate.setHours(slot.hour, slot.minute, 0, 0);
    if (candidate.getTime() > now.getTime()) {
      return { label: slot.label, target: candidate };
    }
  }
  const first = AARTI_SLOTS[0]!;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(first.hour, first.minute, 0, 0);
  return { label: first.label, target: tomorrow };
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
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

  useEffect(() => {
    // Visibility-pause: only tick when tab is visible (Phase D P1 #8 battery drain fix).
    let id: number | null = null;
    const start = (): void => {
      if (id !== null) return;
      id = window.setInterval(() => setTick((t) => t + 1), 1000);
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
  }, []);

  const { label, countdown } = useMemo(() => {
    const now = nowInIST();
    const next = nextAartiFrom(now);
    return { label: next.label, countdown: formatCountdown(next.target.getTime() - now.getTime()) };
    // tick forces recompute every second
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

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

  return (
    <div
      className={`pointer-events-none fixed bottom-6 right-6 z-40 hidden md:block transition-all duration-500 ease-in ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <Link
        href="/today"
        className="pointer-events-auto group inline-flex h-14 items-center gap-3 rounded-full px-5 text-white shadow-lg shadow-black/10 ring-1 ring-black/5 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{ backgroundColor: 'var(--color-primary, #ea580c)' }}
        aria-label={`${label} starts in ${countdown}, open today schedule`}
      >
        <Flame className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight">
          {label} starts in {countdown}
        </span>
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
