'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ParallaxLayerProps {
  children: ReactNode;
  speed?: number;
  className?: string;
  maxOffset?: number;
}

export default function ParallaxLayer({
  children,
  speed = 0.15,
  className,
  maxOffset = 80,
}: ParallaxLayerProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);
  const reduced = useRef<boolean>(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mql.matches;
    if (reduced.current) {
      node.style.transform = 'translate3d(0,0,0)';
      return;
    }

    const clamp = (v: number, lo: number, hi: number): number =>
      Math.max(lo, Math.min(hi, v));

    const update = (): void => {
      frame.current = null;
      const rect = node.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const scrollOffset = viewportCenter - elementCenter;
      const y = clamp(scrollOffset * speed, -maxOffset, maxOffset);
      node.style.transform = `translate3d(0, ${y}px, 0)`;
    };

    const onScroll = (): void => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [speed, maxOffset]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
