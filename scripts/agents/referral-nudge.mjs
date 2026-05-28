// referral-nudge — daily 07:00 IST poll for users whose first booking
// landed 7-8 days ago. Sends one email per user with a deep link to
// /refer + a 10% off prompt for their friend. State file dedups by
// user_id so the same user never gets the same nudge twice.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, TODAY, isoNow, API_BASE, WEB_BASE } from './_lib.mjs';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM || 'Darshya Referrals <referrals@darshya.online>';
const STATE_FILE = join('docs/agent-reports', '_referral-nudge-state.json');

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

function emailHtml(name) {
  const referUrl = `${WEB_BASE.replace(/\/$/, '')}/refer?utm_source=referral-nudge&utm_medium=email`;
  return `<p>Namaste ${escapeHtml(name || 'devotee')},</p>
<p>Hope your puja experience with Darshya was meaningful. A week in, we'd love your help spreading the seva.</p>
<p>Share your personal referral link and your friend gets <strong>10% off their first booking</strong>. You get the satisfaction of guiding someone to authentic devotional services.</p>
<p><a href="${referUrl}">Get your referral link →</a></p>
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
  console.log('[referral-nudge] starting');

  if (!CRON_TOKEN) {
    writeReport('referral-nudge', `# referral-nudge — ${TODAY}\n\n**Skipped: CRON_AUTH_TOKEN not set.**\n`);
    return;
  }

  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/recent-first-bookings?token=${encodeURIComponent(CRON_TOKEN)}`;
  let payload = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    payload = await r.json();
  } catch (e) {
    writeReport('referral-nudge', `# referral-nudge — ${TODAY}\n\n**Failed to fetch feed:** ${String(e)}\n`);
    return;
  }

  const users = payload?.users ?? [];
  const state = loadState();
  state.sent = state.sent || {};

  let sent = 0;
  let skipped = 0;
  const log = [];

  for (const u of users) {
    if (state.sent[u.user_id]) {
      skipped++;
      continue;
    }
    if (!u.email) {
      skipped++;
      continue;
    }
    const r = await sendEmail({
      to: u.email,
      subject: '✨ A week later — share Darshya with someone you love',
      html: emailHtml(u.full_name),
    });
    if (r.ok || r.skipped) {
      state.sent[u.user_id] = { sentAt: isoNow() };
      if (r.ok) sent++;
      else skipped++;
      log.push(`- \`${u.full_name}\` <${u.email}> — ${r.ok ? '✓ sent' : `skipped (${r.skipped})`}`);
    } else {
      log.push(`- \`${u.full_name}\` <${u.email}> — ✗ failed (${r.status || r.error})`);
    }
    await new Promise((res) => setTimeout(res, 300));
  }

  saveState(state);

  const md = `# referral-nudge — ${TODAY}

Polled \`/api/v1/admin/ops/recent-first-bookings\` for users whose first booking landed 7-8 days ago, and emailed each a referral prompt with deep link to \`/refer\`.

## Summary

- Eligible: **${users.length}**
- Sent: **${sent}**
- Skipped (deduped / no email): **${skipped}**

${RESEND_API_KEY ? '' : '_⚠ RESEND_API_KEY not set — no emails actually sent._'}

## Send log

${log.slice(0, 30).join('\n') || '_no eligible users_'}

---
_State file: \`_referral-nudge-state.json\` (per user_id dedup)._
`;

  writeReport('referral-nudge', md);
  console.log('[referral-nudge] done');
}

main().catch((e) => {
  console.error('[referral-nudge] fatal:', e);
  process.exit(1);
});
