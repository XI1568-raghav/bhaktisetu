# apps\web\lib\books.ts

- safeBookSlug · function · L14-L19 — function safeBookSlug(slug: string): string
- safeChapterSlug · function · L21-L26 — function safeChapterSlug(slug: string): string
- listBookSlugs · function · L28-L39 — async function listBookSlugs(): Promise<string[]>
- loadManifest · function · L41-L50 — async function loadManifest(bookSlug: string): Promise<BookManifest | null>
- loadAllManifests · function · L52-L56 — async function loadAllManifests(): Promise<BookManifest[]>
- loadChapter · function · L58-L75 — async function loadChapter( bookSlug: string, chapterSlug: string ): Promise<Chapter | null>
- nextChapter · function · L77-L84 — function nextChapter( manifest: BookManifest, currentSlug: string ): ChapterSummary | null
- prevChapter · function · L86-L93 — function prevChapter( manifest: BookManifest, currentSlug: string ): ChapterSummary | null
