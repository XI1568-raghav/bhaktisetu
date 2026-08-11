# apps\api\scripts\ops\cs007-reset-stale-temple-leads.ts

- StaleLead · interface · L31-L36 — interface StaleLead
- RunSummary · interface · L38-L42 — interface RunSummary
- assertPositiveInt · function · L44-L48 — function assertPositiveInt(name: string, n: number): void
- selectStaleLeadsSql · function · L50-L64 — function selectStaleLeadsSql(limit = 200): string
- cs005UnsentGuardSql · function · L66-L77 — function cs005UnsentGuardSql(): string
- buildResetUpdate · function · L79-L104 — function buildResetUpdate( lead: StaleLead, nowIso: string, ): { sql: string; params: Array<string | number> }
- buildAuditLogInsert · function · L106-L118 — function buildAuditLogInsert( leadId: string, nowIso: string, ): { sql: string; params: Array<string> }
- CliArgs · interface · L120-L123 — interface CliArgs
- parseArgs · function · L125-L144 — function parseArgs(argv: string[]): CliArgs
- summarize · function · L146-L148 — function summarize(input: RunSummary): RunSummary
- PgClient · interface · L150-L153 — interface PgClient
- loadPgClient · function · L155-L165 — async function loadPgClient(databaseUrl: string): Promise<PgClient>
- main · function · L167-L271 — async function main(): Promise<void>
