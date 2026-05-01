import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';

// Self-onboarding for providers who land on /list-temple, /become-priest,
// /become-astrologer, /become-wellness, /list-gaushala. Public, no auth.
//
// Creates a Lead row with status=NEW, source=self_onboard_<role>, and
// stuffs role-specific extras into the JSON `metadata` field plus a
// human-readable `notes` summary. Sends a welcome email to the applicant
// and (if configured) a notification to ADMIN_EMAILS. All email is
// env-gated via sendEmail().

const ROLE_VALUES = ['TEMPLE', 'PRIEST', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA'] as const;

const baseFields = {
  fullName: z.string().min(1).max(120).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().min(6).max(20).trim(),
  city: z.string().min(1).max(80).trim(),
  state: z.string().min(1).max(80).trim(),
};

const templeSchema = z.object({
  role: z.literal('TEMPLE'),
  ...baseFields,
  templeName: z.string().min(1).max(160).trim(),
  deity: z.string().min(1).max(80).trim(),
});

const priestSchema = z.object({
  role: z.literal('PRIEST'),
  ...baseFields,
  yearsExperience: z.coerce.number().int().min(0).max(80),
  specialties: z.string().min(1).max(500).trim(),
});

const astrologerSchema = z.object({
  role: z.literal('ASTROLOGER'),
  ...baseFields,
  astrologyType: z.enum(['vedic', 'tarot', 'numerology', 'palmistry', 'other']),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
});

const wellnessSchema = z.object({
  role: z.literal('WELLNESS_INSTRUCTOR'),
  ...baseFields,
  sessionType: z.enum(['yoga', 'meditation', 'pranayama', 'vipassana', 'other']),
  certifications: z.string().max(500).trim().optional(),
});

const gaushalaSchema = z.object({
  role: z.literal('GAUSHALA'),
  ...baseFields,
  gaushalaName: z.string().min(1).max(160).trim(),
  cowCount: z.coerce.number().int().min(0).max(100000),
  has80G: z.union([z.boolean(), z.literal('yes'), z.literal('no'), z.literal('on')]).optional(),
});

const bodySchema = z.discriminatedUnion('role', [
  templeSchema,
  priestSchema,
  astrologerSchema,
  wellnessSchema,
  gaushalaSchema,
]);

type SelfOnboardBody = z.infer<typeof bodySchema>;

function roleLabel(role: SelfOnboardBody['role']): string {
  switch (role) {
    case 'TEMPLE':
      return 'temple';
    case 'PRIEST':
      return 'pandit';
    case 'ASTROLOGER':
      return 'astrologer';
    case 'WELLNESS_INSTRUCTOR':
      return 'wellness instructor';
    case 'GAUSHALA':
      return 'gaushala';
  }
}

function roleSourceKey(role: SelfOnboardBody['role']): string {
  return `self_onboard_${role.toLowerCase()}`;
}

function welcomeEmailHtml(params: { fullName: string; roleLabel: string }): string {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fbf7f1;color:#3d2e1f;margin:0;padding:0;">
<div style="max-width:560px;margin:24px auto;padding:32px 28px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:22px;font-weight:600;color:#ea580c;margin-bottom:24px;">Darshya</div>
<h1 style="font-size:18px;font-weight:600;margin:0 0 16px;">Namaste ${params.fullName}, thanks for your interest</h1>
<p style="font-size:14px;line-height:1.6;">We have received your application to join Darshya as a ${params.roleLabel}. Our partnerships team will review your details and get back to you within 48 hours.</p>
<p style="font-size:14px;line-height:1.6;">In the meantime, feel free to explore the platform at <a href="https://darshya.online" style="color:#ea580c;">darshya.online</a>.</p>
<div style="font-size:11px;color:#999;margin-top:28px;padding-top:16px;border-top:1px solid #eee;text-align:center;">Darshya · India's Devotional Super App<br>https://darshya.online</div>
</div></body></html>`;
}

function adminNotifyHtml(params: { lead: SelfOnboardBody; leadId: string; roleLabel: string }): string {
  const { lead, leadId, roleLabel } = params;
  const extras = Object.entries(lead)
    .filter(([k]) => !['role', 'fullName', 'email', 'phone', 'city', 'state'].includes(k))
    .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
    .join('');
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#222;">
<h2>New ${roleLabel} self-onboarding lead</h2>
<p><strong>Lead ID:</strong> ${leadId}</p>
<ul>
<li><strong>Name:</strong> ${lead.fullName}</li>
<li><strong>Email:</strong> ${lead.email}</li>
<li><strong>Phone:</strong> ${lead.phone}</li>
<li><strong>City:</strong> ${lead.city}, ${lead.state}</li>
${extras}
</ul>
<p>Review in admin: <a href="https://darshya.online/admin/leads">/admin/leads</a></p>
</body></html>`;
}

export async function leadsSelfOnboardRoutes(server: FastifyInstance) {
  server.post('/self-onboard', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: 'invalid_body',
        issues: parsed.error.flatten(),
      });
    }
    const body = parsed.data;

    const { role, fullName, email, phone, city, state } = body;
    // Build role-specific extras as a typed Record<string, unknown> for Json.
    const extras: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (['role', 'fullName', 'email', 'phone', 'city', 'state'].includes(k)) continue;
      extras[k] = v;
    }
    const noteText = JSON.stringify(extras);

    // Upsert by (role, email) — same applicant resubmitting just refreshes
    // their data without spawning duplicate rows. The schema enforces
    // @@unique([role, email]).
    let leadId: string;
    try {
      const lead = await prisma.lead.upsert({
        where: { role_email: { role, email } },
        update: {
          name: fullName,
          phone,
          city,
          state,
          source: roleSourceKey(role),
          metadata: extras as never,
          notes: noteText,
          status: 'NEW',
        },
        create: {
          role,
          name: fullName,
          email,
          phone,
          city,
          state,
          source: roleSourceKey(role),
          metadata: extras as never,
          notes: noteText,
          status: 'NEW',
        },
      });
      leadId = lead.id;
    } catch (err) {
      server.log.error({ err }, 'leads/self-onboard: upsert failed');
      return reply.status(500).send({ ok: false, error: 'database_error' });
    }

    // Welcome email — best-effort, env-gated via sendEmail().
    try {
      await sendEmail({
        to: email,
        subject: `Thanks for your interest in Darshya`,
        html: welcomeEmailHtml({ fullName, roleLabel: roleLabel(role) }),
        text: `Namaste ${fullName},\n\nWe have received your application to join Darshya as a ${roleLabel(role)}. Our partnerships team will review your details and get back to you within 48 hours.\n\n— Darshya`,
      });
    } catch (err) {
      server.log.warn({ err }, 'leads/self-onboard: welcome email failed');
    }

    // Admin notification — env-gated. Comma-separated ADMIN_EMAILS.
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (adminEmails.length > 0) {
      try {
        await sendEmail({
          to: adminEmails,
          subject: `[Darshya] New ${roleLabel(role)} lead — ${fullName}`,
          html: adminNotifyHtml({ lead: body, leadId, roleLabel: roleLabel(role) }),
        });
      } catch (err) {
        server.log.warn({ err }, 'leads/self-onboard: admin notify failed');
      }
    }

    return reply.status(201).send({ ok: true, leadId });
  });
}
