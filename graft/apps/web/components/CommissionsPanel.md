# apps\web\components\CommissionsPanel.tsx

- StatusFilter · type · L22-L22 — type StatusFilter = 'all' | CommissionStatus;
- Props · interface · L24-L28 — interface Props
- formatINR · function · L39-L46 — function formatINR(n: number | null | undefined): string
- formatDate · function · L48-L55 — function formatDate(iso: string | null | undefined): string
- statusClass · function · L57-L66 — function statusClass(status: string): string
- CommissionsPanel · function · L68-L259 — function CommissionsPanel({ mode = 'me', title, description }: Props)
- SummaryCard · function · L261-L288 — function SummaryCard({ label, value, subtitle, icon: Icon, color, bg, }: { label: string; value: string; subtitle?: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; })
