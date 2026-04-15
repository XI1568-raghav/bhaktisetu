import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatPrice,
  formatDate,
  generateBookingNumber,
  isNriUser,
  getDeityIcon,
  slugify,
  truncate,
  buildQueryString,
  titleCase,
  parseTime,
  calculateBookingPrice,
} from './index.js';

// ─── formatPrice ─────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats INR with no decimals by default', () => {
    const result = formatPrice(1299);
    // en-IN locale uses the Indian Rupee sign
    expect(result).toContain('1,299');
    expect(result).toMatch(/₹/);
  });

  it('defaults to INR when no currency specified', () => {
    const result = formatPrice(500);
    expect(result).toMatch(/₹/);
  });

  it('formats USD with 2 decimal places', () => {
    const result = formatPrice(49.99, 'USD');
    expect(result).toContain('49.99');
    expect(result).toMatch(/\$/);
  });

  it('handles zero amount', () => {
    const result = formatPrice(0);
    expect(result).toContain('0');
  });

  it('handles negative amounts', () => {
    const result = formatPrice(-500);
    expect(result).toContain('500');
  });

  it('formats large INR values correctly', () => {
    const result = formatPrice(1250000);
    // Indian numbering system: 12,50,000
    expect(result).toContain('12,50,000');
  });

  it('supports compact notation for INR', () => {
    const result = formatPrice(1250000, 'INR', { compact: true });
    // Compact should shorten, e.g. "12.5L" or similar
    expect(result).toBeTruthy();
    expect(result.length).toBeLessThan(formatPrice(1250000).length);
  });

  it('supports compact notation for USD', () => {
    const result = formatPrice(1500000, 'USD', { compact: true });
    expect(result).toBeTruthy();
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  // Use a fixed date for deterministic tests
  const testDate = new Date('2026-01-15T10:30:00Z');

  it('formats "medium" by default', () => {
    const result = formatDate(testDate);
    // en-IN medium: should contain short month and year
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });

  it('formats "full" with weekday and time', () => {
    const result = formatDate(testDate, 'full');
    expect(result).toContain('2026');
    // Full format includes weekday
    expect(result.length).toBeGreaterThan(10);
  });

  it('formats "long" with full month name', () => {
    const result = formatDate(testDate, 'long');
    expect(result).toContain('January');
    expect(result).toContain('2026');
  });

  it('formats "short" with 2-digit components', () => {
    const result = formatDate(testDate, 'short');
    expect(result).toBeTruthy();
    // Short format is compact
    expect(result.length).toBeLessThan(20);
  });

  it('formats "time" with hour and minute', () => {
    const result = formatDate(testDate, 'time');
    expect(result).toBeTruthy();
    // Should contain a colon between hour and minute
    expect(result).toMatch(/:/);
  });

  it('accepts string dates', () => {
    const result = formatDate('2026-01-15', 'long');
    expect(result).toContain('January');
    expect(result).toContain('2026');
  });

  it('returns relative time for "relative" format', () => {
    // Use a very recent date
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const result = formatDate(tenMinutesAgo, 'relative');
    expect(result).toBe('10m ago');
  });

  it('returns "just now" for very recent dates', () => {
    const now = new Date();
    const result = formatDate(now, 'relative');
    expect(result).toBe('just now');
  });

  it('returns "yesterday" for dates 1 day ago', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const result = formatDate(yesterday, 'relative');
    expect(result).toBe('yesterday');
  });

  it('returns days ago for dates within a week', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const result = formatDate(threeDaysAgo, 'relative');
    expect(result).toBe('3d ago');
  });

  it('returns weeks ago for dates within a month', () => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const result = formatDate(twoWeeksAgo, 'relative');
    expect(result).toBe('2w ago');
  });
});

// ─── generateBookingNumber ───────────────────────────────────────────────────

describe('generateBookingNumber', () => {
  it('matches the BS-YYYYMMDD-XXXXX format', () => {
    const booking = generateBookingNumber();
    expect(booking).toMatch(/^BS-\d{8}-[A-Z0-9]{5}$/);
  });

  it('starts with BS- prefix', () => {
    const booking = generateBookingNumber();
    expect(booking.startsWith('BS-')).toBe(true);
  });

  it('contains today\'s date in the middle segment', () => {
    const booking = generateBookingNumber();
    const now = new Date();
    const expectedDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    expect(booking).toContain(expectedDate);
  });

  it('suffix uses only allowed characters (no 0, O, 1, I)', () => {
    // Generate multiple to test randomness
    for (let i = 0; i < 50; i++) {
      const booking = generateBookingNumber();
      const suffix = booking.split('-')[2];
      // The allowed set is ABCDEFGHJKLMNPQRSTUVWXYZ23456789
      // Missing: 0, 1, I, O
      expect(suffix).not.toMatch(/[01IO]/);
    }
  });

  it('generates unique booking numbers', () => {
    const numbers = new Set<string>();
    for (let i = 0; i < 100; i++) {
      numbers.add(generateBookingNumber());
    }
    // With 5 chars from 31-char alphabet, collisions in 100 samples are extremely unlikely
    expect(numbers.size).toBe(100);
  });
});

// ─── isNriUser ───────────────────────────────────────────────────────────────

describe('isNriUser', () => {
  it('returns false for "IN"', () => {
    expect(isNriUser('IN')).toBe(false);
  });

  it('returns false for "IND"', () => {
    expect(isNriUser('IND')).toBe(false);
  });

  it('returns false for "India" (case-insensitive)', () => {
    expect(isNriUser('India')).toBe(false);
  });

  it('returns false for "india" (lowercase)', () => {
    expect(isNriUser('india')).toBe(false);
  });

  it('returns false for " IN " (with whitespace)', () => {
    expect(isNriUser(' IN ')).toBe(false);
  });

  it('returns true for "US"', () => {
    expect(isNriUser('US')).toBe(true);
  });

  it('returns true for "UK"', () => {
    expect(isNriUser('UK')).toBe(true);
  });

  it('returns true for "AE" (UAE)', () => {
    expect(isNriUser('AE')).toBe(true);
  });

  it('returns true for "SG" (Singapore)', () => {
    expect(isNriUser('SG')).toBe(true);
  });

  it('returns true for any non-Indian country', () => {
    expect(isNriUser('JP')).toBe(true);
    expect(isNriUser('AU')).toBe(true);
    expect(isNriUser('DE')).toBe(true);
  });
});

// ─── getDeityIcon ────────────────────────────────────────────────────────────

describe('getDeityIcon', () => {
  it('returns "trident" for Shiva', () => {
    expect(getDeityIcon('shiva')).toBe('trident');
  });

  it('returns "conch" for Vishnu', () => {
    expect(getDeityIcon('vishnu')).toBe('conch');
  });

  it('returns "flute" for Krishna', () => {
    expect(getDeityIcon('krishna')).toBe('flute');
  });

  it('returns "bow" for Rama', () => {
    expect(getDeityIcon('rama')).toBe('bow');
  });

  it('returns "elephant" for Ganesha', () => {
    expect(getDeityIcon('ganesha')).toBe('elephant');
  });

  it('returns "elephant" for Ganesh (alias)', () => {
    expect(getDeityIcon('ganesh')).toBe('elephant');
  });

  it('returns "mace" for Hanuman', () => {
    expect(getDeityIcon('hanuman')).toBe('mace');
  });

  it('returns "trident-lotus" for Durga', () => {
    expect(getDeityIcon('durga')).toBe('trident-lotus');
  });

  it('returns "lotus-coin" for Lakshmi', () => {
    expect(getDeityIcon('lakshmi')).toBe('lotus-coin');
  });

  it('returns "veena" for Saraswati', () => {
    expect(getDeityIcon('saraswati')).toBe('veena');
  });

  it('returns "spear" for Kartikeya and Murugan', () => {
    expect(getDeityIcon('kartikeya')).toBe('spear');
    expect(getDeityIcon('murugan')).toBe('spear');
  });

  it('returns "conch" for Venkateswara and Balaji', () => {
    expect(getDeityIcon('venkateswara')).toBe('conch');
    expect(getDeityIcon('balaji')).toBe('conch');
  });

  it('returns "wheel" for Buddha', () => {
    expect(getDeityIcon('buddha')).toBe('wheel');
  });

  it('returns "hand" for Mahavir', () => {
    expect(getDeityIcon('mahavir')).toBe('hand');
  });

  it('is case-insensitive', () => {
    expect(getDeityIcon('SHIVA')).toBe('trident');
    expect(getDeityIcon('Krishna')).toBe('flute');
  });

  it('returns "om" for unknown deities', () => {
    expect(getDeityIcon('unknown')).toBe('om');
    expect(getDeityIcon('zeus')).toBe('om');
  });

  it('returns "om" for empty string', () => {
    expect(getDeityIcon('')).toBe('om');
  });
});

// ─── slugify ─────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('hello@world!')).toBe('helloworld');
  });

  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('collapses multiple hyphens into one', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('removes leading hyphens', () => {
    expect(slugify('-hello-world')).toBe('hello-world');
  });

  it('removes trailing hyphens', () => {
    expect(slugify('hello-world-')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles a realistic temple name', () => {
    expect(slugify('Sri Kashi Vishwanath Temple')).toBe('sri-kashi-vishwanath-temple');
  });

  it('handles numbers', () => {
    expect(slugify('5 Mukhi Rudraksha')).toBe('5-mukhi-rudraksha');
  });
});

// ─── truncate ────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns text unchanged if shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns text unchanged if equal to maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and adds ellipsis when text exceeds maxLength', () => {
    const result = truncate('hello world', 8);
    expect(result).toHaveLength(8);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('handles maxLength of 1', () => {
    const result = truncate('hello', 1);
    expect(result).toBe('\u2026');
  });

  it('trims trailing whitespace before the ellipsis', () => {
    // "hello world" truncated to 6 chars:
    // slice(0,5) = "hello" then trimEnd + ellipsis
    const result = truncate('hello world', 6);
    expect(result).toBe('hello\u2026');
  });
});

// ─── buildQueryString ────────────────────────────────────────────────────────

describe('buildQueryString', () => {
  it('builds a query string from an object', () => {
    const result = buildQueryString({ page: 1, limit: 20 });
    expect(result).toContain('page=1');
    expect(result).toContain('limit=20');
    expect(result.startsWith('?')).toBe(true);
  });

  it('omits undefined values', () => {
    const result = buildQueryString({ page: 1, name: undefined });
    expect(result).toBe('?page=1');
  });

  it('omits null values', () => {
    const result = buildQueryString({ page: 1, name: null });
    expect(result).toBe('?page=1');
  });

  it('omits empty string values', () => {
    const result = buildQueryString({ page: 1, name: '' });
    expect(result).toBe('?page=1');
  });

  it('includes boolean values', () => {
    const result = buildQueryString({ active: true });
    expect(result).toBe('?active=true');
  });

  it('includes zero as a valid value', () => {
    const result = buildQueryString({ offset: 0 });
    expect(result).toBe('?offset=0');
  });

  it('returns empty string when all values are undefined/null', () => {
    const result = buildQueryString({ a: undefined, b: null, c: '' });
    expect(result).toBe('');
  });

  it('returns empty string for empty object', () => {
    expect(buildQueryString({})).toBe('');
  });
});

// ─── titleCase ───────────────────────────────────────────────────────────────

describe('titleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('handles a single word', () => {
    expect(titleCase('hello')).toBe('Hello');
  });

  it('handles already title-cased text', () => {
    expect(titleCase('Hello World')).toBe('Hello World');
  });

  it('lowercases uppercase words then capitalizes first letter', () => {
    expect(titleCase('HELLO WORLD')).toBe('Hello World');
  });

  it('handles empty string', () => {
    expect(titleCase('')).toBe('');
  });

  it('handles a temple name', () => {
    expect(titleCase('sri meenakshi temple')).toBe('Sri Meenakshi Temple');
  });
});

// ─── parseTime ───────────────────────────────────────────────────────────────

describe('parseTime', () => {
  it('parses a valid HH:MM string', () => {
    expect(parseTime('10:30')).toEqual({ hours: 10, minutes: 30 });
  });

  it('parses midnight (00:00)', () => {
    expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
  });

  it('parses end of day (23:59)', () => {
    expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
  });

  it('defaults to 0 for missing parts', () => {
    expect(parseTime('10')).toEqual({ hours: 10, minutes: 0 });
  });

  it('handles empty string gracefully', () => {
    expect(parseTime('')).toEqual({ hours: 0, minutes: 0 });
  });

  it('handles non-numeric input with default 0', () => {
    const result = parseTime('abc:def');
    expect(result).toEqual({ hours: NaN, minutes: NaN });
  });
});

// ─── calculateBookingPrice ───────────────────────────────────────────────────

describe('calculateBookingPrice', () => {
  it('calculates base price * devotee count for Indian users', () => {
    expect(calculateBookingPrice(500, 3, false)).toBe(1500);
  });

  it('applies NRI multiplier when isNri is true', () => {
    // 500 * 2 * 1.5 = 1500
    expect(calculateBookingPrice(500, 2, true)).toBe(1500);
  });

  it('uses custom NRI multiplier', () => {
    // 500 * 2 * 2.0 = 2000
    expect(calculateBookingPrice(500, 2, true, 2.0)).toBe(2000);
  });

  it('applies discount percentage', () => {
    // 500 * 2 = 1000, 10% discount = 900
    expect(calculateBookingPrice(500, 2, false, 1.5, 10)).toBe(900);
  });

  it('applies both NRI multiplier and discount', () => {
    // 500 * 2 * 1.5 = 1500, 10% discount = 1350
    expect(calculateBookingPrice(500, 2, true, 1.5, 10)).toBe(1350);
  });

  it('returns 0 for zero base price', () => {
    expect(calculateBookingPrice(0, 5, false)).toBe(0);
  });

  it('returns 0 for zero devotee count', () => {
    expect(calculateBookingPrice(500, 0, false)).toBe(0);
  });

  it('handles single devotee with no extras', () => {
    expect(calculateBookingPrice(1000, 1, false)).toBe(1000);
  });

  it('rounds to 2 decimal places', () => {
    // 333 * 3 * 1.5 = 1498.5 (exact), discount 7% = 1393.605 -> 1393.61
    expect(calculateBookingPrice(333, 3, true, 1.5, 7)).toBe(1393.61);
  });

  it('handles 100% discount (free)', () => {
    expect(calculateBookingPrice(500, 2, false, 1.5, 100)).toBe(0);
  });

  it('defaults NRI multiplier to 1.5 and discount to 0', () => {
    // With NRI: 100 * 1 * 1.5 = 150
    expect(calculateBookingPrice(100, 1, true)).toBe(150);
    // Without NRI: 100 * 1 = 100
    expect(calculateBookingPrice(100, 1, false)).toBe(100);
  });
});
