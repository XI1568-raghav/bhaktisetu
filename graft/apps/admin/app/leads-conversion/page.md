# apps\admin\app\leads-conversion\page.tsx

- RoleStats · interface · L8-L16 — interface RoleStats
- ConversionResponse · interface · L18-L33 — interface ConversionResponse
- TimelineDay · interface · L35-L41 — interface TimelineDay
- TimelineResponse · interface · L43-L46 — interface TimelineResponse
- FetchState · interface · L48-L52 — interface FetchState<T>
- fetchConversion · function · L54-L68 — async function fetchConversion(): Promise<FetchState<ConversionResponse>>
- fetchTimeline · function · L70-L84 — async function fetchTimeline(): Promise<FetchState<TimelineResponse>>
- pct · function · L86-L89 — function pct(part: number, whole: number): string
- widthPct · function · L91-L94 — function widthPct(part: number, whole: number): number
- LeadsConversionPage · function · L114-L150 — async function LeadsConversionPage()
- KpiCards · function · L152-L182 — function KpiCards({ totals }: { totals: RoleStats })
- FunnelChart · function · L184-L220 — function FunnelChart({ totals }: { totals: RoleStats })
- RoleTable · function · L222-L266 — function RoleTable({ byRole }: { byRole: Record<string, RoleStats> })
- TimelineChart · function · L268-L313 — function TimelineChart({ timeline }: { timeline: TimelineDay[] })
- LegendDot · function · L315-L322 — function LegendDot({ color, label }: { color: string; label: string })
- RecentInterested · function · L324-L376 — function RecentInterested({ recent, }: { recent: ConversionResponse["recent"]; })
