# apps\api\scripts\leads\_real-contacts-2026-05-02.ts

- RealLead · interface · L23-L34 — interface RealLead
- toRaw · function · L1260-L1278 — function toRaw(r: RealLead): RawLead
- ImportResp · interface · L1280-L1284 — interface ImportResp
- importViaApi · function · L1286-L1336 — async function importViaApi( base: string, token: string, ): Promise<{ inserted: number; skipped: number; total: number }>
- importViaPrisma · function · L1338-L1369 — async function importViaPrisma(): Promise<{ inserted: number; skipped: number; total: number; }>
- maybeRunOutreach · function · L1371-L1383 — async function maybeRunOutreach(base: string, token: string): Promise<void>
- main · function · L1385-L1409 — async function main(): Promise<void>
