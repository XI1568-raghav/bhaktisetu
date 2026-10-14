import { describe, expect, it } from 'vitest';
import { looksLikeVideoContainer } from './r2.js';

const bytes = (...n: number[]) => Uint8Array.from(n);

describe('looksLikeVideoContainer', () => {
  it('accepts mp4/mov, webm and avi headers', () => {
    expect(looksLikeVideoContainer(bytes(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d))).toBe(true);
    expect(looksLikeVideoContainer(bytes(0x1a, 0x45, 0xdf, 0xa3, 1, 2))).toBe(true);
    expect(looksLikeVideoContainer(new TextEncoder().encode('RIFF\0\0\0\0AVI LIST'))).toBe(true);
  });
  it('rejects text and short input', () => {
    expect(looksLikeVideoContainer(new TextEncoder().encode('hello this is not a video'))).toBe(false);
    expect(looksLikeVideoContainer(bytes(1, 2))).toBe(false);
  });
});
