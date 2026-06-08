'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * CategoryStackLift — scroll-linked per-card lift + scale + fade.
 * Same StickyHeadlinePin physics curve, applied per card via direct
 * scroll-position binding (not IntersectionObserver one-shot). Smoother
 * because scrolling back and forth re-runs the curve.
 *
 * Per-card math:
 *   progress = clamp(0, (viewportHeight - cardTop) / 400, 1)
 *   eased = 1 - (1-progress)^3   (ease-out cubic)
 *   opacity = eased
 *   translateY = (1 - eased) * 32px
 *   scale = 0.96 + eased * 0.04
 *
 * Children must mark each card with data-card attribute.
 * prefers-reduced-motion → skip animation, render cards in final state.
 */

type Props = {
  children: ReactNode;
  className?: string;
};

export default function CategoryStackLift({ children, className }: Props): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.querySelectorAll<HTMLElement>('[data-card]').forEach((c) => {
        c.style.opacity = '1';
        c.style.transform = 'translate3d(0,0,0) scale(1)';
      });
      return;
    }

    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
    if (cards.length === 0) return;

    // Initial state — render hidden so first paint matches the curve start.
    cards.forEach((c) => {
      c.style.opacity = '0';
      c.style.transform = 'translate3d(0, 32px, 0) scale(0.96)';
      c.style.willChange = 'opacity, transform';
    });

    let rafId: number | null = null;

    const tick = (): void => {
      rafId = null;
      const vh = window.innerHeight;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh - rect.top) / 400));
        const eased = 1 - Math.pow(1 - p, 3);
        card.style.opacity = String(eased);
        card.style.transform = `translate3d(0, ${(1 - eased) * 32}px, 0) scale(${(0.96 + eased * 0.04).toFixed(4)})`;
      });
    };

    const onScroll = (): void => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
