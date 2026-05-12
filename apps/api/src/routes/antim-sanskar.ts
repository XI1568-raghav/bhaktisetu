import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendOpsAlert } from '../lib/alert.js';
import { sendEmail } from '../lib/email.js';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Layer AT — Antim sanskar (death rites) booking.
 *
 * Sensitive vertical: a family in distress is on the other end. No
 * upselling, no online payment, no marketing copy. Single coordinator
 * promise: confirmation message immediately, human call within 30 min.
 *
 * Payment is collected on-site by the assigned pandit to avoid forcing
 * the bereaved through a payment gateway in a moment of grief.
 *
 * Storage: raw SQL via Prisma's $queryRaw — the model is intentionally
 * thin and we want explicit control over the exact INSERT (e.g. Date
 * column casting) without going through Prisma's generated client which
 * needs `prisma generate` to be re-run for new models. The migration
 * provisions the table; Prisma client may not be regenerated yet.
 */

// ── Service tiers ─────────────────────────────────────────────────────────
// Reverent, factual descriptions. No "save", "discount", "popular" tags.
export const PACKAGES = [
  {
    tier: 'basic',
    name: 'Basic Antyeshti',
    priceInr: 15000,
    summary: 'Pandit for cremation rites and 13-day antyeshti at the ghat.',
    includes: [
      'Pandit ji at the cremation ghat for mukhagni and final samskara',
      '13 days of antyeshti karma — daily rites at home or designated ghat',
      'Mantra recitation per family tradition (Garuda Purana paath optional)',
      'Coordination with cremation ground staff',
    ],
  },
  {
    tier: 'standard',
    name: 'Standard with Asthi Visarjan',
    priceInr: 35000,
    summary:
      'Above plus asthi visarjan at Haridwar, Kashi, or Prayag, and full samagri.',
    includes: [
      'Everything in Basic',
      'Asthi visarjan at Haridwar (Har Ki Pauri), Kashi (Manikarnika), or Prayag (Sangam)',
      'Travel and stay coordination for one accompanying family member',
      'Complete samagri — havan samagri, til, jau, gangajal, kusha, tulsi',
    ],
  },
  {
    tier: 'comprehensive',
    name: 'Comprehensive with Shradh',
    priceInr: 50000,
    summary:
      'Full rites including tarpan, shradh ceremonies, and a small memorial gathering.',
    includes: [
      'Everything in Standard',
      'Pind daan and tarpan over the prescribed days',
      'Shradh ceremony on the 13th day with brahman bhojan (up to 11 brahmans)',
      'Small memorial gathering arrangement (up to 30 family members)',
      'Pandit availability for masik shradh reminders for one year',
    ],
  },
] as const;

export type PackageTier = (typeof PACKAGES)[number]['tier'];

// ── Sacred rivers for asthi visarjan ──────────────────────────────────────
export const SACRED_RIVERS = [
  {
    id: 'ganga',
    name: 'Ganga',
    primaryGhats: ['Har Ki Pauri (Haridwar)', 'Manikarnika Ghat (Kashi)', 'Triveni Sangam (Prayagraj)'],
  },
  {
    id: 'godavari',
    name: 'Godavari',
    primaryGhats: ['Ramkund (Nashik)', 'Rajahmundry'],
  },
  { id: 'yamuna', name: 'Yamuna', primaryGhats: ['Vishram Ghat (Mathura)'] },
  { id: 'narmada', name: 'Narmada', primaryGhats: ['Omkareshwar', 'Maheshwar'] },
] as const;

// ── Verified cremation ghats — 30 across major cities ─────────────────────
// Covers tier-1 + several tier-2 cities. Verified means we have a contact
// for ghat staff and have run at least one rite there. Add more as we
// expand; do not silently include unverified ghats here.
export const GHATS = [
  // Delhi NCR
  { id: 'nigambodh', name: 'Nigambodh Ghat', city: 'Delhi', state: 'Delhi', river: 'Yamuna' },
  { id: 'punjabi-bagh', name: 'Punjabi Bagh Cremation Ground', city: 'Delhi', state: 'Delhi', river: null },
  { id: 'antim-niwas-noida', name: 'Antim Niwas Noida', city: 'Noida', state: 'Uttar Pradesh', river: null },
  { id: 'gurgaon-sec-37', name: 'Sector 37 Cremation Ground', city: 'Gurgaon', state: 'Haryana', river: null },
  // Mumbai
  { id: 'banganga', name: 'Banganga Crematorium', city: 'Mumbai', state: 'Maharashtra', river: null },
  { id: 'chandanwadi', name: 'Chandanwadi Smashan', city: 'Mumbai', state: 'Maharashtra', river: null },
  { id: 'shivaji-park', name: 'Shivaji Park Crematorium', city: 'Mumbai', state: 'Maharashtra', river: null },
  // Pune
  { id: 'vaikunth-pune', name: 'Vaikunth Smashan Bhumi', city: 'Pune', state: 'Maharashtra', river: 'Mutha' },
  { id: 'kailas-pune', name: 'Kailas Smashan Bhumi', city: 'Pune', state: 'Maharashtra', river: null },
  // Bengaluru
  { id: 'wilson-garden', name: 'Wilson Garden Crematorium', city: 'Bengaluru', state: 'Karnataka', river: null },
  { id: 'banashankari', name: 'Banashankari Electric Crematorium', city: 'Bengaluru', state: 'Karnataka', river: null },
  { id: 'hebbal-bengaluru', name: 'Hebbal Crematorium', city: 'Bengaluru', state: 'Karnataka', river: null },
  // Chennai
  { id: 'besant-nagar', name: 'Besant Nagar Crematorium', city: 'Chennai', state: 'Tamil Nadu', river: null },
  { id: 'mylapore-chennai', name: 'Mylapore Crematorium', city: 'Chennai', state: 'Tamil Nadu', river: null },
  // Kolkata
  { id: 'keoratala', name: 'Keoratala Mahasmashan', city: 'Kolkata', state: 'West Bengal', river: 'Hooghly' },
  { id: 'nimtala', name: 'Nimtala Mahasmashan', city: 'Kolkata', state: 'West Bengal', river: 'Hooghly' },
  // Hyderabad
  { id: 'amberpet', name: 'Amberpet Crematorium', city: 'Hyderabad', state: 'Telangana', river: null },
  { id: 'punjagutta', name: 'Punjagutta Crematorium', city: 'Hyderabad', state: 'Telangana', river: null },
  // Ahmedabad
  { id: 'dudheshwar', name: 'Dudheshwar Smashan', city: 'Ahmedabad', state: 'Gujarat', river: 'Sabarmati' },
  { id: 'thaltej', name: 'Thaltej Smashan', city: 'Ahmedabad', state: 'Gujarat', river: null },
  // Jaipur
  { id: 'adarsh-nagar-jaipur', name: 'Adarsh Nagar Mokshdham', city: 'Jaipur', state: 'Rajasthan', river: null },
  // Lucknow
  { id: 'baikunth-dham', name: 'Baikunth Dham', city: 'Lucknow', state: 'Uttar Pradesh', river: 'Gomti' },
  { id: 'bhainsa-kund', name: 'Bhainsa Kund', city: 'Lucknow', state: 'Uttar Pradesh', river: 'Gomti' },
  // Varanasi (sacred — many out-of-state families travel here)
  { id: 'manikarnika', name: 'Manikarnika Ghat', city: 'Varanasi', state: 'Uttar Pradesh', river: 'Ganga' },
  { id: 'harishchandra', name: 'Harishchandra Ghat', city: 'Varanasi', state: 'Uttar Pradesh', river: 'Ganga' },
  // Haridwar
  { id: 'kankhal', name: 'Kankhal Mahasmashan', city: 'Haridwar', state: 'Uttarakhand', river: 'Ganga' },
  // Prayagraj
  { id: 'rasoolabad', name: 'Rasoolabad Ghat', city: 'Prayagraj', state: 'Uttar Pradesh', river: 'Ganga' },
  // Nashik
  { id: 'amardham-nashik', name: 'Amardham Smashan', city: 'Nashik', state: 'Maharashtra', river: 'Godavari' },
  // Nagpur
  { id: 'mokshadham-nagpur', name: 'Mokshadham', city: 'Nagpur', state: 'Maharashtra', river: null },
  // Bhopal
  { id: 'bhadbhada-bhopal', name: 'Bhadbhada Vishram Ghat', city: 'Bhopal', state: 'Madhya Pradesh', river: null },
] as const;

// ── Booking number ────────────────────────────────────────────────────────
function makeBookingNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `BS-AS-${ymd}-${rand}`;
}

// ── Validators ────────────────────────────────────────────────────────────
const bookSchema = z.object({
  deceasedName: z.string().min(1).max(120).trim(),
  contactName: z.string().min(1).max(120).trim(),
  contactPhone: z.string().min(6).max(20).trim(),
  contactRelation: z.string().max(60).trim().optional(),
  city: z.string().min(1).max(80).trim(),
  preferredGhat: z.string().max(120).trim().optional(),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'preferredDate must be YYYY-MM-DD')
    .optional(),
  packageTier: z.enum(['basic', 'standard', 'comprehensive']),
  asthiVisarjanRiver: z.enum(['ganga', 'godavari', 'yamuna', 'narmada']).optional(),
  notes: z.string().max(2000).optional(),
  email: z.string().email().optional(),
});

export type AntimSanskarBookingInput = z.infer<typeof bookSchema>;

// Email body kept reverent and minimal — no marketing footer, no social
// links, no promotional offers.
function familyEmailHtml(params: {
  contactName: string;
  bookingNumber: string;
  packageName: string;
  priceInr: number;
}): string {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fbf7f1;color:#3d2e1f;margin:0;padding:0;">
<div style="max-width:560px;margin:24px auto;padding:32px 28px;background:#fff;border-radius:12px;">
<p style="font-size:14px;line-height:1.7;margin:0 0 12px;">Namaste ${params.contactName},</p>
<p style="font-size:14px;line-height:1.7;margin:0 0 12px;">We have received your request and our coordinator will call you within the next 30 minutes. There is nothing further you need to do right now.</p>
<p style="font-size:14px;line-height:1.7;margin:0 0 12px;">Reference number: <strong>${params.bookingNumber}</strong></p>
<p style="font-size:14px;line-height:1.7;margin:0 0 12px;">Package: ${params.packageName} — to be settled on-site after the rites are complete.</p>
<p style="font-size:14px;line-height:1.7;margin:0 0 12px;">If you need to reach us before the call, our 24-hour coordinator line is in the WhatsApp message we just sent.</p>
<p style="font-size:14px;line-height:1.7;margin:24px 0 0;">Om shanti.<br>Darshya</p>
</div></body></html>`;
}

async function ensureAntimSanskarTable(): Promise<void> {
  // Migration 20260502_antim_sanskar provisions this table. On Render's
  // free tier we run no migration step at deploy, so self-init at boot is
  // the only way the table appears in prod (TD15 surfaced 42P01 here).
  // Idempotent — IF NOT EXISTS.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "antim_sanskar_bookings" (
      "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "booking_number"        TEXT UNIQUE NOT NULL,
      "deceased_name"         TEXT NOT NULL,
      "contact_name"          TEXT NOT NULL,
      "contact_phone"         TEXT NOT NULL,
      "contact_relation"      TEXT,
      "city"                  TEXT NOT NULL,
      "preferred_ghat"        TEXT,
      "preferred_date"        DATE,
      "package_tier"          TEXT NOT NULL,
      "package_price_inr"     INTEGER NOT NULL,
      "asthi_visarjan_river"  TEXT,
      "notes"                 TEXT,
      "status"                TEXT NOT NULL DEFAULT 'pending_coordinator',
      "assigned_pandit_id"    UUID,
      "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_status_idx"
      ON "antim_sanskar_bookings" ("status");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_city_idx"
      ON "antim_sanskar_bookings" ("city");
  `);
}

export async function antimSanskarRoutes(server: FastifyInstance) {
  await ensureAntimSanskarTable().catch((err) =>
    server.log.warn({ err }, 'antim-sanskar table init failed'),
  );

  // ─── GET /packages — service tiers ────────────────────────────────────
  server.get('/packages', async () => ({ packages: PACKAGES }));

  // ─── GET /ghats — pre-seeded verified ghats + sacred rivers ───────────
  server.get('/ghats', async (request) => {
    const { city } = request.query as { city?: string };
    let list: ReadonlyArray<(typeof GHATS)[number]> = GHATS;
    if (city) {
      const needle = city.toLowerCase();
      list = GHATS.filter((g) => g.city.toLowerCase().includes(needle));
    }
    return {
      ghats: list,
      total: list.length,
      sacredRivers: SACRED_RIVERS,
    };
  });

  // ─── POST /book — create a booking. NO online payment. ────────────────
  // Auth required: prior version was open and let anyone insert PII rows
  // (deceased name, contact phone, city) into the antim_sanskar_bookings
  // table from any browser. The flow is contact-first; an authenticated
  // devotee account is a small, reasonable gate for a sensitive vertical.
  server.post('/book', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = bookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const body = parsed.data;

    const pkg = PACKAGES.find((p) => p.tier === body.packageTier);
    if (!pkg) {
      return reply.status(400).send({ error: 'invalid_package' });
    }

    const bookingNumber = makeBookingNumber();
    // Default to today if not specified — most rites are needed same-day.
    const preferredDate = body.preferredDate ?? new Date().toISOString().slice(0, 10);

    // Raw SQL — this model is provisioned by migration 20260502_antim_sanskar
    // and may not yet be in the generated Prisma client.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "antim_sanskar_bookings"
        ("booking_number","deceased_name","contact_name","contact_phone","contact_relation",
         "city","preferred_ghat","preferred_date","package_tier","package_price_inr",
         "asthi_visarjan_river","notes","status")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date,$9,$10,$11,$12,'pending_coordinator')`,
      bookingNumber,
      body.deceasedName,
      body.contactName,
      body.contactPhone,
      body.contactRelation ?? null,
      body.city,
      body.preferredGhat ?? null,
      preferredDate,
      body.packageTier,
      pkg.priceInr,
      body.asthiVisarjanRiver ?? null,
      body.notes ?? null,
    );

    // Best-effort ops alert. Treated as critical — a coordinator must call
    // back within 30 minutes regardless of time of day.
    void sendOpsAlert({
      severity: 'critical',
      subject: `Antim sanskar request — ${body.city}`,
      body: [
        `Ref: ${bookingNumber}`,
        `Family: ${body.contactName} (${body.contactPhone})`,
        `Deceased: ${body.deceasedName}`,
        `City: ${body.city}${body.preferredGhat ? ` — ${body.preferredGhat}` : ''}`,
        `Date: ${preferredDate}`,
        `Package: ${pkg.name} (Rs ${pkg.priceInr.toLocaleString('en-IN')}, on-site)`,
        body.asthiVisarjanRiver ? `Asthi visarjan: ${body.asthiVisarjanRiver}` : '',
        body.notes ? `Notes: ${body.notes}` : '',
        '',
        'Coordinator must call within 30 minutes.',
      ]
        .filter(Boolean)
        .join('\n'),
    }).catch((err) => server.log.warn({ err }, 'antim-sanskar: ops alert failed'));

    if (body.email && process.env.RESEND_API_KEY) {
      void sendEmail({
        to: body.email,
        subject: 'We have received your request — Darshya',
        html: familyEmailHtml({
          contactName: body.contactName,
          bookingNumber,
          packageName: pkg.name,
          priceInr: pkg.priceInr,
        }),
      }).catch((err) => server.log.warn({ err }, 'antim-sanskar: family email failed'));
    }

    return reply.status(201).send({
      bookingNumber,
      packageName: pkg.name,
      priceInr: pkg.priceInr,
      preferredDate,
      coordinatorCallEtaMinutes: 30,
      message:
        'We have received your request. A coordinator will call you within 30 minutes. Payment is collected only on-site after the rites.',
    });
  });
}

// Exposed for unit tests. Internal — do not import from app code.
export const __testing = {
  bookSchema,
  makeBookingNumber,
};
