'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * FadeScaleReveal — premium scroll-triggered reveal extracted from
 * StickyHeadlinePin's fade+scale+translateY curve. Reads as Apple-grade.
 *
 * Behavior:
 *  - IntersectionObserver fires at 25% visibility (single-fire)
 *  - Element animates opacity 0→1, scale 0.94→1, translateY 24px→0
 *  - Cubic-bezier(0.16, 1, 0.3, 1) ease-out-expo (Apple signature)
 *  - Duration 800ms (slower than TextReveal 600ms — feels weightier)
 *  - prefers-reduced-motion → instant reveal
 *
 * Use cases:
 *  - Section H2 headlines (drop-in replace for ScrambleReveal)
 *  - Subtext paragraphs that should "settle into place"
 *  - Hero badge chips, trust signals
 *
 * Props:
 *  - as: tag name (default 'div')
 *  - delay: ms before animation starts (for cascading multi-element groups)
 *  - className: forwarded to the rendered element
 */

type Props = {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span' | 'section';
  className?: string;
  delay?: number;
};

export default function FadeScaleReveal({
  children,
  as: Tag = 'div',
  className,
  delay = 0,
}: Props): JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: [0.25] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const style: React.CSSProperties = {
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 24px, 0) scale(0.94)',
    transition: `opacity 800ms ${easing} ${delay}ms, transform 800ms ${easing} ${delay}ms`,
    willChange: 'opacity, transform',
  };

  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement & HTMLParagraphElement & HTMLDivElement & HTMLSpanElement>}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
