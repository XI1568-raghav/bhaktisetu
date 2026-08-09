# apps\web\app\temples\[slug]\page.tsx

- generateStaticParams · function · L46-L56 — function generateStaticParams()
- canonicalTempleSlug · function · L102-L112 — function canonicalTempleSlug(slug: string): string
- getApiTemple · function · L114-L125 — async function getApiTemple(slug: string): Promise<TempleDetail | null>
- generateMetadata · function · L131-L190 — async function generateMetadata({ params, }: { params: Promise<{ slug: string }>; }): Promise<Metadata>
- TempleDetailPage · function · L196-L302 — async function TempleDetailPage({ params, }: { params: Promise<{ slug: string }>; })
- RichTemplePage · function · L308-L906 — function RichTemplePage({ slug, rich, apiTemple, }: { slug: string; rich: TempleDetailRich; apiTemple: TempleDetail | null; })
- SimpleTemplePage · function · L912-L1037 — function SimpleTemplePage({ slug, temple }: { slug: string; temple: TempleDetail })
- HeroBadge · function · L1043-L1063 — function HeroBadge({ icon: Icon, text, tone, }: { icon: React.ComponentType<{ className?: string }>; text: string; tone: 'amber' | 'rose' | 'green'; })
- QuickInfoCard · function · L1065-L1086 — function QuickInfoCard({ icon: Icon, label, value, sub, }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; })
- ReachItem · function · L1088-L1108 — function ReachItem({ icon: Icon, label, value, }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; })
- Row · function · L1110-L1117 — function Row({ label, value }: { label: string; value: string })
- PhotoGallery · function · L1119-L1156 — function PhotoGallery({ slug, count, heroImg, gallery, templeName, }: { slug: string; count: number; heroImg: string; gallery: readonly string[]; templeName: string; })
