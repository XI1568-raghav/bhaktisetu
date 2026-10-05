import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * When the AI backend is unreachable, Ask Pandit used to answer from a local
 * canned library and present it as the pandit's answer to the question. The
 * canned text is still the safety net, but it must say what it is.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const src = strip(readFileSync(join(__dirname, '..', 'components/AiChat.tsx'), 'utf8'));

describe('Ask Pandit fallback is labelled', () => {
  it('tells the devotee the AI guide is unavailable and this is general guidance', () => {
    expect(src).toMatch(/AI guide is unavailable right now/);
    expect(src).toMatch(/general guidance/);
  });
  it('applies the label to the locally generated answer', () => {
    expect(src).toMatch(/FALLBACK_NOTICE/);
    expect(src).toMatch(/getLocalDemoResponse\(trimmed\)/);
  });
});
