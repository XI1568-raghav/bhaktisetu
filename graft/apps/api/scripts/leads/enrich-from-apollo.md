# apps\api\scripts\leads\enrich-from-apollo.ts

- Role · type · L50-L55 — type Role = | 'TEMPLE' | 'PRIEST' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA';
- ICP · interface · L57-L61 — interface ICP
- ApolloLeadRow · interface · L121-L130 — interface ApolloLeadRow
- todayIso · function · L132-L134 — function todayIso(): string
- dedupeByEmail · function · L136-L146 — function dedupeByEmail(rows: ApolloLeadRow[]): ApolloLeadRow[]
- fetchIcp · function · L148-L176 — async function fetchIcp(icp: ICP): Promise<ApolloLeadRow[]>
- tsLiteral · function · L178-L181 — function tsLiteral(v: string | null): string
- renderRows · function · L183-L200 — function renderRows(rows: ApolloLeadRow[]): string
- renderFile · function · L202-L219 — function renderFile( date: string, buckets: Record<ICP['varName'], ApolloLeadRow[]>, ): string
- main · function · L221-L279 — async function main(): Promise<void>
