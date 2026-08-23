import { H1 } from '../../components/ui/heading-recipe';
export const revalidate = 60;

export const metadata = {
  alternates: { canonical: 'https://darshya.online/status' },
  title: 'Status',
  description: 'Real-time uptime for Darshya services',
};

type Monitor = {
  friendlyName: string;
  status: 'up' | 'down' | 'unknown';
  uptime: string;
};

const FALLBACK_MONITORS: Monitor[] = [
  { friendlyName: 'api-health', status: 'unknown', uptime: '—' },
  { friendlyName: 'web-root', status: 'unknown', uptime: '—' },
  { friendlyName: 'api-temples', status: 'unknown', uptime: '—' },
  { friendlyName: 'web-panchang', status: 'unknown', uptime: '—' },
];

function normalizeStatus(raw: unknown): Monitor['status'] {
  if (raw === 'up' || raw === 2 || raw === '2') return 'up';
  if (raw === 'down' || raw === 9 || raw === '9') return 'down';
  return 'unknown';
}

function normalizeUptime(m: Record<string, unknown>): string {
  const candidates = [m.custom_uptime_ratio, m.uptime, m.customUptimeRatio];
  for (const c of candidates) {
    if (typeof c === 'number') return `${c.toFixed(2)}%`;
    if (typeof c === 'string' && c.length > 0) {
      const trimmed = c.endsWith('%') ? c : `${c}%`;
      return trimmed;
    }
  }
  return '—';
}

async function loadMonitors(): Promise<{
  monitors: Monitor[];
  isFallback: boolean;
}> {
  const url = process.env.NEXT_PUBLIC_UPTIME_STATUS_URL;
  if (!url) {
    return { monitors: FALLBACK_MONITORS, isFallback: true };
  }
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      return { monitors: FALLBACK_MONITORS, isFallback: true };
    }
    const data = (await res.json()) as {
      psp?: { monitors?: Array<Record<string, unknown>> };
    };
    const raw = data?.psp?.monitors ?? [];
    if (!Array.isArray(raw) || raw.length === 0) {
      return { monitors: FALLBACK_MONITORS, isFallback: true };
    }
    const monitors: Monitor[] = raw.map((m) => ({
      friendlyName:
        (m.friendlyName as string) ?? (m.friendly_name as string) ?? 'unknown',
      status: normalizeStatus(m.statusClass ?? m.status),
      uptime: normalizeUptime(m),
    }));
    return { monitors, isFallback: false };
  } catch {
    return { monitors: FALLBACK_MONITORS, isFallback: true };
  }
}

function StatusDot({ status }: { status: Monitor['status'] }) {
  const color =
    status === 'up'
      ? 'bg-green-500'
      : status === 'down'
        ? 'bg-red-500'
        : 'bg-gray-400';
  const label =
    status === 'up' ? 'Up' : status === 'down' ? 'Down' : 'Unknown';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`inline-block h-3 w-3 rounded-full ${color}`}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </span>
  );
}

export default async function StatusPage() {
  const { monitors, isFallback } = await loadMonitors();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className={H1.catalogue}>Status</h1>
      <p className="mt-2 text-gray-600">
        Real-time uptime for Darshya services. Updates every 60 seconds.
      </p>

      {isFallback ? (
        <div className="mt-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          Status temporarily unavailable. Live data will appear once the
          UptimeRobot public status page is configured.
        </div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Monitor
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                30-day uptime
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {monitors.map((m) => (
              <tr key={m.friendlyName}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {m.friendlyName}
                </td>
                <td className="px-4 py-3">
                  <StatusDot status={m.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{m.uptime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-8 text-sm text-gray-500">
        Powered by{' '}
        <a
          href="https://uptimerobot.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-saffron-600 underline hover:text-saffron-700"
        >
          UptimeRobot
        </a>
      </footer>
    </main>
  );
}
