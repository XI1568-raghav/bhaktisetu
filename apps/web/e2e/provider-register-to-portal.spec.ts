import { test, expect } from '@playwright/test';

/**
 * Register -> sign in -> portal, for every provider role, with no admin step.
 *
 * Needs the local stack (docs/runbooks/qa-local-stack.md: API on :4000 with
 * REQUIRE_PROVIDER_APPROVAL unset, a Supabase stand-in with email auto-confirm,
 * web on :3000). It never touches production: set E2E_LOCAL_STACK=1 to run it.
 * If Supabase email confirmation is ON, the signup shows a "verify your email"
 * screen and the same spec needs the confirmation click before sign-in.
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

const WALL = /pending approval|awaiting approval|under review|waiting for approval|pending review|not approved|Provider accounts require/i;

for (const role of ROLES) {
  test(`${role.key}: register, sign in, land on ${role.portal} with no approval wall`, async ({ page, context }) => {
    test.setTimeout(120_000);
    const apiFailures: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes(':4000') && [401, 403, 404, 500, 502, 503].includes(r.status())) {
        apiFailures.push(`${r.status()} ${r.request().method()} ${r.url().replace(/.*4000/, '')}`);
      }
    });
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
    // Signup hands back a session: the app either shows the "account is active" screen
    // or has already moved the new provider into their portal.
    await Promise.race([
      page.waitForURL(`**${role.portal}`, { timeout: 30_000 }),
      page.getByText(/Your account is active/i).first().waitFor({ timeout: 30_000 }),
    ]);
    expect(await page.locator('body').innerText()).not.toMatch(WALL);

    // Sign out the blunt way: settle, drop cookies + storage, leave the SPA, come back to /auth/login.
    await page.waitForLoadState('networkidle');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('about:blank');
    await page.goto('/auth/login', { waitUntil: 'networkidle' });
    await page.locator('input#email').fill(email);
    await page.locator('input#password').fill('Passw0rd!x1');
    await page.getByRole('button', { name: /^Sign in$/i }).first().click();
    await page.waitForURL(`**${role.portal}`, { timeout: 30_000 });
    await page.waitForLoadState('networkidle');

    expect(await page.locator('body').innerText()).not.toMatch(WALL);
    expect(apiFailures).toEqual([]);
  });
}
