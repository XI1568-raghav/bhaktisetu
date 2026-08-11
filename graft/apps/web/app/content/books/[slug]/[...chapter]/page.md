# apps\web\app\content\books\[slug]\[...chapter]\page.tsx

Next.js route that statically generates and renders the book chapter reader, wiring SEO metadata and prev/next navigation for each chapter.

- Params · type · L12-L12 — Route parameter shape pairing a book slug with the catch-all chapter path segments.
- generateStaticParams · function · L14-L25 — Enumerates every book/chapter combination from the manifests so all reader pages are pre-rendered at build time.
- generateMetadata · function · L27-L52 — Builds per-chapter SEO metadata (title, description, canonical URL, OpenGraph) from the book manifest and chapter content.
- ChapterReaderPage · function · L54-L80 — Server component that loads the requested book chapter, 404s on missing content, and hands prev/next navigation to the reader client.
