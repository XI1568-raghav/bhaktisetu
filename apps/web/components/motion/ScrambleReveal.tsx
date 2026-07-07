'use client';

import { useEffect, useMemo, useRef, useState, type JSX } from 'react';

/**
 * ScrambleReveal — Apple-style character-scramble that resolves into final
 * text on scroll-in. Each char cycles through random glyphs (~600ms) then
 * snaps to final character. Stagger across chars produces the "text snaps
 * together" feel.
 *
 * Implementation:
 *  - IntersectionObserver fires once at 30% visibility threshold
 *  - useRef holds per-char animation timers (cleanup on unmount)
 *  - requestAnimationFrame loop swaps random char ~60ms/frame until lock-time
 *  - lock-time per char = base + (charIndex * stagger)
 *
 * Accessibility:
 *  - Full text in aria-label, per-char spans aria-hidden
 *  - prefers-reduced-motion → skip scramble, reveal final text instantly
 */

const SCRAMBLE_CHARS = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789';

type Props = {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  className?: string;
  /** Per-char unlock stagger in ms. Default 35 (Apple-ish). */
  stagger?: number;
  /** Total scramble duration per char before lock, in ms. */
  duration?: number;
};

export default function ScrambleReveal({
  children,
  as: Tag = 'h2',
  className,
  stagger = 35,
  duration = 600,
}: Props): JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [chars, setChars] = useState<string[]>(() => children.split(''));

  const finalChars = useMemo(() => children.split(''), [children]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect reduced-motion preference.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setChars(finalChars);
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setChars(finalChars);
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: [0.3] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [finalChars]);

  useEffect(() => {
    if (!revealed) return;
    const startTime = performance.now();
    let rafId: number;

    const tick = (): void => {
      const elapsed = performance.now() - startTime;
      const next = finalChars.map((finalChar, i) => {
        // Preserve whitespace + punctuation — don't scramble them.
        if (/\s/.test(finalChar) || /[.,;:!?·—()-]/.test(finalChar)) return finalChar;
        const lockTime = i * stagger + duration;
        if (elapsed >= lockTime) return finalChar;
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] ?? finalChar;
      });
      setChars(next);
      // All chars locked? Stop ticking.
      if (elapsed > finalChars.length * stagger + duration) return;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [revealed, finalChars, stagger, duration]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
      aria-label={children}
      className={className}
    >
      <span aria-hidden="true">{chars.join('')}</span>
    </Tag>
  );
}
