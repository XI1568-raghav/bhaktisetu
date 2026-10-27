import { PrismaClient } from '@prisma/client';
import { applyPoolParams } from './db-tuning.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

// Optional pool tuning from env (DB_CONNECTION_LIMIT, DB_POOL_TIMEOUT,
// DB_CONNECT_TIMEOUT, DB_PGBOUNCER). null when none is set, which leaves the
// client reading DATABASE_URL untouched, as before.
const tunedUrl = applyPoolParams(process.env.DATABASE_URL);

try {
  // R-Q2-E-011: emit `query` events so the slow-query logger + N+1 detector
  // (apps/api/src/db/*) can hook them. Stays cheap — events are noop unless
  // the listener attaches. Set DB_QUERY_INSTRUMENTATION=off to skip listener.
  prismaInstance = globalForPrisma.prisma || new PrismaClient({
    ...(tunedUrl ? { datasourceUrl: tunedUrl } : {}),
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : [{ emit: 'event', level: 'query' }, 'error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
} catch {
  // If Prisma can't connect (no DATABASE_URL), create a client anyway
  // It will throw on actual queries but allows the server to start
  prismaInstance = new PrismaClient();
}

export const prisma = prismaInstance;
