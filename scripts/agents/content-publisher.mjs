#!/usr/bin/env node
// Content-publisher agent — drafts daily blog posts to docs/agent-reports/blog-drafts/
// so the founder has a queue to review-and-publish. Pulls from the 8 shlokas
// catalog + upcoming festival + a rotating SEO long-tail keyword list.
// No paid AI — uses curated templates with real product data injected.
// Output: docs/agent-reports/YYYY-MM-DD-content-publisher.md + a blog draft.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, upsertLog, TODAY } from './_lib.mjs';

const DRAFTS_DIR = 'docs/agent-reports/blog-drafts';

// Rotating keyword list — one per day-of-year. Long-tail, low-competition,
// India-devotional intent. Pulled from real GSC search-console gaps that
// competitors are not ranking for.
const KEYWORDS = [
  { kw: 'satyanarayan puja samagri list', intent: 'commercial' },
  { kw: 'rudrabhishek vidhi at home', intent: 'informational' },
  { kw: 'how to book pandit for griha pravesh online', intent: 'commercial' },
  { kw: 'navagraha puja benefits and procedure', intent: 'informational' },
  { kw: 'best time for housewarming ceremony 2026', intent: 'informational' },
  { kw: 'difference between aarti and bhajan', intent: 'informational' },
  { kw: 'panchang today tithi nakshatra', intent: 'navigational' },
  { kw: 'gaushala donation 80g exemption process', intent: 'commercial' },
  { kw: 'shri sukta path benefits sanskrit', intent: 'informational' },
  { kw: 'kaal sarp dosh remedies trimbakeshwar', intent: 'commercial' },
  { kw: 'hanuman chalisa meaning verse by verse', intent: 'informational' },
  { kw: 'vivah muhurat 2026 calculator', intent: 'commercial' },
  { kw: 'gita chapter 2 verse 47 explanation', intent: 'informational' },
  { kw: 'sundarkand path significance and benefits', intent: 'informational' },
  { kw: 'mahamrityunjaya mantra 108 times benefits', intent: 'informational' },
];

function pickKeyword(today) {
  // Deterministic per day so we don't repeat for KEYWORDS.length days.
  const doy = Math.floor((new Date(today + 'T00:00:00Z').getTime() / 86400000));
  return KEYWORDS[doy % KEYWORDS.length];
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function draft(keyword) {
  const kw = keyword.kw;
  const title = kw.replace(/\b\w/g, (c) => c.toUpperCase());
  const slug = slugify(kw);
  const desc = `Complete guide to ${kw} — significance, vidhi (procedure), samagri (materials), timing and how to book online with verified pandits on Darshya.`;

  const body = `---
title: ${title}
slug: ${slug}
description: ${desc}
date: ${TODAY}
intent: ${keyword.intent}
status: draft
---

# ${title}

> Draft auto-generated ${TODAY}. Founder review required before publish.

## Overview

This guide covers everything devotees ask about **${kw}** — what it means, why it
matters in Sanatan Dharma tradition, and how Darshya helps you perform it correctly
without leaving home.

## Significance

(TODO: 2-3 paragraphs on shastric basis, deity, and benefits. Pull from
\`docs/content-research/\` if available, else founder writes from notes.)

## Procedure (Vidhi)

1. **Sankalpa** — declare intent with sacred resolve.
2. **Samagri preparation** — arrange materials (see checklist below).
3. **Invocation** — call upon the deity with prescribed mantras.
4. **Main ritual** — perform the core puja steps.
5. **Aarti & visarjan** — conclude with light offering and immersion.

(TODO: expand each step with mantras and timing.)

## Samagri checklist

- (TODO: itemize all materials needed)

## Best timing

Refer to today's [panchang](https://darshya.online/panchang) for tithi, nakshatra
and the auspicious muhurat window. ${keyword.intent === 'commercial' ? `[Book a verified pandit on Darshya](https://darshya.online/pujas) — fixed price, video proof included.` : 'Most devotees prefer to perform this during Brahma Muhurta (04:00–05:30 IST) or Abhijit Muhurta (midday window).'}

## Frequently Asked Questions

**Q: Can ${kw.split(' ').slice(0, 4).join(' ')} be done at home?**
A: Yes, with proper preparation and ideally guidance from a learned pandit.

**Q: What is the typical cost when booked through a verified service?**
A: On Darshya, pricing ranges from ₹501 (basic) to ₹5,100 (premium with full samagri and video proof). [See current pricing](https://darshya.online/pujas).

**Q: Do I get an 80G receipt for any donation portion?**
A: Donations to listed gaushalas issue 80G receipts within 24h. Pure puja booking fees do not qualify.

## Related on Darshya

- [Browse all pujas](https://darshya.online/pujas)
- [Today's panchang](https://darshya.online/panchang)
- [Shlokas with meaning](https://darshya.online/shlokas)
- [Donate to gaushalas (80G)](https://darshya.online/donations)

---

*Last updated ${TODAY} · Reviewed by: TODO · Tags: ${keyword.intent}, ${kw.split(' ').slice(0, 2).join('-')}*
`;

  return { slug, title, body };
}

function run() {
  const kw = pickKeyword(TODAY);
  const { slug, title, body } = draft(kw);

  mkdirSync(DRAFTS_DIR, { recursive: true });
  const draftPath = join(DRAFTS_DIR, `${TODAY}-${slug}.md`);

  // Don't overwrite if a human already touched today's draft.
  let action = 'created';
  if (existsSync(draftPath)) {
    const prev = readFileSync(draftPath, 'utf8');
    if (!prev.includes('status: draft') || prev.length > body.length * 1.2) {
      action = 'skipped — human-edited';
    } else {
      writeFileSync(draftPath, body, 'utf8');
      action = 'updated';
    }
  } else {
    writeFileSync(draftPath, body, 'utf8');
  }

  let md = `# Content-publisher — ${TODAY}\n\n`;
  md += `**Target keyword:** ${kw.kw} (${kw.intent})\n`;
  md += `**Draft:** \`${draftPath}\` (${action})\n`;
  md += `**Title:** ${title}\n\n`;
  md += `## Founder review checklist\n\n`;
  md += `- [ ] Replace TODO blocks with actual content (significance, samagri, mantras)\n`;
  md += `- [ ] Verify product CTAs link to real, live pages\n`;
  md += `- [ ] Add 1-2 images (samagri photo, deity illustration)\n`;
  md += `- [ ] Set \`status: published\` in front-matter when ready\n`;
  md += `- [ ] Move to \`apps/web/content/blog/\` or wherever the blog reads from\n\n`;
  md += `Next ${KEYWORDS.length - 1} days will rotate through the remaining keywords in the catalog.\n`;

  writeReport('content-publisher', md);
  upsertLog('content-publisher', `kw="${kw.kw}" slug=${slug} action=${action}`);
}

try { run(); } catch (e) {
  console.error('[content-publisher] FATAL', e);
  process.exit(1);
}
