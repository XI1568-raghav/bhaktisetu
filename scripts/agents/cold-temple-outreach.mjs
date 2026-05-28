// cold-temple-outreach — daily 25-temple cap. Polls
// `/api/v1/admin/ops/cold-temples` for NEW Lead rows (role=TEMPLE,
// lastContactedAt=null), sends personalized outreach via Resend, then
// POSTs `/mark-contacted` so the same lead never gets a second cold email.
//
// Personalisation is light: city in subject + name in opener. No LLM to
// keep zero spend + deterministic deliverability.
//
// Free-tier math: 25/day × 30 = 750/mo Resend (under 100/day cap, since
// daily cron + 25 is hard ceiling per run).

import { writeReport, TODAY, isoNow, API_BASE, WEB_BASE } from './_lib.mjs';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM || 'Darshya Partnerships <partnerships@darshya.online>';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function emailHtml({ name, city }) {
  const onboardUrl = `${WEB_BASE.replace(/\/$/, '')}/list-temple?utm_source=cold-outreach&utm_medium=email`;
  return `<p>Namaste${name ? ` from ${escapeHtml(name)}` : ''},</p>
<p>I'm reaching out from Darshya, an India-first devotional platform helping verified temples reach NRI and domestic devotees who want video-proof puja seva.</p>
<p>${city ? `Temples in ${escapeHtml(city)} have been ` : 'Temples have been '}seeing steady demand from devotees abroad — Darshya handles bookings, payments (INR + USD), and the live or recorded video delivery so your pujaris can focus on the seva.</p>
<p>Three things make us different:</p>
<ul>
  <li>20-25% platform commission (no per-listing fee)</li>
  <li>Video proof of every booking, mandatory</li>
  <li>NRI pricing 9-10× domestic — straight to your temple bank</li>
</ul>
<p><a href="${onboardUrl}">List your temple in 5 minutes →</a></p>
<p>Hari Om,<br>— Darshya Partnerships</p>`;
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return { ok: false, skipped: 'no-key-or-recipient' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: await r.text().catch(() => '') };
    const json = await r.json();
    return { ok: true, messageId: json?.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function markContacted(leadIds) {
  if (leadIds.length === 0) return { ok: true, updated: 0 };
  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/mark-contacted?token=${encodeURIComponent(CRON_TOKEN)}`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ leadIds }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return { ok: false, status: r.status };
    return await r.json();
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function main() {
  console.log('[cold-temple-outreach] starting');

  if (!CRON_TOKEN) {
    writeReport('cold-temple-outreach', `# cold-temple-outreach — ${TODAY}\n\n**Skipped: CRON_AUTH_TOKEN not set.**\n`);
    return;
  }

  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/cold-temples?token=${encodeURIComponent(CRON_TOKEN)}`;
  let payload = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    payload = await r.json();
  } catch (e) {
    writeReport('cold-temple-outreach', `# cold-temple-outreach — ${TODAY}\n\n**Failed to fetch feed:** ${String(e)}\n`);
    return;
  }

  const leads = payload?.leads ?? [];
  let sent = 0;
  let skipped = 0;
  const contactedIds = [];
  const log = [];

  for (const l of leads) {
    if (!l.email) {
      skipped++;
      continue;
    }
    const subject = l.city ? `Verified temples in ${l.city} are partnering with Darshya` : 'Verified temples are partnering with Darshya';
    const r = await sendEmail({
      to: l.email,
      subject,
      html: emailHtml({ name: l.name, city: l.city }),
    });
    if (r.ok) {
      sent++;
      contactedIds.push(l.id);
      log.push(`- \`${l.name}\` <${l.email}> · ${l.city || 'unknown'} — ✓ sent`);
    } else if (r.skipped) {
      skipped++;
      log.push(`- \`${l.name}\` <${l.email}> — skipped (${r.skipped})`);
    } else {
      log.push(`- \`${l.name}\` <${l.email}> — ✗ failed (${r.status || r.error})`);
    }
    await new Promise((res) => setTimeout(res, 500));
  }

  const markResult = await markContacted(contactedIds);

  const md = `# cold-temple-outreach — ${TODAY}

Polled \`/api/v1/admin/ops/cold-temples\` for NEW TEMPLE leads (lastContactedAt=null, capped 25/run), sent personalized partnership outreach via Resend, then marked each as EMAILED to prevent re-contact.

## Summary

- Eligible: **${leads.length}**
- Sent: **${sent}**
- Skipped (no email): **${skipped}**
- Marked contacted: **${markResult?.updated ?? 0}**

${RESEND_API_KEY ? '' : '_⚠ RESEND_API_KEY not set — no emails actually sent._'}

## Send log

${log.slice(0, 30).join('\n') || '_no eligible leads_'}

---
_Lead status flipped NEW → EMAILED via \`/mark-contacted\`. Re-runs are idempotent — same lead won't be re-contacted._
`;

  writeReport('cold-temple-outreach', md);
  console.log('[cold-temple-outreach] done');
}

main().catch((e) => {
  console.error('[cold-temple-outreach] fatal:', e);
  process.exit(1);
});
