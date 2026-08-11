# apps\web\app\yatra\destinations\[slug]\page.tsx

- Params · type · L12-L12 — type Params = { slug: string };
- generateStaticParams · function · L14-L16 — async function generateStaticParams(): Promise<Params[]>
- generateMetadata · function · L18-L39 — async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata>
- YatraDestinationDetailPage · function · L47-L164 — async function YatraDestinationDetailPage({ params }: { params: Promise<Params> })
