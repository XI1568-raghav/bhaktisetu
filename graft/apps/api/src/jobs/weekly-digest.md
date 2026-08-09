# apps\api\src\jobs\weekly-digest.ts

- WeeklyDigestResult · interface · L33-L38 — interface WeeklyDigestResult
- sleep · function · L40-L42 — function sleep(ms: number): Promise<void>
- isSunday9AmIst · function · L44-L52 — function isSunday9AmIst(now: Date): boolean
- DigestContext · interface · L54-L59 — interface DigestContext
- UserRow · interface · L61-L68 — interface UserRow
- digestEmailHtml · function · L70-L152 — function digestEmailHtml(params: { user: UserRow; ctx: DigestContext; weekStartLabel: string; unsubscribeUrl: string; }): { subject: string; html: string; text: string }
- escapeHtml · function · L154-L160 — function escapeHtml(s: string): string
- fetchOptOutSet · function · L162-L172 — async function fetchOptOutSet(): Promise<Set<string>>
- fetchUpcomingAartisForUser · function · L174-L198 — async function fetchUpcomingAartisForUser( userId: string, ): Promise<DigestContext['upcomingAartis']>
- fetchNewContent · function · L200-L216 — async function fetchNewContent(): Promise<DigestContext['newContent']>
- fetchRecommendedPuja · function · L218-L243 — async function fetchRecommendedPuja( user: UserRow, ): Promise<DigestContext['recommendedPuja']>
- fetchPanchang · function · L245-L262 — async function fetchPanchang(): Promise<DigestContext['panchang']>
- runWeeklyDigest · function · L264-L364 — async function runWeeklyDigest(): Promise<WeeklyDigestResult>
- maybeRunWeeklyDigest · function · L371-L401 — async function maybeRunWeeklyDigest( opts: { force?: boolean; now?: Date } = {}, ): Promise<WeeklyDigestResult & { gated?: boolean }>
