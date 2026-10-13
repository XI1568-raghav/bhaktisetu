import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { uuidParamGuard } from '../lib/uuid.js';
import { authenticateUser } from '../middlewares/auth.js';
import { sendEmail } from '../lib/email.js';

/**
 * Tiny self-contained signed-token helper. We avoid adding `jsonwebtoken`
 * as a dep — payload is a base64url(JSON) body + HMAC-SHA256 signature.
 * Format: `<base64url(payload)>.<base64url(signature)>`.
 */
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf as Buffer).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}
function signToken(payload: object, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}
function verifyToken<T = unknown>(token: string, secret: string): T | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const obj = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (typeof obj.exp === 'number' && obj.exp * 1000 < Date.now()) return null;
    return obj as T;
  } catch {
    return null;
  }
}

/**
 * Layer AM — Multi-tenant Org B2B SaaS routes.
 *
 * Each Temple Trust (or other operator) gets an Org with members + roles.
 * Roles: OWNER (full control + billing), ADMIN (manage members + content),
 * MEMBER (read-only / scoped operator).
 *
 * Raw SQL is used so the route works without a `prisma generate` cycle —
 * matches the pattern in donations.ts / ratings.ts / provider-kyc.ts.
 *
 * Invite tokens are signed JWTs (env: ORG_INVITE_SECRET, 7-day expiry).
 */

type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

const ORG_INVITE_SECRET = process.env.ORG_INVITE_SECRET || 'dev-invite-secret-do-not-use-in-prod';
const ORG_INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;

const PLAN_LIMITS = {
  free: 1,
  pro: 5,
  enterprise: Number.POSITIVE_INFINITY,
} as const;

type Plan = keyof typeof PLAN_LIMITS;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `org-${crypto.randomBytes(3).toString('hex')}`;
}

const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional().default('free'),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const roleChangeSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

/** Look up the requesting user's role on a given org. Null = not a member. */
async function getMemberRole(orgId: string, userId: string): Promise<OrgRole | null> {
  const rows = await prisma.$queryRawUnsafe<{ role: OrgRole }[]>(
    `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
    orgId,
    userId,
  );
  return rows[0]?.role ?? null;
}

/**
 * Fastify preHandler factory. Caller provides the minimum required role.
 * Hierarchy: OWNER > ADMIN > MEMBER. Reads :id (or :orgId) from params.
 *
 * Wire from other routes: `{ preHandler: [authenticateUser, requireOrgRole('ADMIN')] }`
 */
export function requireOrgRole(minRole: OrgRole) {
  const rank: Record<OrgRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    const params = request.params as { id?: string; orgId?: string };
    const orgId = params.id ?? params.orgId;
    if (!orgId) return reply.code(400).send({ error: 'orgId required in path' });
    const role = await getMemberRole(orgId, userId);
    if (!role) return reply.code(403).send({ error: 'NotOrgMember' });
    if (rank[role] < rank[minRole]) {
      return reply.code(403).send({ error: 'InsufficientRole', required: minRole, actual: role });
    }
  };
}

export async function orgsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);

  // ── POST /orgs — create new org (current user becomes OWNER) ───────
  server.post('/', async (request, reply) => {
    const userId = request.currentUser!.id;
    const parsed = createOrgSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BadRequest', issues: parsed.error.issues });
    }
    const { name, plan } = parsed.data;
    let slug = parsed.data.slug ?? slugify(name);

    // Ensure slug uniqueness — append short suffix on collision.
    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM orgs WHERE slug = $1 LIMIT 1`,
      slug,
    );
    if (existing.length > 0) {
      slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const created = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO orgs (name, slug, owner_user_id, plan)
       VALUES ($1, $2, $3::uuid, $4)
       RETURNING id`,
      name,
      slug,
      userId,
      plan,
    );
    const orgId = created[0]!.id;

    await prisma.$executeRawUnsafe(
      `INSERT INTO org_members (org_id, user_id, role, invited_by)
       VALUES ($1::uuid, $2::uuid, 'OWNER', $2::uuid)
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      orgId,
      userId,
    );

    return reply.send({ id: orgId, name, slug, plan, role: 'OWNER' });
  });

  // ── GET /orgs/my — list orgs current user belongs to ───────────────
  server.get('/my', async (request) => {
    const userId = request.currentUser!.id;
    type Row = {
      id: string; name: string; slug: string; plan: Plan;
      owner_user_id: string; role: OrgRole; created_at: Date;
    };
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT o.id, o.name, o.slug, o.plan, o.owner_user_id, o.created_at, m.role
         FROM orgs o
         JOIN org_members m ON m.org_id = o.id
        WHERE m.user_id = $1::uuid
        ORDER BY o.created_at DESC`,
      userId,
    );
    return { orgs: rows };
  });

  // ── POST /orgs/:id/invite — issue invite link + email ──────────────
  server.post<{ Params: { id: string } }>(
    '/:id/invite',
    { preHandler: [requireOrgRole('ADMIN')] },
    async (request, reply) => {
      const orgId = request.params.id;
      const userId = request.currentUser!.id;
      const parsed = inviteSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'BadRequest', issues: parsed.error.issues });
      }
      const { email, role } = parsed.data;

      const orgRows = await prisma.$queryRawUnsafe<{ name: string; slug: string }[]>(
        `SELECT name, slug FROM orgs WHERE id = $1::uuid LIMIT 1`,
        orgId,
      );
      if (orgRows.length === 0) return reply.code(404).send({ error: 'OrgNotFound' });
      const org = orgRows[0]!;

      const expiresAt = new Date(Date.now() + ORG_INVITE_TTL_SECONDS * 1000);
      const token = signToken(
        {
          orgId,
          email: email.toLowerCase(),
          role,
          kind: 'org-invite',
          exp: Math.floor(expiresAt.getTime() / 1000),
        },
        ORG_INVITE_SECRET,
      );

      await prisma.$executeRawUnsafe(
        `INSERT INTO org_invites (org_id, email, role, token, invited_by, expires_at)
         VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6)`,
        orgId,
        email.toLowerCase(),
        role,
        token,
        userId,
        expiresAt,
      );

      const baseUrl = process.env.WEB_URL || 'https://darshya.online';
      const link = `${baseUrl}/org/accept?token=${encodeURIComponent(token)}`;
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2>You've been invited to join ${org.name}</h2>
          <p>Role: <strong>${role}</strong></p>
          <p><a href="${link}" style="background:#c2410c;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">Accept invite</a></p>
          <p style="color:#666;font-size:12px;">Link expires in 7 days. If you didn't expect this, ignore this email.</p>
        </div>`;
      await sendEmail({
        to: email,
        subject: `Invitation to join ${org.name} on Darshya`,
        html,
        text: `You've been invited to join ${org.name} as ${role}. Accept: ${link}`,
      });

      return reply.send({ ok: true, expiresAt: expiresAt.toISOString(), inviteLink: link });
    },
  );

  // ── GET /orgs/:id/members — list members ───────────────────────────
  server.get<{ Params: { id: string } }>(
    '/:id/members',
    { preHandler: [requireOrgRole('MEMBER')] },
    async (request) => {
      const orgId = request.params.id;
      type Row = {
        id: string; user_id: string; role: OrgRole;
        joined_at: Date; full_name: string | null; email: string | null;
      };
      const rows = await prisma.$queryRawUnsafe<Row[]>(
        `SELECT m.id, m.user_id, m.role, m.joined_at,
                u."fullName" as full_name, u.email
           FROM org_members m
           LEFT JOIN users u ON u.id = m.user_id
          WHERE m.org_id = $1::uuid
          ORDER BY
            CASE m.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END,
            m.joined_at ASC`,
        orgId,
      );
      return { members: rows };
    },
  );

  // ── POST /orgs/:id/members/:userId/role — change role (OWNER only) ─
  server.post<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId/role',
    { preHandler: [requireOrgRole('OWNER')] },
    async (request, reply) => {
      const { id: orgId, userId: targetUserId } = request.params;
      const parsed = roleChangeSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'BadRequest', issues: parsed.error.issues });
      }
      const { role } = parsed.data;

      // If transferring OWNER, demote the current owner to ADMIN to keep
      // the unique-owner invariant logical (orgs.owner_user_id stays
      // pointed at the new OWNER).
      if (role === 'OWNER') {
        await prisma.$executeRawUnsafe(
          `UPDATE org_members SET role = 'ADMIN'
            WHERE org_id = $1::uuid AND role = 'OWNER' AND user_id <> $2::uuid`,
          orgId,
          targetUserId,
        );
        await prisma.$executeRawUnsafe(
          `UPDATE orgs SET owner_user_id = $2::uuid WHERE id = $1::uuid`,
          orgId,
          targetUserId,
        );
      }

      const result = await prisma.$executeRawUnsafe(
        `UPDATE org_members SET role = $3
          WHERE org_id = $1::uuid AND user_id = $2::uuid`,
        orgId,
        targetUserId,
        role,
      );
      if (result === 0) return reply.code(404).send({ error: 'MemberNotFound' });
      return reply.send({ ok: true, role });
    },
  );

  // ── DELETE /orgs/:id/members/:userId ───────────────────────────────
  server.delete<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId',
    { preHandler: [uuidParamGuard('id', 'userId'), requireOrgRole('ADMIN')] },
    async (request, reply) => {
      const { id: orgId, userId: targetUserId } = request.params;

      // Refuse to remove the OWNER row — would orphan the org.
      const targetRows = await prisma.$queryRawUnsafe<{ role: OrgRole }[]>(
        `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
        orgId,
        targetUserId,
      );
      if (targetRows.length === 0) return reply.code(404).send({ error: 'MemberNotFound' });
      if (targetRows[0]!.role === 'OWNER') {
        return reply.code(400).send({ error: 'CannotRemoveOwner', message: 'Transfer ownership first.' });
      }

      // Non-OWNER admins cannot remove other ADMINs — only the OWNER can.
      const requesterRole = await getMemberRole(orgId, request.currentUser!.id);
      if (targetRows[0]!.role === 'ADMIN' && requesterRole !== 'OWNER') {
        return reply.code(403).send({ error: 'OwnerRequiredToRemoveAdmin' });
      }

      await prisma.$executeRawUnsafe(
        `DELETE FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
        orgId,
        targetUserId,
      );
      return reply.send({ ok: true });
    },
  );

  // ── POST /orgs/accept-invite?token=... — join via invite link ──────
  server.post<{ Querystring: { token?: string } }>(
    '/accept-invite',
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const userEmail = request.currentUser!.email?.toLowerCase() ?? null;
      const token = request.query.token;
      if (!token) return reply.code(400).send({ error: 'TokenRequired' });

      const payload = verifyToken<{
        orgId: string; email: string; role: 'ADMIN' | 'MEMBER'; kind: string;
      }>(token, ORG_INVITE_SECRET);
      if (!payload) return reply.code(400).send({ error: 'InvalidOrExpiredToken' });
      if (payload.kind !== 'org-invite') {
        return reply.code(400).send({ error: 'WrongTokenKind' });
      }

      // Email match — prevent ticket sharing between accounts.
      if (userEmail && userEmail !== payload.email.toLowerCase()) {
        return reply.code(403).send({
          error: 'EmailMismatch',
          message: 'This invite was issued to a different email address.',
        });
      }

      const inviteRows = await prisma.$queryRawUnsafe<{ id: string; accepted_at: Date | null; expires_at: Date }[]>(
        `SELECT id, accepted_at, expires_at FROM org_invites WHERE token = $1 LIMIT 1`,
        token,
      );
      if (inviteRows.length === 0) return reply.code(404).send({ error: 'InviteNotFound' });
      const invite = inviteRows[0]!;
      if (invite.accepted_at) return reply.code(400).send({ error: 'AlreadyAccepted' });
      if (new Date(invite.expires_at).getTime() < Date.now()) {
        return reply.code(400).send({ error: 'Expired' });
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO org_members (org_id, user_id, role, invited_by)
         VALUES ($1::uuid, $2::uuid, $3, NULL)
         ON CONFLICT (org_id, user_id) DO NOTHING`,
        payload.orgId,
        userId,
        payload.role,
      );
      await prisma.$executeRawUnsafe(
        `UPDATE org_invites SET accepted_at = now() WHERE id = $1::uuid`,
        invite.id,
      );

      return reply.send({ ok: true, orgId: payload.orgId, role: payload.role });
    },
  );

  // ── GET /orgs/:id/plan-status — quota usage for plan tier ──────────
  server.get<{ Params: { id: string } }>(
    '/:id/plan-status',
    { preHandler: [requireOrgRole('MEMBER')] },
    async (request) => {
      const orgId = request.params.id;
      const orgRows = await prisma.$queryRawUnsafe<{ plan: Plan }[]>(
        `SELECT plan FROM orgs WHERE id = $1::uuid LIMIT 1`,
        orgId,
      );
      const plan = (orgRows[0]?.plan ?? 'free') as Plan;
      const templeRows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint as count FROM temples WHERE org_id = $1::uuid`,
        orgId,
      );
      const templeCount = Number(templeRows[0]?.count ?? 0);
      const limit = PLAN_LIMITS[plan];
      return {
        plan,
        templeCount,
        templeLimit: limit === Number.POSITIVE_INFINITY ? null : limit,
        atLimit: templeCount >= limit,
      };
    },
  );
}
