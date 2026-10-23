import { test, expect, type Page } from '@playwright/test';

/**
 * Register -> portal, for every provider role, with no admin step and no sign-in.
 *
 * Regression for the production defect "after public signup the portal calls
 * /auth/refresh with an empty body (400) and /auth/session/revive (401), then
 * redirects to /auth/login?redirect=<portal>": the signup used a full page load,
 * which drops the in-memory access token that the signup response had just
 * seeded. The user must land INSIDE the portal, signed in, with:
 *   - no 400/401/403/404/5xx from the API at any point,
 *   - no visit to /auth/login,
 *   - no "pending approval" wording,
 *   - the provider profile actually saved (POST /onboarding/provider -> 200).
 * Then a hard reload of the portal must still be signed in (the httpOnly session
 * cookies from POST /auth/register were kept), again without any 4xx.
 *
 * Needs the local stack (docs/runbooks/qa-local-stack.md: API on :4000 with
 * REQUIRE_PROVIDER_APPROVAL unset, a Supabase stand-in with email auto-confirm,
 * web on :3000). It never touches production: set E2E_LOCAL_STACK=1 to run it.
 * If Supabase email confirmation is ON the signup shows a "verify your email"
 * screen instead and this spec fails on purpose.
 */
test.skip(!process.env.E2E_LOCAL_STACK, 'needs the local stack (E2E_LOCAL_STACK=1)');

const ROLES = [
  { key: 'priest', label: 'Pandit', portal: '/priest' },
  { key: 'store_owner', label: 'Store Owner', portal: '/store-admin' },
  { key: 'astrologer', label: 'Astrologer', portal: '/astrologer-portal' },
  { key: 'wellness_instructor', label: 'Wellness Instructor', portal: '/wellness-portal' },
  { key: 'gaushala_manager', label: 'Gau Seva', portal: '/gaushala-portal' },
  { key: 'temple_manager', label: 'Temple Manager', portal: '/temple-portal' },
] as const;

const WALL = /pending approval|awaiting approval|waiting for approval|under review|pending review|not approved|Provider accounts require/i;

/** Every API answer that is a client/server error, with method + path. */
function watchApi(page: Page): { failures: string[]; sawLogin: () => boolean; onlyPath: (re: RegExp) => string[] } {
  const failures: string[] = [];
  const all: string[] = [];
  let login = false;
  page.on('response', (r) => {
    const u = r.url();
    if (!u.includes(':4000')) return;
    const line = `${r.status()} ${r.request().method()} ${u.replace(/.*:4000/, '')}`;
    all.push(line);
    if (r.status() >= 400) failures.push(line);
  });
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame() && /\/auth\/login/.test(f.url())) login = true;
  });
  return { failures, sawLogin: () => login, onlyPath: (re) => all.filter((l) => re.test(l)) };
}

for (const role of ROLES) {
  test(`${role.key}: register lands inside ${role.portal}, signed in, no 4xx, no login redirect`, async ({ page }) => {
    test.setTimeout(150_000);
    const net = watchApi(page);
    const email = `e2e-${role.key}-${Date.now()}@example.com`;
    const chip = (name: string) => page.getByRole('button', { name, exact: true }).click();

    await page.goto('/auth/signup', { waitUntil: 'networkidle' });
    await page.getByText(role.label, { exact: true }).first().click();
    await page.getByRole('button', { name: /Continue as/ }).click();
    await page.locator('input[name="name"]').fill(`E2E ${role.key}`);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('Passw0rd!x1');
    if (role.key === 'priest') {
      await page.locator('input[placeholder="e.g. 10"]').fill('10');
      await chip('Satyanarayan Puja');
    }
    if (role.key === 'store_owner') {
      await page.locator('input[placeholder*="Puja Store"]').fill(`E2E Store ${Date.now()}`);
      await chip('Puja Samagri');
    }
    if (role.key === 'astrologer') {
      await chip('Vedic Astrology');
      await chip('Hindi');
    }
    if (role.key === 'wellness_instructor') await chip('Yoga');
    if (role.key === 'gaushala_manager' || role.key === 'temple_manager') {
      await page.locator('input[placeholder*="e.g. Shri"]').first().fill(`E2E ${role.key} ${Date.now()}`);
    }
    await page.locator('input[type="checkbox"]').last().check();
    await page.getByRole('button', { name: /Create Account/ }).click();

    // Straight into the portal: no sign-in, no bounce.
    await page.waitForURL(`**${role.portal}`, { timeout: 45_000 });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`${role.portal}$`));
    expect(await page.locator('body').innerText()).not.toMatch(WALL);

    // The provider profile call was NOT abandoned by the navigation.
    expect(net.onlyPath(/POST \/api\/v1\/onboarding\/provider/)).toEqual([
      expect.stringMatching(/^200 POST \/api\/v1\/onboarding\/provider$/),
    ]);
    expect(net.sawLogin()).toBe(false);
    expect(net.failures).toEqual([]);

    // A hard reload keeps the session (cookies from /auth/register were stored).
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(new RegExp(`${role.portal}$`));
    expect(await page.locator('body').innerText()).not.toMatch(WALL);
    expect(net.sawLogin()).toBe(false);
    expect(net.failures).toEqual([]);
  });
}
