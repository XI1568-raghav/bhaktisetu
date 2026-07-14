import { z } from 'zod';
import { getPrisma } from '../prisma.js';
import { isReadOnlyQuery } from '../guard.js';

// The ONLY raw-SQL tool. The query is a hardcoded literal with zero
// interpolation — but we still route it through isReadOnlyQuery() first as
// defense in depth (so a future edit that accidentally interpolates user input
// would be caught by the guard before it hits prod). Tables are the snake_case
// @@map names from schema.prisma.
export const ProdHealthSchema = z.object({}).strict();

const PROD_HEALTH_SQL = `
  SELECT table_name AS table, c.reltuples::bigint AS rows
  FROM information_schema.tables t
  JOIN pg_class c ON c.relname = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN ('users', 'puja_bookings', 'payments', 'donations')
  ORDER BY t.table_name
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
