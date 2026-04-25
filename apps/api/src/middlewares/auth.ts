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
    // Demo mode: accept demo tokens and return a mock user
    // Supports demo-devotee, demo-pandit, demo-store, demo-astrologer,
    // demo-wellness, demo-gaushala, demo-temple, demo-admin
    if (isDemoMode && token.startsWith('demo-')) {
      const roleFromToken = token.replace('demo-', '').toUpperCase();
      const DEMO_ROLE_MAP: Record<string, MarketplaceRole[]> = {
        'DEVOTEE': ['DEVOTEE'],
        'PANDIT': ['PANDIT', 'DEVOTEE'],
        'STORE': ['STORE_OWNER', 'DEVOTEE'],
        'STORE_OWNER': ['STORE_OWNER', 'DEVOTEE'],
        'ASTROLOGER': ['ASTROLOGER', 'DEVOTEE'],
        'WELLNESS': ['WELLNESS_INSTRUCTOR', 'DEVOTEE'],
        'WELLNESS_INSTRUCTOR': ['WELLNESS_INSTRUCTOR', 'DEVOTEE'],
        'GAUSHALA': ['GAUSHALA_MANAGER', 'DEVOTEE'],
        'GAUSHALA_MANAGER': ['GAUSHALA_MANAGER', 'DEVOTEE'],
        'TEMPLE': ['TEMPLE_MANAGER', 'DEVOTEE'],
        'TEMPLE_MANAGER': ['TEMPLE_MANAGER', 'DEVOTEE'],
        'ADMIN': ['ADMIN', 'DEVOTEE'],
      };
      const roles = DEMO_ROLE_MAP[roleFromToken] ?? ['DEVOTEE'];

      request.currentUser = {
        id: 'demo-user-001',
        supabaseId: 'demo-supabase-001',
        phone: '+919876543210',
        email: 'arjun@darshya.online',
        fullName: 'Arjun Sharma',
        subscriptionTier: 'bhakti_pass',
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

      const priest = await prisma.priest.findUnique({
        where: { userId: request.currentUser.id },
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
