import { z } from "zod";

export interface RetentionCohort {
  date: string;
  label: string;
  cohortSize: number;
  values: number[];
}

export type RetentionFetchResult =
  | { status: "ok"; cohorts: RetentionCohort[]; intervals: number }
  | { status: "missing_config"; missing: string[] }
  | { status: "empty"; cohorts: RetentionCohort[]; intervals: number }
  | { status: "error"; message: string };

const RetentionRowSchema = z.object({
  date: z.string().optional(),
  label: z.string().optional(),
  values: z.array(
    z.object({
      count: z.number().int().nonnegative(),
    }),
  ),
});

const RetentionResponseSchema = z.object({
  result: z.array(RetentionRowSchema),
});

const POSTHOG_HOST = "https://us.i.posthog.com";
const INTERVALS = 8;

function formatCohortLabel(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1] ?? input;
  return input;
}

export async function fetchRetention(): Promise<RetentionFetchResult> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  const missing: string[] = [];
  if (!apiKey) missing.push("POSTHOG_API_KEY");
  if (!projectId) missing.push("POSTHOG_PROJECT_ID");
  if (missing.length > 0) {
    return { status: "missing_config", missing };
  }

  const body = {
    insight: "RETENTION",
    period: "Week",
    total_intervals: INTERVALS,
    retention_type: "retention_first_time",
    target_entity: {
      id: "$pageview",
      name: "$pageview",
      type: "events",
      order: 0,
    },
    returning_entity: {
      id: "$pageview",
      name: "$pageview",
      type: "events",
      order: 0,
    },
    date_from: `-${INTERVALS * 7}d`,
  };

  const url = `${POSTHOG_HOST}/api/projects/${projectId}/insights/retention/`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return {
        status: "error",
        message: `PostHog returned HTTP ${res.status}`,
      };
    }

    const json: unknown = await res.json();
    const parsed = RetentionResponseSchema.safeParse(json);
    if (!parsed.success) {
      return {
        status: "error",
        message: "PostHog response did not match expected retention schema",
      };
    }

    const cohorts: RetentionCohort[] = parsed.data.result.map((row, idx) => {
      const counts = row.values.map((v) => v.count);
      const cohortSize = counts[0] ?? 0;
      return {
        date: row.date ?? row.label ?? `Week ${idx}`,
        label: formatCohortLabel(row.date ?? row.label, `Week ${idx}`),
        cohortSize,
        values: counts,
      };
    });

    const totalUsers = cohorts.reduce((sum, c) => sum + c.cohortSize, 0);
    if (totalUsers === 0) {
      return { status: "empty", cohorts, intervals: INTERVALS };
    }

    return { status: "ok", cohorts, intervals: INTERVALS };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown network error",
    };
  }
}
