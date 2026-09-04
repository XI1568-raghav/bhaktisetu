import {
  fetchFeatureFlags,
  type FeatureFlagSummary,
} from "../../lib/posthog-experiments";
import { H1 } from "../../components/ui/heading-recipe";

export const revalidate = 300;

const SAFFRON = "#E16318";

export default async function ExperimentsPage() {
  const result = await fetchFeatureFlags();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className={H1.portal}>
          Experiments
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          PostHog feature flags. Read-only — create or edit in the{" "}
          <a
            href="https://app.posthog.com/feature_flags"
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: SAFFRON }}
          >
            PostHog dashboard
          </a>
          .
        </p>
      </header>

      {result.status === "missing_config" ? (
        <EmptyState
          title="Set POSTHOG_API_KEY to view experiments"
          body={
            <>
              Configure{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">
                POSTHOG_API_KEY
              </code>{" "}
              and{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">
                POSTHOG_PROJECT_ID
              </code>
              . Missing: {result.missing.join(", ")}.
            </>
          }
        />
      ) : result.status === "error" ? (
        <EmptyState
          title="Could not load feature flags"
          body={
            <>
              PostHog request failed: {result.message}. Will retry on next
              revalidation.
            </>
          }
        />
      ) : result.status === "empty" ? (
        <EmptyState
          title="No feature flags yet"
          body={
            <>
              Create your first flag in PostHog. See{" "}
              <code className="font-mono text-xs">docs/ab-testing.md</code> for
              naming and rollout conventions.
            </>
          }
        />
      ) : (
        <FlagsTable flags={result.flags} />
      )}

      <section className="mt-10 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Conventions</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
          <li>
            Keys: <code className="font-mono text-xs">kebab-case</code> (e.g.,{" "}
            <code className="font-mono text-xs">home-hero-cta-text</code>)
          </li>
          <li>
            Significance threshold: <strong>95%</strong> (p &lt; 0.05)
          </li>
          <li>
            Always define guardrail metrics before launching — see{" "}
            <code className="font-mono text-xs">docs/ab-testing.md</code>
          </li>
        </ul>
      </section>
    </main>
  );
}

function FlagsTable({ flags }: { flags: FeatureFlagSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th
              className="px-3 py-2 text-left font-semibold text-stone-700"
              scope="col"
            >
              Key
            </th>
            <th
              className="px-3 py-2 text-left font-semibold text-stone-700"
              scope="col"
            >
              Name
            </th>
            <th
              className="px-3 py-2 text-left font-semibold text-stone-700"
              scope="col"
            >
              Status
            </th>
            <th
              className="px-3 py-2 text-right font-semibold text-stone-700"
              scope="col"
            >
              Rollout
            </th>
            <th
              className="px-3 py-2 text-left font-semibold text-stone-700"
              scope="col"
            >
              Variants
            </th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <tr
              key={f.id}
              className="border-b border-stone-100 last:border-b-0"
            >
              <td className="px-3 py-2 font-mono text-xs text-stone-900">
                {f.key}
              </td>
              <td className="px-3 py-2 text-stone-800">{f.name}</td>
              <td className="px-3 py-2">
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: f.active ? "#DCFCE7" : "#F5F5F4",
                    color: f.active ? "#166534" : "#57534E",
                  }}
                >
                  {f.active ? "Active" : "Paused"}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-stone-900">
                {f.rolloutPercentage === null
                  ? "—"
                  : `${f.rolloutPercentage}%`}
              </td>
              <td className="px-3 py-2">
                {f.variants.length === 0 ? (
                  <span className="text-xs text-stone-500">boolean</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {f.variants.map((v) => (
                      <li
                        key={v.key}
                        className="rounded border px-1.5 py-0.5 font-mono text-[11px]"
                        style={{
                          borderColor: "#E5E0D8",
                          color: "#1C1917",
                        }}
                        title={v.name ?? v.key}
                      >
                        {v.key} · {v.rolloutPercentage}%
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
