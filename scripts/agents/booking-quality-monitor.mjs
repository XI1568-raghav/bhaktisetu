// booking-quality-monitor — hourly poll for SLA-overdue puja bookings.
// A booking is overdue if its scheduledDate is ≥ 24h in the past AND the
// pandit has not yet uploaded videoProofUrl (mandatory per business rule
// #1). Each breach is a refund risk and a trust signal.
//
// Files one rolling GH issue per breach signature, env-or-noops gracefully
// without GITHUB_TOKEN / CRON_AUTH_TOKEN.

import { writeReport, TODAY, API_BASE } from './_lib.mjs';

const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const GH_REPO = process.env.GH_REPO || 'XI1568-raghav/bhaktisetu';
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

async function ghFetch(path, init = {}) {
  if (!GH_TOKEN) return { status: 0, json: null };
  try {
    const r = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${GH_TOKEN}`,
        'user-agent': 'darshya-booking-quality-monitor',
        ...(init.headers || {}),
      },
    });
    const json = await r.json().catch(() => null);
    return { status: r.status, json };
  } catch (e) {
    return { status: 0, json: null, error: String(e) };
  }
}

async function fileIssue(title, body) {
  const { status, json } = await ghFetch(`/repos/${GH_REPO}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      labels: ['agent-auto-filed', 'booking-quality', 'P0'],
    }),
  });
  if (status === 201) return { ok: true, url: json?.html_url, number: json?.number };
  return { ok: false, status, error: json?.message };
}

async function findOpenSlaIssue() {
  const { json } = await ghFetch(
    `/repos/${GH_REPO}/issues?state=open&labels=booking-quality&per_page=10`
  );
  return (Array.isArray(json) ? json : []).find((i) => /sla-overdue:/.test(i.body || ''));
}

function fingerprint(rows) {
  const sig = rows
    .map((r) => r.bookingNumber)
    .sort()
    .join(',');
  let h = 0;
  for (let i = 0; i < sig.length; i++) h = ((h << 5) - h + sig.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

async function main() {
  console.log('[booking-quality-monitor] starting');

  if (!CRON_TOKEN) {
    writeReport(
      'booking-quality-monitor',
      `# booking-quality-monitor — ${TODAY}\n\n**Skipped: CRON_AUTH_TOKEN not set.** Generate \`openssl rand -hex 32\`, set as GH Actions secret + Render env var to enable.\n`
    );
    return;
  }

  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/sla-overdue-bookings?token=${encodeURIComponent(CRON_TOKEN)}`;
  let payload = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    payload = await r.json();
  } catch (e) {
    writeReport(
      'booking-quality-monitor',
      `# booking-quality-monitor — ${TODAY}\n\n**Failed to fetch SLA feed:** ${String(e)}\n\nVerify API_BASE + CRON_AUTH_TOKEN parity between Render and GH Actions.\n`
    );
    return;
  }

  const rows = payload?.bookings ?? [];
  const count = rows.length;

  let issueLine = '_No GH issue filed (GITHUB_TOKEN missing or no breaches)._';
  if (count > 0 && GH_TOKEN) {
    const fp = fingerprint(rows);
    const existing = await findOpenSlaIssue();
    if (existing && (existing.body || '').includes(`sla-overdue:${fp}`)) {
      issueLine = `_Existing open issue covers this signal: ${existing.html_url}_`;
    } else {
      const body = `## SLA breach — pandits missing video proof past 24h

${rows
  .slice(0, 25)
  .map(
    (b) =>
      `- \`${b.bookingNumber}\` · scheduled \`${b.scheduledDate?.slice(0, 10)}\` · status \`${b.status}\` · ₹${b.priceAmount} · priest \`${b.priestId ?? 'unassigned'}\``,
  )
  .join('\n')}

**Action**: WhatsApp every pandit listed above. Force-cancel + auto-refund any booking past 72h without proof (business rule #1 — video proof is mandatory).

---
_Auto-filed by \`booking-quality-monitor\` on ${TODAY}._
_sla-overdue:${fp}_
`;
      const result = await fileIssue(`[SLA] ${count} puja booking(s) missing video proof past 24h`, body);
      issueLine = result.ok
        ? `Filed GH issue #${result.number}: ${result.url}`
        : `Failed to file issue: ${result.error || result.status}`;
    }
  }

  const md = `# booking-quality-monitor — ${TODAY}

Polled \`/api/v1/admin/ops/sla-overdue-bookings\` for puja bookings past their scheduled date by ≥24h with no \`videoProofUrl\`.

## Result

- **${count}** breach(es)
- Cutoff: \`${payload?.cutoff ?? 'n/a'}\`
- ${issueLine}

${
  count === 0
    ? '_All recent bookings are on-time. Continue monitoring._'
    : `## Top breaches\n\n| Booking | Scheduled | Status | ₹ | Priest |\n|---|---|---|---|---|\n${rows
        .slice(0, 15)
        .map(
          (b) =>
            `| \`${b.bookingNumber}\` | ${b.scheduledDate?.slice(0, 10)} | ${b.status} | ${b.priceAmount} | ${b.priestId?.slice(0, 8) ?? '—'} |`,
        )
        .join('\n')}`
}
`;

  writeReport('booking-quality-monitor', md);
  console.log('[booking-quality-monitor] done');
}

main().catch((e) => {
  console.error('[booking-quality-monitor] fatal:', e);
  process.exit(1);
});
