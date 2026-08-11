# apps\api\src\routes\orgs.ts

- b64url · function · L13-L16 — function b64url(buf: Buffer | string): string
- b64urlDecode · function · L17-L21 — function b64urlDecode(s: string): Buffer
- signToken · function · L22-L26 — function signToken(payload: object, secret: string): string
- verifyToken · function · L27-L40 — function verifyToken<T = unknown>(token: string, secret: string): T | null
- OrgRole · type · L55-L55 — type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';
- Plan · type · L66-L66 — type Plan = keyof typeof PLAN_LIMITS;
- slugify · function · L68-L74 — function slugify(input: string): string
- getMemberRole · function · L92-L99 — async function getMemberRole(orgId: string, userId: string): Promise<OrgRole | null>
- requireOrgRole · function · L107-L121 — function requireOrgRole(minRole: OrgRole)
- orgsRoutes · function · L123-L425 — async function orgsRoutes(server: FastifyInstance)
- Row · type · L170-L173 — type Row = { id: string; name: string; slug: string; plan: Plan; owner_user_id: string; role: OrgRole; created_at: Date; };
- Row · type · L254-L257 — type Row = { id: string; user_id: string; role: OrgRole; joined_at: Date; full_name: string | null; email: string | null; };
