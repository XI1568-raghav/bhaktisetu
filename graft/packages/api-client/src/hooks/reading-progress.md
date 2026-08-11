# packages\api-client\src\hooks\reading-progress.ts

- hasLocalStorage · function · L27-L29 — function hasLocalStorage(): boolean
- readAllLocal · function · L31-L41 — function readAllLocal(): Record<string, ReadingProgress>
- writeAllLocal · function · L43-L50 — function writeAllLocal(data: Record<string, ReadingProgress>): void
- readLocal · function · L52-L54 — function readLocal(bookSlug: string): ReadingProgress | null
- writeLocal · function · L56-L60 — function writeLocal(progress: ReadingProgress): void
- clearLocalAll · function · L62-L69 — function clearLocalAll(): void
- ListResponse · interface · L81-L84 — interface ListResponse
- DetailResponse · interface · L86-L89 — interface DetailResponse
- UpsertResponse · interface · L91-L95 — interface UpsertResponse
- UseReadingProgressOptions · interface · L99-L102 — interface UseReadingProgressOptions
- useReadingProgress · function · L106-L211 — function useReadingProgress( bookSlug: string, options: UseReadingProgressOptions = {} )
- onUnload · function · L189-L195 — onUnload = ()
- useAllReadingProgress · function · L215-L239 — function useAllReadingProgress(options: UseReadingProgressOptions = {})
- useMergeAnonReadingProgress · function · L245-L268 — function useMergeAnonReadingProgress()
