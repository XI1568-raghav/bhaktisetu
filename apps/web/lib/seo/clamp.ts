/**
 * Search snippets cut around 155-160 characters and titles around 60. These
 * helpers shorten at a sentence or word boundary so a snippet never ends
 * mid-word. They never add text, so a clamped string stays as honest as the
 * original.
 */
export const DESCRIPTION_MAX = 155;
export const TITLE_MAX = 60;

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const window = t.slice(0, max);
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  if (sentence >= max * 0.5) return window.slice(0, sentence + 1);
  const space = window.lastIndexOf(' ');
  const cut = (space > 0 ? window.slice(0, space) : window.slice(0, max - 1)).replace(/[\s,;:\-–—(]+$/, '');
  return `${cut}…`;
}

export const clampDescription = (text: string, max = DESCRIPTION_MAX): string => clamp(text, max);
export const clampTitle = (text: string, max = TITLE_MAX): string => clamp(text, max);
