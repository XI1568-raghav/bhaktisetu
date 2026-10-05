import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The API answers in English unless the request carries Accept-Language
 * (apps/api/src/lib/i18n.ts). Every request the mobile app makes must carry
 * the app's current language, defaulting to 'en'.
 */
const ORIGINAL_ENV = process.env.EXPO_PUBLIC_API_URL;

async function load() {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.test.invalid';
  vi.resetModules();
  const api = await import('../api');
  const lang = await import('../language');
  return { api, lang };
}

function stubFetch() {
  const fn = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function sentHeader(fn: ReturnType<typeof stubFetch>, call = 0): string | undefined {
  const init = (fn.mock.calls[call] as unknown as [string, RequestInit])[1];
  return new Headers(init.headers as HeadersInit).get('Accept-Language') ?? undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_ENV === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = ORIGINAL_ENV;
});

describe('mobile language -> Accept-Language', () => {
  it('defaults to en before any language is set', async () => {
    const { api, lang } = await load();
    expect(lang.currentAcceptLanguage()).toBe('en');
    const f = stubFetch();
    await api.apiFetch('/x');
    expect(sentHeader(f)).toBe('en');
  });

  it('apiFetch and apiPost send the current language', async () => {
    const { api, lang } = await load();
    lang.setCurrentLanguage('hi');
    const f = stubFetch();
    await api.apiFetch('/x');
    await api.apiPost('/y', { a: 1 });
    expect(sentHeader(f, 0)).toBe('hi');
    expect(sentHeader(f, 1)).toBe('hi');
  });

  it('falls back to en for null, empty or header-unsafe values', async () => {
    const { lang } = await load();
    for (const bad of [null, undefined, '', '  ', 'hi\r\nX-Evil: 1', 'x'.repeat(40)]) {
      lang.setCurrentLanguage(bad);
      expect(lang.currentAcceptLanguage()).toBe('en');
    }
  });

  it('resets to en when the language is cleared (sign-out)', async () => {
    const { lang } = await load();
    lang.setCurrentLanguage('ta');
    expect(lang.currentAcceptLanguage()).toBe('ta');
    lang.setCurrentLanguage(null);
    expect(lang.currentAcceptLanguage()).toBe('en');
  });
});
