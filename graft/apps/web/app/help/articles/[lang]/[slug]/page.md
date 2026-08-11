# apps\web\app\help\articles\[lang]\[slug]\page.tsx · [[help-center]] [[isr-json-ld-seo-architecture]]

- Params · type · L20-L20 — type Params = Promise<{ lang: string; slug: string }>;
- generateMetadata · function · L22-L58 — async function generateMetadata({ params, }: { params: Params; }): Promise<Metadata>
- generateStaticParams · function · L60-L62 — async function generateStaticParams()
- renderMarkdown · function · L64-L138 — function renderMarkdown(md: string): string
- closeList · function · L71-L80 — closeList = ()
- escapeHtml · function · L140-L145 — function escapeHtml(s: string): string
- renderInline · function · L147-L156 — function renderInline(s: string): string
- HelpArticlePage · function · L158-L268 — async function HelpArticlePage({ params }: { params: Params })
