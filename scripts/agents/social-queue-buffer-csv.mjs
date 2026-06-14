#!/usr/bin/env node
// Social-queue → Buffer CSV exporter.
// Reads the latest docs/agent-reports/YYYY-MM-DD-social-queue.md (output of social-queue.mjs)
// and emits a Buffer-import-compatible CSV with per-platform variants (Twitter / LinkedIn / Instagram).
//
// Buffer free tier accepts CSV via Bulk Upload:
//   Columns: text, profile_service, scheduled_at, image_url (optional)
//   See: https://support.buffer.com/article/487-bulk-upload-from-csv
//
// Output: docs/marketing/buffer-21-social-posts.csv
// Usage:  node scripts/agents/social-queue-buffer-csv.mjs
//
// No external deps. Reads + writes via node:fs. Stdout = summary table.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPORTS_DIR = resolve('docs/agent-reports');
const OUT_PATH = resolve('docs/marketing/buffer-21-social-posts.csv');

function findLatestSocialQueueReport() {
  const files = readdirSync(REPORTS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-social-queue\.md$/.test(f))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error('No social-queue report found. Run `node scripts/agents/social-queue.mjs` first.');
  }
  return join(REPORTS_DIR, files[0]);
}

function parseReport(mdPath) {
  // Normalize CRLF → LF so the regex works on Windows-authored files.
  const raw = readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n');
  const posts = [];
  // Pattern: ### N. YYYY-MM-DD · HH:MM IST · type\n\n```\nBODY\n```
  const re = /### \d+\. (\d{4}-\d{2}-\d{2}) · ([0-9:]+ IST) · (\w+)\n\n```\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    posts.push({ date: m[1], slot: m[2], type: m[3], body: m[4] });
  }
  return posts;
}

// IST → ISO scheduled_at for Buffer. Buffer wants ISO 8601 in the channel's set timezone.
// We emit IST as +05:30 so any Buffer account in IST will respect it.
function slotToIso(date, slot) {
  // slot e.g. "9:00 IST" or "13:00 IST"
  const hhmm = slot.replace(' IST', '');
  const [h, mm] = hhmm.split(':').map(Number);
  const hh = String(h).padStart(2, '0');
  const mmStr = String(mm).padStart(2, '0');
  return `${date}T${hh}:${mmStr}:00+05:30`;
}

// Per-platform routing (matches handoff doc cadence rules):
//   Twitter: all 21 posts (cheap real estate)
//   LinkedIn: type ∈ {NRI, gurukul, founder}
//   Instagram: type ∈ {shloka, temple, gaushala}
function platformsForType(type) {
  const out = ['twitter'];
  if (['NRI', 'gurukul', 'founder'].includes(type)) out.push('linkedin');
  if (['shloka', 'temple', 'gaushala'].includes(type)) out.push('instagram');
  return out;
}

// Twitter has a 280-char limit. Truncate longer bodies with a "…" + link cue.
function adaptForTwitter(body) {
  if (body.length <= 280) return body;
  // Find last hashtag block; trim middle.
  const tags = body.match(/(#\w+\s*)+$/)?.[0] ?? '';
  const head = body.slice(0, 280 - tags.length - 2).trimEnd();
  return `${head}…\n${tags}`.trim();
}

// LinkedIn allows up to 3000 chars; expand with a soft founder-voice intro.
function adaptForLinkedin(body, type) {
  const prefix = {
    NRI:
      'Building Darshya — devotional super-app for India. Sharing today\'s NRI-lane update:\n\n',
    gurukul:
      'Free Sanskrit + Vedic learning is core to Darshya\'s mission. Today:\n\n',
    founder:
      'Building in public — Darshya weekly update:\n\n',
  }[type] ?? '';
  return `${prefix}${body}\n\nDarshya is a devotional super-app for India: live darshan, verified puja with video proof, gaushala seva, Sanskrit learning. darshya.online`;
}

// Instagram captions: keep body, add Reel-friendly CTA.
function adaptForInstagram(body, type) {
  const cta = {
    shloka: '\n\n📿 Save this for daily recitation. Follow @bhaktisetu for daily shlokas.',
    temple: '\n\n🛕 Live darshan available on Darshya. Link in bio.',
    gaushala: '\n\n🐄 Adopt a gau-mata for ₹2,000/month. Link in bio.',
  }[type] ?? '';
  return `${body}${cta}`;
}

function csvEscape(s) {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(posts) {
  const header = 'text,profile_service,scheduled_at,type,day_index';
  const rows = [header];
  posts.forEach((p, idx) => {
    const platforms = platformsForType(p.type);
    const scheduledAt = slotToIso(p.date, p.slot);
    for (const platform of platforms) {
      let body;
      if (platform === 'twitter') body = adaptForTwitter(p.body);
      else if (platform === 'linkedin') body = adaptForLinkedin(p.body, p.type);
      else body = adaptForInstagram(p.body, p.type);
      rows.push(
        [csvEscape(body), platform, scheduledAt, p.type, idx + 1].join(','),
      );
    }
  });
  return rows.join('\n') + '\n';
}

function main() {
  const reportPath = findLatestSocialQueueReport();
  const posts = parseReport(reportPath);
  if (posts.length === 0) {
    throw new Error(`No posts parsed from ${reportPath}. Has the agent template drifted?`);
  }
  const csv = buildCsv(posts);
  writeFileSync(OUT_PATH, csv, 'utf8');

  // Summary to stdout (counts per platform / per type)
  const platformCounts = { twitter: 0, linkedin: 0, instagram: 0 };
  const typeCounts = {};
  for (const p of posts) {
    for (const plat of platformsForType(p.type)) platformCounts[plat]++;
    typeCounts[p.type] = (typeCounts[p.type] ?? 0) + 1;
  }
  console.log(`Source: ${reportPath}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log(`Posts:  ${posts.length} (over ${new Set(posts.map((p) => p.date)).size} days)`);
  console.log(`Per platform: twitter=${platformCounts.twitter}, linkedin=${platformCounts.linkedin}, instagram=${platformCounts.instagram}`);
  console.log(`Per type: ${Object.entries(typeCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
}

main();
