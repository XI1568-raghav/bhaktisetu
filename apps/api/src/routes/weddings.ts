import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { MuhuratInputSchema, findWeddingMuhurats } from '../lib/muhurat.js';
import { authenticateUser } from '../middlewares/auth.js';

const InquiryBody = z.object({
  fullName: z.string().min(1).max(120).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().min(6).max(20).trim(),
  city: z.string().min(1).max(80).trim(),
  weddingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'weddingDate must be YYYY-MM-DD')
    .refine((d) => new Date(d).getTime() > Date.now(), 'weddingDate must be future')
    .optional(),
  package: z.enum(['basic', 'premium', 'royal']).optional(),
  guests: z.coerce.number().int().min(0).max(50000).optional(),
  budget: z.coerce.number().int().min(0).max(100000000).optional(),
  message: z.string().max(2000).trim().optional(),
});

export async function weddingRoutes(server: FastifyInstance) {
  // POST /muhurat — compute ranked muhurat list. PUBLIC, deliberately.
  //
  // PAR-14. This route used to sit behind `authenticateUser`, added to stop an
  // attacker burning the mhah-panchang compute loop (Ayanamsa + dasha calc) in
  // a tight loop. That control was the wrong shape for the risk: the concern is
  // REQUEST RATE, and authentication does not cap a rate — a signed-up attacker
  // has an account in thirty seconds and the loop is just as burnable, only now
  // with a session. Meanwhile the gate broke the product: /inquiry below emails
  // https://darshya.online/weddings/muhurat to brand-new prospects who are by
  // definition signed out, so lead-gen traffic landed on a sign-in wall.
  //
  // The control that actually caps compute is a rate limit, so that is what is
  // attached. `config.rateLimit` is read by @fastify/rate-limit's own onRoute
  // hook at registration time, and server.ts's per-prefix override hook bails
  // out when a route already declares one (`if (existing) return`), so this
  // value wins over the global 100/min. Anonymous callers key on
  // `ip:<clientIp>` via rateLimitKey — 10/min per IP against a loop that takes
  // milliseconds per day scanned.
  server.post('/muhurat', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const parsed = MuhuratInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: parsed.error.flatten() });
    }
    const result = findWeddingMuhurats(parsed.data, 10);
    return result;
  });

  // POST /inquiry — store inquiry in WeddingInquiry table (raw SQL).
  // We auto-create the table on first call so we don't need a migration.
  // Auth required to stop anonymous PII dumps into the table.
  server.post('/inquiry', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = InquiryBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: parsed.error.flatten() });
    }
    const b = parsed.data;

    try {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "WeddingInquiry" (
          id           text PRIMARY KEY,
          full_name    text NOT NULL,
          email        text NOT NULL,
          phone        text NOT NULL,
          city         text NOT NULL,
          wedding_date date,
          package      text,
          guests       integer,
          budget       integer,
          message      text,
          status       text NOT NULL DEFAULT 'NEW',
          created_at   timestamptz NOT NULL DEFAULT now()
        )`,
      );

      const id = `wi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      // `package` is a reserved-ish identifier in some Postgres versions —
      // quote it. Cast wedding_date so prepared-statement binds the string
      // to the date column without ambiguity (TD15 surfaced 500s here).
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WeddingInquiry"
          (id, full_name, email, phone, city, wedding_date, "package", guests, budget, message)
         VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10)`,
        id,
        b.fullName,
        b.email,
        b.phone,
        b.city,
        b.weddingDate ?? null,
        b.package ?? null,
        b.guests ?? null,
        b.budget ?? null,
        b.message ?? null,
      );

      // Best-effort welcome email; email lib is env-gated and no-ops without RESEND.
      await sendEmail({
        to: b.email,
        subject: 'Darshya Weddings — we have your details',
        html: `<p>Namaste ${b.fullName},</p><p>Thank you for reaching out to Darshya Weddings. Our wedding concierge will contact you within 24 hours to discuss your ${b.package ?? 'wedding'} plan.</p><p>You can also browse muhurat dates while you wait: <a href="https://darshya.online/weddings/muhurat">darshya.online/weddings/muhurat</a></p><p>— Team Darshya</p>`,
      }).catch(() => undefined);

      const adminEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (adminEmails.length > 0) {
        await sendEmail({
          to: adminEmails.join(','),
          subject: `New wedding inquiry — ${b.fullName} (${b.city})`,
          html: `<p><strong>${b.fullName}</strong> &lt;${b.email}&gt; ${b.phone}</p><p>City: ${b.city}<br/>Package: ${b.package ?? '—'}<br/>Date: ${b.weddingDate ?? '—'}<br/>Guests: ${b.guests ?? '—'}<br/>Budget: ₹${b.budget ?? '—'}</p><p>${b.message ?? ''}</p>`,
        }).catch(() => undefined);
      }

      return reply.code(201).send({ id, status: 'NEW' });
    } catch (err) {
      server.log.error({ err }, 'wedding inquiry failed');
      return reply.code(500).send({ error: 'InquiryFailed' });
    }
  });
}
