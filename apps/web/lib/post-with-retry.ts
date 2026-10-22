/**
 * POST JSON with a per-attempt deadline and a short retry on the failures a
 * cold or briefly-unavailable API produces.
 *
 * QA 2026-10-22 (yatra): the booking/quote request failed three times in a row
 * with "Could not reach our yatra desk" before the quote finally appeared. The
 * API runs on a free instance that sleeps; the first requests after idle hit
 * the cold start (a dropped connection or 502/503/504) and the form reported a
 * hard error on each, so the visitor had to press the button again until the
 * server was awake. Retrying the transient failures automatically, behind one
 * continuous loading state, turns that into a single wait. 4xx answers are
 * never retried: they are the server's decision, not a transport problem.
 */
export interface PostRetryOptions {
  attempts?: number;
  timeoutMs?: number;
  backoffMs?: number;
  onRetry?: (attempt: number) => void;
}

const TRANSIENT = new Set([502, 503, 504]);

export async function postJsonWithRetry(
  url: string,
  body: unknown,
  { attempts = 3, timeoutMs = 20_000, backoffMs = 1_500, onRetry }: PostRetryOptions = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!TRANSIENT.has(res.status) || i === attempts) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (i === attempts) throw err;
    } finally {
      clearTimeout(timer);
    }
    onRetry?.(i + 1);
    await new Promise((r) => setTimeout(r, backoffMs * i));
  }
  throw lastErr;
}
