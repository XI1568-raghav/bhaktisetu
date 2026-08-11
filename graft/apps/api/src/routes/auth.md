# apps\api\src\routes\auth.ts

- makeDemoSession · function · L85-L94 — function makeDemoSession(email: string)
- getPrimaryRoleForUser · function · L102-L114 — async function getPrimaryRoleForUser(userId: string): Promise<string>
- normalizePhone · function · L121-L127 — function normalizePhone(phone: string): string
- Bucket · type · L142-L142 — type Bucket = { count: number; windowStart: number };
- bucketOk · function · L145-L155 — function bucketOk(map: Map<string, Bucket>, key: string, max: number): boolean
- setAuthCookies · function · L174-L204 — function setAuthCookies( reply: import('fastify').FastifyReply, accessToken: string, refreshToken: string, ): void
- clearAuthCookies · function · L206-L215 — function clearAuthCookies(reply: import('fastify').FastifyReply): void
- authRoutes · function · L219-L1053 — async function authRoutes(server: FastifyInstance)
- signupHandler · function · L726-L940 — signupHandler = async (request: any, reply: any)
