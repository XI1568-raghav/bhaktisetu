'use client';

import { useEffect } from 'react';

export default function ScrollReveal({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ─── 1. Reveal elements on scroll ─────────────────────────────────
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    // ─── 2. Text highlight on scroll ──────────────────────────────────
    const highlightObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            highlightObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    // ─── 3. Counter animation — animates numbers on scroll ────────────
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = el.dataset.counterTarget || el.textContent || '0';
            animateCounter(el, target);
            counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );

    function animateCounter(el: HTMLElement, target: string) {
      if (prefersReducedMotion) { el.textContent = target; return; }

      // Extract numeric part and suffix (e.g. "50K+" → 50, "K+")
      const match = target.match(/^([₹$]?)(\d+(?:\.\d+)?)(.*)/);
      if (!match) { el.textContent = target; return; }

      const [, prefix = '', numStr = '0', suffix = ''] = match;
      const end = parseFloat(numStr);
      const duration = 1200;
      const startTime = performance.now();

      function tick(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * end;

        el.textContent = `${prefix}${current % 1 === 0 || progress < 1 ? Math.round(current) : current.toFixed(1)}${suffix}`;

        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target; // Ensure exact final value
      }
      requestAnimationFrame(tick);
    }

    // ─── 4. Parallax — scroll-linked Y offset ────────────────────────
    const parallaxElements: { el: HTMLElement; speed: number }[] = [];
    document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax || '0.15');
      parallaxElements.push({ el, speed });
    });

    let ticking = false;
    function updateParallax() {
      if (prefersReducedMotion || parallaxElements.length === 0) return;
      const scrollY = window.scrollY;

      for (const { el, speed } of parallaxElements) {
        const rect = el.getBoundingClientRect();
        const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2;
        el.style.transform = `translate3d(0, ${centerOffset * speed * -1}px, 0)`;
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }

    // ─── 5. Scroll progress bar ──────────────────────────────────────
    const progressBar = document.querySelector('[data-scroll-progress]') as HTMLElement;
    function updateProgress() {
      if (!progressBar) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / docHeight, 1);
      progressBar.style.transform = `scaleX(${progress})`;
    }

    // ─── Wire up ──────────────────────────────────────────────────────
    document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));
    document.querySelectorAll('.text-highlight').forEach((el) => highlightObserver.observe(el));
    document.querySelectorAll('[data-counter]').forEach((el) => counterObserver.observe(el));

    const scrollHandler = () => { onScroll(); updateProgress(); };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    updateParallax(); // Initial position

    return () => {
      revealObserver.disconnect();
      highlightObserver.disconnect();
      counterObserver.disconnect();
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return <>{children}</>;
}
