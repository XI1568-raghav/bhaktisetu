// onboarding-nudge — 6-hourly poll for self-onboard leads that stalled in
// NEW state. Three windows (24h / 72h / 7d) get differentiated email +
// WhatsApp nudges, escalating from "we noticed" → "still interested?" →
// "final reminder".
//
// State file `_onboarding-nudge-state.json` records leadId+windowKey
// sent, so the same lead never gets the same nudge twice across cron
// ticks (every 6h would otherwise repeat each run for 24-30h).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, TODAY, isoNow, API_BASE } from './_lib.mjs';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM || 'Darshya Onboarding <onboarding@darshya.online>';
const STATE_DIR = 'docs/agent-reports';
const STATE_FILE = join(STATE_DIR, '_onboarding-nudge-state.json');

function loadState() {
  if (!existsSync(STATE_FILE)) return { sent: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { sent: {} };
  }
}

function saveState(state) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const COPY = {
  '24h': {
    subject: 'Finish your Darshya provider signup — 2 minutes',
    bodyHtml: (name) => `<p>Namaste ${escapeHtml(name)},</p>
<p>You started a provider application on Darshya yesterday but didn't finish KYC. Pick up where you left off — most providers complete signup in under 2 minutes.</p>
<p><a href="https://darshya.online/auth/signin">Continue signup →</a></p>
<p>Reply to this email if you hit any blockers.</p>
<p>— Darshya onboarding team</p>`,
  },
  '72h': {
    subject: 'Still interested in listing on Darshya?',
    bodyHtml: (name) => `<p>Namaste ${escapeHtml(name)},</p>
<p>It's been 3 days since you started your provider application. We're keeping your slot open but it expires soon.</p>
<p><a href="https://darshya.online/auth/signin">Resume application →</a></p>
<p>If you've decided not to proceed, just reply STOP and we'll remove you from our list.</p>
<p>— Darshya onboarding team</p>`,
  },
  '7d': {
    subject: 'Final reminder — your Darshya application',
    bodyHtml: (name) => `<p>Namaste ${escapeHtml(name)},</p>
<p>This is the last reminder for your provider application started a week ago. After today we'll archive it.</p>
<p><a href="https://darshya.online/auth/signin">Finish in 2 minutes →</a></p>
<p>No reply needed if you've moved on.</p>
<p>— Darshya onboarding team</p>`,
  },
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return { ok: false, skipped: 'no-key-or-recipient' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
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
  console.log('[onboarding-nudge] starting');

  if (!CRON_TOKEN) {
    writeReport(
      'onboarding-nudge',
      `# onboarding-nudge — ${TODAY}\n\n**Skipped: CRON_AUTH_TOKEN not set.** Required to fetch lead feed.\n`
    );
    return;
  }

  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/kyc-abandoned?token=${encodeURIComponent(CRON_TOKEN)}`;
  let payload = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    payload = await r.json();
  } catch (e) {
    writeReport(
      'onboarding-nudge',
      `# onboarding-nudge — ${TODAY}\n\n**Failed to fetch lead feed:** ${String(e)}\n`
    );
    return;
  }

  const state = loadState();
  state.sent = state.sent || {};

  const summary = [];
  const sendLog = [];

  for (const [windowKey, copy] of Object.entries(COPY)) {
    const rows = payload?.buckets?.[windowKey] ?? [];
    let sent = 0;
    let skipped = 0;
    for (const lead of rows) {
      const dedupKey = `${lead.id}:${windowKey}`;
      if (state.sent[dedupKey]) {
        skipped++;
        continue;
      }
      if (!lead.email) {
        skipped++;
        continue;
      }
      const r = await sendEmail({
        to: lead.email,
        subject: copy.subject,
        html: copy.bodyHtml(lead.name || 'devotee'),
      });
      if (r.ok || r.skipped) {
        state.sent[dedupKey] = { sentAt: isoNow(), result: r.ok ? 'sent' : r.skipped };
        if (r.ok) sent++;
        else skipped++;
        sendLog.push(`- ${windowKey}: \`${lead.name}\` <${lead.email}> — ${r.ok ? '✓ sent' : `skipped (${r.skipped})`}`);
      } else {
        sendLog.push(`- ${windowKey}: \`${lead.name}\` <${lead.email}> — ✗ failed (${r.status || r.error})`);
      }
      await new Promise((res) => setTimeout(res, 300));
    }
    summary.push({ windowKey, total: rows.length, sent, skipped });
  }

  saveState(state);

  const md = `# onboarding-nudge — ${TODAY}

Polled \`/api/v1/admin/ops/kyc-abandoned\` and nudged stalled provider self-onboard leads at 24h / 72h / 7d windows.

## Summary

| Window | Eligible | Sent | Skipped (deduped or no email) |
|---|---|---|---|
${summary.map((s) => `| ${s.windowKey} | ${s.total} | ${s.sent} | ${s.skipped} |`).join('\n')}

${RESEND_API_KEY ? '' : '_⚠ RESEND_API_KEY not set — no emails actually sent._'}

## Send log (capped)

${sendLog.slice(0, 30).join('\n') || '_no eligible leads_'}

---
_State file: \`_onboarding-nudge-state.json\` (per leadId+window dedup)._
`;

  writeReport('onboarding-nudge', md);
  console.log('[onboarding-nudge] done');
}

main().catch((e) => {
  console.error('[onboarding-nudge] fatal:', e);
  process.exit(1);
});
