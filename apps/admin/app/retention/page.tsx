import { fetchRetention, type RetentionCohort } from "../../lib/posthog-retention";
import { H1 } from "../../components/ui/heading-recipe";

export const revalidate = 300;

const SAFFRON = "#E16318";

function pctValue(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

function pctLabel(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${((part / whole) * 100).toFixed(0)}%`;
}

function heatmapColor(retentionPct: number): string {
  if (retentionPct <= 0) return "#F5F1EA";
  const alpha = Math.max(0.08, Math.min(1, retentionPct / 100));
  return `rgba(225, 99, 24, ${alpha.toFixed(2)})`;
}

function textColorFor(retentionPct: number): string {
  return retentionPct >= 45 ? "#FFFFFF" : "#1C1917";
}

export default async function RetentionPage() {
  const result = await fetchRetention();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className={H1.portal}>
          Cohort retention
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Weekly cohorts, last 8 weeks. Refreshes every 5 minutes. Source: PostHog.
        </p>
      </header>

      {result.status === "missing_config" ? (
        <EmptyState
          title="Set POSTHOG_API_KEY to view retention"
          body={
            <>
              Configure{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">POSTHOG_API_KEY</code>{" "}
              and{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">POSTHOG_PROJECT_ID</code>.
              Missing: {result.missing.join(", ")}.
            </>
          }
        />
      ) : result.status === "error" ? (
        <EmptyState
          title="Could not load retention"
          body={<>PostHog request failed: {result.message}. Will retry on next revalidation.</>}
        />
      ) : result.status === "empty" ? (
        <EmptyState
          title="No retention data in the last 8 weeks"
          body={<>Connection succeeded but no $pageview cohorts were recorded.</>}
        />
      ) : (
        <RetentionGrid cohorts={result.cohorts} intervals={result.intervals} />
      )}

      <section className="mt-10 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">How this is computed</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
          <li>
            Cohort signup event: first <code className="font-mono text-xs">$pageview</code>
          </li>
          <li>
            Returning event: any <code className="font-mono text-xs">$pageview</code>
          </li>
          <li>Period: weekly · Intervals: 8</li>
        </ul>
      </section>
    </main>
  );
}

function RetentionGrid({
  cohorts,
  intervals,
}: {
  cohorts: RetentionCohort[];
  intervals: number;
}) {
  const cols = Array.from({ length: intervals }, (_, i) => i);

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th
              className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left font-semibold text-stone-700"
              scope="col"
            >
              Cohort
            </th>
            <th className="px-3 py-2 text-right font-semibold text-stone-700" scope="col">
              Size
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className="px-2 py-2 text-center font-mono text-xs font-semibold text-stone-600"
                scope="col"
              >
                W{c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.date} className="border-b border-stone-100 last:border-b-0">
              <th
                className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-left font-mono text-xs text-stone-700"
                scope="row"
              >
                {cohort.label}
              </th>
              <td className="px-3 py-2 text-right font-mono text-xs text-stone-900">
                {cohort.cohortSize.toLocaleString()}
              </td>
              {cols.map((c) => {
                const value = cohort.values[c];
                if (value === undefined) {
                  return (
                    <td
                      key={c}
                      className="px-1 py-1 text-center text-xs text-stone-300"
                      aria-label="no data"
                    >
                      ·
                    </td>
                  );
                }
                const pctNum = pctValue(value, cohort.cohortSize);
                const label = pctLabel(value, cohort.cohortSize);
                return (
                  <td key={c} className="p-1">
                    <div
                      className="flex h-9 items-center justify-center rounded text-xs font-semibold"
                      style={{
                        backgroundColor: heatmapColor(pctNum),
                        color: textColorFor(pctNum),
                      }}
                      title={`${value} of ${cohort.cohortSize} returned in week ${c}`}
                    >
                      {c === 0 ? "100%" : label}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 border-t border-stone-200 px-3 py-2 text-xs text-stone-500">
        <span>Less</span>
        {[10, 25, 50, 75, 100].map((p) => (
          <span
            key={p}
            className="h-3 w-6 rounded"
            style={{ backgroundColor: heatmapColor(p), border: `1px solid ${SAFFRON}33` }}
            aria-hidden
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center"
      style={{ borderColor: "#E5E0D8" }}
    >
      <p className="text-base font-semibold text-stone-900">{title}</p>
      <p className="mt-2 text-sm text-stone-600">{body}</p>
    </div>
  );
}
