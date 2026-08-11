# apps\api\scripts\verify-mail-dns.ts

- CheckResult · type · L16-L16 — type CheckResult = { name: string; ok: boolean; detail: string };
- checkMx · function · L18-L32 — async function checkMx(): Promise<CheckResult>
- checkSpf · function · L34-L44 — async function checkSpf(): Promise<CheckResult>
- checkDmarc · function · L46-L56 — async function checkDmarc(): Promise<CheckResult>
- main · function · L58-L73 — async function main()
