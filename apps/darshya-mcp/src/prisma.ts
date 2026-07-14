import { PrismaClient } from '@prisma/client';
import { loadEnv } from './env.js';

// Read-only client. We deliberately do NOT attach query-event instrumentation
// (apps/api/src/lib/prisma.ts does, for the N+1 detector — MCP has no need and
// it keeps the client cheap). The read-only guarantee is enforced by guard.ts
// for raw SQL, and by only ever calling findFirst/findMany/count/aggregate for
// Prisma-typed queries.
let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    const { DIRECT_URL } = loadEnv();
    client = new PrismaClient({ datasourceUrl: DIRECT_URL });
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
