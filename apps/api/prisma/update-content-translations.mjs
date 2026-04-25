/**
 * Appends an English Translation section to each content item's body in
 * the production DB. Idempotent — checks for the marker before appending.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const TRANSLATIONS = JSON.parse(
  readFileSync(resolve(here, 'english-translations.json'), 'utf8')
);

const MARKER = '### English Meaning';

const prisma = new PrismaClient();

let updated = 0;
let skipped = 0;
let missing = 0;

for (const [slug, englishMd] of Object.entries(TRANSLATIONS)) {
  const row = await prisma.contentItem.findUnique({ where: { slug } });
  if (!row) {
    console.warn(`! row not found: ${slug}`);
    missing += 1;
    continue;
  }

  if (row.body && row.body.includes(MARKER)) {
    console.log(`. already has English: ${slug}`);
    skipped += 1;
    continue;
  }

  // Insert the English block. If body ends with a `---` divider followed by
  // an italicized footer, put the English BEFORE that divider so the footer
  // remains the closing note. Otherwise just append.
  let newBody;
  const finalDividerIdx = row.body.lastIndexOf('\n---\n');
  if (finalDividerIdx > 0 && finalDividerIdx > row.body.length - 800) {
    // Final divider near the end — insert English before it
    newBody =
      row.body.slice(0, finalDividerIdx) +
      englishMd +
      '\n' +
      row.body.slice(finalDividerIdx);
  } else {
    newBody = row.body + englishMd;
  }

  await prisma.contentItem.update({
    where: { slug },
    data: { body: newBody },
  });
  updated += 1;
  console.log(`+ ${slug} (+${englishMd.length} chars)`);
}

console.log(`\nDone: ${updated} updated, ${skipped} already had English, ${missing} missing.`);
await prisma.$disconnect();
