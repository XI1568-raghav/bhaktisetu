# apps\api\src\jobs\outreach-cron.ts

- generatePersonalizedOpener · function · L18-L31 — async function generatePersonalizedOpener(lead: Lead): Promise<string>
- sleep · function · L62-L64 — function sleep(ms: number): Promise<void>
- ensureSendCounterTable · function · L66-L74 — async function ensureSendCounterTable()
- getTodaySendCount · function · L76-L84 — async function getTodaySendCount(): Promise<number>
- bumpTodaySendCount · function · L86-L93 — async function bumpTodaySendCount(): Promise<void>
- OutreachTickResult · interface · L95-L101 — interface OutreachTickResult
- alreadySent · function · L103-L109 — async function alreadySent(leadId: string, templateKey: string): Promise<boolean>
- sendFirstTouch · function · L111-L179 — async function sendFirstTouch(lead: Lead): Promise<{ ok: boolean; error?: string }>
- sendFollowup · function · L181-L209 — async function sendFollowup(lead: Lead, days: 3 | 7 | 14): Promise<{ ok: boolean; error?: string }>
- runOutreachTick · function · L211-L322 — async function runOutreachTick(): Promise<OutreachTickResult>
- remaining · function · L229-L229 — remaining = ()
- throttledSend · function · L231-L240 — async function throttledSend<T>(fn: () => Promise<T>, ok: () => void): Promise<T>
