import { describe, it, expect } from 'vitest';
import { sniffFileType, judgeUpload } from './file-sniff.js';

const b = (...x: number[]) => new Uint8Array(x);
const PDF = new TextEncoder().encode('%PDF-1.7\n');
const PNG = b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const JPG = b(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);

describe('sniffFileType', () => {
  it('recognises pdf, png, jpeg and rejects html / empty', () => {
    expect(sniffFileType(PDF)).toBe('pdf');
    expect(sniffFileType(PNG)).toBe('png');
    expect(sniffFileType(JPG)).toBe('jpeg');
    expect(sniffFileType(new TextEncoder().encode('<html><body>'))).toBeNull();
    expect(sniffFileType(b())).toBeNull();
  });
});

describe('judgeUpload', () => {
  const kyc = ['pdf', 'png', 'jpeg'] as const;
  it('refuses a zero-byte object', () => {
    expect(judgeUpload({ length: 0, contentType: 'application/pdf', head: b() }, kyc)).toBe('empty');
  });
  it('refuses bytes that are not an allowed type', () => {
    expect(judgeUpload({ length: 20, contentType: 'application/pdf', head: new TextEncoder().encode('<html>hello') }, kyc)).toBe('wrong_type');
  });
  it('refuses a declared type that disagrees with the bytes', () => {
    expect(judgeUpload({ length: 20, contentType: 'application/pdf', head: PNG }, kyc)).toBe('wrong_type');
  });
  it('accepts matching bytes and tolerates a generic content-type', () => {
    expect(judgeUpload({ length: 900, contentType: 'application/pdf', head: PDF }, kyc)).toBe('ok');
    expect(judgeUpload({ length: 900, contentType: 'application/octet-stream', head: JPG }, kyc)).toBe('ok');
  });
  it('honours the allowed list (a pdf is not a photo)', () => {
    expect(judgeUpload({ length: 900, contentType: null, head: PDF }, ['png', 'jpeg', 'webp'])).toBe('wrong_type');
  });
});
