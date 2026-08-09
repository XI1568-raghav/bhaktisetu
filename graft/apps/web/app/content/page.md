# apps\web\app\content\page.tsx

- formatCount · function · L360-L364 — function formatCount(n: number): string
- formatDuration · function · L366-L371 — function formatDuration(seconds: number | null): string
- PagedContent · interface · L377-L382 — interface PagedContent
- fetchContentData · function · L384-L454 — async function fetchContentData( type?: string, search?: string, page: number = 1, ): Promise<PagedContent>
- buildContentHref · function · L456-L467 — function buildContentHref( type: string | undefined, search: string | undefined, page: number, ): string
- fetchDailyContent · function · L469-L481 — async function fetchDailyContent()
- DailyContentSection · function · L485-L560 — async function DailyContentSection()
- ContentListSection · function · L564-L744 — async function ContentListSection({ type, search, page, }: { type?: string; search?: string; page: number; })
- ContentPage · function · L748-L867 — async function ContentPage({ searchParams, }: { searchParams: Promise<{ type?: string; search?: string; page?: string }>; })
