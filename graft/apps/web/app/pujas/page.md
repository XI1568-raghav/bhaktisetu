# apps\web\app\pujas\page.tsx

- PujaCard · interface · L88-L103 — interface PujaCard
- categoryTag · function · L116-L131 — function categoryTag(category: string, idx: number): { tag: string; tagColor: string }
- formatDuration · function · L133-L139 — function formatDuration(minutes: number): string
- mapPujaTypeToCard · function · L141-L169 — function mapPujaTypeToCard(p: PujaType, idx: number): PujaCard
- loadPujas · function · L278-L287 — async function loadPujas(): Promise<PujaCard[]>
- PujasPage · function · L292-L611 — async function PujasPage({ searchParams }: { searchParams: Promise<{ page?: string }> })
