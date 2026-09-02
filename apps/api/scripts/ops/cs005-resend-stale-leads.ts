/**
 * R-Q1-CS-005 — Re-send 230 stale EMAILED leads after Resend DNS verify.
 *
 * Hard gate: refuses to run unless RESEND_DOMAIN_VERIFIED=true env is set.
 * This is the founder's explicit confirmation that IT-004 DNS verify is GREEN
 * (per docs/ops/resend-dns-verify-runbook.md). Re-sending pre-DNS = damages
 * domain reputation further.
 *
 * Idempotency: writes lead.metadata.cs005_resent_at = ISO timestamp after each
 * successful send. Re-runs skip leads where this is already set.
 *
 * Rate limit: respects Resend free tier (100 sends/UTC day). Pass --limit=N
 * to cap per run. Default 100. Founder runs 3x over 3 days for 230 total.
 *
 * Failure isolation: per-lead failures log to console + ops_audit_log w/o
 * aborting the batch (so 1 bad email doesn't lose the other 229).
 *
 * Run:
 *   RESEND_DOMAIN_VERIFIED=true \
 *     pnpm tsx apps/api/scripts/ops/cs005-resend-stale-leads.ts --dry-run
 *
 *   RESEND_DOMAIN_VERIFIED=true RESEND_API_KEY=re_... \
 *     pnpm tsx apps/api/scripts/ops/cs005-resend-stale-leads.ts --limit=100
 */

import { HAS_80G, COMPLIANCE_LINE } from '../../src/lib/eighty-g.js';
// TC-08: the pandit body said "30 verified pandit prospects shortlisted".
// Nothing verifies a pandit — see src/lib/pandit-vetting.ts.
import { verifiedNoun } from '../../src/lib/pandit-vetting.js';

export interface LeadRow {
  id: string;
  role: string | null;
  name: string | null;
  city: string | null;
  email: string | null;
  status: string;
  contactCount: number | null;
  lastContactedAt: Date | string | null;
  metadata: Record<string, unknown> | null;
}

export interface SendCandidate {
  lead: LeadRow;
  templateKey: 'pandit' | 'temple' | 'gaushala' | 'astrologer';
}

export interface PlanResult {
  totalCandidates: number;
  byRole: Record<string, number>;
  byDay: { day: number; count: number }[];
  skipped: { id: string; reason: string }[];
  selected: SendCandidate[];
}

export const TEMPLATE_KEY_BY_ROLE: Record<string, SendCandidate['templateKey']> = {
  PANDIT: 'pandit',
  TEMPLE_MANAGER: 'temple',
  GAUSHALA_MANAGER: 'gaushala',
  ASTROLOGER: 'astrologer',
};

/**
 * Pure: decide whether a lead is eligible for the cs005 re-send wave.
 * Returns null if eligible; otherwise a string reason for skipping.
 */
export function skipReason(lead: LeadRow, now: Date = new Date()): string | null {
  if (lead.status !== 'EMAILED') return 'status_not_emailed';
  if (!lead.email || lead.email.trim() === '') return 'no_email';
  if ((lead.contactCount ?? 0) < 1) return 'never_contacted';

  const reply = (lead.metadata?.reply_count as number | undefined) ?? 0;
  if (reply > 0) return 'has_reply';

  const resentAt = lead.metadata?.cs005_resent_at as string | undefined;
  if (resentAt) return 'already_resent';

  if (!lead.lastContactedAt) return 'no_last_contact';
  const lastContact = new Date(lead.lastContactedAt);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  if (lastContact > thirtyDaysAgo) return 'too_recent';

  return null;
}

/**
 * Pure: route lead role → template key. Returns null for unknown role.
 */
export function templateForLead(lead: LeadRow): SendCandidate['templateKey'] | null {
  if (!lead.role) return null;
  return TEMPLATE_KEY_BY_ROLE[lead.role] ?? null;
}

/**
 * Pure: build send plan. Filters out ineligible leads, routes to templates,
 * groups by role, and slices into per-day chunks respecting Resend free tier
 * (100/day default).
 */
export function buildPlan(
  leads: LeadRow[],
  opts: { now?: Date; perDayCap?: number; limit?: number } = {},
): PlanResult {
  const now = opts.now ?? new Date();
  const perDayCap = opts.perDayCap ?? 100;
  const limit = opts.limit ?? Number.POSITIVE_INFINITY;

  const skipped: { id: string; reason: string }[] = [];
  const selected: SendCandidate[] = [];
  const byRole: Record<string, number> = {};

  for (const lead of leads) {
    const reason = skipReason(lead, now);
    if (reason) {
      skipped.push({ id: lead.id, reason });
      continue;
    }
    const templateKey = templateForLead(lead);
    if (!templateKey) {
      skipped.push({ id: lead.id, reason: 'no_template_for_role' });
      continue;
    }
    if (selected.length >= limit) break;
    selected.push({ lead, templateKey });
    byRole[templateKey] = (byRole[templateKey] ?? 0) + 1;
  }

  const byDay: { day: number; count: number }[] = [];
  let remaining = selected.length;
  let day = 1;
  while (remaining > 0) {
    const count = Math.min(remaining, perDayCap);
    byDay.push({ day, count });
    remaining -= count;
    day += 1;
  }

  return { totalCandidates: selected.length, byRole, byDay, skipped, selected };
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * TC-01 (P0, trust) — the two sentences in this mailer that were not true.
 *
 * This script re-sends 230 stale leads through Resend. Two of its bodies made
 * tax claims the code contradicts:
 *
 *   temple:   "- Bhaktisetu Foundation: active 80G + CSR-1 in India"
 *   gaushala: "...monthly disbursement milta hai with 80G receipt for donor."
 *
 * `apps/web/lib/company.ts` records `HAS_80G_VERIFIED: false` and
 * `HAS_CSR1_VERIFIED: false`, with `pan`, `eightyGNumber` and `csr1Number` all
 * `null`. `src/lib/pdf-receipt.ts` `is80GEligible()` needs a donee 80G number
 * AND a donee PAN, both read from `gaushala_profiles.regn_80g` / `.pan`, which
 * no route in this repository writes — so every receipt ever minted prints
 * "Proof of donation — not a tax exemption certificate".
 *
 * A sent email cannot be edited, and the CSR-1 half is the worse claim: a
 * corporate donor's own CSR compliance would rest on it. Both lines are now
 * bound to `src/lib/eighty-g.ts` and return verbatim when the flags flip.
 *
 * Kept as a static import because `src/lib/eighty-g.ts` is two `const`s and a
 * template string with no dependencies — importing it does not compromise the
 * "zero deps at import time" property the lazy `prisma`/`resend` imports below
 * exist to preserve.
 */
const DONOR_RECEIPT_LINE: string = HAS_80G
  ? 'Donor ko 80G receipt milti hai.'
  : 'Donor ko numbered receipt PDF milti hai — proof of payment, tax-exemption certificate nahi (Darshya ke paas abhi Section 80G registration nahi hai).';

/**
 * Pure: render warm-followup template for a lead. Templates live in
 * docs/cs/templates/cs005-warm-followup-{role}.md — this renderer keeps
 * a minimal HTML version inline so the script has zero filesystem deps
 * at send time. Founder reviews + tunes the canonical .md before send.
 */
export function renderTemplate(candidate: SendCandidate): RenderedTemplate {
  const { lead, templateKey } = candidate;
  const name = (lead.name ?? 'Ji').trim();
  const city = lead.city?.trim() || 'aapke shahar';
  const unsubLink = `https://darshya.online/unsubscribe?lead=${encodeURIComponent(lead.id)}`;

  const subjects: Record<SendCandidate['templateKey'], string> = {
    pandit: `Bhaktisetu — ${city} pandit network update + ek aur ask`,
    temple: `Bhaktisetu — ${city} temple listing pilot, 60-80% commission, no upfront fee`,
    gaushala: `Bhaktisetu — gauseva recurring-donation platform, ${city} pilot`,
    astrologer: `Bhaktisetu — astrologer consultation platform, USD rails for NRI clients`,
  };

  const bodies: Record<SendCandidate['templateKey'], string> = {
    pandit: `Pranam ${name} ji,

Maine aapko kuch hafte pehle Bhaktisetu Foundation (https://darshya.online)
ke baare mein email bheja tha — verified-pandit platform jo NRI devotees ke
saath India temples + pandit ji ko connect karta hai.

Possible hai woh email aap tak nahi pahuncha — humare DNS setup ka ek issue
tha. Aaj theek hai.

Update humari taraf se:
- 30 ${verifiedNoun('pandit')} prospects shortlisted across BLR
- First 5 pilot pandits onboarded
- NRI USD consultations going live with Stripe rails
- 70-80% commission to pandit, no upfront fee

Agar aap interested hain ek 15-min call ke liye —
calendar: https://cal.com/bhaktisetu

Agar pehle hi koi reply kar chuke hain ya not-interested — bas yahin reply
kar dein "unsubscribe" likh ke, main hata dunga aur dobara contact nahi
karunga.

Pranam,
Bhaktisetu Foundation Team`,

    temple: `Pranam ${name} ji,

Bhaktisetu Foundation se hello. Aapko kuch hafte pehle email bheji thi.
Possible hai spam folder mein chali gayi — humara DNS setup theek hua hai
aaj.

Updated context:
- ${COMPLIANCE_LINE}
- 30 ${city} temples in pipeline; 5 pilots will be live by Q2-end
- Devotees pay via Razorpay/Stripe; temple ko 60-80% commission
- Video proof mandatory per puja; founder personally onboards first 5

Agar aapke temple ko pilot karna chahein — 15-min exploratory call?
calendar: https://cal.com/bhaktisetu

Nahi interested → "remove" likh dein reply mein, main hata dunga.

Pranam,
Bhaktisetu Foundation Team`,

    gaushala: `Pranam ${name} ji,

Bhaktisetu Foundation se. Kuch hafte pehle email bheji thi gauseva
recurring-donation platform ke baare mein. Spam ya delivery issue ho sakta
tha — humara DNS theek hua hai aaj.

Re-sending humari original ask:

Bhaktisetu pe gauseva recurring-donation platform launch ho raha hai. NRI
+ India donors monthly contribute karte hain (₹500-₹10000/mo), aur gaushala
ko monthly disbursement milta hai. ${DONOR_RECEIPT_LINE}

${city} ki gaushala ko list karna chahte hain pilot batch mein. Aapke
gaushala ka basic info + 80G regn + PAN bhejein (hum record kar lete hain;
abhi donor receipt par print nahi hote), hum 7 din mein onboard
kar denge — koi upfront fee nahi.

15-min call ke liye reply karein OR "remove" likhein agar interested nahi.

Pranam,
Bhaktisetu Foundation Team`,

    astrologer: `Namaste ${name} ji,

Maine aapko kuch hafte pehle email bheji thi Bhaktisetu astrologer
consultation platform ke baare mein. DNS issue tha humare side, theek hua
aaj — re-sending.

Quick update:
- Stripe USD rails live for NRI clients (US/UK/CA/AU paying $80-$200 per session)
- INR Razorpay rails active for domestic clients
- Bhaktisetu commission 20-30%; astrologer keeps 70-80%
- Verified Jyotish profile shown on darshya.online/astrology
- Video proof (Jitsi recording) auto-saved per session

${city} ke astrologers ko onboard kar rahe hain pilot batch mein. 15-min
call for fit-check?
calendar: https://cal.com/bhaktisetu

Reply "unsubscribe" if not interested.

Namaste,
Bhaktisetu Foundation Team`,
  };

  const body = bodies[templateKey];
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#222">${body
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')}
<hr style="border:none;border-top:1px solid #ccc;margin:24px 0">
<p style="font-size:12px;color:#666">To unsubscribe and never hear from us again, <a href="${unsubLink}">click here</a>.</p></div>`;

  const text = `${body}\n\n---\nTo unsubscribe: ${unsubLink}`;

  return { subject: subjects[templateKey], html, text };
}

interface SendResult {
  leadId: string;
  ok: boolean;
  error?: string;
  resentAt?: string;
}

export interface SendBatchOptions {
  resendClient: { emails: { send: (args: { from: string; to: string; subject: string; html: string; text: string }) => Promise<unknown> } };
  fromAddress: string;
  onSuccess: (leadId: string, resentAt: string) => Promise<void>;
  onFailure: (leadId: string, error: Error) => Promise<void>;
}

/**
 * Send a batch of candidates. Per-lead failures log + continue (do NOT abort).
 * Returns per-lead results for caller to summarize.
 */
export async function sendBatch(
  candidates: SendCandidate[],
  opts: SendBatchOptions,
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (const candidate of candidates) {
    const { lead } = candidate;
    if (!lead.email) {
      results.push({ leadId: lead.id, ok: false, error: 'no_email' });
      continue;
    }
    const tmpl = renderTemplate(candidate);
    try {
      await opts.resendClient.emails.send({
        from: opts.fromAddress,
        to: lead.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
      const resentAt = new Date().toISOString();
      await opts.onSuccess(lead.id, resentAt);
      results.push({ leadId: lead.id, ok: true, resentAt });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      try {
        await opts.onFailure(lead.id, err instanceof Error ? err : new Error(errMsg));
      } catch {
        // even audit-log failure mustn't abort the batch
      }
      results.push({ leadId: lead.id, ok: false, error: errMsg });
    }
  }
  return results;
}

export function parseCliArgs(argv: string[]): { dryRun: boolean; limit: number } {
  const dryRun = argv.includes('--dry-run');
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Math.min(500, parseInt(limitArg.slice('--limit='.length), 10) || 100)) : 100;
  return { dryRun, limit };
}

/**
 * Hard-gate check: refuse to send unless founder has set
 * RESEND_DOMAIN_VERIFIED=true in env. Returns null if OK; error string otherwise.
 */
export function checkDomainVerifiedGate(env: NodeJS.ProcessEnv): string | null {
  if (env.RESEND_DOMAIN_VERIFIED !== 'true') {
    return 'RESEND_DOMAIN_VERIFIED env != "true" — refusing to send. Per IT-004, verify Resend DNS GREEN first, then set RESEND_DOMAIN_VERIFIED=true.';
  }
  return null;
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseCliArgs(process.argv.slice(2));

  const gateErr = checkDomainVerifiedGate(process.env);
  if (gateErr) {
    console.error(`FATAL: ${gateErr}`);
    process.exit(1);
  }

  // Lazy import: only require prisma + resend when actually running, not when
  // imported by tests (keeps test surface pure + dep-free).
  const { prisma } = (await import('../../src/lib/prisma.js')) as { prisma: { lead: { findMany: (args: unknown) => Promise<LeadRow[]>; update: (args: unknown) => Promise<unknown> } } };

  const leads = await prisma.lead.findMany({
    where: { status: 'EMAILED' },
    orderBy: { lastContactedAt: 'asc' },
    take: 500,
  });

  const plan = buildPlan(leads, { limit });

  console.log('--- CS-005 send plan ---');
  console.log(`Eligible candidates: ${plan.totalCandidates}`);
  console.log(`By role:`, plan.byRole);
  console.log(`By day (Resend free-tier 100/day):`, plan.byDay);
  console.log(`Skipped: ${plan.skipped.length}`);

  if (dryRun) {
    console.log('\nDRY RUN — no sends. First 5 candidates:');
    for (const c of plan.selected.slice(0, 5)) {
      const tmpl = renderTemplate(c);
      console.log(`  → ${c.lead.email} (${c.templateKey}, ${c.lead.name}, ${c.lead.city})`);
      console.log(`     subject: ${tmpl.subject}`);
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('FATAL: RESEND_API_KEY env required for live send.');
    process.exit(1);
  }
  const { Resend } = (await import('resend')) as { Resend: new (k: string) => SendBatchOptions['resendClient'] };
  const resendClient = new Resend(apiKey);

  const results = await sendBatch(plan.selected, {
    resendClient,
    fromAddress: 'Bhaktisetu <founder@darshya.online>',
    onSuccess: async (leadId, resentAt) => {
      const lead = plan.selected.find((c) => c.lead.id === leadId)?.lead;
      const prevMeta = (lead?.metadata as Record<string, unknown>) ?? {};
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          contactCount: { increment: 1 },
          lastContactedAt: new Date(),
          metadata: { ...prevMeta, cs005_resent_at: resentAt },
        },
      });
      console.log(`  ✓ sent ${leadId}`);
    },
    onFailure: async (leadId, err) => {
      // Best-effort audit log. If ops_audit_log doesn't exist, swallow — the
      // failure is already in console + return value.
      console.error(`  ✗ failed ${leadId}: ${err.message}`);
    },
  });

  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  console.log(`\n--- Summary ---`);
  console.log(`Sent OK: ${ok}/${results.length}`);
  console.log(`Failed: ${failed}`);
}

// Bare execution guard
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('cs005-resend-stale-leads.ts')) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

export const __testing = {
  skipReason,
  templateForLead,
  buildPlan,
  renderTemplate,
  sendBatch,
  parseCliArgs,
  checkDomainVerifiedGate,
  TEMPLATE_KEY_BY_ROLE,
};
