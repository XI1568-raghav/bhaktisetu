'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type AsTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p';

interface TextRevealProps {
  children: string;
  as?: AsTag;
  className?: string;
  delay?: number;
  stagger?: number;
}

export default function TextReveal({
  children,
  as = 'p',
  className,
  delay = 0,
  stagger = 60,
}: TextRevealProps): JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);

  const words = useMemo<string[]>(() => children.split(' '), [children]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
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
  }, []);

  const Tag = as;
  const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement & HTMLParagraphElement>}
      aria-label={children}
      className={className}
    >
      {words.map((word, i) => {
        const ms = delay + i * stagger;
        const style: React.CSSProperties = {
          display: 'inline-block',
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0px)' : 'translateY(1rem)',
          transition: `opacity 600ms ${easing} ${ms}ms, transform 600ms ${easing} ${ms}ms`,
          willChange: 'opacity, transform',
        };
        // Space rendered as separate text-node sibling so browser preserves it
        // for line-break + visible inter-word gap. `inline-block` on the span
        // otherwise collapses trailing whitespace inside the box.
        const isLast = i === words.length - 1;
        return (
          <span key={`${word}-${i}`} style={{ display: 'inline' }}>
            <span aria-hidden="true" style={style}>{word}</span>
            {!isLast && ' '}
          </span>
        );
      })}
    </Tag>
  );
}
