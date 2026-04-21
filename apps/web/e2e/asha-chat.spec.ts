import { test, expect } from '@playwright/test';

test.describe('Asha AI Support chat widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    const openBtn = page.locator('button[aria-label="Open live chat"]');
    await expect(openBtn).toBeVisible({ timeout: 20000 });
    // Retry until the chat textarea appears — guards against clicking before React hydration.
    const textarea = page.locator('textarea[placeholder*="Poojly"]');
    for (let i = 0; i < 5; i++) {
      await openBtn.click().catch(() => {});
      if (await textarea.isVisible().catch(() => false)) break;
      await page.waitForTimeout(500);
    }
    await expect(textarea).toBeVisible({ timeout: 10000 });
  });

  test('widget never shows "couldn\'t reach AI" error for normal messages', async ({ page }) => {
    await page.locator('textarea[placeholder*="Poojly"]').fill('Hi');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    const body = await page.locator('body').textContent();
    expect(body).not.toContain("couldn't reach the AI service");
  });

  test('greeting "Hi" gets a friendly Namaste reply (not escalation)', async ({ page }) => {
    await page.locator('textarea[placeholder*="Poojly"]').fill('Hi');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Namaste/i).first()).toBeVisible({ timeout: 5000 });

    // Should NOT show the human-agent CTA
    await expect(page.getByRole('button', { name: /Talk to Human Agent/i })).toHaveCount(0);
  });

  test('"How do I book a puja?" answers with Browse Pujas action chip', async ({ page }) => {
    await page.locator('textarea[placeholder*="Poojly"]').fill('How do I book a puja?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);

    // One of the agent messages should include a link to /pujas
    const pujaLink = page.locator('a[href="/pujas"]');
    await expect(pujaLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('refund request over ₹5,000 triggers escalation with Talk to Human button', async ({ page }) => {
    await page
      .locator('textarea[placeholder*="Poojly"]')
      .fill('I want a refund of ₹10000 for my cancelled booking');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Talk to Human Agent/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('clicking "Talk to Human Agent" navigates to /support/ticket/new?from=chat with prefilled transcript', async ({
    page,
  }) => {
    await page
      .locator('textarea[placeholder*="Poojly"]')
      .fill('I need a refund of ₹12000 please');
    await page.keyboard.press('Enter');

    const escalateBtn = page.getByRole('button', { name: /Talk to Human Agent/i });
    await expect(escalateBtn).toBeVisible({ timeout: 15000 });
    await escalateBtn.click();

    await page.waitForURL(/\/support\/ticket\/new\?from=chat/, { timeout: 15000 });
    // Give the client component time to hydrate and pull transcript from localStorage.
    await page.waitForTimeout(800);

    // Subject + description should be pre-filled from transcript
    const subject = page.locator('input[placeholder*="summary"]');
    await expect(subject).toHaveValue(/Escalated from AI chat/i);

    const description = page.locator('textarea[placeholder*="Describe"]');
    await expect(description).toHaveValue(/Chat transcript/i);
    await expect(description).toHaveValue(/refund of/i);
  });

  test('explicit "talk to human" request escalates', async ({ page }) => {
    await page.locator('textarea[placeholder*="Poojly"]').fill('Please connect me to a human agent');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Talk to Human Agent/i })).toBeVisible({
      timeout: 15000,
    });
  });
});
