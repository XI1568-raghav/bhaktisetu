'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';

export interface Milestone {
  when: string;
  phase: string;
  title: string;
  body: string;
  status: 'shipped' | 'now' | 'planned' | 'vision';
  icon: LucideIcon;
  accent: string;
  bgFrom: string;
  bgTo: string;
}

interface Props {
  milestones: Milestone[];
}

/**
 * Sticky-pin horizontal roadmap rail.
 *
 * The outer wrapper is tall (N * 90vh). The inner is sticky at 100vh. As the
 * user scrolls vertically, the horizontal card row translates left and the
 * active card snaps to the centered playhead. Background hue cross-fades
 * between phase-tinted gradients.
 *
 * Mobile (< md): renders a compact vertical stack instead, with the active
 * card determined by IntersectionObserver. The horizontal pin would fight the
 * native scroll on small screens.
 */
export default function RoadmapRail({ milestones }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ticking = false;
    function compute() {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = rect.height - vh;
      if (span <= 0) {
        setProgress(0);
        setActiveIdx(0);
        return;
      }
      const scrolled = Math.max(0, Math.min(span, -rect.top));
      const p = scrolled / span;
      setProgress(p);
      const idx = Math.min(
        milestones.length - 1,
        Math.round(p * (milestones.length - 1))
      );
      setActiveIdx(idx);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    }
    if (prefersReducedMotion) {
      setProgress(0);
      setActiveIdx(0);
      return;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    compute();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [milestones.length]);

  const N = milestones.length;
  const cardWidthRem = 24;
  const gapRem = 4;
  const stride = cardWidthRem + gapRem;
  const translateRem = -(activeIdx * stride);

  const active = milestones[activeIdx]!;
  const bgGradient = `radial-gradient(ellipse 80% 60% at 50% 35%, ${active.bgFrom}, ${active.bgTo})`;

  const overallPct = Math.round(progress * 100);

  return (
    <>
      {/* ─── Desktop / tablet: sticky-pin horizontal rail ───────────── */}
      <div
        ref={sectionRef}
        className="relative hidden md:block"
        style={{ height: `${N * 85}vh` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 transition-[background] duration-700 ease-out"
            style={{ background: bgGradient }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[#faf9f6]/40"
          />

          <div className="absolute top-10 left-0 right-0 z-20 px-10">
            <div className="mx-auto flex max-w-6xl items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-saffron-700">
                  The journey · {overallPct}%
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-surface-900">
                  {active.phase}
                  <span className="ml-3 text-surface-400">·</span>
                  <span className="ml-3 text-surface-500">{active.when}</span>
                </h2>
              </div>
              <div className="hidden items-center gap-2 text-[11px] font-medium text-surface-500 lg:flex">
                <span className="inline-block h-2 w-2 rounded-full bg-saffron-500" />
                scroll to walk through
              </div>
            </div>
          </div>

          {/* horizontal rail */}
          <div className="absolute inset-0 flex items-center">
            <div
              className="relative flex will-change-transform"
              style={{
                gap: `${gapRem}rem`,
                paddingLeft: `calc(50vw - ${cardWidthRem / 2}rem)`,
                paddingRight: `calc(50vw - ${cardWidthRem / 2}rem)`,
                transform: `translateX(${translateRem}rem)`,
                transition: 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {milestones.map((m, i) => (
                <RailCard
                  key={m.when}
                  m={m}
                  active={i === activeIdx}
                  past={i < activeIdx}
                  widthRem={cardWidthRem}
                  index={i}
                  total={N}
                />
              ))}
            </div>
          </div>

          {/* playhead pulse */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: `${cardWidthRem + 1.5}rem`,
              height: '24rem',
            }}
          >
            <div className="absolute inset-x-0 -top-3 flex justify-center">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg"
                style={{ background: active.accent }}
              >
                You are here
              </span>
            </div>
          </div>

          {/* progress dots */}
          <div className="absolute bottom-10 left-0 right-0 z-20">
            <div className="mx-auto flex max-w-4xl items-center justify-center gap-2">
              {milestones.map((m, i) => (
                <button
                  key={m.when}
                  type="button"
                  aria-label={`Jump to ${m.phase}`}
                  onClick={() => jumpToMilestone(sectionRef.current, i, N)}
                  className="group relative flex items-center"
                >
                  <span
                    className="block h-2 rounded-full transition-all duration-300"
                    style={{
                      width: i === activeIdx ? '2.5rem' : '0.5rem',
                      background:
                        i <= activeIdx ? m.accent : 'rgba(120, 100, 80, 0.25)',
                    }}
                  />
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-900 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {m.phase}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 text-center text-[10px] font-medium uppercase tracking-wider text-surface-400">
              click to jump · or just keep scrolling
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile: compact vertical stack ──────────────────────────── */}
      <div className="md:hidden">
        <MobileStack milestones={milestones} />
      </div>
    </>
  );
}

function jumpToMilestone(section: HTMLDivElement | null, idx: number, total: number) {
  if (!section) return;
  const rect = section.getBoundingClientRect();
  const span = rect.height - window.innerHeight;
  const targetProgress = total > 1 ? idx / (total - 1) : 0;
  const targetTop = window.scrollY + rect.top + span * targetProgress;
  window.scrollTo({ top: targetTop, behavior: 'smooth' });
}

function RailCard({
  m,
  active,
  past,
  widthRem,
  index,
  total,
}: {
  m: Milestone;
  active: boolean;
  past: boolean;
  widthRem: number;
  index: number;
  total: number;
}) {
  const Icon = m.icon;
  return (
    <article
      className="shrink-0 rounded-3xl border bg-white p-7 transition-all duration-500 ease-out"
      style={{
        width: `${widthRem}rem`,
        borderColor: active ? `${m.accent}66` : 'rgba(120,100,80,0.14)',
        boxShadow: active
          ? `0 32px 60px -28px ${m.accent}44, 0 0 0 1px ${m.accent}22 inset`
          : '0 1px 2px rgba(0,0,0,0.04)',
        transform: active ? 'scale(1.04)' : past ? 'scale(0.94)' : 'scale(0.94)',
        opacity: active ? 1 : 0.55,
      }}
      aria-current={active ? 'step' : undefined}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: `${m.accent}1a`, color: m.accent }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: `${m.accent}1c`, color: m.accent }}
        >
          {m.phase}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          {m.when}
        </span>
      </div>

      <h3 className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight text-surface-900">
        {m.title}
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-surface-600">
        {m.body}
      </p>

      <StatusPill status={m.status} accent={m.accent} />
    </article>
  );
}

function StatusPill({
  status,
  accent,
}: {
  status: Milestone['status'];
  accent: string;
}) {
  if (status === 'shipped') {
    return (
      <div
        className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: accent }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Shipped
      </div>
    );
  }
  if (status === 'now') {
    return (
      <div
        className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: accent }}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-60"
            style={{ background: accent }}
          />
          <span
            className="relative h-2 w-2 rounded-full"
            style={{ background: accent }}
          />
        </span>
        Shipping now
      </div>
    );
  }
  if (status === 'planned') {
    return (
      <div
        className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: accent }}
      >
        <span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: accent }} />
        Planned
      </div>
    );
  }
  return (
    <div
      className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: accent }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />
      Vision
    </div>
  );
}

function MobileStack({ milestones }: { milestones: Milestone[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = Number((entry.target as HTMLElement).dataset.idx);
            setActiveIdx(i);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    for (const el of refs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-saffron-200 via-saffron-300/50 to-saffron-100"
      />
      <ol className="space-y-5">
        {milestones.map((m, i) => {
          const Icon = m.icon;
          const active = i === activeIdx;
          return (
            <li
              key={m.when}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-idx={i}
              className="relative pl-14"
            >
              <span
                className="absolute left-0 top-2 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[#faf9f6] transition-all"
                style={{
                  borderColor: m.accent,
                  background: active ? m.accent : '#faf9f6',
                  color: active ? '#ffffff' : m.accent,
                }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div
                className="rounded-2xl border bg-white p-5 transition-all"
                style={{
                  borderColor: active ? `${m.accent}55` : 'rgba(120,100,80,0.14)',
                  boxShadow: active
                    ? `0 14px 28px -14px ${m.accent}44`
                    : '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: `${m.accent}1c`, color: m.accent }}
                  >
                    {m.phase}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                    {m.when}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight text-surface-900">
                  {m.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-surface-600">
                  {m.body}
                </p>
                <StatusPill status={m.status} accent={m.accent} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
