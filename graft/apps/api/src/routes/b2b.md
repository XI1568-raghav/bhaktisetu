# apps\api\src\routes\b2b.ts

- B2BApiKeyRecord · type · L28-L39 — type B2BApiKeyRecord = { id: string; orgName: string; contactEmail: string; keyPrefix: string; keyHash: string; scopes: string[]; rpmLimit: number; active: boolean; lastUsedAt: Date | null; revokedAt: Date | null; };
- sha256 · function · L47-L49 — function sha256(s: string): string
- lookupDevKey · function · L51-L66 — function lookupDevKey(key: string): B2BApiKeyRecord | null
- lookupDbKey · function · L70-L73 — async function lookupDbKey(_key: string): Promise<B2BApiKeyRecord | null>
- resolveApiKey · function · L75-L80 — async function resolveApiKey(rawKey: string): Promise<B2BApiKeyRecord | null>
- RateState · type · L84-L84 — type RateState = { count: number; windowStartMs: number };
- checkRate · function · L88-L101 — function checkRate(keyId: string, limit: number): { ok: true } | { ok: false; retryAfterSec: number }
- FastifyRequest · interface · L106-L108 — interface FastifyRequest
- authenticateB2B · function · L113-L132 — async function authenticateB2B(req: FastifyRequest, reply: FastifyReply)
- requireScope · function · L134-L140 — function requireScope(scope: string)
- maskEmail · function · L144-L147 — function maskEmail(email: string | null | undefined): string | null
- maskPhone · function · L149-L153 — function maskPhone(phone: string | null | undefined): string | null
- b2bRoutes · function · L157-L247 — async function b2bRoutes(server: FastifyInstance)
