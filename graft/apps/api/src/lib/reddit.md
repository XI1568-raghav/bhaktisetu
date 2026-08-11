# apps\api\src\lib\reddit.ts

- RedditConfig · interface · L20-L26 — interface RedditConfig
- readConfig · function · L28-L37 — function readConfig(): RedditConfig | null
- isRedditConfigured · function · L39-L41 — function isRedditConfigured(): boolean
- CachedToken · interface · L43-L46 — interface CachedToken
- getAccessToken · function · L49-L90 — async function getAccessToken(cfg: RedditConfig): Promise<string | null>
- safeText · function · L92-L98 — async function safeText(res: Response): Promise<string>
- SubmitPostInput · interface · L100-L105 — interface SubmitPostInput
- SubmitPostResult · interface · L107-L113 — interface SubmitPostResult
- normaliseSub · function · L115-L117 — function normaliseSub(sub: string): string
- submitRedditPost · function · L119-L175 — async function submitRedditPost(input: SubmitPostInput): Promise<SubmitPostResult>
- __resetRedditTokenCache · function · L178-L180 — function __resetRedditTokenCache(): void
