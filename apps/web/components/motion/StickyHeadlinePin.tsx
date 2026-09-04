'use client';

import { useEffect, useRef, useState, type ReactNode, type JSX } from 'react';

/**
 * StickyHeadlinePin — Apple iPhone-page section that pins the headline for
 * 1× viewport while user scrolls, fades it in over first 30% then fades out
 * over last 30%. Body children unaffected.
 *
 * Usage:
 *   <StickyHeadlinePin headline="See divinity. Hear devotion. Feel home.">
 *     <p>Watch live aarti from 200+ temples...</p>
 *   </StickyHeadlinePin>
 *
 * Layout:
 *   - outer h-[200vh] (gives scroll runway)
 *   - inner sticky top-0 h-screen flex center
 *   - headline opacity binds to scroll progress (0 → 1 → 1 → 0)
 *
 * Accessibility: prefers-reduced-motion → static render, no scroll binding.
 */

type Props = {
  headline: string;
  children?: ReactNode;
  className?: string;
};

export default function StickyHeadlinePin({ headline, children, className }: Props): JSX.Element {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedRef.current) {
      setProgress(0.5); // headline fully visible, no animation
      return;
    }

    const outer = outerRef.current;
    if (!outer) return;
    let frame: number | null = null;

    const update = (): void => {
      frame = null;
      const rect = outer.getBoundingClientRect();
      const winH = window.innerHeight;
      // total runway = outer height - one viewport
      const runway = rect.height - winH;
      // distance scrolled into runway
      const scrolled = Math.max(0, -rect.top);
      const p = Math.min(1, scrolled / runway);
      setProgress(p);
    };

    const onScroll = (): void => {
      if (frame !== null) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Opacity curve:
  //   0..0.30 fade-in (0 → 1)
  //   0.30..0.70 hold at 1
  //   0.70..1.0 fade-out (1 → 0)
  let opacity = 1;
  let scale = 1;
  let translateY = 0;
  if (!reducedRef.current) {
    if (progress < 0.3) {
      const t = progress / 0.3;
      opacity = t;
      scale = 0.9 + 0.1 * t;
      translateY = (1 - t) * 40;
    } else if (progress > 0.7) {
      const t = (progress - 0.7) / 0.3;
      opacity = 1 - t;
      scale = 1 - 0.05 * t;
      translateY = -t * 40;
    }
  }

  return (
    <div ref={outerRef} className={`relative h-[180vh] ${className ?? ''}`}>
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-6">
        <h2
          className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-center max-w-[56rem]"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text)',
            opacity,
            transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
            transition: 'none',
            willChange: 'opacity, transform',
          }}
        >
          {headline}
        </h2>
        {children && (
          <div
            className="mt-6 text-base sm:text-lg text-center max-w-2xl"
            style={{ color: 'var(--color-text-muted)', opacity: opacity * 0.9 }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
