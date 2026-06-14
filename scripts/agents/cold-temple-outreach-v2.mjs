// cold-temple-outreach-v2 — R-Q1-M-014. Personalized outreach v2.
//
// Same data source + idempotent mark-contacted contract as v1, but each
// temple gets a body shaped to its deity tradition, region, city tier, and
// closest relevant festival. No LLM (deterministic, $0 spend).
//
// Free-tier math unchanged: 25/day cap × 30 = 750/mo Resend; well under
// 100/day and 3000/mo limits. Sends serially with 500ms gap.
//
// Counter `email_v2_personalized_sent` (R-Q1-M-014 KPI) increments per
// successful send. Wired into report so manual KPI roller can pick it up.

import { writeReport, TODAY, API_BASE } from './_lib.mjs';
import { buildPersonalizedEmail } from './cold-temple-outreach-v2-personalize.mjs';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM || 'Darshya Partnerships <partnerships@darshya.online>';

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
  console.log('[cold-temple-outreach-v2] starting');

  if (!CRON_TOKEN) {
    writeReport('cold-temple-outreach-v2', `# cold-temple-outreach-v2 — ${TODAY}\n\n**Skipped: CRON_AUTH_TOKEN not set.**\n`);
    return;
  }

  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/cold-temples?token=${encodeURIComponent(CRON_TOKEN)}`;
  let payload = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    payload = await r.json();
  } catch (e) {
    writeReport('cold-temple-outreach-v2', `# cold-temple-outreach-v2 — ${TODAY}\n\n**Failed to fetch feed:** ${String(e)}\n`);
    return;
  }

  const leads = payload?.leads ?? [];
  let sent = 0;
  let skipped = 0;
  const contactedIds = [];
  const log = [];
  const deityBreakdown = {};
  const regionBreakdown = {};

  for (const l of leads) {
    if (!l.email) {
      skipped++;
      continue;
    }
    const { subject, html, deityClass, region, cityTier } = buildPersonalizedEmail(l);
    deityBreakdown[deityClass] = (deityBreakdown[deityClass] || 0) + 1;
    regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;

    const r = await sendEmail({ to: l.email, subject, html });
    if (r.ok) {
      sent++;
      contactedIds.push(l.id);
      log.push(`- \`${l.name || '?'}\` <${l.email}> · ${l.city || 'unknown'} · ${deityClass}/${region}/${cityTier} — ✓ sent`);
    } else if (r.skipped) {
      skipped++;
      log.push(`- \`${l.name || '?'}\` <${l.email}> · ${deityClass}/${region} — skipped (${r.skipped})`);
    } else {
      log.push(`- \`${l.name || '?'}\` <${l.email}> · ${deityClass}/${region} — ✗ failed (${r.status || r.error})`);
    }
    await new Promise((res) => setTimeout(res, 500));
  }

  const markResult = await markContacted(contactedIds);

  const fmtBreakdown = (m) =>
    Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `  - ${k}: ${v}`)
      .join('\n') || '  - _none_';

  const md = `# cold-temple-outreach-v2 — ${TODAY}

Polled \`/api/v1/admin/ops/cold-temples\` for NEW TEMPLE leads (lastContactedAt=null, capped 25/run), generated a **per-temple personalized email body** based on deity tradition + region + city tier + closest festival, sent via Resend, then marked each as EMAILED.

This is the v2 of cold-temple-outreach. v1 used name + city only; v2 shapes the entire hook, body, and value-prop per temple. Deterministic (no LLM, no token spend) — same temple gets the same body on re-test.

## Summary

- Eligible: **${leads.length}**
- Sent: **${sent}**
- Skipped (no email or no Resend key): **${skipped}**
- Marked contacted: **${markResult?.updated ?? 0}**

## KPI

\`\`\`
email_v2_personalized_sent: ${sent}
\`\`\`

_Roadmap item R-Q1-M-014. Roll up into \`_manual-kpis.yml\` if needed; cumulative count lives in the lead table (\`lastContactedAt != null AND contactSource = 'cold-temple-outreach-v2'\`) once the API tracks source._

## Deity-class breakdown

${fmtBreakdown(deityBreakdown)}

## Region breakdown

${fmtBreakdown(regionBreakdown)}

${RESEND_API_KEY ? '' : '_⚠ RESEND_API_KEY not set — no emails actually sent._'}

## Send log

${log.slice(0, 30).join('\n') || '_no eligible leads_'}

---
_Lead status flipped NEW → EMAILED via \`/mark-contacted\`. Re-runs are idempotent — same lead won't be re-contacted._
`;

  writeReport('cold-temple-outreach-v2', md);
  console.log('[cold-temple-outreach-v2] done');
}

main().catch((e) => {
  console.error('[cold-temple-outreach-v2] fatal:', e);
  process.exit(1);
});
