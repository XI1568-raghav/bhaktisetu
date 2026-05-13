"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Optional callback fired with the current scroll percent (0-100). */
  onChange?: (percent: number) => void;
}

export function ScrollProgressBar({ onChange }: Props) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const next = total > 0 ? Math.min(100, Math.max(0, (h.scrollTop / total) * 100)) : 0;
      setPct(next);
      onChange?.(next);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onChange]);

  return (
    <div
      className="fixed top-14 left-0 right-0 h-1 bg-transparent z-40 pointer-events-none"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="h-full bg-saffron-500 transition-[width] duration-150"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
