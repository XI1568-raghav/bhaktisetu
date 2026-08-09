# apps\api\src\lib\ai-usage.ts

- memGet · function · L35-L43 — function memGet(key: string): number | null
- memSet · function · L45-L47 — function memSet(key: string, value: number, ttlSeconds: number): void
- counterGet · function · L49-L53 — async function counterGet(key: string): Promise<number>
- counterIncr · function · L55-L60 — async function counterIncr(key: string, ttlSeconds: number): Promise<number>
- ActivePlan · interface · L64-L68 — interface ActivePlan
- getActivePlan · function · L77-L99 — async function getActivePlan(userId: string): Promise<ActivePlan | null>
- UsageDecision · type · L103-L105 — type UsageDecision = | { allowed: true; plan: 'free' | 'session' | 'monthly'; remaining: number | null; limit: number | null } | { allowed: false; reason: 'limit_reached'; plan: 'free' | 'session'; used: number; limit: number };
- isAnonymous · function · L107-L109 — function isAnonymous(userId: string): boolean
- monthKey · function · L111-L113 — function monthKey(d = new Date()): string
- canSendMessage · function · L119-L142 — async function canSendMessage(userId: string): Promise<UsageDecision>
- recordMessage · function · L149-L167 — async function recordMessage(userId: string): Promise<void>
- getUsageSummary · function · L172-L191 — async function getUsageSummary(userId: string): Promise<{ plan: 'free' | 'session' | 'monthly' | 'anonymous'; used: number; limit: number | null; remaining: number | null; }>
