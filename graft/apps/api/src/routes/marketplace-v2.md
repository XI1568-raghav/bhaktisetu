# apps\api\src\routes\marketplace-v2.ts

- ensureTables · function · L33-L53 — async function ensureTables()
- hashKey · function · L55-L57 — function hashKey(key: string): string
- generateKey · function · L59-L63 — function generateKey(): { key: string; hash: string; prefix: string }
- checkRateLimit · function · L68-L78 — function checkRateLimit(keyHash: string, perMin: number): boolean
- authenticateKey · function · L80-L99 — async function authenticateKey( headerVal: string | undefined, ): Promise<{ id: string; scopes: string[]; rate_limit_per_min: number } | null>
- marketplaceV2Routes · function · L101-L174 — async function marketplaceV2Routes(server: FastifyInstance)
- requireApiKey · function · L104-L114 — requireApiKey = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply)
- marketplaceAdminRoutes · function · L185-L229 — async function marketplaceAdminRoutes(server: FastifyInstance)
