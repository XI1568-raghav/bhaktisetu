import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PACK_DIR = join(process.cwd(), 'docs/agent-reports/cmo/2026-03-nri-fb-ads-launch-pack');

const CREATIVE_IDS = ['gift-puja-nri', 'live-darshan-nri', '80g-receipt-nri'];
const AUDIENCE_IDS = ['us-hindu-25-45', 'uk-hindu-25-45'];

function readCreative(id) {
  const path = join(PACK_DIR, `creative-0${CREATIVE_IDS.indexOf(id) + 1}-${id}.md`);
  return readFileSync(path, 'utf8');
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const obj = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    obj[k] = v;
  }
  return obj;
}

describe('NRI FB Ads launch pack', () => {
  it('pack directory exists', () => {
    expect(existsSync(PACK_DIR)).toBe(true);
  });

  it('README.md exists with $50 budget split', () => {
    const readme = readFileSync(join(PACK_DIR, 'README.md'), 'utf8');
    expect(readme).toMatch(/\$50/);
    expect(readme).toMatch(/\$25/);
    expect(readme).toMatch(/7-day/i);
  });

  it('3 creative briefs exist', () => {
    const files = readdirSync(PACK_DIR).filter((f) => /^creative-0\d-.*\.md$/.test(f));
    expect(files.length).toBe(3);
    for (const id of CREATIVE_IDS) {
      const matches = files.filter((f) => f.includes(id));
      expect(matches.length, `creative for ${id}`).toBe(1);
    }
  });

  it.each(CREATIVE_IDS)('creative %s has FB-compliant copy lengths + CTA + image-prompt + UTM landing', (id) => {
    const text = readCreative(id);
    const fm = frontmatter(text);
    expect(fm.headline, `headline for ${id}`).toBeTruthy();
    expect(fm.headline.length, `headline ≤40 chars for ${id}`).toBeLessThanOrEqual(40);
    expect(fm.primary_text, `primary_text for ${id}`).toBeTruthy();
    expect(fm.primary_text.length, `primary_text ≤125 chars for ${id}`).toBeLessThanOrEqual(125);
    expect(fm.description, `description for ${id}`).toBeTruthy();
    expect(fm.description.length, `description ≤30 chars for ${id}`).toBeLessThanOrEqual(30);
    expect(fm.cta, `cta for ${id}`).toBeTruthy();
    expect(text).toMatch(/image[-_ ]prompt/i);
    expect(text).toMatch(/utm_source=facebook/);
    expect(text).toMatch(/utm_medium=cpc/);
    expect(text).toMatch(/utm_campaign=nri-q1-feb-2026/);
    expect(text).toMatch(new RegExp(`utm_content=${id}`));
  });

  it('2 audience JSON specs exist with geo + age + interests', () => {
    for (const aud of AUDIENCE_IDS) {
      const path = join(PACK_DIR, `audience-${aud}.json`);
      expect(existsSync(path), `audience file ${aud}`).toBe(true);
      const spec = JSON.parse(readFileSync(path, 'utf8'));
      expect(spec.geo).toBeTruthy();
      expect(spec.age_min).toBe(25);
      expect(spec.age_max).toBe(45);
      expect(Array.isArray(spec.interests)).toBe(true);
      expect(spec.interests.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('utm-plan.md lists all 6 URL variants', () => {
    const plan = readFileSync(join(PACK_DIR, 'utm-plan.md'), 'utf8');
    expect(plan).toMatch(/utm_source=facebook/);
    expect(plan).toMatch(/utm_medium=cpc/);
    expect(plan).toMatch(/utm_campaign=nri-q1-feb-2026/);
    // 3 creatives × 2 audiences = 6 utm_content x utm_term combos
    const urlCount = (plan.match(/utm_source=facebook/g) || []).length;
    expect(urlCount).toBeGreaterThanOrEqual(6);
  });

  it('posthog-events.md defines conversion funnel', () => {
    const ph = readFileSync(join(PACK_DIR, 'posthog-events.md'), 'utf8');
    expect(ph).toMatch(/nri_landing_view/);
    expect(ph).toMatch(/gift_puja_click/);
    expect(ph).toMatch(/checkout_start/);
    expect(ph).toMatch(/order_placed/);
  });

  it('launch-checklist.md + kill-criteria.md present', () => {
    expect(existsSync(join(PACK_DIR, 'launch-checklist.md'))).toBe(true);
    expect(existsSync(join(PACK_DIR, 'kill-criteria.md'))).toBe(true);
    const kill = readFileSync(join(PACK_DIR, 'kill-criteria.md'), 'utf8');
    expect(kill).toMatch(/CPA/);
    expect(kill).toMatch(/CTR/);
  });
});
