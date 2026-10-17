/**
 * Cloud Run (request-based billing) throttles a container's CPU to ~0 the moment
 * the HTTP response is sent, and may freeze or stop the instance minutes later.
 * A bare `void somePromise()` after `reply.send` therefore stalls or is lost.
 *
 * `settleBounded` is the replacement for fire-and-forget on the paths that
 * matter (money audit rows, receipts, notifications): the handler awaits the
 * work, but never longer than a budget, and never throws. Work that outlives the
 * budget keeps running exactly as before (it just may be throttled); durable
 * retries (email outbox, reconcile-payments, auto-refund sweeps) are the
 * backstop and are driven by POST /api/v1/cron/daily.
 *
 * BACKGROUND_AWAIT_MS: budget in ms (default 4000). 0 restores the old
 * fire-and-forget behaviour (work is not awaited at all).
 */
export function backgroundBudgetMs(): number {
  const raw = process.env.BACKGROUND_AWAIT_MS;
  if (raw === undefined || raw === '') return 4000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 4000;
}

export async function settleBounded(
  work: Promise<unknown> | Array<Promise<unknown>>,
  label = 'background',
): Promise<void> {
  const list = Array.isArray(work) ? work : [work];
  // Attach a catch to every promise first so a rejection after the budget
  // expires can never become an unhandled rejection.
  const guarded = list.map((p) =>
    Promise.resolve(p).catch((err) => {
      console.warn(`[${label}] background task failed:`, err);
    }),
  );
  const budget = backgroundBudgetMs();
  if (budget === 0 || guarded.length === 0) return;
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, budget);
    timer.unref?.();
  });
  try {
    await Promise.race([Promise.all(guarded), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
