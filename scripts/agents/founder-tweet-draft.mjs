#!/usr/bin/env node
// Founder-tweet draft agent — generates 5 founder-voice tweet drafts daily
// based on real product signals (sitemap URL counts, panchang day, current
// festival proximity). Output is a markdown checklist the founder can copy.
// No external AI calls — deterministic templates seeded with day-of-month.
// Output: docs/agent-reports/YYYY-MM-DD-founder-tweet-draft.md
import { fetchText, writeReport, upsertLog, WEB_BASE, TODAY } from './_lib.mjs';

// Indian festivals 2026 (approximate dates — for hook timing only, not authoritative).
const FESTIVALS = [
  { name: 'Ram Navami',     date: '2026-03-27' },
  { name: 'Hanuman Jayanti', date: '2026-04-10' },
  { name: 'Akshaya Tritiya', date: '2026-04-29' },
  { name: 'Buddha Purnima',  date: '2026-05-01' },
  { name: 'Jagannath Rath Yatra', date: '2026-07-16' },
  { name: 'Guru Purnima',    date: '2026-07-29' },
  { name: 'Raksha Bandhan',  date: '2026-08-28' },
  { name: 'Janmashtami',     date: '2026-09-04' },
  { name: 'Ganesh Chaturthi', date: '2026-09-15' },
  { name: 'Navratri (start)', date: '2026-10-11' },
  { name: 'Diwali',          date: '2026-11-08' },
  { name: 'Chhath Puja',     date: '2026-11-14' },
];

function nextFestival(today) {
  const t = new Date(today + 'T00:00:00Z').getTime();
  return FESTIVALS.find((f) => new Date(f.date + 'T00:00:00Z').getTime() >= t) || FESTIVALS[0];
}

function daysUntil(target, today) {
  const a = new Date(today + 'T00:00:00Z').getTime();
  const b = new Date(target + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

const TEMPLATES = [
  ({ festival, dDays, sitemapUrls }) =>
    `${dDays} days to ${festival.name}.\n\nBuilding the puja booking flow nobody is talking about: video proof + verified pandits + transparent commission. ${sitemapUrls}+ pages live now at darshya.online — solo founder, $0 ad spend.`,
  ({ festival, dDays }) =>
    `Indian diaspora problem nobody is solving:\n\nyour parents back home want a Satyanarayan puja done for ${festival.name} but you don't trust the random WhatsApp pandit forwarded by relatives.\n\nFix: verified pandits, video proof, fixed price in USD. Building it at darshya.online.`,
  () =>
    `Hot take: religion tech in India is undercooked.\n\n- Sri Mandir, AppsForBharat raised $10M+\n- Still no live darshan QoS standard\n- Still no transparent commission to the temple\n- Still no diaspora UX\n\nWe're shipping all three at darshya.online. Solo + bootstrapped.`,
  ({ today }) =>
    `Today's panchang (${today}) is live at darshya.online/panchang — tithi, nakshatra, rahu kaal, auspicious muhurat windows. Calculated from Drik methodology, no app required.\n\nFree. Forever.`,
  ({ festival }) =>
    `Shloka of the day from Bhagavad Gita is live at darshya.online/shlokas.\n\n8 hand-picked shlokas with Sanskrit + transliteration + meaning + shareable OG cards. ${festival.name} themed picks coming soon.\n\nNo paywall. No ads. Just the sacred texts.`,
];

async function getSitemapStats() {
  const { text } = await fetchText(`${WEB_BASE}/sitemap.xml`);
  const urlCount = (text.match(/<loc>/g) || []).length;
  return { sitemapUrls: urlCount };
}

async function run() {
  const stats = await getSitemapStats();
  const festival = nextFestival(TODAY);
  const dDays = Math.max(0, daysUntil(festival.date, TODAY));

  const ctx = { festival, dDays, today: TODAY, sitemapUrls: stats.sitemapUrls };

  let md = `# Founder tweet drafts — ${TODAY}\n\n`;
  md += `Context: ${festival.name} in ${dDays}d · ${stats.sitemapUrls} URLs live\n\n`;
  md += `Copy any one to X. Personalize, don't auto-post — the algorithm rewards authenticity.\n\n`;

  TEMPLATES.forEach((tpl, i) => {
    const tweet = tpl(ctx);
    const chars = tweet.length;
    const status = chars <= 280 ? '✓' : chars <= 4000 ? '⚠ premium' : '✗ too long';
    md += `## Draft ${i + 1} — ${chars} chars ${status}\n\n`;
    md += '```\n' + tweet + '\n```\n\n';
  });

  md += `\n---\n\n`;
  md += `**Posting cadence**: 1-2 per day max. Reply to bigger accounts in your niche (@srimandir, @vedicfolks) within 30 min of their posts for max reach.\n`;

  writeReport('founder-tweet-draft', md);
  upsertLog('founder-tweet-draft', `festival=${festival.name} d=${dDays} drafts=${TEMPLATES.length}`);
}

run().catch((e) => {
  console.error('[founder-tweet-draft] FATAL', e);
  process.exit(1);
});
