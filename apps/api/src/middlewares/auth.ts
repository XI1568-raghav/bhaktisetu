import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin, isDemoMode } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

export type MarketplaceRole = 'DEVOTEE' | 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER' | 'ADMIN';

export interface AuthUser {
  id: string;
  supabaseId: string;
  phone: string;
  email: string | null;
  fullName: string;
  subscriptionTier: string;
  roles: MarketplaceRole[];
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthUser;
  }
}

/**
 * Extracts the Bearer token from the Authorization header.
 */
function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Fastify preHandler hook that verifies the JWT with Supabase
 * and attaches the authenticated user from Prisma to the request.
 */
export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractBearerToken(request);

  if (!token) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    });
    return;
  }

  try {
    // Demo tokens (`demo-<handle>-...`). After the chat seed migration we map
    // the handle to a REAL DB user by email so request.currentUser.id is a
    // real UUID — needed for any route that writes Prisma rows linked to the
    // user (conversations, messages, bookings, etc).
    //
    // Token format: `demo-<handle>-...` where handle is the email local-part
    // (devotee, pandit, priest, store, astro, wellness, gaushala, temple,
    // admin). Handles `pandit` and `priest` both map to pandit@demo.com.
    if (token.startsWith('demo-')) {
      const stripped = token.replace(/^demo-/, '').replace(/-token$/, '').replace(/^demo-/, '');
      const DEMO_ROLE_MAP: Record<string, { roles: MarketplaceRole[]; email: string }> = {
        'devotee':  { roles: ['DEVOTEE'],                      email: 'devotee@demo.com' },
        'pandit':   { roles: ['PANDIT', 'DEVOTEE'],            email: 'pandit@demo.com' },
        'priest':   { roles: ['PANDIT', 'DEVOTEE'],            email: 'pandit@demo.com' },
        'store':    { roles: ['STORE_OWNER', 'DEVOTEE'],       email: 'store@demo.com' },
        'astro':    { roles: ['ASTROLOGER', 'DEVOTEE'],        email: 'astro@demo.com' },
        'wellness': { roles: ['WELLNESS_INSTRUCTOR', 'DEVOTEE'], email: 'wellness@demo.com' },
        'gaushala': { roles: ['GAUSHALA_MANAGER', 'DEVOTEE'],  email: 'gaushala@demo.com' },
        'temple':   { roles: ['TEMPLE_MANAGER', 'DEVOTEE'],    email: 'temple@demo.com' },
        'admin':    { roles: ['ADMIN', 'DEVOTEE'],             email: 'admin@demo.com' },
      };
      const handle = stripped.toLowerCase();
      const profile = DEMO_ROLE_MAP[handle] ?? DEMO_ROLE_MAP['devotee']!;

      // Look up the seeded demo user. If the seed hasn't run yet, fall back
      // to the synthetic-id behaviour so non-DB routes (e.g. /consultation/start
      // before the Phase A migration) keep working.
      const dbUser = await prisma.user.findUnique({ where: { email: profile.email } });
      if (dbUser) {
        request.currentUser = {
          id: dbUser.id,
          supabaseId: dbUser.id,
          phone: dbUser.phone,
          email: dbUser.email,
          fullName: dbUser.fullName,
          subscriptionTier: dbUser.subscriptionTier,
          roles: profile.roles,
        };
        return;
      }

      // Fallback (pre-seed) — synthetic id, DB-bound routes will reject these.
      request.currentUser = {
        id: `demo-${handle}`,
        supabaseId: `demo-${handle}`,
        phone: '+919876543210',
        email: profile.email,
        fullName: handle.charAt(0).toUpperCase() + handle.slice(1),
        subscriptionTier: 'bhakti_pass',
        roles: profile.roles,
      };
      return;
    }

    // ── Magic-link / email session token ───────────────────────────
    // Format: email-<userId>-<random32hex>. Tokens are issued by the
    // /auth/magic-link/verify endpoint after a successful email link click.
    if (token.startsWith('email-')) {
      const match = token.match(/^email-([0-9a-f-]{36})-[0-9a-f]{32}$/i);
      if (!match) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email session token.' });
        return;
      }
      const userId = match[1];
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!dbUser) {
        reply.code(401).send({ error: 'Unauthorized', message: 'User not found for session token.' });
        return;
      }
      const roleAssignments = await prisma.userRoleAssignment.findMany({
        where: { userId: dbUser.id },
      });
      let roles: MarketplaceRole[] = roleAssignments.length > 0
        ? roleAssignments.map((ra) => ra.role as MarketplaceRole)
        : ['DEVOTEE'];
      if (!roles.includes('DEVOTEE')) roles.push('DEVOTEE');
      request.currentUser = {
        id: dbUser.id,
        supabaseId: dbUser.id,
        phone: dbUser.phone,
        email: dbUser.email,
        fullName: dbUser.fullName,
        subscriptionTier: dbUser.subscriptionTier,
        roles,
      };
      return;
    }

    // Verify the token with Supabase
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired access token.',
      });
      return;
    }

    // Look up the user in our Prisma database
    const dbUser = await prisma.user.findFirst({
      where: {
        phone: supabaseUser.phone ?? '',
      },
    });

    if (!dbUser) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'User account not found. Please complete registration.',
      });
      return;
    }

    // Fetch user roles
    let roles: MarketplaceRole[] = ['DEVOTEE'];
    try {
      const roleAssignments = await prisma.userRoleAssignment.findMany({
        where: { userId: dbUser.id },
      });
      if (roleAssignments.length > 0) {
        roles = roleAssignments.map((ra) => ra.role as MarketplaceRole);
        if (!roles.includes('DEVOTEE')) roles.push('DEVOTEE');
      }
    } catch {
      // Role table may not exist yet; default to DEVOTEE
    }

    // Check admin email allowlist as fallback
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
    if (dbUser.email && adminEmails.includes(dbUser.email.toLowerCase()) && !roles.includes('ADMIN')) {
      roles.push('ADMIN');
    }

    // Attach user to request
    request.currentUser = {
      id: dbUser.id,
      supabaseId: supabaseUser.id,
      phone: dbUser.phone,
      email: dbUser.email,
      fullName: dbUser.fullName,
      subscriptionTier: dbUser.subscriptionTier,
      roles,
    };
  } catch (err) {
    request.log.error(err, 'Auth middleware error');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Authentication service unavailable.',
    });
  }
}

/**
 * Factory for a preHandler hook that checks if the user has a specific role.
 * Supports legacy roles ('priest', 'admin') and new marketplace roles.
 */
export function requireRole(role: 'priest' | 'admin' | MarketplaceRole) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // authenticateUser must run first
    if (!request.currentUser) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    const userRoles = request.currentUser.roles ?? [];

    // Legacy 'priest' role check
    if (role === 'priest') {
      if (userRoles.includes('PANDIT')) return;

      // Synthetic ids (`demo-*`, `anon-*`) are not real UUIDs — Prisma's
      // uuid validator rejects them, so don't attempt a DB lookup. Fall
      // back to the role list above. Caught in production by Sentry as
      // "Inconsistent column data: Error creating UUID, ...".
      const userId = request.currentUser.id;
      if (userId.startsWith('demo-') || userId.startsWith('anon-')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'This route requires an active priest account.',
        });
        return;
      }

      const priest = await prisma.priest.findUnique({
        where: { userId },
      });

      if (!priest || priest.status !== 'active') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'This route requires an active priest account.',
        });
        return;
      }
      return;
    }

    // Legacy 'admin' check + role-based check
    if (role === 'admin' || role === 'ADMIN') {
      if (userRoles.includes('ADMIN')) return;

      // Fallback: email allowlist
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const userEmail = request.currentUser.email?.toLowerCase();

      if (userEmail && adminEmails.includes(userEmail)) return;

      reply.code(403).send({
        error: 'Forbidden',
        message: 'This route requires admin privileges.',
      });
      return;
    }

    // Marketplace role check
    if (!userRoles.includes(role)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `This route requires the ${role} role.`,
      });
      return;
    }
  };
}

/**
 * Factory for a preHandler hook that checks if the user has ANY of the given roles.
 */
export function requireAnyRole(...roles: MarketplaceRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.currentUser) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    const userRoles = request.currentUser.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `This route requires one of: ${roles.join(', ')}`,
      });
      return;
    }
  };
}

/**
 * Registers the authentication decorator on the Fastify instance.
 * Call this once during server bootstrap.
 */
export async function registerAuthDecorators(server: FastifyInstance): Promise<void> {
  server.decorateRequest('currentUser', undefined);
}
