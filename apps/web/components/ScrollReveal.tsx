'use client';

import { useEffect } from 'react';

/**
 * Scroll-driven reveal + parallax + counter orchestration.
 *
 * Perf notes:
 * - All observers share a single rAF tick (the "ticking" flag).
 * - Parallax is gated by a second IntersectionObserver — off-screen elements
 * never get transform writes, avoiding layout thrash from getBoundingClientRect.
 * - Scroll handler is passive + rAF-throttled (one write per frame max).
 * - We query the DOM once per mount; observers self-unobserve after first reveal.
 */
export default function ScrollReveal({ children }: { children: React.ReactNode }) {
 useEffect(() => {
 const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

 // ─── 1. Reveal elements on scroll ─────────────────────────────────
 const revealObserver = new IntersectionObserver(
 (entries) => {
 for (const entry of entries) {
 if (entry.isIntersecting) {
 entry.target.classList.add('is-visible');
 revealObserver.unobserve(entry.target);
 }
 }
 },
 { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
 );

 // ─── 2. Text highlight on scroll ──────────────────────────────────
 const highlightObserver = new IntersectionObserver(
 (entries) => {
 for (const entry of entries) {
 if (entry.isIntersecting) {
 entry.target.classList.add('is-visible');
 highlightObserver.unobserve(entry.target);
 }
 }
 },
 { threshold: 0.5 }
 );

 // ─── 3. Counter animation — animates numbers on scroll ────────────
 const counterObserver = new IntersectionObserver(
 (entries) => {
 for (const entry of entries) {
 if (entry.isIntersecting) {
 const el = entry.target as HTMLElement;
 const target = el.dataset.counterTarget || el.textContent || '0';
 animateCounter(el, target);
 counterObserver.unobserve(el);
 }
 }
 },
 { threshold: 0.3 }
 );

 function animateCounter(el: HTMLElement, target: string) {
 if (prefersReducedMotion) { el.textContent = target; return; }

 const match = target.match(/^([₹$]?)(\d+(?:\.\d+)?)(.*)/);
 if (!match) { el.textContent = target; return; }

 const [, prefix = '', numStr = '0', suffix = ''] = match;
 const end = parseFloat(numStr);
 const duration = 1200;
 const startTime = performance.now();

 function tick(now: number) {
 const elapsed = now - startTime;
 const progress = Math.min(elapsed / duration, 1);
 const eased = 1 - Math.pow(1 - progress, 3);
 const current = eased * end;

 el.textContent = `${prefix}${current % 1 === 0 || progress < 1 ? Math.round(current) : current.toFixed(1)}${suffix}`;

 if (progress < 1) requestAnimationFrame(tick);
 else el.textContent = target;
 }
 requestAnimationFrame(tick);
 }

 // ─── 4. Parallax — scroll-linked Y offset, gated by visibility ───
 // Only apply transforms to elements currently near the viewport.
 // Off-screen parallax elements are skipped entirely.
 type ParallaxEntry = { el: HTMLElement; speed: number; visible: boolean };
 const parallaxEntries: ParallaxEntry[] = [];

 if (!prefersReducedMotion) {
 document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
 const speed = parseFloat(el.dataset.parallax || '0.15');
 parallaxEntries.push({ el, speed, visible: false });
 });
 }

 // Toggle visibility when parallax element approaches viewport (200px buffer).
 const parallaxVisibilityObserver = new IntersectionObserver(
 (entries) => {
 for (const entry of entries) {
 const hit = parallaxEntries.find((p) => p.el === entry.target);
 if (hit) hit.visible = entry.isIntersecting;
 }
 },
 { rootMargin: '200px 0px 200px 0px', threshold: 0 }
 );

 for (const { el } of parallaxEntries) parallaxVisibilityObserver.observe(el);

 let ticking = false;
 function updateParallax() {
 const vh = window.innerHeight;
 for (const entry of parallaxEntries) {
 if (!entry.visible) continue;
 const rect = entry.el.getBoundingClientRect();
 const centerOffset = rect.top + rect.height / 2 - vh / 2;
 entry.el.style.transform = `translate3d(0, ${centerOffset * entry.speed * -1}px, 0)`;
 }
 }

 // ─── 5. Scroll progress bar ──────────────────────────────────────
 const progressBar = document.querySelector('[data-scroll-progress]') as HTMLElement | null;
 function updateProgress() {
 if (!progressBar) return;
 const scrollTop = window.scrollY;
 const docHeight = document.documentElement.scrollHeight - window.innerHeight;
 const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
 progressBar.style.transform = `scaleX(${progress})`;
 }

 // ─── Single rAF-throttled scroll tick ────────────────────────────
 function onScroll() {
 if (ticking) return;
 ticking = true;
 requestAnimationFrame(() => {
 updateParallax();
 updateProgress();
 ticking = false;
 });
 }

 // ─── Wire up ──────────────────────────────────────────────────────
 document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));
 document.querySelectorAll('.text-highlight').forEach((el) => highlightObserver.observe(el));
 document.querySelectorAll('[data-counter]').forEach((el) => counterObserver.observe(el));

 window.addEventListener('scroll', onScroll, { passive: true });
 // Initial positions (wrapped in rAF so it batches with first paint).
 requestAnimationFrame(() => { updateParallax(); updateProgress(); });

 return () => {
 revealObserver.disconnect();
 highlightObserver.disconnect();
 counterObserver.disconnect();
 parallaxVisibilityObserver.disconnect();
 window.removeEventListener('scroll', onScroll);
 };
 }, []);

 return <>{children}</>;
}
