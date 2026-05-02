import { fetchFunnel, FUNNEL_STEPS } from "../../lib/posthog-funnel";

export const revalidate = 300;

const SAFFRON = "#E16318";

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function widthPct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

export default async function FunnelPage() {
  const result = await fetchFunnel();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
          Conversion funnel
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Last 30 days. Refreshes every 5 minutes. Source: PostHog.
        </p>
      </header>

      {result.status === "missing_config" ? (
        <EmptyState
          title="PostHog credentials not configured"
          body={
            <>
              Set <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">POSTHOG_API_KEY</code>{" "}
              and{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">POSTHOG_PROJECT_ID</code>{" "}
              to see funnel. Missing: {result.missing.join(", ")}.
            </>
          }
        />
      ) : result.status === "error" ? (
        <EmptyState
          title="Could not load funnel"
          body={<>PostHog request failed: {result.message}. Funnel will retry on next revalidation.</>}
        />
      ) : result.status === "empty" ? (
        <>
          <EmptyState
            title="No events in the last 30 days"
            body={
              <>
                Connection to PostHog succeeded but no funnel events were recorded.
                Verify event tracking is firing in production.
              </>
            }
          />
          <FunnelChart steps={result.steps} />
        </>
      ) : (
        <FunnelChart steps={result.steps} />
      )}

      <section className="mt-10 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Step → PostHog event</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {FUNNEL_STEPS.map((step) => (
            <li key={step.id} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-medium text-stone-900">{step.label}</span>
              <code className="font-mono text-xs text-stone-600">{step.event}</code>
              <span className="text-xs text-stone-500">{step.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function FunnelChart({
  steps,
}: {
  steps: { id: string; label: string; count: number }[];
}) {
  const first = steps[0];
  const firstCount = first?.count ?? 0;

  return (
    <ol className="space-y-4">
      {steps.map((step, idx) => {
        const prev = idx > 0 ? steps[idx - 1] : undefined;
        const dropoff =
          prev && prev.count > 0
            ? 100 - (step.count / prev.count) * 100
            : 0;
        const bar = widthPct(step.count, firstCount || 1);
        const overall = pct(step.count, firstCount || 1);

        return (
          <li key={step.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-mono text-stone-400">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-semibold text-stone-900">
                  {step.label}
                </span>
              </div>
              <div className="flex items-baseline gap-3 text-xs text-stone-600">
                <span className="font-mono text-stone-900">
                  {step.count.toLocaleString()}
                </span>
                <span>{overall} of step 1</span>
                {idx > 0 && (
                  <span className="text-rose-600">
                    -{dropoff.toFixed(1)}% from prev
                  </span>
                )}
              </div>
            </div>
            <div
              className="mt-1.5 h-7 overflow-hidden rounded bg-stone-100"
              role="img"
              aria-label={`${step.label}: ${step.count} users`}
            >
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${bar}%`,
                  backgroundColor: SAFFRON,
                  minWidth: step.count > 0 ? "2px" : "0",
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
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
