# apps\api\src\jobs\content-auto-post.ts

- normSub · function · L34-L36 — function normSub(sub: string): string
- normTitle · function · L38-L40 — function normTitle(t: string): string
- AutoPostRow · interface · L42-L49 — interface AutoPostRow
- AutoPostResult · interface · L51-L59 — interface AutoPostResult
- loadCandidates · function · L61-L83 — async function loadCandidates(): Promise<AutoPostRow[]>
- recentPostsForSub · function · L85-L106 — async function recentPostsForSub(sub: string): Promise<{ titles: string[]; lastPostedAt: Date | null }>
- markPosted · function · L108-L121 — async function markPosted(id: string, postedUrl: string): Promise<void>
- stripFlairFooter · function · L123-L131 — function stripFlairFooter(body: string): { clean: string; flair: string | null }
- runContentAutoPost · function · L133-L208 — async function runContentAutoPost(): Promise<AutoPostResult>
- tickContentAutoPost · function · L211-L225 — async function tickContentAutoPost(): Promise<AutoPostResult>
