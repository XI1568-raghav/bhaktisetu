# apps\web\app\pujas\[slug]\page.tsx

- PujaTempleOffering · interface · L32-L43 — interface PujaTempleOffering
- PujaDetail · interface · L45-L67 — interface PujaDetail
- getDefaultFallback · function · L162-L223 — function getDefaultFallback(slug: string): PujaDetail
- normalizePuja · function · L239-L250 — function normalizePuja(puja: PujaDetail): PujaDetail
- getPujaBySlug · function · L252-L262 — async function getPujaBySlug(slug: string): Promise<PujaDetail>
- generateMetadata · function · L264-L316 — async function generateMetadata({ params, }: { params: Promise<{ slug: string }>; }): Promise<Metadata>
- PujaDetailPage · function · L318-L714 — async function PujaDetailPage({ params, }: { params: Promise<{ slug: string }>; })
- SidebarRow · function · L716-L736 — function SidebarRow({ icon: Icon, label, value, }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; })
