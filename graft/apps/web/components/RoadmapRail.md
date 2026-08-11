# apps\web\components\RoadmapRail.tsx

- MilestoneIconKey · type · L15-L22 — type MilestoneIconKey = | 'sunrise' | 'building' | 'sparkles' | 'shield' | 'cog' | 'radio' | 'telescope';
- Milestone · interface · L34-L44 — interface Milestone
- Props · interface · L46-L48 — interface Props
- RoadmapRail · function · L62-L247 — function RoadmapRail({ milestones }: Props)
- compute · function · L73-L92 — function compute()
- onScroll · function · L93-L100 — function onScroll()
- jumpToMilestone · function · L249-L256 — function jumpToMilestone(section: HTMLDivElement | null, idx: number, total: number)
- RailCard · function · L258-L322 — function RailCard({ m, active, past, widthRem, index, total, }: { m: Milestone; active: boolean; past: boolean; widthRem: number; index: number; total: number; })
- StatusPill · function · L324-L382 — function StatusPill({ status, accent, }: { status: Milestone['status']; accent: string; })
- MobileStack · function · L384-L469 — function MobileStack({ milestones }: { milestones: Milestone[] })
