// dormant-reactivation — Wednesday-only weekly poll for users dormant
// ≥30 days. Sends nakshatra-personalised rebook hook (1 email/user/cycle).
//
// State file `_dormant-reactivation-state.json` dedups per user — same
// user won't be re-nudged for 90 days even if still dormant, so we never
// look spammy.
//
// Day gate: only fires on Wednesday (cron is daily but agent self-skips
// other days unless FORCE=1). Keeps Resend send-rate predictable.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, TODAY, isoNow, API_BASE, WEB_BASE } from './_lib.mjs';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM || 'Darshya <hello@darshya.online>';
const STATE_FILE = join('docs/agent-reports', '_dormant-reactivation-state.json');
const FORCE = process.env.FORCE === '1';

// Nakshatra → recommended seva mapping (light, deterministic, no LLM).
const NAKSHATRA_HOOKS = {
  ashwini: 'a Mangal grah shanti puja for new beginnings',
  bharani: 'a Yama tarpan for ancestral peace',
  krittika: 'a Surya namaskar abhishekam',
  rohini: 'a Krishna janmashtami-style abhishek',
  mrigashira: 'a Som-pradosh shiva puja',
  ardra: 'a Rudra abhishekam for difficult karma',
  punarvasu: 'an Aditi puja for fresh starts',
  pushya: 'a Brihaspati graha shanti for prosperity',
  ashlesha: 'a Nag-puja for serpent karma resolution',
  magha: 'a Pitru tarpan for ancestor blessings',
};

function loadState() {
  if (!existsSync(STATE_FILE)) return { sent: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { sent: {} };
  }
}

function saveState(s) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function emailHtml({ name, nakshatra }) {
  const nk = (nakshatra || '').toLowerCase().trim();
  const recommendation = NAKSHATRA_HOOKS[nk] || 'a Mahamrityunjaya jaap for protection and renewal';
  const pujasUrl = `${WEB_BASE.replace(/\/$/, '')}/pujas?utm_source=dormant-reactivation&utm_medium=email`;
  return `<p>Namaste ${escapeHtml(name || 'devotee')},</p>
<p>It's been a while since your last seva on Darshya. Based on your nakshatra${nakshatra ? ` (${escapeHtml(nakshatra)})` : ''}, this is a particularly auspicious month for <strong>${recommendation}</strong>.</p>
<p>Our verified pandits can book one this week with full video proof delivered straight to your phone.</p>
<p><a href="${pujasUrl}">Browse pujas →</a></p>
<p>Hari Om,<br>— Darshya team</p>`;
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

async function main() {
  console.log('[dormant-reactivation] starting');

  const today = new Date();
  const isWednesday = today.getUTCDay() === 3;
  if (!isWednesday && !FORCE) {
    writeReport(
      'dormant-reactivation',
      `# dormant-reactivation — ${TODAY}\n\n**Skipped:** weekly agent, today is not Wednesday (UTC). Use FORCE=1 to override.\n`
    );
    return;
  }

  if (!CRON_TOKEN) {
    writeReport('dormant-reactivation', `# dormant-reactivation — ${TODAY}\n\n**Skipped: CRON_AUTH_TOKEN not set.**\n`);
    return;
  }

  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/dormant-users?days=30&token=${encodeURIComponent(CRON_TOKEN)}`;
  let payload = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    payload = await r.json();
  } catch (e) {
    writeReport('dormant-reactivation', `# dormant-reactivation — ${TODAY}\n\n**Failed to fetch feed:** ${String(e)}\n`);
    return;
  }

  const users = payload?.users ?? [];
  const state = loadState();
  state.sent = state.sent || {};

  let sent = 0;
  let skipped = 0;
  const log = [];
  const ninetyDays = 90 * 24 * 3600_000;

  for (const u of users) {
    const last = state.sent[u.user_id]?.sentAt;
    if (last && Date.now() - Date.parse(last) < ninetyDays) {
      skipped++;
      continue;
    }
    if (!u.email) {
      skipped++;
      continue;
    }
    const r = await sendEmail({
      to: u.email,
      subject: '🕉 An auspicious window for your seva',
      html: emailHtml({ name: u.full_name, nakshatra: u.nakshatra }),
    });
    if (r.ok || r.skipped) {
      state.sent[u.user_id] = { sentAt: isoNow() };
      if (r.ok) sent++;
      else skipped++;
      log.push(`- \`${u.full_name}\` <${u.email}> · nakshatra=${u.nakshatra || 'none'} — ${r.ok ? '✓ sent' : `skipped (${r.skipped})`}`);
    } else {
      log.push(`- \`${u.full_name}\` <${u.email}> — ✗ failed (${r.status || r.error})`);
    }
    await new Promise((res) => setTimeout(res, 400));
  }

  saveState(state);

  const md = `# dormant-reactivation — ${TODAY}

Wednesday weekly. Polled \`/api/v1/admin/ops/dormant-users?days=30\` and emailed each a nakshatra-personalised rebook hook.

## Summary

- Eligible: **${users.length}**
- Sent: **${sent}**
- Skipped (deduped 90d / no email): **${skipped}**
- Cutoff: \`${payload?.cutoffAt ?? 'n/a'}\` (${payload?.cutoffDays ?? 30}d)

${RESEND_API_KEY ? '' : '_⚠ RESEND_API_KEY not set — no emails actually sent._'}

## Send log

${log.slice(0, 30).join('\n') || '_no eligible users_'}

---
_State file: \`_dormant-reactivation-state.json\` (per user_id, 90d dedup window)._
`;

  writeReport('dormant-reactivation', md);
  console.log('[dormant-reactivation] done');
}

main().catch((e) => {
  console.error('[dormant-reactivation] fatal:', e);
  process.exit(1);
});
