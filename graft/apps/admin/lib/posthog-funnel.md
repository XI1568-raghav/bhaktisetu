# apps\admin\lib\posthog-funnel.ts

- FunnelStepDef · interface · L3-L9 — interface FunnelStepDef
- FunnelStepResult · interface · L50-L56 — interface FunnelStepResult
- FunnelFetchResult · type · L58-L62 — type FunnelFetchResult = | { status: "ok"; steps: FunnelStepResult[]; windowDays: number } | { status: "missing_config"; missing: string[] } | { status: "empty"; steps: FunnelStepResult[]; windowDays: number } | { status: "error"; message: string };
- fetchFunnel · function · L81-L169 — async function fetchFunnel(): Promise<FunnelFetchResult>
