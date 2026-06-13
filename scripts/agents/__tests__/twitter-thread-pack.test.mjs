import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const PACK_DIR = path.resolve(
  process.cwd(),
  'docs/agent-reports/cmo/2026-05-founder-twitter-pack'
);

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { fm, body: m[2] };
}

function listThreads() {
  return readdirSync(PACK_DIR)
    .filter((f) => /^thread-W[1-4]-[1-3]-.+\.md$/.test(f))
    .sort();
}

describe('twitter-thread-pack — R-Q2-M-012', () => {
  it('has the pack directory', () => {
    expect(existsSync(PACK_DIR)).toBe(true);
  });

  it('contains 12 thread files matching naming convention', () => {
    const threads = listThreads();
    expect(threads.length).toBe(12);
  });

  it('covers all 4 weeks × 3 threads/week', () => {
    const threads = listThreads();
    for (let w = 1; w <= 4; w++) {
      for (let n = 1; n <= 3; n++) {
        const found = threads.find((f) => f.startsWith(`thread-W${w}-${n}-`));
        expect(found, `missing thread-W${w}-${n}-*`).toBeTruthy();
      }
    }
  });

  it('each thread has required frontmatter fields', () => {
    const threads = listThreads();
    for (const f of threads) {
      const raw = readFileSync(path.join(PACK_DIR, f), 'utf8');
      const { fm } = parseFrontmatter(raw);
      expect(fm.hook, `${f}: hook missing`).toBeTruthy();
      expect(fm.hook.length, `${f}: hook >280 chars`).toBeLessThanOrEqual(280);
      const tc = Number(fm.tweet_count);
      expect(tc, `${f}: tweet_count invalid`).toBeGreaterThanOrEqual(5);
      expect(tc, `${f}: tweet_count >12`).toBeLessThanOrEqual(12);
      expect(fm.topic, `${f}: topic missing`).toBeTruthy();
      expect(['india', 'nri', 'generic']).toContain(fm.target_audience);
      expect(fm.cta, `${f}: cta missing`).toBeTruthy();
      const sw = Number(fm.schedule_week);
      expect(sw, `${f}: schedule_week 1-4`).toBeGreaterThanOrEqual(1);
      expect(sw, `${f}: schedule_week 1-4`).toBeLessThanOrEqual(4);
      expect(fm.schedule_day_hint, `${f}: schedule_day_hint missing`).toBeTruthy();
    }
  });

  it('every numbered tweet body line is ≤280 chars', () => {
    const threads = listThreads();
    for (const f of threads) {
      const raw = readFileSync(path.join(PACK_DIR, f), 'utf8');
      const { body } = parseFrontmatter(raw);
      const tweetLines = body
        .split('\n')
        .filter((l) => /^\d+\/\d+\s/.test(l.trim()));
      expect(tweetLines.length, `${f}: no numbered tweets`).toBeGreaterThan(0);
      for (const line of tweetLines) {
        // Strip leading "N/M " prefix when counting, keep full body otherwise
        expect(
          line.length,
          `${f}: tweet too long (${line.length}): ${line.slice(0, 60)}…`
        ).toBeLessThanOrEqual(280);
      }
    }
  });

  it('audience mix: ≥4 NRI, ≥6 India, ≤2 generic', () => {
    const threads = listThreads();
    const counts = { india: 0, nri: 0, generic: 0 };
    for (const f of threads) {
      const raw = readFileSync(path.join(PACK_DIR, f), 'utf8');
      const { fm } = parseFrontmatter(raw);
      counts[fm.target_audience] = (counts[fm.target_audience] || 0) + 1;
    }
    expect(counts.nri, 'need ≥4 NRI').toBeGreaterThanOrEqual(4);
    expect(counts.india, 'need ≥6 India').toBeGreaterThanOrEqual(6);
    expect(counts.generic, 'need ≤2 generic').toBeLessThanOrEqual(2);
  });

  it('supporting docs present', () => {
    for (const name of [
      'README.md',
      'cadence.md',
      'engagement-playbook.md',
      'success-criteria-update.md',
      'metrics-tracker.md',
    ]) {
      expect(
        existsSync(path.join(PACK_DIR, name)),
        `${name} missing`
      ).toBe(true);
    }
  });

  it('success-criteria-update.md replaces placeholder with measurable bullets', () => {
    const raw = readFileSync(
      path.join(PACK_DIR, 'success-criteria-update.md'),
      'utf8'
    );
    expect(raw).not.toMatch(/Populate during first sub-agent emission cycle/);
    // At least 4 bullet lines
    const bullets = raw.split('\n').filter((l) => /^\s*[-*]\s+/.test(l));
    expect(bullets.length).toBeGreaterThanOrEqual(4);
  });
});
