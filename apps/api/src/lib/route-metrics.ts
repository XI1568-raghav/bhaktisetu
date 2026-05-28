// In-memory per-route latency tracker. Zero deps, zero infra burn.
// Each route keeps a ring buffer of last N response times; every 5 min the
// process logs p50/p95/p99 + sample count per route. No Prometheus, no DB
// writes — purely log-driven so Render free tier stays clean.

type Sample = number;

const RING_SIZE = 200;
const REPORT_INTERVAL_MS = 5 * 60 * 1000;

const buckets = new Map<string, Sample[]>();

export function recordLatency(routeKey: string, ms: number): void {
  let buf = buckets.get(routeKey);
  if (!buf) {
    buf = [];
    buckets.set(routeKey, buf);
  }
  buf.push(ms);
  if (buf.length > RING_SIZE) buf.shift();
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

export interface RouteStat {
  route: string;
  samples: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

export function snapshotStats(): RouteStat[] {
  const stats: RouteStat[] = [];
  for (const [route, buf] of buckets) {
    if (buf.length === 0) continue;
    const sorted = [...buf].sort((a, b) => a - b);
    stats.push({
      route,
      samples: buf.length,
      p50: Math.round(percentile(sorted, 50)),
      p95: Math.round(percentile(sorted, 95)),
      p99: Math.round(percentile(sorted, 99)),
      max: Math.round(sorted[sorted.length - 1] ?? 0),
    });
  }
  stats.sort((a, b) => b.p95 - a.p95);
  return stats;
}

let timer: NodeJS.Timeout | null = null;

export function startMetricsReporter(log: { info: (obj: unknown, msg?: string) => void }): void {
  if (timer) return;
  timer = setInterval(() => {
    const stats = snapshotStats();
    if (stats.length === 0) return;
    log.info({ metrics: stats.slice(0, 20) }, 'route-latency p50/p95/p99 (top 20 by p95)');
  }, REPORT_INTERVAL_MS);
  // Don't keep the process alive solely for metric logging.
  timer.unref?.();
}

export function stopMetricsReporter(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
