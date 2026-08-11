# apps\web\lib\commission-api.ts

- CommissionStatus · type · L12-L17 — type CommissionStatus = | 'pending' | 'processing' | 'paid' | 'failed' | 'on_hold';
- Commission · interface · L19-L36 — interface Commission
- authHeaders · function · L38-L40 — function authHeaders(token: string | undefined): Record<string, string>
- asJson · function · L42-L55 — async function asJson<T>(res: Response): Promise<T>
- unwrapCommissions · function · L57-L65 — function unwrapCommissions(payload: unknown): Commission[]
- ListCommissionOptions · interface · L67-L71 — interface ListCommissionOptions
- listCommissions · function · L73-L88 — async function listCommissions( token: string | undefined, opts: ListCommissionOptions = {}, ): Promise<Commission[]>
- listMyCommissions · function · L90-L95 — async function listMyCommissions( token: string | undefined, status?: CommissionStatus | string, ): Promise<Commission[]>
