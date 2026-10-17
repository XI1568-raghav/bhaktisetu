/**
 * Are in-process timers (ops scheduler, per-booking offer timeouts, latency
 * reporter) switched off?
 *
 * On Cloud Run with min-instances=0 the container is frozen/stopped between
 * requests, so setInterval/setTimeout never fire reliably. There the work is
 * driven from outside instead: Cloud Scheduler calls POST /api/v1/cron/tick
 * (bearer CRON_AUTH_TOKEN) every 5-10 minutes. See
 * docs/runbooks/cloud-run-api-deploy.md.
 *
 * DISABLE_INPROCESS_JOBS=true  -> timers off.
 * DISABLE_INPROCESS_JOBS=false -> timers on (explicit override, even on Cloud Run).
 * unset                        -> off when running on Cloud Run (K_SERVICE is set
 *                                 by the platform), on everywhere else.
 */
export function inProcessJobsDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.DISABLE_INPROCESS_JOBS?.trim().toLowerCase();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return !!env.K_SERVICE;
}
