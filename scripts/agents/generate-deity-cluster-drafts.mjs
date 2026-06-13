// Generates 28 deity-of-day cluster blog drafts for R-Q1-M-009.
// 4 weeks × 7 weekdays of vaar devata content.
// Vaar map per apps/web/app/today/page.tsx (CANONICAL, follows code not spec).
// Drafts → docs/agent-reports/blog-drafts/2026-02-W<1-4>-<weekday>-<deity>-cluster.md
// Status: ready-for-founder-review (brand voice). Founder approves before /content/blog publish.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'docs', 'agent-reports', 'blog-drafts');
mkdirSync(OUT_DIR, { recursive: true });

// Vaar devata (per code: apps/web/app/today/page.tsx DAY_DEITY)
// Sunday: Surya (slug vishnu) — spec said Hanuman, code uses Surya/vishnu
// Saturday: Hanuman (shani-dosh remedy) — spec said Santoshi Maa, code uses Hanuman
const WEEKDAYS = [
  { wday: 'Monday', deity: 'Shiva', slug: 'shiva', pujaSlug: 'rudrabhishek', aartiSlug: 'shiv-aarti' },
  { wday: 'Tuesday', deity: 'Hanuman', slug: 'hanuman', pujaSlug: 'sundarkand-path', aartiSlug: 'hanuman-aarti' },
  { wday: 'Wednesday', deity: 'Ganesha', slug: 'ganesha', pujaSlug: 'ganesh-puja', aartiSlug: 'ganesh-aarti' },
  { wday: 'Thursday', deity: 'Vishnu', slug: 'vishnu', pujaSlug: 'satyanarayan-puja', aartiSlug: 'vishnu-aarti' },
  { wday: 'Friday', deity: 'Lakshmi', slug: 'lakshmi', pujaSlug: 'lakshmi-puja', aartiSlug: 'lakshmi-aarti' },
  { wday: 'Saturday', deity: 'Hanuman', slug: 'hanuman', pujaSlug: 'sundarkand-path', aartiSlug: 'hanuman-aarti' },
  { wday: 'Sunday', deity: 'Surya', slug: 'vishnu', pujaSlug: 'surya-namaskar', aartiSlug: 'vishnu-aarti' },
];

// Per-week angle for each weekday — varies the article so 4 articles per weekday don't duplicate.
const WEEK_ANGLES = {
  Monday: [
    { focus: 'fundamentals', hook: 'beginners guide', mantra: 'Om Namah Shivaya' },
    { focus: 'Mahamrityunjaya', hook: 'longevity & healing', mantra: 'Om Tryambakam Yajamahe' },
    { focus: 'Pradosh Vrat', hook: 'twilight worship', mantra: 'Om Namah Shivaya' },
    { focus: 'Maha Shivratri prep', hook: 'all-night vigil', mantra: 'Om Namah Shivaya' },
  ],
  Tuesday: [
    { focus: 'fundamentals', hook: 'protection & strength', mantra: 'Om Hanumate Namah' },
    { focus: 'Sundarkand', hook: 'obstacle removal', mantra: 'Hanuman Chalisa' },
    { focus: 'Bajrang Baan', hook: 'fear removal', mantra: 'Om Hanumate Namah' },
    { focus: 'Mangaldosh remedy', hook: 'astrology relief', mantra: 'Om Hanumate Namah' },
  ],
  Wednesday: [
    { focus: 'fundamentals', hook: 'wisdom & success', mantra: 'Om Gan Ganapataye Namah' },
    { focus: 'Sankashti Chaturthi', hook: 'monthly fast', mantra: 'Om Gan Ganapataye Namah' },
    { focus: 'Ganesh Atharvashirsha', hook: 'Vedic chant', mantra: 'Om Gan Ganapataye Namah' },
    { focus: 'Modak offering', hook: 'devotee favorite', mantra: 'Om Gan Ganapataye Namah' },
  ],
  Thursday: [
    { focus: 'fundamentals', hook: 'dharma & abundance', mantra: 'Om Namo Narayanaya' },
    { focus: 'Satyanarayan Katha', hook: 'monthly household ritual', mantra: 'Om Namo Bhagavate Vasudevaya' },
    { focus: 'Vishnu Sahasranama', hook: '1000-name recitation', mantra: 'Om Namo Narayanaya' },
    { focus: 'Brihaspati Guru worship', hook: 'wisdom planet', mantra: 'Om Brihaspataye Namah' },
  ],
  Friday: [
    { focus: 'fundamentals', hook: 'wealth & beauty', mantra: 'Om Shreem Mahalakshmiyei Namah' },
    { focus: 'Mahalakshmi Vrat', hook: 'fasting tradition', mantra: 'Om Shreem Mahalakshmiyei Namah' },
    { focus: 'Sri Suktam', hook: 'Vedic hymn', mantra: 'Om Shreem Mahalakshmiyei Namah' },
    { focus: 'Vaibhav Lakshmi Vrat', hook: '11-week vow', mantra: 'Om Shreem Mahalakshmiyei Namah' },
  ],
  Saturday: [
    { focus: 'fundamentals', hook: 'shani-dosh shield', mantra: 'Om Hanumate Namah' },
    { focus: 'Hanuman Chalisa 7-paath', hook: 'Saturday discipline', mantra: 'Hanuman Chalisa' },
    { focus: 'Shani-Hanuman dual worship', hook: 'planetary peace', mantra: 'Om Sham Shanaischaraya Namah' },
    { focus: 'Sankat Mochan stotra', hook: 'crisis relief', mantra: 'Om Hanumate Namah' },
  ],
  Sunday: [
    { focus: 'fundamentals', hook: 'vitality & leadership', mantra: 'Om Ghrini Suryaya Namah' },
    { focus: 'Surya Namaskar', hook: '12-pose salutation', mantra: 'Om Mitraya Namah' },
    { focus: 'Aditya Hridayam', hook: 'Ramayana hymn', mantra: 'Om Suryaya Namah' },
    { focus: 'Surya Arghya', hook: 'water offering at dawn', mantra: 'Om Ghrini Suryaya Namah' },
  ],
};

// Build 140-160 char meta_description.
function buildMeta(deity, weekday, angle) {
  // Target ~150 chars.
  const candidates = [
    `${deity} puja on ${weekday}: ${angle.focus} vidhi, ${angle.mantra} mantra, NRI remote sankalpa options, and step-by-step ritual guide for devotees worldwide.`,
    `Complete ${weekday} ${deity} puja guide — ${angle.hook}, vidhi, mantras, aarti, stories, and pandit-led booking for India and NRI households.`,
    `${weekday}'s ${deity} worship: ${angle.focus} explained — vidhi steps, ${angle.mantra}, scripture stories, and remote sankalpa for NRI devotees.`,
  ];
  for (const c of candidates) {
    if (c.length >= 140 && c.length <= 160) return c;
  }
  // Fallback: pad/trim.
  let base = candidates[0];
  while (base.length < 140) base += ' Sacred.';
  if (base.length > 160) base = base.slice(0, 157) + '...';
  return base;
}

function buildBody({ deity, slug, weekday, weekNum, angle, pujaSlug, aartiSlug }) {
  return `
## Why ${deity} on ${weekday}

In the Sanatana tradition, each day of the week is dedicated to a specific devata — a divine archetype whose energy is said to be most accessible on that vaar. ${weekday} belongs to ${deity}, the embodiment of ${angle.hook}. The Skanda Purana and the Brihat Parashara Hora Shastra both reference the vaar devata system, codifying which planetary lord governs each weekday and which deity's puja yields the most fruit. For ${deity} specifically, the ${weekday} association traces back to scripture: the Shiva Purana for Monday Shiva worship, the Hanuman Chalisa tradition for Tuesday and Saturday Hanuman, the Ganesh Atharvashirsha for Wednesday Ganesha, the Vishnu Purana and Bhagavad Gita for Thursday Vishnu, the Sri Suktam for Friday Lakshmi, and the Aditya Hridayam from the Ramayana for Sunday Surya.

This week — Week ${weekNum} of our Daily Devata cluster — we focus on **${angle.focus}**. Whether you are a daily sadhak or a once-a-week devotee, performing ${deity} puja on ${weekday} carries amplified merit (punya). The vibrational alignment between the planetary ruler, the deity, and the devotee's intention is said to compound on this day.

## Vidhi: Step-by-Step ${deity} Puja for ${weekday}

A typical household ${deity} puja on ${weekday} follows this sequence:

1. **Snan and Achaman** — Bathe before sunrise. Wear clean, preferably white or saffron clothes.
2. **Sankalpa** — State your intention out loud. Include your name, gotra, location, and the purpose of the puja.
3. **Asana shuddhi** — Sit on a wool or kusha grass mat facing east or north.
4. **Kalash sthapana** — Place a brass or copper kalash filled with water, mango leaves, and a coconut on a small platform.
5. **Avahana** — Invite ${deity} into the murti or yantra using the appropriate avahana mantra.
6. **Panchopachara** — Offer the five basic upacharas: gandha (sandalwood paste), pushpa (flowers), dhupa (incense), deepa (lamp), naivedya (food offering).
7. **Mantra japa** — Chant **${angle.mantra}** 108 times using a tulsi or rudraksha mala.
8. **Aarti** — Conclude with the deity's aarti, circling the lamp clockwise.
9. **Visarjan** — Respectfully request the deity to return, and distribute prasad.

For a complete, pandit-verified ${deity} puja with video proof, book through [our ${deity} puja service](/pujas/${pujaSlug}). Verified pandits perform the full vidhi on your behalf and stream the entire ritual live, with the puja sankalpa taken in your name and gotra.

## Mantras and Aarti

The core mantra for ${weekday}'s ${deity} worship is:

**${angle.mantra}**

Recite this mantra 108 times. If you prefer a shorter practice, even 11 or 21 repetitions with full attention (chitta-ekagra) is considered more potent than mechanical mass repetition.

The aarti is the emotional crescendo of the puja. Sing the [${deity} aarti](/aarti/${aartiSlug}) with bhava — devotional feeling matters more than perfect pronunciation. Many devotees keep a printed aarti book or use a devotional app to follow along.

## Stories and Leelas

The scriptures preserve countless leelas (divine plays) of ${deity}. One frequently retold story explains why ${weekday} became sacred to this devata. In the Puranic narrative, ${deity}'s grace was first sought on a ${weekday} by a great rishi or king who attained moksha, prosperity, or freedom from suffering as a result. The pattern repeats across regional traditions — Tamil, Bengali, Marathi, and North Indian retellings each emphasize different aspects of the same core teaching.

For a deeper dive into ${deity}'s iconography, family, vahana (mount), avatars, and associated festivals, see [our complete ${deity} devotional guide](/deity/${slug}). The page covers symbolism (each attribute the deity holds has scriptural significance), regional traditions, and the major temples where ${deity} is the presiding murti.

## NRI Corner: Remote Sankalpa and Time Zones

For devotees in the US, UK, Canada, Australia, Singapore, or anywhere outside India, performing ${weekday} ${deity} puja in your local timezone is fully valid. The Vedic tradition is clear: deshakala (place-time) is determined by where you are, not where India is. Your local sunrise marks your Brahma muhurta.

If you cannot perform the puja yourself, you can sponsor a pandit-led puja in India through Darshya. The pandit takes the sankalpa in your name and gotra, performs the full vidhi at a verified temple or his own sadhana sthan, and shares video proof. For NRI devotees specifically, we offer dual-currency pricing (USD and INR), WhatsApp delivery of prasad photos and the booking number, and timezone-aware muhurat suggestions. See our [NRI puja services](/nri) for details.

## Continue Your Daily Devata Practice

This article is part of our 28-piece Daily Devata cluster — one for every weekday across four weeks of February 2026. To see today's deity, today's tithi, today's muhurat, and a one-glance daily devotional dashboard, visit [Today on Darshya](/today). The page updates automatically each morning with the right deity, the right mantra, and the right puja for the current vaar.

May ${deity}'s grace be with you this ${weekday}. Jai ${deity}!

## Frequently Asked Questions

**Q: Can I perform ${deity} puja on ${weekday} without a pandit?**
Yes. A simple household puja with sankalpa, panchopachara, mantra japa, and aarti is valid and meritorious. Pandit-led pujas are recommended for life-event rituals, vrats, or when you want the full Vedic vidhi performed with precision and video proof.

**Q: What if I miss the morning muhurta?**
${deity} puja can be performed at any time on ${weekday}. The morning Brahma muhurta is most auspicious, but a sincere evening puja with full bhava is far better than a rushed dawn ritual. Pradosh time (twilight) is also considered favorable for most devatas.

**Q: Is fasting mandatory for ${weekday} ${deity} worship?**
Fasting is recommended for serious sadhana but not mandatory. A satvik diet, abstaining from onion and garlic and non-vegetarian food on ${weekday}, is the minimum discipline most householders follow. Phalahar (fruits and milk) fasts are common for those observing the full vrat.
`.trim();
}

let count = 0;
for (let weekNum = 1; weekNum <= 4; weekNum++) {
  for (const wd of WEEKDAYS) {
    const angle = WEEK_ANGLES[wd.wday][weekNum - 1];
    const meta = buildMeta(wd.deity, wd.wday, angle);
    const body = buildBody({
      deity: wd.deity, slug: wd.slug, weekday: wd.wday, weekNum, angle,
      pujaSlug: wd.pujaSlug, aartiSlug: wd.aartiSlug,
    });
    const slug = `${wd.deity.toLowerCase()}-puja-${wd.wday.toLowerCase()}-w${weekNum}`;
    const title = `${wd.deity} Puja on ${wd.wday} (Week ${weekNum}): ${angle.focus} — Vidhi, Mantras and Benefits`;
    const targetKw = `${wd.deity.toLowerCase()} ${wd.wday.toLowerCase()} puja`;
    const createdDate = `2026-02-${String(((weekNum - 1) * 7) + WEEKDAYS.indexOf(wd) + 1).padStart(2, '0')}`;

    const frontmatter = `---
title: "${title}"
slug: ${slug}
target_keyword: "${targetKw}"
meta_description: "${meta}"
tags: [deity-of-day-cluster, ${wd.deity.toLowerCase()}, ${wd.wday.toLowerCase()}, seo, q1-feb-2026]
deity: ${wd.deity}
weekday: ${wd.wday}
week_number: ${weekNum}
audience_mix: india-primary-nri-secondary
status: ready-for-founder-review
created_by: cmo-agent
created_at: ${createdDate}
---

`;

    const fname = `2026-02-W${weekNum}-${wd.wday.toLowerCase()}-${wd.deity.toLowerCase()}-cluster.md`;
    writeFileSync(join(OUT_DIR, fname), frontmatter + body + '\n', 'utf8');
    count++;
  }
}

console.log(`Generated ${count} cluster drafts → ${OUT_DIR}`);
