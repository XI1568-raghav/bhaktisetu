/**
 * The Razorpay SDK's axios instance has NO timeout. Against a gateway that
 * accepts the connection and never answers, every create-order / refund request
 * hangs until the platform proxy cuts it (measured 2026-10-13 with a stalled
 * stub). Bounding the wait turns a stall into the same friendly 503 as any other
 * gateway failure. Apply to every `new Razorpay(...)` the API builds.
 */
export function withGatewayTimeout<T>(client: T): T {
  const ms = Number(process.env.RAZORPAY_TIMEOUT_MS) || 15_000;
  const rq = (client as unknown as { api?: { rq?: { defaults: { timeout?: number } } } }).api?.rq;
  if (rq) rq.defaults.timeout = ms;
  return client;
}
