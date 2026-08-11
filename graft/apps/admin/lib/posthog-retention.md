# apps\admin\lib\posthog-retention.ts

- RetentionCohort · interface · L3-L8 — interface RetentionCohort
- RetentionFetchResult · type · L10-L14 — type RetentionFetchResult = | { status: "ok"; cohorts: RetentionCohort[]; intervals: number } | { status: "missing_config"; missing: string[] } | { status: "empty"; cohorts: RetentionCohort[]; intervals: number } | { status: "error"; message: string };
- formatCohortLabel · function · L33-L38 — function formatCohortLabel(input: string | undefined, fallback: string): string
- fetchRetention · function · L40-L123 — async function fetchRetention(): Promise<RetentionFetchResult>
