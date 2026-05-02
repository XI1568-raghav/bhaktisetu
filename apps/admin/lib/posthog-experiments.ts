import { z } from "zod";

// Read-only viewer for PostHog feature flags (a.k.a. experiments). Listing
// only — creation/edit happens in the PostHog dashboard.
//
// Endpoint: GET /api/projects/:project_id/feature_flags/

const POSTHOG_HOST = "https://us.i.posthog.com";

export interface FlagVariant {
  key: string;
  name?: string;
  rolloutPercentage: number;
}

export interface FeatureFlagSummary {
  id: number;
  key: string;
  name: string;
  active: boolean;
  rolloutPercentage: number | null;
  variants: FlagVariant[];
  createdAt?: string;
}

export type ExperimentsFetchResult =
  | { status: "ok"; flags: FeatureFlagSummary[] }
  | { status: "missing_config"; missing: string[] }
  | { status: "empty"; flags: [] }
  | { status: "error"; message: string };

const VariantSchema = z.object({
  key: z.string(),
  name: z.string().optional().nullable(),
  rollout_percentage: z.number().nullable().optional(),
});

const FilterGroupSchema = z.object({
  rollout_percentage: z.number().nullable().optional(),
});

const FlagSchema = z.object({
  id: z.number(),
  key: z.string(),
  name: z.string().optional().nullable(),
  active: z.boolean(),
  created_at: z.string().optional().nullable(),
  filters: z
    .object({
      groups: z.array(FilterGroupSchema).optional().nullable(),
      multivariate: z
        .object({
          variants: z.array(VariantSchema),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
});

const ResponseSchema = z.object({
  results: z.array(FlagSchema),
});

function topRollout(
  filters: z.infer<typeof FlagSchema>["filters"],
): number | null {
  const groups = filters?.groups ?? [];
  if (groups.length === 0) return null;
  const pcts = groups
    .map((g) => g.rollout_percentage)
    .filter((p): p is number => typeof p === "number");
  if (pcts.length === 0) return null;
  return Math.max(...pcts);
}

export async function fetchFeatureFlags(): Promise<ExperimentsFetchResult> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  const missing: string[] = [];
  if (!apiKey) missing.push("POSTHOG_API_KEY");
  if (!projectId) missing.push("POSTHOG_PROJECT_ID");
  if (missing.length > 0) {
    return { status: "missing_config", missing };
  }

  const url = `${POSTHOG_HOST}/api/projects/${projectId}/feature_flags/?limit=100`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return {
        status: "error",
        message: `PostHog returned HTTP ${res.status}`,
      };
    }

    const json: unknown = await res.json();
    const parsed = ResponseSchema.safeParse(json);
    if (!parsed.success) {
      return {
        status: "error",
        message: "PostHog response did not match expected feature_flags schema",
      };
    }

    const flags: FeatureFlagSummary[] = parsed.data.results.map((row) => {
      const variants: FlagVariant[] =
        row.filters?.multivariate?.variants?.map((v) => ({
          key: v.key,
          name: v.name ?? undefined,
          rolloutPercentage: v.rollout_percentage ?? 0,
        })) ?? [];

      return {
        id: row.id,
        key: row.key,
        name: row.name ?? row.key,
        active: row.active,
        rolloutPercentage: topRollout(row.filters ?? null),
        variants,
        createdAt: row.created_at ?? undefined,
      };
    });

    if (flags.length === 0) {
      return { status: "empty", flags: [] };
    }

    return { status: "ok", flags };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown network error",
    };
  }
}
