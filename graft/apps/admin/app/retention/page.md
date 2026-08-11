# apps\admin\app\retention\page.tsx

- pctValue · function · L7-L10 — function pctValue(part: number, whole: number): number
- pctLabel · function · L12-L15 — function pctLabel(part: number, whole: number): string
- heatmapColor · function · L17-L21 — function heatmapColor(retentionPct: number): string
- textColorFor · function · L23-L25 — function textColorFor(retentionPct: number): string
- RetentionPage · function · L27-L82 — async function RetentionPage()
- RetentionGrid · function · L84-L178 — function RetentionGrid({ cohorts, intervals, }: { cohorts: RetentionCohort[]; intervals: number; })
- EmptyState · function · L180-L196 — function EmptyState({ title, body, }: { title: string; body: React.ReactNode; })
