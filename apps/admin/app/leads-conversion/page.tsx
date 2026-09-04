import { adminApiBase, adminApiHeaders } from "../../lib/api";
import { H1 } from "../../components/ui/heading-recipe";

export const revalidate = 60;

const SAFFRON = "#E16318";
const STONE = "#E5E0D8";

interface RoleStats {
  total: number;
  emailed: number;
  opened: number;
  clicked: number;
  replied: number;
  interested: number;
  converted: number;
}

interface ConversionResponse {
  total: number;
  byRole: Record<string, RoleStats>;
  totals: RoleStats;
  recent: Array<{
    id: string;
    leadId: string;
    leadName: string;
    role: string;
    city: string | null;
    email: string | null;
    sentAt: string;
    classifiedIntent: string | null;
    bodyPreview: string;
  }>;
}

interface TimelineDay {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

interface TimelineResponse {
  days: number;
  timeline: TimelineDay[];
}

interface FetchState<T> {
  status: "ok" | "error";
  data: T | null;
  message?: string;
}

async function fetchConversion(): Promise<FetchState<ConversionResponse>> {
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/admin/leads/conversion`, {
      headers: adminApiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", data: null, message: `API ${res.status}: ${text.slice(0, 200)}` };
    }
    return { status: "ok", data: (await res.json()) as ConversionResponse };
  } catch (err) {
    return { status: "error", data: null, message: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchTimeline(): Promise<FetchState<TimelineResponse>> {
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/admin/leads/conversion/timeline?days=30`, {
      headers: adminApiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", data: null, message: `API ${res.status}: ${text.slice(0, 200)}` };
    }
    return { status: "ok", data: (await res.json()) as TimelineResponse };
  } catch (err) {
    return { status: "error", data: null, message: err instanceof Error ? err.message : String(err) };
  }
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function widthPct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

const FUNNEL_STEPS: Array<{ key: keyof RoleStats; label: string }> = [
  { key: "total", label: "Pipeline" },
  { key: "emailed", label: "Emailed" },
  { key: "opened", label: "Opened" },
  { key: "clicked", label: "Clicked" },
  { key: "replied", label: "Replied" },
  { key: "interested", label: "Interested" },
  { key: "converted", label: "Converted" },
];

const ROLE_LABELS: Record<string, string> = {
  TEMPLE: "Temples",
  PRIEST: "Priests",
  ASTROLOGER: "Astrologers",
  WELLNESS_INSTRUCTOR: "Wellness",
  GAUSHALA: "Gaushalas",
};

export default async function LeadsConversionPage() {
  const [conv, tl] = await Promise.all([fetchConversion(), fetchTimeline()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className={H1.portal}>
          Lead conversion funnel
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Cold lead → emailed → opened → clicked → replied → INTERESTED → converted. Refreshes every 60s.
        </p>
      </header>

      {conv.status === "error" || !conv.data ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not load conversion data</p>
          {conv.message && <p className="mt-1 text-xs opacity-80">{conv.message}</p>}
        </div>
      ) : (
        <>
          <KpiCards totals={conv.data.totals} />
          <FunnelChart totals={conv.data.totals} />
          <RoleTable byRole={conv.data.byRole} />
          {tl.status === "ok" && tl.data ? (
            <TimelineChart timeline={tl.data.timeline} />
          ) : (
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Timeline unavailable{tl.message ? `: ${tl.message}` : ""}.
            </div>
          )}
          <RecentInterested recent={conv.data.recent} />
        </>
      )}
    </main>
  );
}

function KpiCards({ totals }: { totals: RoleStats }) {
  const openRate = pct(totals.opened, totals.emailed);
  const clickRate = pct(totals.clicked, totals.opened);
  const replyRate = pct(totals.replied, totals.emailed);
  const conversionRate = pct(totals.converted, totals.total);

  const cards = [
    { label: "Open rate", value: openRate, sub: `${totals.opened} of ${totals.emailed} emailed` },
    { label: "Click rate", value: clickRate, sub: `${totals.clicked} of ${totals.opened} opens` },
    { label: "Reply rate", value: replyRate, sub: `${totals.replied} replies / ${totals.emailed} sent` },
    { label: "Conversion rate", value: conversionRate, sub: `${totals.converted} of ${totals.total} leads` },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border bg-white p-4"
          style={{ borderColor: STONE }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{c.label}</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SAFFRON }}>
            {c.value}
          </p>
          <p className="mt-1 text-xs text-stone-500">{c.sub}</p>
        </div>
      ))}
    </section>
  );
}

function FunnelChart({ totals }: { totals: RoleStats }) {
  const top = totals.total || 1;
  return (
    <section className="mt-8 rounded-lg border bg-white p-5" style={{ borderColor: STONE }}>
      <h2 className="text-sm font-semibold text-stone-900">Funnel — totals</h2>
      <div className="mt-4 space-y-2">
        {FUNNEL_STEPS.map((step, i) => {
          const value = totals[step.key];
          const prevStep = FUNNEL_STEPS[i - 1];
          const prev = !prevStep ? value : totals[prevStep.key];
          const drop = !prevStep ? null : prev - value;
          const w = widthPct(value, top);
          return (
            <div key={step.key} className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-stone-700">{step.label}</span>
              <div className="relative h-7 flex-1 overflow-hidden rounded bg-stone-100">
                <div
                  className="h-full rounded"
                  style={{ width: `${w}%`, backgroundColor: SAFFRON, opacity: 0.85 }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-white">
                  {value.toLocaleString()}
                </span>
              </div>
              <span className="w-20 text-right text-xs text-stone-600">
                {pct(value, top)}
              </span>
              <span className="w-20 text-right text-xs text-stone-500">
                {drop !== null ? `−${drop.toLocaleString()}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RoleTable({ byRole }: { byRole: Record<string, RoleStats> }) {
  const roles = Object.keys(ROLE_LABELS);
  return (
    <section className="mt-8 overflow-hidden rounded-lg border bg-white" style={{ borderColor: STONE }}>
      <div className="border-b px-5 py-3" style={{ borderColor: STONE }}>
        <h2 className="text-sm font-semibold text-stone-900">By role</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y" style={{ borderColor: STONE }}>
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">Role</th>
              {FUNNEL_STEPS.map((s) => (
                <th key={s.key} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  {s.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                Conv %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: STONE }}>
            {roles.map((r) => {
              const s = byRole[r] ?? { total: 0, emailed: 0, opened: 0, clicked: 0, replied: 0, interested: 0, converted: 0 };
              return (
                <tr key={r}>
                  <td className="px-4 py-2 text-sm font-medium text-stone-900">{ROLE_LABELS[r] ?? r}</td>
                  {FUNNEL_STEPS.map((step) => (
                    <td key={step.key} className="px-3 py-2 text-right text-sm tabular-nums text-stone-700">
                      {s[step.key].toLocaleString()}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums" style={{ color: SAFFRON }}>
                    {pct(s.converted, s.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimelineChart({ timeline }: { timeline: TimelineDay[] }) {
  const max = Math.max(1, ...timeline.map((d) => Math.max(d.sent, d.opened, d.clicked, d.replied)));
  return (
    <section className="mt-8 rounded-lg border bg-white p-5" style={{ borderColor: STONE }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Timeline — last 30 days</h2>
        <div className="flex items-center gap-3 text-xs">
          <LegendDot color={SAFFRON} label="Sent" />
          <LegendDot color="#3B82F6" label="Opened" />
          <LegendDot color="#10B981" label="Clicked" />
          <LegendDot color="#A855F7" label="Replied" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex h-40 min-w-full items-end gap-1">
          {timeline.map((d) => (
            <div key={d.date} className="flex flex-1 min-w-[14px] flex-col items-stretch justify-end gap-0.5">
              <div
                title={`${d.date} • sent ${d.sent}`}
                style={{ height: `${(d.sent / max) * 100}%`, backgroundColor: SAFFRON, opacity: 0.85 }}
                className="rounded-t-sm"
              />
              <div
                title={`${d.date} • opened ${d.opened}`}
                style={{ height: `${(d.opened / max) * 60}%`, backgroundColor: "#3B82F6", opacity: 0.7 }}
              />
              <div
                title={`${d.date} • clicked ${d.clicked}`}
                style={{ height: `${(d.clicked / max) * 40}%`, backgroundColor: "#10B981", opacity: 0.7 }}
              />
              <div
                title={`${d.date} • replied ${d.replied}`}
                style={{ height: `${(d.replied / max) * 30}%`, backgroundColor: "#A855F7", opacity: 0.8 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex min-w-full justify-between text-[10px] text-stone-500">
          <span>{timeline[0]?.date ?? ""}</span>
          <span>{timeline[Math.floor(timeline.length / 2)]?.date ?? ""}</span>
          <span>{timeline[timeline.length - 1]?.date ?? ""}</span>
        </div>
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-stone-600">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function RecentInterested({
  recent,
}: {
  recent: ConversionResponse["recent"];
}) {
  if (recent.length === 0) {
    return (
      <section className="mt-8 rounded-lg border bg-white p-5" style={{ borderColor: STONE }}>
        <h2 className="text-sm font-semibold text-stone-900">Recent INTERESTED replies</h2>
        <p className="mt-2 text-sm text-stone-500">
          No INTERESTED replies yet. They will appear here as the outreach webhook classifies them.
        </p>
      </section>
    );
  }
  return (
    <section className="mt-8 overflow-hidden rounded-lg border bg-white" style={{ borderColor: STONE }}>
      <div className="border-b px-5 py-3" style={{ borderColor: STONE }}>
        <h2 className="text-sm font-semibold text-stone-900">
          Recent INTERESTED replies ({recent.length})
        </h2>
      </div>
      <ul className="divide-y" style={{ borderColor: STONE }}>
        {recent.map((r) => (
          <li key={`${r.leadId}-${r.sentAt}`} className="px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-stone-900">{r.leadName}</span>
                <span className="ml-2 text-xs text-stone-500">
                  {ROLE_LABELS[r.role] ?? r.role}
                  {r.city ? ` • ${r.city}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500">{new Date(r.sentAt).toLocaleString()}</span>
                <a
                  href={`/leads?id=${r.leadId}`}
                  className="rounded px-2 py-1 text-xs font-medium hover:bg-stone-100"
                  style={{ color: SAFFRON }}
                >
                  View lead
                </a>
              </div>
            </div>
            {r.bodyPreview && (
              <p className="mt-1 text-sm text-stone-700 line-clamp-2">{r.bodyPreview}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
