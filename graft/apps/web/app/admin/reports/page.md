# apps\web\app\admin\reports\page.tsx

- ExportType · type · L25-L25 — type ExportType = 'users' | 'revenue' | 'all';
- inr · function · L30-L32 — function inr(n: number): string
- revenueShort · function · L36-L47 — function revenueShort(amountInr: number): string
- formatChange · function · L49-L55 — function formatChange(changePct: number | null): { label: string; positive: boolean }
- AdminReportsPage · function · L57-L424 — function AdminReportsPage()
- today · function · L89-L89 — today = ()
- handleExport · function · L91-L177 — handleExport = async (type: ExportType)
