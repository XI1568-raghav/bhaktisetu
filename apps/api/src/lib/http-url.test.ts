import { describe, it, expect } from 'vitest';
import { httpUrl, isHttpUrl } from './http-url.js';

const BAD = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html;base64,PHNjcmlwdD4=',
  'file:///etc/passwd',
  'vbscript:msgbox(1)',
  'ftp://example.com/x',
  '//example.com/x',
  'https://',
  'not a url',
  '',
];
const GOOD = ['https://example.com/a.png', 'http://example.com/a?b=1', 'HTTPS://Example.com'];

describe('http(s)-only url inputs', () => {
  it.each(BAD)('rejects %s', (u) => {
    expect(isHttpUrl(u)).toBe(false);
    expect(httpUrl('imageUrl').safeParse(u).success).toBe(false);
  });

  it.each(GOOD)('accepts %s', (u) => {
    expect(isHttpUrl(u)).toBe(true);
    expect(httpUrl('imageUrl').safeParse(u).success).toBe(true);
  });

  it('names the field and the allowed schemes in the message', () => {
    const r = httpUrl('imageUrl').safeParse('javascript:alert(1)');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.message).toMatch(/imageUrl.*http:\/\/ or https:\/\//);
  });

  it('enforces the max length', () => {
    expect(httpUrl('x', 20).safeParse('https://example.com/' + 'a'.repeat(30)).success).toBe(false);
  });
});
