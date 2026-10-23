import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('signup sets the same httpOnly cookies as login', () => {
  it('calls setAuthCookies inside the signup handler when a session exists', () => {
    const src = readFileSync(fileURLToPath(new URL('./auth.ts', import.meta.url)), 'utf8');
    const start = src.indexOf('const signupHandler');
    const end = src.indexOf("server.post('/signup'");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(src.slice(start, end)).toMatch(/setAuthCookies\(reply, authData\.session\.access_token, authData\.session\.refresh_token\)/);
  });
});
