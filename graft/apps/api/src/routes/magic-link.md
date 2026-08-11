# apps\api\src\routes\magic-link.ts

- signToken · function · L48-L54 — function signToken(email: string): { token: string; expiresAt: number }
- verifyToken · function · L56-L96 — function verifyToken(token: string): { email: string; expiresAt: number } | null
- magicLinkRoutes · function · L98-L182 — async function magicLinkRoutes(server: FastifyInstance)
