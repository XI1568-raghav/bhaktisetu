# apps\web\components\DarshanBrowser.tsx

- firstImageUrl · function · L21-L29 — function firstImageUrl(images: TempleImage[] | undefined): string | null
- templeImageThumb · function · L31-L33 — function templeImageThumb(url: string): string
- deityFallback · function · L35-L44 — function deityFallback(deityPrimary: string): string
- templeImageFor · function · L46-L48 — function templeImageFor(stream: DarshanStream): string
- readReminders · function · L76-L86 — function readReminders(): string[]
- writeReminders · function · L88-L94 — function writeReminders(ids: string[])
- matchesDeity · function · L96-L100 — function matchesDeity(stream: DarshanStream, deity: string): boolean
- matchesRegion · function · L102-L107 — function matchesRegion(stream: DarshanStream, region: string): boolean
- matchesQuery · function · L109-L117 — function matchesQuery(stream: DarshanStream, q: string): boolean
- streamHref · function · L119-L123 — function streamHref(stream: DarshanStream): string
- formatStartsIn · function · L125-L130 — function formatStartsIn(min: number): string
- DarshanBrowser · function · L132-L437 — function DarshanBrowser({ liveStreams, scheduledStreams, upcomingNotes = [], }: { liveStreams: DarshanStream[]; scheduledStreams: DarshanStream[]; upcomingNotes?: { templeSlug: string; nextSlot: string; startsInMin: number }[]; })
- toggleReminder · function · L173-L185 — function toggleReminder(id: string, templeName: string)
