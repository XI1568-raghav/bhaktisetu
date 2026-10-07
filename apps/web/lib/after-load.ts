/**
 * Run `cb` once the page has finished loading and the main thread is idle.
 * Third-party loaders (PostHog, Sentry CDN) use this so their download and
 * parse never compete with hydration. Returns a cancel function.
 */
export function afterLoad(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let cancelled = false;
  let idleId: number | undefined;
  let timerId: number | undefined;
  const run = () => {
    if (cancelled) return;
    cb();
  };
  const schedule = () => {
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      timerId = window.setTimeout(run, 2000);
    }
  };
  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
    if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleId);
    }
    if (timerId !== undefined) window.clearTimeout(timerId);
  };
}
