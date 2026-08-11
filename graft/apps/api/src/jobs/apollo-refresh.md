# apps\api\src\jobs\apollo-refresh.ts

- LeadRole · type · L25-L30 — type LeadRole = | 'TEMPLE' | 'PRIEST' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA';
- ICP · interface · L32-L36 — interface ICP
- ApolloRefreshResult · interface · L97-L105 — interface ApolloRefreshResult
- UpsertCounts · interface · L107-L110 — interface UpsertCounts
- upsertLead · function · L112-L151 — async function upsertLead( role: LeadRole, person: ApolloPerson, icpVarName: string, ): Promise<'created' | 'existing'>
- fetchAndUpsertIcp · function · L153-L184 — async function fetchAndUpsertIcp(icp: ICP): Promise<{ fetched: number; counts: UpsertCounts; errors: string[]; }>
- refreshApolloLeads · function · L190-L229 — async function refreshApolloLeads(): Promise<ApolloRefreshResult>
- maybeRunApolloRefresh · function · L236-L261 — async function maybeRunApolloRefresh(): Promise<ApolloRefreshResult>
- __resetApolloRefreshCooldown · function · L264-L266 — function __resetApolloRefreshCooldown(): void
