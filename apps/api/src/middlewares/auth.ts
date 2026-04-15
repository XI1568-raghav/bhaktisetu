import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin, isDemoMode } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

export interface AuthUser {
  id: string;
  supabaseId: string;
  phone: string;
  email: string | null;
  fullName: string;
  subscriptionTier: string;
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
    if (isDemoMode && token.startsWith('demo-')) {
      request.currentUser = {
        id: 'demo-user-001',
        supabaseId: 'demo-supabase-001',
        phone: '+919876543210',
        email: 'arjun@bhaktisetu.com',
        fullName: 'Arjun Sharma',
        subscriptionTier: 'bhakti_pass',
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

    // Attach user to request
    request.currentUser = {
      id: dbUser.id,
      supabaseId: supabaseUser.id,
      phone: dbUser.phone,
      email: dbUser.email,
      fullName: dbUser.fullName,
      subscriptionTier: dbUser.subscriptionTier,
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
 * Currently supports 'priest' (user has a linked priest record) and 'admin'
 * (based on an admin flag or separate admin table — here we check a simple
 * email allowlist from env for simplicity).
 */
export function requireRole(role: 'priest' | 'admin') {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // authenticateUser must run first
    if (!request.currentUser) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    const userId = request.currentUser.id;

    if (role === 'priest') {
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
    }

    if (role === 'admin') {
      // Simple admin check via environment-configured email allowlist
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const userEmail = request.currentUser.email?.toLowerCase();

      if (!userEmail || !adminEmails.includes(userEmail)) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'This route requires admin privileges.',
        });
        return;
      }
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
