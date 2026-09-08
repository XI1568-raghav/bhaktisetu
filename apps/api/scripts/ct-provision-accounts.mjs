#!/usr/bin/env node
/**
 * Provision REAL prod test accounts, one per UserRole, for the customer test.
 *
 * Why not the existing demo accounts: `middlewares/auth.ts` hard-rejects
 * `demo-*` tokens whenever NODE_ENV=production (shouldRejectDemoTokensInProd),
 * with a test asserting it. So prod testing needs accounts that authenticate
 * through the normal Supabase email+password path.
 *
 * Model (verified in source, not assumed):
 *   - Credentials live in Supabase Auth. Created here with email_confirm:true
 *     so no inbox round-trip is needed.
 *   - `middlewares/auth.ts:443` resolves `User.id = supabaseUser.id` first, so
 *     the Prisma row is created with the SAME uuid.
 *   - Roles come from `user_role_assignments`. `auth.ts:588` returns early on
 *     `userRoles.includes('ADMIN')`, so an ADMIN row is sufficient — ADMIN_EMAILS
 *     is an additional path, not the only one. No Render env change required.
 *
 * Passwords are NOT written into the repo. They come from CT_TEST_PASSWORD and
 * the credential file is written outside the repo (--out).
 *
 *   CT_TEST_PASSWORD='...' node provision-accounts.mjs --out <path>   # create
 *   CT_TEST_PASSWORD='...' node provision-accounts.mjs --teardown     # remove
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');  // apps/api/scripts -> repo root
const argv = process.argv.slice(2);
const TEARDOWN = argv.includes('--teardown');
const OUT = argv[argv.indexOf('--out') + 1];

// Load apps/api/.env.production without a dotenv dependency (same pattern as
// scripts/seed-demo-users.ts). DIRECT_URL, not the pooled URL, for writes.
const envPath = resolve(HERE, '../.env.production');
for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq < 0) continue;
  const k = line.slice(0, eq).trim();
  let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const PASSWORD = process.env.CT_TEST_PASSWORD;
if (!PASSWORD) {
  console.error('CT_TEST_PASSWORD is required (8+ chars, >=1 letter, >=1 digit).');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.production');
  process.exit(1);
}

// `ct+` prefix so every artifact of this run is greppable and removable in one
// pass. Real inboxes are never touched.
const ACCOUNTS = [
  { email: 'ct+devotee@darshya.online',  role: 'DEVOTEE',             fullName: 'CT Devotee',   phone: '+919000000101' },
  { email: 'ct+pandit@darshya.online',   role: 'PANDIT',              fullName: 'CT Pandit',    phone: '+919000000102' },
  { email: 'ct+store@darshya.online',    role: 'STORE_OWNER',         fullName: 'CT Store',     phone: '+919000000103' },
  { email: 'ct+astro@darshya.online',    role: 'ASTROLOGER',          fullName: 'CT Astro',     phone: '+919000000104' },
  { email: 'ct+wellness@darshya.online', role: 'WELLNESS_INSTRUCTOR', fullName: 'CT Wellness',  phone: '+919000000105' },
  { email: 'ct+gaushala@darshya.online', role: 'GAUSHALA_MANAGER',    fullName: 'CT Gaushala',  phone: '+919000000106' },
  { email: 'ct+temple@darshya.online',   role: 'TEMPLE_MANAGER',      fullName: 'CT Temple',    phone: '+919000000107' },
  { email: 'ct+admin@darshya.online',    role: 'ADMIN',               fullName: 'CT Admin',     phone: '+919000000108' },
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function findAuthUserByEmail(email) {
  // listUsers is paginated; ct+ accounts are new so scan a few pages at most.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function teardown() {
  for (const a of ACCOUNTS) {
    const existing = await findAuthUserByEmail(a.email);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
      console.log(`  supabase deleted ${a.email}`);
    }
    const dbUser = await prisma.user.findUnique({ where: { email: a.email } });
    if (dbUser) {
      await prisma.userRoleAssignment.deleteMany({ where: { userId: dbUser.id } });
      await prisma.user.delete({ where: { id: dbUser.id } }).catch((e) => {
        // A user with bookings/payments cannot be hard-deleted; leave it blocked
        // rather than cascading into another devotee's records.
        console.log(`  ! ${a.email} has dependent rows, blocking instead: ${e.code || e.message}`);
        return prisma.user.update({ where: { id: dbUser.id }, data: { blocked: true, blockedReason: 'customer-test teardown' } });
      });
      console.log(`  db removed ${a.email}`);
    }
  }
}

async function provision() {
  const out = [];
  for (const a of ACCOUNTS) {
    let authUser = await findAuthUserByEmail(a.email);
    if (authUser) {
      // Re-run: force the password so the credential file is always accurate.
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(`${a.email} update: ${error.message}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: a.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: a.fullName, customer_test: true },
      });
      if (error) throw new Error(`${a.email} create: ${error.message}`);
      authUser = data.user;
    }

    // User.id must equal the Supabase id (auth.ts:443 resolves by id first).
    // An older row under this email with a different id would never match by id,
    // so reconcile it rather than leaving a split identity.
    const byEmail = await prisma.user.findUnique({ where: { email: a.email } });
    if (byEmail && byEmail.id !== authUser.id) {
      await prisma.userRoleAssignment.deleteMany({ where: { userId: byEmail.id } });
      await prisma.user.delete({ where: { id: byEmail.id } });
    }
    await prisma.user.upsert({
      where: { id: authUser.id },
      update: { email: a.email, fullName: a.fullName, phone: a.phone },
      create: { id: authUser.id, email: a.email, fullName: a.fullName, phone: a.phone },
    });

    // Exactly one primary row per user — auth.ts has a backstop for two, but do
    // not rely on it.
    await prisma.userRoleAssignment.deleteMany({ where: { userId: authUser.id } });
    await prisma.userRoleAssignment.create({
      data: { userId: authUser.id, role: a.role, isPrimary: true },
    });
    if (a.role !== 'DEVOTEE') {
      await prisma.userRoleAssignment.create({
        data: { userId: authUser.id, role: 'DEVOTEE', isPrimary: false },
      });
    }

    out.push({ email: a.email, role: a.role, userId: authUser.id });
    console.log(`  ok ${a.role.padEnd(20)} ${a.email}`);
  }
  if (OUT) {
    writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), password: PASSWORD, accounts: out }, null, 2));
    console.log(`\ncredentials -> ${OUT}`);
  }
  return out;
}

try {
  console.log(TEARDOWN ? 'Tearing down customer-test accounts...' : 'Provisioning customer-test accounts...');
  if (TEARDOWN) await teardown();
  else await provision();
  console.log('done');
} finally {
  await prisma.$disconnect();
}
