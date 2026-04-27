/**
 * Quick inspector for the chat tables + demo users on whichever DB
 * DATABASE_URL points to. Same DB Render uses since both share the Supabase
 * pooler URL. Pure read, no writes.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = line.slice(eq + 1).trim();
  }
} catch {}

const p = new PrismaClient();

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
