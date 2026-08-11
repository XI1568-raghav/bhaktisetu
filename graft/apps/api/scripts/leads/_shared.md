# apps\api\scripts\leads\_shared.ts

- sleep · function · L23-L23 — sleep = (ms: number)
- RawLead · interface · L27-L38 — interface RawLead
- politeFetch · function · L40-L55 — async function politeFetch( url: string, init?: RequestInit & { fetchImpl?: typeof fetch }, ): Promise<Response>
- normalizePhone · function · L57-L62 — function normalizePhone(p?: string | null): string | null
- normalizeEmail · function · L64-L68 — function normalizeEmail(e?: string | null): string | null
- UpsertResult · interface · L70-L73 — interface UpsertResult
- upsertLead · function · L80-L124 — async function upsertLead( client: Pick<PrismaClient, 'lead'>, role: LeadRole, raw: RawLead, ): Promise<'created' | 'skipped'>
- runScrape · function · L126-L146 — async function runScrape( role: LeadRole, scraperName: string, fn: (ctx: { upsert: (raw: RawLead) => Promise<'created' | 'skipped'> }) => Promise<void>, ): Promise<UpsertResult>
- upsert · function · L133-L138 — upsert = async (raw: RawLead)
