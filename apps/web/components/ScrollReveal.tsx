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

 // ─── 6. Sankalp thread — fallback only ───────────────────────────
 /**
  * HOME-SCROLL (2026-09-08). The rail in components/home/SankalpThread.tsx is
  * driven by CSS `animation-timeline: scroll(root block)`, which costs nothing
  * and runs off the main thread. This is the fallback for engines where that
  * timeline never becomes active.
  *
  * It is NOT a support check. `CSS.supports('animation-timeline: scroll()')`
  * returns true in environments where the timeline is still never ticked — a
  * bare control element with a scroll-driven keyframe reported
  * `timeline.currentTime === null` at both ends of the page while a
  * JS-constructed `new ScrollTimeline()` on the same document reported "0%".
  * So the probe below asks the only question that matters: is the animation
  * this element already has actually receiving time? If it is, we write nothing
  * and the compositor keeps the job.
  *
  * The cost when it IS needed is one transform write plus at most one opacity
  * write per knot, inside the rAF tick this file already runs for the progress
  * bar — no new listener, no second rAF.
  */
 const threadFill = document.querySelector('[data-sankalp-fill]') as HTMLElement | null;
 const threadDots = Array.from(
 document.querySelectorAll('[data-sankalp-knot] [data-sankalp-dot]'),
 ) as HTMLElement[];
 const threadStops = threadDots.map((dot) => {
 const at = (dot.closest('[data-sankalp-knot]') as HTMLElement | null)?.style.getPropertyValue('--at');
 return Math.max(0, Math.min(100, parseFloat(at || '100'))) / 100;
 });
 let threadNeedsJs: boolean | null = null;
 let litCount = -1;

 function cssTimelineIsLive(el: HTMLElement): boolean {
 const anims = typeof el.getAnimations === 'function' ? el.getAnimations() : [];
 return anims.some((a) => {
 try {
 return a.timeline != null && a.timeline.currentTime != null;
 } catch {
 return false;
 }
 });
 }

 function updateThread(progress: number) {
 if (!threadFill) return;
 if (threadNeedsJs === null) threadNeedsJs = !cssTimelineIsLive(threadFill);
 if (!threadNeedsJs) return;
 threadFill.style.transform = `scaleY(${progress})`;
 // Only touch the dots when the lit COUNT changes, not every frame.
 let lit = 0;
 for (const stop of threadStops) if (progress >= stop) lit++;
 if (lit === litCount) return;
 litCount = lit;
 threadDots.forEach((dot, i) => {
 dot.style.opacity = progress >= (threadStops[i] ?? 1) ? '1' : '0.28';
 });
 }

 // ─── Single rAF-throttled scroll tick ────────────────────────────
 function onScroll() {
 if (ticking) return;
 ticking = true;
 requestAnimationFrame(() => {
 updateParallax();
 updateProgress();
 const docH = document.documentElement.scrollHeight - window.innerHeight;
 updateThread(docH > 0 ? Math.min(window.scrollY / docH, 1) : 0);
 ticking = false;
 });
 }

 // ─── Wire up ──────────────────────────────────────────────────────
 // CWV-01: elements already in the first viewport are shown immediately (they
 // were never hidden); only the ones below the fold are marked pending and
 // revealed on scroll. Reads first, writes second: one layout, not N.
 const revealEls = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
 const vh = window.innerHeight;
 const belowFold = revealEls.map((el) => el.getBoundingClientRect().top >= vh - 40);
 revealEls.forEach((el, i) => {
 if (prefersReducedMotion || !belowFold[i]) {
 el.classList.add('is-visible');
 return;
 }
 el.classList.add('reveal-pending');
 revealObserver.observe(el);
 });
 document.querySelectorAll('.text-highlight').forEach((el) => highlightObserver.observe(el));
 document.querySelectorAll('[data-counter]').forEach((el) => counterObserver.observe(el));

 window.addEventListener('scroll', onScroll, { passive: true });
 // Initial positions (wrapped in rAF so it batches with first paint).
 requestAnimationFrame(() => { updateParallax(); updateProgress(); updateThread(0); });

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
