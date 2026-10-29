import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 2026-10-29: four temples got an official, verified YouTube channel
 * (Banke Bihari, Ram Mandir, Omkareshwar, Govind Dev Ji). Every list that must
 * know about a darshan temple has to agree on the channel id: the detail page
 * maps, the prerendered slugs, the ops SQL and the seed.
 */
const ROOT = join(process.cwd(), '..', '..');
const page = readFileSync(join(process.cwd(), 'app/darshan/[id]/page.tsx'), 'utf8');
const sql = readFileSync(join(ROOT, 'ops/sql/darshan-channels-2026-10.sql'), 'utf8');
const seed = readFileSync(join(ROOT, 'apps/api/prisma/seed/darshan-streams.ts'), 'utf8');
const api = readFileSync(join(ROOT, 'apps/api/src/routes/darshan.ts'), 'utf8');

const NEW: Record<string, string> = {
  'banke-bihari-vrindavan': 'UCwh96MUAk0m81vEXaHVm6Ng',
  'ram-mandir-ayodhya': 'UCIbhcJEGjI7fRfKiG_p0Mqg',
  omkareshwar: 'UCsIZ3yYwCW4316fPX3V-4lg',
  'govind-dev-ji-jaipur': 'UCGqf8XY3-ONj_M9tf1DdckA',
};

describe('verified darshan channels', () => {
  for (const [slug, id] of Object.entries(NEW)) {
    it(`${slug}: same channel in the page maps, prerender list, SQL and seed`, () => {
      expect(page).toContain(`'${slug}': '${id}'`); // CHANNEL_BY_SLUG
      expect(page).toContain(`'${slug}': ytEmbed('${id}')`); // YOUTUBE_STREAMS
      expect(page).toContain(`id: '${id}'`.replace("id: ", "youtubeChannelId: ")); // fallback library entry
      expect(page.slice(0, page.indexOf('import type'))).toContain(`'${slug}'`); // generateStaticParams
      expect(sql).toContain(`('${slug}'`);
      expect(sql).toContain(id);
      expect(seed).toContain(`templeSlug: '${slug}', youtubeChannelId: '${id}'`);
    });
    it(`${slug}: is never claimed live by the always-on API fallback table`, () => {
      expect(api).not.toContain(id);
    });
  }
  it('the astrology-content Mahakaleshwar channel is not used anywhere', () => {
    for (const src of [page, seed, api]) expect(src).not.toContain('UC7q12ONY2mvuq066rreluhQ');
  });
});
