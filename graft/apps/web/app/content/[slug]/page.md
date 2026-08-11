# apps\web\app\content\[slug]\page.tsx

- generateStaticParams · function · L11-L48 — function generateStaticParams()
- formatCount · function · L261-L265 — function formatCount(n: number): string
- formatDuration · function · L267-L272 — function formatDuration(seconds: number | null): string
- getContentBySlug · function · L278-L302 — async function getContentBySlug(slug: string): Promise<ContentItem>
- getRelatedContent · function · L304-L331 — async function getRelatedContent(content: ContentItem): Promise<ContentItem[]>
- addItems · function · L315-L322 — addItems = (items: ContentItem[])
- generateMetadata · function · L335-L351 — async function generateMetadata({ params, }: { params: Promise<{ slug: string }>; }): Promise<Metadata>
- ContentDetailPage · function · L355-L579 — async function ContentDetailPage({ params }: { params: Promise<{ slug: string }> })
