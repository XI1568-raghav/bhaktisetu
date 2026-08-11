# apps\api\scripts\leads\import-leads.ts

- Source · type · L27-L27 — type Source = 'manual' | 'apollo' | 'both' | 'bengaluru-pandits';
- ManualLead · interface · L29-L40 — interface ManualLead
- ApolloLeadShape · interface · L42-L51 — interface ApolloLeadShape
- ManualBucket · interface · L53-L56 — interface ManualBucket
- ApolloBucket · interface · L58-L61 — interface ApolloBucket
- resolveSource · function · L63-L67 — function resolveSource(): Source
- findLatestApolloFile · function · L69-L81 — function findLatestApolloFile(dir: string): string | null
- manualToRaw · function · L83-L101 — function manualToRaw(r: ManualLead): RawLead
- apolloToRaw · function · L103-L121 — function apolloToRaw(r: ApolloLeadShape): RawLead
- importManual · function · L123-L138 — async function importManual(): Promise<{ inserted: number; skipped: number }>
- BengaluruPanditShape · interface · L140-L155 — interface BengaluruPanditShape
- BengaluruPanditBucket · interface · L157-L160 — interface BengaluruPanditBucket
- bengaluruPanditToRaw · function · L162-L185 — function bengaluruPanditToRaw(r: BengaluruPanditShape): RawLead
- importBengaluruPandits · function · L187-L207 — async function importBengaluruPandits(): Promise<{ inserted: number; skipped: number; }>
- importApollo · function · L209-L233 — async function importApollo( dir: string, ): Promise<{ inserted: number; skipped: number }>
- main · function · L235-L266 — async function main(): Promise<void>
