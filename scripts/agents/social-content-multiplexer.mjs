#!/usr/bin/env node
// social-content-multiplexer — supersedes founder-tweet-draft + rss-to-thread
// + content-publisher dedup work. Reads recent agent reports + festival
// calendar + sitemap stats, emits a single multi-channel content pack:
//   5 X drafts (≤ 280 chars), 3 LinkedIn posts (~600-900 chars),
//   3 Instagram captions (≤ 2200 chars).
//
// Deterministic — no LLM. Templates are seeded by day-of-year so output is
// reproducible and the founder always has a fresh queue to copy.
//
// Output: docs/agent-reports/YYYY-MM-DD-social-content-multiplexer.md

import { writeReport, upsertLog, fetchText, WEB_BASE, TODAY } from './_lib.mjs';
// TC-01 / TC-08 — see ./_claims.mjs. Everything this file emits is written to
// be posted verbatim to X, LinkedIn and Instagram, so the two unbacked trust
// claims are read off the owner flags instead of being typed into templates.
import { PANDIT_TRUST_LINE, PANDIT_TRUST_SHORT, verifiedNoun, withEightyG } from './_claims.mjs';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPORT_DIR = 'docs/agent-reports';

// Festival hooks — kept lean. Authority lies in apps/web/lib/festivals.ts.
const FESTIVALS_2026 = [
  { name: 'Ram Navami',           date: '2026-03-27' },
  { name: 'Hanuman Jayanti',      date: '2026-04-10' },
  { name: 'Akshaya Tritiya',      date: '2026-04-29' },
  { name: 'Buddha Purnima',       date: '2026-05-01' },
  { name: 'Jagannath Rath Yatra', date: '2026-07-16' },
  { name: 'Guru Purnima',         date: '2026-07-29' },
  { name: 'Raksha Bandhan',       date: '2026-08-28' },
  { name: 'Janmashtami',          date: '2026-09-04' },
  { name: 'Ganesh Chaturthi',     date: '2026-09-15' },
  { name: 'Navratri (start)',     date: '2026-10-11' },
  { name: 'Diwali',               date: '2026-11-08' },
  { name: 'Chhath Puja',          date: '2026-11-14' },
];

function nextFestival(today) {
  const t = new Date(today + 'T00:00:00Z').getTime();
  return FESTIVALS_2026.find((f) => new Date(f.date + 'T00:00:00Z').getTime() >= t) || FESTIVALS_2026[0];
}

function daysUntil(target, today) {
  const a = new Date(today + 'T00:00:00Z').getTime();
  const b = new Date(target + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function recentReports(n = 7) {
  if (!existsSync(REPORT_DIR)) return [];
  const cutoff = Date.now() - n * 86400_000;
  return readdirSync(REPORT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .filter((f) => {
      const d = f.slice(0, 10);
      return Date.parse(d + 'T00:00:00Z') >= cutoff;
    })
    .map((f) => ({
      name: f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
      date: f.slice(0, 10),
    }));
}

async function getSitemapUrlCount() {
  const { text } = await fetchText(`${WEB_BASE}/sitemap.xml`);
  return (text.match(/<loc>/g) || []).length;
}

const X_TEMPLATES = [
  ({ festival, dDays, urls }) =>
    `${dDays}d to ${festival.name}.\n\nDarshya now indexes ${urls}+ devotional pages — every major puja, every sacred city, every chalisa. Solo founder, $0 ads.\n\nIf you've been waiting for India's first transparent puja platform: darshya.online`,
  ({ festival }) =>
    `Diaspora problem nobody solves:\n\nyour parents want a Satyanarayan puja for ${festival.name}. You don't trust the random WhatsApp pandit forwarded by relatives.\n\nFix: ${verifiedNoun('pandits')}, video proof of every puja, USD-fixed price. darshya.online`,
  () =>
    `Religion-tech hot take:\n\n- Sri Mandir + AppsForBharat raised $10M+\n- Still no live darshan QoS standard\n- Still no transparent temple commission\n- Still no diaspora UX\n\nWe ship all three at darshya.online. Solo + bootstrapped.`,
  ({ today }) =>
    `Today's panchang (${today}) live: tithi, nakshatra, rahu kaal, auspicious muhurat windows.\n\nDrik methodology, no app required, no paywall.\n\ndarshya.online/panchang`,
  ({ festival }) =>
    `Shloka of the day from Bhagavad Gita is live.\n\n${festival.name} themed shareable cards coming. Sanskrit + transliteration + meaning + OG cards you can post to WA.\n\ndarshya.online/shlokas`,
];

const LINKEDIN_TEMPLATES = [
  ({ festival, dDays, urls }) => `${dDays} days to ${festival.name}.

Update from darshya.online — India's first transparent puja platform built for the diaspora:

• ${urls}+ devotional pages indexed (every major puja, sacred city, chalisa, aarti, festival)
• ${PANDIT_TRUST_LINE}
• Fixed USD pricing for NRIs — no surprise commissions
• ${withEightyG('80G receipts on every donation through the platform', 'A numbered receipt PDF on every donation — proof of payment, not a tax-exemption certificate')}

Solo founder, $0 ad budget, 90 days to seed pitch. Building in public.

If you know an NRI family that's been burned by random-WhatsApp-pandit syndrome, send them our way.

#religionTech #IndiaStartup #buildInPublic`,

  ({ festival }) => `Hard truth from the religion-tech trenches:

The largest devotional apps in India raised $10M+ rounds and shipped:
- No live darshan quality-of-service standard
- No transparent temple commission disclosure
- No NRI-first UX (diaspora has zero presence in the funnel)

At darshya.online we made these the founding non-negotiables.

For ${festival.name} this year, we'll be running ${verifiedNoun('pandit')} puja bookings with full video proof — sender (any country) pays USD, recipient (in India) gets the call + video.

If you're building in religion-tech, devotional content, or NRI fintech — let's compare notes.

#religionTech #NRIDiaspora #productMarketFit`,

  () => `Why I'm building Darshya solo — and why I haven't raised yet:

The Indian devotional market is ₹40,000 crore annually. The diaspora layer alone is ₹5,000 crore in remittance-for-rituals.

Existing players target volume domestic devotees. Nobody serves the family in San Jose whose mother in Varanasi wants a puja done correctly.

So I started building. ${TODAY} update:
- Programmatic SEO across pujas × temples × deities × cities
- 24 agents in the daily fleet (lighthouse, broken-link, schema, competitor watch, etc)
- ${verifiedNoun('Pandit')} onboarding live
- WhatsApp video-proof delivery scoped

90 days to a seed pitch. Building in public at darshya.online.

#solofounder #religionTech #IndiaStartup`,
];

const INSTA_TEMPLATES = [
  ({ festival, dDays }) => `🕉 ${dDays} days to ${festival.name}.

Did you know? Booking a ${verifiedNoun('pandit')} for a remote puja used to mean:
❌ Random WhatsApp forwards
❌ No video proof
❌ No fixed pricing for NRIs

We built darshya.online to fix exactly this.

✅ ${PANDIT_TRUST_SHORT}
✅ Full video proof delivered to your phone
✅ Fixed USD pricing for diaspora families

Link in bio.

#${festival.name.replace(/\s+/g, '')} #HinduFestival #PujaBooking #NRIIndia #VerifiedPandit #DevotionalTech`,

  () => `🌅 Today's panchang at darshya.online/panchang

🪔 Tithi · Nakshatra · Yoga · Karana
🌅 Sunrise · Sunset · Moonrise
⚠️ Rahu Kaal · Yamaganda · Gulika
✨ Abhijit · Brahma Muhurat windows

Calculated using Drik methodology. No app required. No ads. No paywall.

The most accurate panchang for the most important decisions of your day.

#Panchang #VedicAstrology #Muhurat #DailyDharma #HinduCalendar`,

  ({ festival }) => `📿 Sacred geography of India runs deeper than tourism.

12 Jyotirlinga · 51 Shakti Peeth · 4 Char Dham · 7 Sapta Puri · 5 Pancha Bhoota · 8 Ashta Vinayak

We're indexing every one at darshya.online/pilgrimage — with significance, legend, best season, how to reach, where to stay, what to offer.

Coming for ${festival.name}: themed pilgrimage circuits.

Tag someone planning a pilgrimage this year. 🙏

#Pilgrimage #SacredGeography #HinduTirth #Jyotirlinga #CharDham #DevotionalIndia`,
];

function chars(s) { return s.length; }
function xStatus(s) { return chars(s) <= 280 ? '✓' : chars(s) <= 4000 ? '⚠ premium' : '✗ too long'; }
function liStatus(s) { return chars(s) <= 3000 ? '✓' : '⚠ truncate'; }
function igStatus(s) { return chars(s) <= 2200 ? '✓' : '✗ over cap'; }

async function main() {
  console.log('[social-content-multiplexer] starting');

  const urls = await getSitemapUrlCount().catch(() => 0);
  const festival = nextFestival(TODAY);
  const dDays = daysUntil(festival.date, TODAY);
  const reports = recentReports(7);
  const ctx = { festival, dDays, today: TODAY, urls };

  const xDrafts = X_TEMPLATES.map((t) => t(ctx));
  const liDrafts = LINKEDIN_TEMPLATES.map((t) => t(ctx));
  const igDrafts = INSTA_TEMPLATES.map((t) => t(ctx));

  let md = `# Social content multiplexer — ${TODAY}\n\n`;
  md += `Context: ${festival.name} in ${dDays}d · ${urls} URLs live · ${reports.length} fleet reports past 7d\n\n`;
  md += `One content pack, three channels. Copy any; personalize before posting — algorithms reward variation.\n\n`;
  md += `> _Supersedes founder-tweet-draft + rss-to-thread + content-publisher dedup work._\n\n`;

  md += `## X (Twitter) — 5 drafts\n\n`;
  xDrafts.forEach((t, i) => {
    md += `### X draft ${i + 1} — ${chars(t)} chars ${xStatus(t)}\n\n\`\`\`\n${t}\n\`\`\`\n\n`;
  });

  md += `## LinkedIn — 3 posts\n\n`;
  liDrafts.forEach((t, i) => {
    md += `### LinkedIn draft ${i + 1} — ${chars(t)} chars ${liStatus(t)}\n\n\`\`\`\n${t}\n\`\`\`\n\n`;
  });

  md += `## Instagram — 3 captions\n\n`;
  igDrafts.forEach((t, i) => {
    md += `### IG draft ${i + 1} — ${chars(t)} chars ${igStatus(t)}\n\n\`\`\`\n${t}\n\`\`\`\n\n`;
  });

  md += `---\n\n`;
  md += `**Cadence guidance**\n`;
  md += `- X: 1-2 posts/day, reply to bigger accounts in niche within 30 min for max reach\n`;
  md += `- LinkedIn: 2-3 posts/week, post Tue/Wed/Thu 09:00-11:00 IST\n`;
  md += `- Instagram: 3-5 posts/week + 1-2 reels, peak time 19:00-21:00 IST\n`;

  writeReport('social-content-multiplexer', md);
  upsertLog('social-content-multiplexer', `festival=${festival.name} d=${dDays} x=${xDrafts.length} li=${liDrafts.length} ig=${igDrafts.length}`);
  console.log('[social-content-multiplexer] done');
}

main().catch((e) => {
  console.error('[social-content-multiplexer] FATAL', e);
  process.exit(1);
});
