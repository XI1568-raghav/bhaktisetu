// Tests for cold-temple-outreach-v2-personalize (R-Q1-M-014).
//
// Goal: prove that two leads do NOT receive identical body text when their
// attributes differ, and that the same lead receives the same body on re-call
// (determinism — safe to re-test, safe to diff).

import { describe, it, expect } from 'vitest';
import {
  classifyDeity,
  classifyRegion,
  classifyCityTier,
  stableHash,
  pickTemplate,
  buildSubject,
  buildBodyHtml,
  buildPersonalizedEmail,
} from '../cold-temple-outreach-v2-personalize.mjs';

describe('classifyDeity', () => {
  it('classifies Shiva-family aliases', () => {
    expect(classifyDeity('Lord Shiva')).toBe('shiva');
    expect(classifyDeity('Mahadev')).toBe('shiva');
    expect(classifyDeity('Kedarnath')).toBe('shiva');
    expect(classifyDeity('Bhairav')).toBe('shiva');
  });
  it('classifies Vishnu-family aliases', () => {
    expect(classifyDeity('Krishna')).toBe('vishnu');
    expect(classifyDeity('Venkateswara')).toBe('vishnu');
    expect(classifyDeity('Lord Ram')).toBe('vishnu');
    expect(classifyDeity('Jagannath')).toBe('vishnu');
  });
  it('classifies Devi aliases', () => {
    expect(classifyDeity('Durga Mata')).toBe('devi');
    expect(classifyDeity('Lakshmi')).toBe('devi');
    expect(classifyDeity('Kali Maa')).toBe('devi');
  });
  it('classifies Ganesha, Hanuman, Ayyappa', () => {
    expect(classifyDeity('Ganesha')).toBe('ganesha');
    expect(classifyDeity('Vinayaka')).toBe('ganesha');
    expect(classifyDeity('Hanuman')).toBe('hanuman');
    expect(classifyDeity('Bajrangbali')).toBe('hanuman');
    expect(classifyDeity('Ayyappa')).toBe('ayyappa');
  });
  it('falls back to generic on unknown or empty', () => {
    expect(classifyDeity('')).toBe('generic');
    expect(classifyDeity(null)).toBe('generic');
    expect(classifyDeity('Sai Baba')).toBe('generic');
  });
});

describe('classifyRegion', () => {
  it('classifies north correctly', () => {
    expect(classifyRegion('Uttar Pradesh', 'Varanasi')).toBe('north');
    expect(classifyRegion('Punjab', 'Amritsar')).toBe('north');
    expect(classifyRegion('Delhi', '')).toBe('north');
  });
  it('classifies south correctly', () => {
    expect(classifyRegion('Tamil Nadu', 'Madurai')).toBe('south');
    expect(classifyRegion('Karnataka', 'Bengaluru')).toBe('south');
    expect(classifyRegion('Kerala', 'Guruvayur')).toBe('south');
  });
  it('classifies west correctly', () => {
    expect(classifyRegion('Maharashtra', 'Mumbai')).toBe('west');
    expect(classifyRegion('Gujarat', 'Dwarka')).toBe('west');
  });
  it('classifies east correctly', () => {
    expect(classifyRegion('West Bengal', 'Kolkata')).toBe('east');
    expect(classifyRegion('Odisha', 'Puri')).toBe('east');
  });
  it('classifies central correctly', () => {
    expect(classifyRegion('Madhya Pradesh', 'Ujjain')).toBe('central');
  });
  it('falls back to unknown', () => {
    expect(classifyRegion('', '')).toBe('unknown');
    expect(classifyRegion('Some Random State', 'NowhereVille')).toBe('unknown');
  });
});

describe('classifyCityTier', () => {
  it('identifies tier1 metros', () => {
    expect(classifyCityTier('Mumbai')).toBe('tier1');
    expect(classifyCityTier('Bengaluru')).toBe('tier1');
    expect(classifyCityTier('Chennai')).toBe('tier1');
  });
  it('identifies pilgrim cities', () => {
    expect(classifyCityTier('Varanasi')).toBe('pilgrim');
    expect(classifyCityTier('Tirupati')).toBe('pilgrim');
    expect(classifyCityTier('Puri')).toBe('pilgrim');
  });
  it('defaults to tier2', () => {
    expect(classifyCityTier('Nashik')).toBe('tier2');
    expect(classifyCityTier('Solapur')).toBe('tier2');
  });
  it('returns unknown on empty', () => {
    expect(classifyCityTier('')).toBe('unknown');
    expect(classifyCityTier(null)).toBe('unknown');
  });
});

describe('stableHash', () => {
  it('is deterministic for the same input', () => {
    expect(stableHash('hello')).toBe(stableHash('hello'));
    expect(stableHash('temple-123')).toBe(stableHash('temple-123'));
  });
  it('differs for different inputs', () => {
    expect(stableHash('a')).not.toBe(stableHash('b'));
    expect(stableHash('temple-1')).not.toBe(stableHash('temple-2'));
  });
  it('returns a 32-bit unsigned integer', () => {
    const h = stableHash('test');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('pickTemplate', () => {
  it('returns empty string on empty bank', () => {
    expect(pickTemplate([], 'key')).toBe('');
    expect(pickTemplate(null, 'key')).toBe('');
  });
  it('returns same template for same key', () => {
    const bank = ['a', 'b', 'c', 'd', 'e'];
    expect(pickTemplate(bank, 'temple-1')).toBe(pickTemplate(bank, 'temple-1'));
  });
  it('selects from within the bank', () => {
    const bank = ['a', 'b', 'c'];
    const result = pickTemplate(bank, 'whatever');
    expect(bank).toContain(result);
  });
});

describe('buildSubject', () => {
  it('produces a non-empty subject for any lead', () => {
    const subj = buildSubject({ id: 'L1', name: 'Test Temple', city: 'Mumbai', deity: 'Shiva' });
    expect(subj.length).toBeGreaterThan(10);
  });
  it('mentions Shiva-tradition seva for Shiva temples in a city', () => {
    const subj = buildSubject({ id: 'L1', city: 'Varanasi', deity: 'Shiva' });
    expect(subj.toLowerCase()).toMatch(/rudrabhishek|shiva|varanasi/);
  });
  it('mentions Devi-tradition seva for Devi temples in a city', () => {
    const subj = buildSubject({ id: 'L2', city: 'Kolkata', deity: 'Durga Mata' });
    expect(subj.toLowerCase()).toMatch(/navratri|devi|ashtami|kolkata/);
  });
  it('falls back to a generic city-based subject when deity unknown', () => {
    const subj = buildSubject({ id: 'L3', city: 'Pune', deity: 'Sai Baba' });
    expect(subj.toLowerCase()).toMatch(/pune|darshya|nri/);
  });
  it('falls back to generic when no city', () => {
    const subj = buildSubject({ id: 'L4', deity: '' });
    expect(subj.toLowerCase()).toMatch(/verified|hindu|darshya/);
  });
});

describe('buildBodyHtml', () => {
  it('produces structured HTML with greeting + opener + value props + CTA', () => {
    const html = buildBodyHtml({ id: 'L1', name: 'Kashi Vishwanath', city: 'Varanasi', state: 'Uttar Pradesh', deity: 'Shiva' });
    expect(html).toMatch(/<p>Namaste from Kashi Vishwanath,<\/p>/);
    expect(html).toMatch(/Shaivite|Shiva|Rudrabhishek/);
    expect(html).toMatch(/utm_source=cold-outreach-v2/);
    expect(html).toMatch(/utm_campaign=per-temple/);
    expect(html).toMatch(/<li>/);
    expect(html).toMatch(/Personalized for your tradition · v2/);
  });

  it('two temples with DIFFERENT deity classes get DIFFERENT body text (not boilerplate)', () => {
    const shivaTemple = buildBodyHtml({ id: 'L1', name: 'Mahakal', city: 'Ujjain', state: 'Madhya Pradesh', deity: 'Shiva' });
    const devitemple = buildBodyHtml({ id: 'L2', name: 'Kamakhya', city: 'Guwahati', state: 'Assam', deity: 'Devi' });
    expect(shivaTemple).not.toBe(devitemple);
    expect(shivaTemple).toMatch(/Rudrabhishek|Shiva|Shaivite/);
    expect(devitemple).toMatch(/Devi|Navratri|Shakta|Ashtami/);
  });

  it('two temples in DIFFERENT regions get DIFFERENT region context lines', () => {
    const north = buildBodyHtml({ id: 'LA', city: 'Varanasi', state: 'Uttar Pradesh', deity: 'Shiva' });
    const south = buildBodyHtml({ id: 'LA', city: 'Madurai', state: 'Tamil Nadu', deity: 'Shiva' });
    // Both Shiva, same id seed for template pick within deity bank, but region line differs
    expect(north).toMatch(/North India|UP|Uttarakhand/);
    expect(south).toMatch(/South Indian|Tamil Nadu|Karnataka/);
  });

  it('same lead produces identical body on repeated calls (deterministic)', () => {
    const lead = { id: 'L1', name: 'Test', city: 'Mumbai', state: 'Maharashtra', deity: 'Vishnu' };
    expect(buildBodyHtml(lead)).toBe(buildBodyHtml(lead));
  });

  it('escapes HTML in dynamic fields to prevent injection', () => {
    const html = buildBodyHtml({ id: 'L1', name: '<script>alert(1)</script>', city: 'X', deity: 'Shiva' });
    expect(html).not.toMatch(/<script>alert/);
    expect(html).toMatch(/&lt;script&gt;/);
  });

  it('omits temple name in greeting when name is missing', () => {
    const html = buildBodyHtml({ id: 'L1', city: 'Mumbai', deity: 'Shiva' });
    expect(html).toMatch(/<p>Namaste,<\/p>/);
  });

  it('embeds deity + region as UTM params for downstream tracking', () => {
    const html = buildBodyHtml({ id: 'L1', city: 'Mumbai', state: 'Maharashtra', deity: 'Ganesha' });
    expect(html).toMatch(/deity=ganesha/);
    expect(html).toMatch(/region=west/);
  });
});

describe('buildPersonalizedEmail (end-to-end)', () => {
  it('returns subject + html + classification metadata', () => {
    const result = buildPersonalizedEmail({
      id: 'L1', name: 'Tirupati Balaji Charities', city: 'Tirupati', state: 'Andhra Pradesh', deity: 'Lord Venkateswara',
    });
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(result.deityClass).toBe('vishnu');
    expect(result.region).toBe('south');
    expect(result.cityTier).toBe('pilgrim');
  });

  it('a fleet of 10 distinct temples yields 10 distinct subject+body pairs (no boilerplate collisions)', () => {
    const fleet = [
      { id: 'L01', name: 'Kashi Vishwanath', city: 'Varanasi', state: 'Uttar Pradesh', deity: 'Shiva' },
      { id: 'L02', name: 'Tirupati Balaji', city: 'Tirupati', state: 'Andhra Pradesh', deity: 'Venkateswara' },
      { id: 'L03', name: 'Kamakhya', city: 'Guwahati', state: 'Assam', deity: 'Devi' },
      { id: 'L04', name: 'Siddhivinayak', city: 'Mumbai', state: 'Maharashtra', deity: 'Ganesha' },
      { id: 'L05', name: 'Salasar Balaji', city: 'Salasar', state: 'Rajasthan', deity: 'Hanuman' },
      { id: 'L06', name: 'Sabarimala', city: 'Sabarimala', state: 'Kerala', deity: 'Ayyappa' },
      { id: 'L07', name: 'Jagannath', city: 'Puri', state: 'Odisha', deity: 'Jagannath' },
      { id: 'L08', name: 'Mahakal', city: 'Ujjain', state: 'Madhya Pradesh', deity: 'Mahakaleshwar' },
      { id: 'L09', name: 'Vaishno Devi', city: 'Katra', state: 'Jammu', deity: 'Mata Vaishno' },
      { id: 'L10', name: 'Meenakshi', city: 'Madurai', state: 'Tamil Nadu', deity: 'Meenakshi Devi' },
    ];
    const bodies = new Set(fleet.map((l) => buildPersonalizedEmail(l).html));
    const subjects = new Set(fleet.map((l) => buildPersonalizedEmail(l).subject));
    // Bodies MUST all differ — that's the v2 promise (no boilerplate)
    expect(bodies.size).toBe(10);
    // Subjects may collide when two leads share deity+city template seed; majority must still differ
    expect(subjects.size).toBeGreaterThanOrEqual(6);
  });

  it('skipping email on null lead is not the responsibility of this module (returns valid output)', () => {
    const result = buildPersonalizedEmail({});
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(result.deityClass).toBe('generic');
    expect(result.region).toBe('unknown');
    expect(result.cityTier).toBe('unknown');
  });
});
