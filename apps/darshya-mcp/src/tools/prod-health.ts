import { z } from 'zod';
import { getPrisma } from '../prisma.js';
import { isReadOnlyQuery } from '../guard.js';

// The ONLY raw-SQL tool. The query is a hardcoded literal with zero
// interpolation — but we still route it through isReadOnlyQuery() first as
// defense in depth (so a future edit that accidentally interpolates user input
// would be caught by the guard before it hits prod). Tables are the snake_case
// @@map names from schema.prisma.
//
// We use real COUNT(*) per table, NOT pg_class.reltuples. reltuples is a stale
// ANALYZE estimate that returns -1 for never-analyzed tables and undercounts
// young prod tables badly (e.g. reported 8 users when the real count was 32).
// A founder-facing health check must show actual row counts, so we pay for 4
// COUNTs (one round-trip via UNION ALL) for accuracy.
export const ProdHealthSchema = z.object({}).strict();

const PROD_HEALTH_SQL = `
  SELECT 'users' AS table, COUNT(*)::bigint AS rows FROM "users"
  UNION ALL SELECT 'puja_bookings', COUNT(*)::bigint FROM "puja_bookings"
  UNION ALL SELECT 'payments', COUNT(*)::bigint FROM "payments"
  UNION ALL SELECT 'donations', COUNT(*)::bigint FROM "donations"
`;

export async function prodHealth(_args: z.infer<typeof ProdHealthSchema>) {
  // Defense in depth: refuse to run if the SQL somehow isn't read-only.
  if (!isReadOnlyQuery(PROD_HEALTH_SQL)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            { ok: false, error: 'Refused: prod_health SQL failed read-only guard.' },
            null,
            2,
          ),
        },
      ],
    };
  }
  const prisma = getPrisma();
  try {
    const rows = await prisma.$queryRawUnsafe<{ table: string; rows: bigint }[]>(PROD_HEALTH_SQL);
    const tables: Record<string, number> = {};
    for (const row of rows) {
      tables[row.table] = Number(row.rows);
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ ok: true, tables, checkedAt: new Date().toISOString() }, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ ok: false, error: (err as Error).message }, null, 2),
        },
      ],
    };
  }
}

export const prodHealthToolDef = {
  name: 'prod_health',
  description:
    "Check Darshya prod DB health: row counts for users, puja_bookings, payments, donations. Read-only (routed through the SQL guard). Use for 'is prod up / how many rows?'",
  inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
};
