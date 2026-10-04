/**
 * Quick inspector for the chat tables + demo users on whichever DB
 * DATABASE_URL points to. Same DB Render uses since both share the Supabase
 * pooler URL. Pure read, no writes.
 */
import { PrismaClient } from '@prisma/client';
// @ts-expect-error — plain-node ESM helper, no types; apps/api/tsconfig.json
// only type-checks src/**, so scripts/** is not compiled.
import { resolveDbTargetOrExit } from './lib/resolve-db-target.mjs';

// OPS-14 (F456). This used to overlay `.env` with `if (!process.env[k])`, which
// never overrides — so an ambient shell DATABASE_URL always won — and then
// constructed a bare `new PrismaClient()`, whose datasource is whatever
// `@prisma/client` loaded from apps/api/.env at import time. Nothing in the
// output said which database answered. It now resolves from a named env file
// (default `.env`, the same file it always read) and announces the host.
const { url } = resolveDbTargetOrExit({
  argv: process.argv.slice(2).includes('--env-file')
    ? process.argv.slice(2)
    : ['--env-file', '.env', ...process.argv.slice(2)],
});

const p = new PrismaClient({ datasourceUrl: url });

async function main() {
  const tables = await p.$queryRawUnsafe<Array<{ table_name: string }>>(
    `select table_name from information_schema.tables where table_schema='public' and table_name like 'chat_%' order by table_name`,
  );
  console.log('chat tables:', tables.map((t) => t.table_name));

  const users = await p.$queryRawUnsafe<Array<{ email: string; id: string; full_name: string }>>(
    `select email, id, full_name from users where email like '%@demo.com' order by email`,
  );
  console.log('demo users (' + users.length + '):');
  for (const u of users) console.log('  ' + u.email + ' -> ' + u.id + ' (' + u.full_name + ')');

  const convs = await p.$queryRawUnsafe<Array<{ n: number }>>(
    `select count(*)::int as n from chat_conversations`,
  );
  console.log('chat_conversations rows:', convs[0]?.n);

  const msgs = await p.$queryRawUnsafe<Array<{ n: number }>>(
    `select count(*)::int as n from chat_messages`,
  );
  console.log('chat_messages rows:', msgs[0]?.n);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
