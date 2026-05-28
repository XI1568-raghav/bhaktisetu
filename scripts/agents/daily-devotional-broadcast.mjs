#!/usr/bin/env node
// daily-devotional-broadcast — 06:00 IST WA-primary push of today's
// devotional message. Deterministic: vaar devata (day-of-week deity) +
// rotating mantra + tithi/panchang snapshot from API.
//
// Resend cap protect: WhatsApp-only. Env-or-noop on WHATSAPP_ACCESS_TOKEN
// + WHATSAPP_PHONE_NUMBER_ID + a template name. If WA not configured,
// writes the report and skips send (still useful as content draft + log).
//
// Output: docs/agent-reports/YYYY-MM-DD-daily-devotional-broadcast.md
import { writeReport, upsertLog, fetchJson, API_BASE, TODAY } from './_lib.mjs';

const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WA_TEMPLATE = process.env.WHATSAPP_DEVOTIONAL_TEMPLATE || 'daily_devotional';
const CRON_TOKEN = process.env.CRON_AUTH_TOKEN || '';
const MAX_RECIPIENTS = Number.parseInt(process.env.MAX_WA_RECIPIENTS || '500', 10);

// Vaar devata — day-of-week deity per Hindu tradition.
const VAAR_DEVATA = [
  { day: 'Ravivar (Sunday)',    deity: 'Surya',       mantra: 'ॐ घृणि सूर्याय नमः', english: 'Om Ghrini Suryaya Namah' },
  { day: 'Somvar (Monday)',     deity: 'Shiva',       mantra: 'ॐ नमः शिवाय',         english: 'Om Namah Shivaya' },
  { day: 'Mangalvar (Tuesday)', deity: 'Hanuman',     mantra: 'ॐ हं हनुमते नमः',     english: 'Om Han Hanumate Namah' },
  { day: 'Budhvar (Wednesday)', deity: 'Ganesha',     mantra: 'ॐ गं गणपतये नमः',     english: 'Om Gan Ganapataye Namah' },
  { day: 'Guruvar (Thursday)',  deity: 'Vishnu / Brihaspati', mantra: 'ॐ बृं बृहस्पतये नमः', english: 'Om Brim Brihaspataye Namah' },
  { day: 'Shukravar (Friday)',  deity: 'Lakshmi',     mantra: 'ॐ श्रीं महालक्ष्म्यै नमः', english: 'Om Shrim Mahalakshmyai Namah' },
  { day: 'Shanivar (Saturday)', deity: 'Shani',       mantra: 'ॐ शं शनैश्चराय नमः',   english: 'Om Sham Shanaishcharaya Namah' },
];

// Rotating shloka pool — Bhagavad Gita verses, one per day-of-year.
const SHLOKAS = [
  { ref: 'BG 2.47', sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', english: 'You have a right to perform your prescribed duty, but never to the fruits of action.' },
  { ref: 'BG 4.7',  sanskrit: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।', english: 'Whenever there is a decline in righteousness, I manifest myself.' },
  { ref: 'BG 6.5',  sanskrit: 'उद्धरेदात्मनाऽऽत्मानं नात्मानमवसादयेत्।', english: 'Lift yourself by your own efforts; do not let yourself fall.' },
  { ref: 'BG 9.22', sanskrit: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।', english: 'To those who are constantly devoted, I carry what they lack and preserve what they have.' },
  { ref: 'BG 18.66', sanskrit: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।', english: 'Abandon all dharmas and take refuge in Me alone — I shall liberate you from all sins.' },
  { ref: 'BG 3.35', sanskrit: 'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।', english: 'Better one\'s own dharma imperfectly done than another\'s well-performed.' },
  { ref: 'BG 7.7',  sanskrit: 'मत्तः परतरं नान्यत्किञ्चिदस्ति धनञ्जय।', english: 'There is nothing higher than Me, O Arjuna.' },
];

function pickToday() {
  const now = new Date();
  const dow = now.getUTCDay();
  const doy = Math.floor(now.getTime() / 86400000);
  return {
    vaar: VAAR_DEVATA[dow],
    shloka: SHLOKAS[doy % SHLOKAS.length],
  };
}

async function getPanchang() {
  if (!CRON_TOKEN) return null;
  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/panchang/today?token=${encodeURIComponent(CRON_TOKEN)}`;
  const { json, status } = await fetchJson(url, { signal: AbortSignal.timeout(10_000) });
  if (status !== 200 || !json) return null;
  return json;
}

async function getOptedInRecipients() {
  if (!CRON_TOKEN) return [];
  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/admin/ops/wa-devotional-opt-ins?token=${encodeURIComponent(CRON_TOKEN)}`;
  const { json, status } = await fetchJson(url, { signal: AbortSignal.timeout(15_000) });
  if (status !== 200 || !Array.isArray(json?.users)) return [];
  return json.users.slice(0, MAX_RECIPIENTS);
}

async function sendWa({ to, deity, mantra, english }) {
  if (!WA_TOKEN || !WA_PHONE_ID) return { ok: false, skipped: 'wa-unconfigured' };
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${WA_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: WA_TEMPLATE,
          language: { code: 'en' },
          components: [
            { type: 'body', parameters: [
              { type: 'text', text: deity },
              { type: 'text', text: mantra },
              { type: 'text', text: english },
            ]},
          ],
        },
      }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: await r.text().catch(() => '') };
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}

async function main() {
  console.log('[daily-devotional-broadcast] starting');
  const { vaar, shloka } = pickToday();
  const panchang = await getPanchang();
  const recipients = await getOptedInRecipients();

  let sent = 0; let failed = 0; let skipped = 0;
  const log = [];

  if (WA_TOKEN && WA_PHONE_ID && recipients.length > 0) {
    for (const r of recipients) {
      if (!r.phone) { skipped++; continue; }
      const result = await sendWa({
        to: r.phone,
        deity: vaar.deity,
        mantra: vaar.mantra,
        english: vaar.english,
      });
      if (result.ok) sent++;
      else if (result.skipped) skipped++;
      else { failed++; log.push(`- ${r.phone} — failed (${result.status || result.error})`); }
      await new Promise((res) => setTimeout(res, 200));
    }
  } else {
    skipped = recipients.length;
  }

  const md = `# Daily devotional broadcast — ${TODAY}

**${vaar.day}** · Vaar devata: **${vaar.deity}**

## Today's mantra (108 repetitions recommended)

> ${vaar.mantra}
>
> _${vaar.english}_

## Today's shloka — ${shloka.ref}

> ${shloka.sanskrit}
>
> _${shloka.english}_

${panchang ? `## Today's panchang

- Tithi: ${panchang.tithi ?? 'n/a'}
- Nakshatra: ${panchang.nakshatra ?? 'n/a'}
- Yoga: ${panchang.yoga ?? 'n/a'}
- Sunrise: ${panchang.sunrise ?? 'n/a'} · Sunset: ${panchang.sunset ?? 'n/a'}
- Rahu kaal: ${panchang.rahuKaal ?? 'n/a'}
` : '_Panchang API unavailable today — broadcast went out without tithi/nakshatra._'}

## Send summary

- Opted-in recipients: **${recipients.length}**
- Sent: **${sent}**
- Failed: **${failed}**
- Skipped (no phone / wa-unconfigured): **${skipped}**

${WA_TOKEN ? '' : '_⚠ WHATSAPP_ACCESS_TOKEN not set — message above is draft only._'}
${WA_PHONE_ID ? '' : '_⚠ WHATSAPP_PHONE_NUMBER_ID not set._'}

${log.length ? `## Failures\n\n${log.slice(0, 20).join('\n')}\n` : ''}
---

_Resend cap protect: WA-only. Email channel intentionally not used to preserve 100/day limit for transactional._
`;

  writeReport('daily-devotional-broadcast', md);
  upsertLog('daily-devotional-broadcast', `dow=${new Date().getUTCDay()} deity=${vaar.deity} sent=${sent} failed=${failed} skipped=${skipped}`);
  console.log(`[daily-devotional-broadcast] done sent=${sent} failed=${failed}`);
}

main().catch((e) => {
  console.error('[daily-devotional-broadcast] FATAL', e);
  process.exit(1);
});
