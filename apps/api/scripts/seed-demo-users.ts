/**
 * Seeds the 8 demo accounts as real DB users so demo tokens (`demo-<handle>-...`)
 * can flow through Prisma without UUID rejection. Idempotent — re-running it
 * upserts by email and never duplicates.
 *
 * After this runs, request.currentUser.id for demo logins is a real UUID,
 * which is what every Phase A+ route (conversations, messages, calls) needs.
 *
 *   pnpm --filter @poojly/api exec tsx scripts/seed-demo-users.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Manual .env load — same pattern as backfill-embeddings.ts; no dotenv dep.
try {
  const envPath = resolve(process.cwd(), '.env');
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env may not exist in CI/Render — env vars come from the platform.
}

const prisma = new PrismaClient();

interface DemoSpec {
  email: string;
  phone: string;
  fullName: string;
  role: 'DEVOTEE' | 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER' | 'ADMIN';
}

// Demo phones use a +91-DEMO-XXXX format so they never collide with real
// seed data (which uses +91-9876543XXX block).
const DEMO_USERS: DemoSpec[] = [
  { email: 'devotee@demo.com',  phone: '+910000000001', fullName: 'Arjun Sharma',          role: 'DEVOTEE' },
  { email: 'pandit@demo.com',   phone: '+910000000002', fullName: 'Pandit Ramesh Sharma',  role: 'PANDIT' },
  { email: 'store@demo.com',    phone: '+910000000003', fullName: 'Vikram Patel',          role: 'STORE_OWNER' },
  { email: 'astro@demo.com',    phone: '+910000000004', fullName: 'Jyotishi Suresh Kumar', role: 'ASTROLOGER' },
  { email: 'wellness@demo.com', phone: '+910000000005', fullName: 'Ananya Devi',           role: 'WELLNESS_INSTRUCTOR' },
  { email: 'gaushala@demo.com', phone: '+910000000006', fullName: 'Govind Prasad',         role: 'GAUSHALA_MANAGER' },
  { email: 'temple@demo.com',   phone: '+910000000007', fullName: 'Swami Dayananda',       role: 'TEMPLE_MANAGER' },
  { email: 'admin@demo.com',    phone: '+910000000008', fullName: 'Admin User',            role: 'ADMIN' },
];

async function main() {
  console.log('Seeding 8 demo users...');

  for (const spec of DEMO_USERS) {
    // Phone is also @unique — if a previous seed created a user with the
    // demo phone but a different email (or vice versa), upsert-by-email alone
    // collides. Strategy: find by email OR phone, update name; else create.
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: spec.email }, { phone: spec.phone }] },
    });
    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { email: spec.email, phone: spec.phone, fullName: spec.fullName },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: spec.email,
          phone: spec.phone,
          fullName: spec.fullName,
          preferredLanguage: 'hi',
          subscriptionTier: 'bhakti_pass',
        },
      });
    }

    // Role assignment (UserRoleAssignment) — idempotent upsert via composite key.
    try {
      await prisma.userRoleAssignment.upsert({
        where: { userId_role: { userId: user.id, role: spec.role } },
        update: {},
        create: { userId: user.id, role: spec.role },
      });
    } catch (e) {
      // Schema may differ — fall back to a non-unique create only if no rows.
      const existing = await prisma.userRoleAssignment.findFirst({
        where: { userId: user.id, role: spec.role },
      });
      if (!existing) {
        await prisma.userRoleAssignment.create({
          data: { userId: user.id, role: spec.role },
        });
      }
    }

    console.log(`  ✔ ${spec.email}  →  ${user.id}  (${spec.role})`);
  }

  // Promote pandit@demo.com to a real Priest row so chat-on-priest_assigned
  // can find a provider for puja bookings.
  const pandit = await prisma.user.findUnique({ where: { email: 'pandit@demo.com' } });
  if (pandit) {
    const existing = await prisma.priest.findUnique({ where: { userId: pandit.id } });
    if (!existing) {
      await prisma.priest.create({
        data: {
          userId: pandit.id,
          displayName: 'Pandit Ramesh Sharma',
          specializations: ['rudrabhishek', 'satyanarayan_katha', 'navagraha'],
          languages: ['hi', 'sa', 'en'],
          experienceYears: 18,
          aadhaarVerified: true,
          isVerified: true,
          verificationStatus: 'approved',
          status: 'active',
          bio: 'Vedic priest serving Kashi for 18 years. Specialised in Rudrabhishek and graha shanti pujas.',
        },
      });
      console.log(`  ✔ Created Priest row for ${pandit.email}`);
    } else {
      console.log(`  · Priest row already exists for ${pandit.email}`);
    }
  }

  console.log('\nDone. Demo tokens (demo-pandit-token, demo-devotee-token, ...) now resolve to real DB users.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
