# apps\admin\lib\posthog-experiments.ts

- FlagVariant · interface · L10-L14 — interface FlagVariant
- FeatureFlagSummary · interface · L16-L24 — interface FeatureFlagSummary
- ExperimentsFetchResult · type · L26-L30 — type ExperimentsFetchResult = | { status: "ok"; flags: FeatureFlagSummary[] } | { status: "missing_config"; missing: string[] } | { status: "empty"; flags: [] } | { status: "error"; message: string };
- topRollout · function · L66-L76 — function topRollout( filters: z.infer<typeof FlagSchema>["filters"], ): number | null
- fetchFeatureFlags · function · L78-L147 — async function fetchFeatureFlags(): Promise<ExperimentsFetchResult>
