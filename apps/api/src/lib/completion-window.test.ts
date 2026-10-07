import { describe, it, expect } from 'vitest';
import { pujaScheduledInstant, tooEarlyToCompleteMessage } from './completion-window.js';
import { isHttpUrl, httpUrlSchema } from './http-url.js';

describe('pujaScheduledInstant', () => {
  const day = new Date('2026-10-12T00:00:00Z');

  it('reads an IST slot label: 18:00 IST is 12:30 UTC', () => {
    expect(pujaScheduledInstant(day, '18:00').toISOString()).toBe('2026-10-12T12:30:00.000Z');
    expect(pujaScheduledInstant(day, 'Evening (6:00 PM)').toISOString()).toBe('2026-10-12T12:30:00.000Z');
  });

  it('falls back to 00:00 IST on the day when the slot cannot be read (same as the start gate)', () => {
    expect(pujaScheduledInstant(day, 'morning').toISOString()).toBe('2026-10-11T18:30:00.000Z');
    expect(pujaScheduledInstant(day, null).toISOString()).toBe('2026-10-11T18:30:00.000Z');
  });
});

describe('tooEarlyToCompleteMessage', () => {
  const day = new Date('2026-10-12T00:00:00Z');
  const start = pujaScheduledInstant(day, '18:00'); // 2026-10-12T12:30Z

  it('is locked before the start, naming the IST time', () => {
    const msg = tooEarlyToCompleteMessage(start, 'puja', new Date('2026-10-12T12:29:59Z'));
    expect(msg).toMatch(/cannot be marked complete before it starts, at 6:00 PM IST on 12 Oct 2026/);
  });

  it('is open from the start instant onwards', () => {
    expect(tooEarlyToCompleteMessage(start, 'puja', new Date('2026-10-12T12:30:00Z'))).toBeNull();
    expect(tooEarlyToCompleteMessage(start, 'puja', new Date('2026-10-13T00:00:00Z'))).toBeNull();
  });
});

describe('isHttpUrl / httpUrlSchema', () => {
  it('accepts http and https only', () => {
    expect(isHttpUrl('https://meet.jit.si/x')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://x.com', 'x', '']) {
      expect(isHttpUrl(bad)).toBe(false);
    }
  });

  it('httpUrlSchema trims, caps the length and names the field', () => {
    const schema = httpUrlSchema('roomUrl', 30);
    expect(schema.parse('  https://a.example/x ')).toBe('https://a.example/x');
    const bad = schema.safeParse('javascript:alert(1)');
    expect(bad.success).toBe(false);
    expect(JSON.stringify(bad)).toContain('roomUrl must be a valid http:// or https:// URL');
    expect(schema.safeParse('https://a.example/' + 'x'.repeat(40)).success).toBe(false);
  });
});
