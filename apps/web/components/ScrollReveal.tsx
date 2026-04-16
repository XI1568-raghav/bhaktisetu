'use client';

import { useEffect } from 'react';

export default function ScrollReveal({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Reveal elements on scroll
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

    // Text highlight on scroll
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

    document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));
    document.querySelectorAll('.text-highlight').forEach((el) => highlightObserver.observe(el));

    // Scroll progress bar (if exists)
    const progressBar = document.querySelector('[data-scroll-progress]') as HTMLElement;
    if (progressBar) {
      const updateProgress = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min(scrollTop / docHeight, 1);
        progressBar.style.transform = `scaleX(${progress})`;
      };
      window.addEventListener('scroll', updateProgress, { passive: true });
      return () => {
        revealObserver.disconnect();
        highlightObserver.disconnect();
        window.removeEventListener('scroll', updateProgress);
      };
    }

    return () => {
      revealObserver.disconnect();
      highlightObserver.disconnect();
    };
  }, []);

  return <>{children}</>;
}
