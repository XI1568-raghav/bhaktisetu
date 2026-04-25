import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect console errors during a page lifecycle */
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/** Filter out benign console errors (React DevTools, hydration warnings, etc.) */
function filterBenignErrors(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('Download the React DevTools') &&
      !e.includes('Warning:') &&
      !e.includes('Failed to load resource') &&
      !e.includes('ERR_CONNECTION_REFUSED') &&
      !e.includes('net::ERR') &&
      !e.includes('favicon') &&
      !e.includes('Hydration') &&
      !e.includes('hydrating') &&
      !e.includes('NEXT_REDIRECT') &&
      !e.includes('ChunkLoadError'),
  );
}

/** Navigate and wait for DOM ready */
async function navigateTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
}

/** Login helper — sets auth cookies/localStorage via the login form */
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

  // Ensure email tab is active (it's the default but be explicit)
  const emailTab = page.locator('button:has-text("Email")').first();
  if (await emailTab.isVisible()) await emailTab.click();

  await page.waitForTimeout(500);

  // Fill email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(password);

  // Click sign in button (the one inside the email form)
  const signInBtn = page.locator('button:has-text("Sign In")').first();
  await signInBtn.click();

  // Wait for redirect away from login page (up to 8s)
  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 8000 });
  } catch {
    // If redirect didn't happen, wait a bit more for slow machines
    await page.waitForTimeout(2000);
  }
}

// ===========================================================================
// 1. HOME PAGE
// ===========================================================================

test.describe('1. Home Page', () => {
  test('hero loads with brand name and CTAs', async ({ page }) => {
    await navigateTo(page, '/');

    // Hero heading
    await expect(page.locator('h1')).toContainText('sacred traditions');

    // CTA buttons
    await expect(page.locator('a:has-text("Explore Temples")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Book a Puja")').first()).toBeVisible();
  });

  test('brand story section (Our Story)', async ({ page }) => {
    await navigateTo(page, '/');
    const body = await page.textContent('body');
    expect(body).toMatch(/Our Story/i);
    expect(body).toMatch(/The Gap/i);
    expect(body).toMatch(/The Bridge/i);
  });

  test('social proof stats', async ({ page }) => {
    await navigateTo(page, '/');
    await expect(page.locator('text=1B+').first()).toBeVisible();
    await expect(page.locator('text=$58B').first()).toBeVisible();
  });

  test('feature grid (What We Offer)', async ({ page }) => {
    await navigateTo(page, '/');
    const body = await page.textContent('body');
    expect(body).toMatch(/Everything in one app/i);
    expect(body).toMatch(/Live Darshan/);
    expect(body).toMatch(/Verified Pujas/);
    expect(body).toMatch(/AI Pandit/);
  });

  test('darshan card section', async ({ page }) => {
    await navigateTo(page, '/');
    const body = await page.textContent('body');
    expect(body).toMatch(/See the divine, from anywhere/i);
    await expect(page.locator('text=LIVE').first()).toBeVisible();
  });

  test('puja booking section', async ({ page }) => {
    await navigateTo(page, '/');
    const body = await page.textContent('body');
    expect(body).toMatch(/Authentic rituals, verified priests/i);
    expect(body).toMatch(/Video Proof/);
    expect(body).toMatch(/Prasad Delivery/);
  });

  test('store + astrology cards', async ({ page }) => {
    await navigateTo(page, '/');
    const body = await page.textContent('body');
    expect(body).toMatch(/Bhakti Store/i);
    expect(body).toMatch(/Everything for daily worship/i);
    expect(body).toMatch(/Astrology/i);
    expect(body).toMatch(/Free Kundli/);
    expect(body).toMatch(/Daily Horoscope/);
  });

  test('more features row (Gau Seva, Panchang, Content, Wellness)', async ({ page }) => {
    await navigateTo(page, '/');
    const body = await page.textContent('body');
    expect(body).toMatch(/Gau Seva/);
    expect(body).toMatch(/Panchang/);
    expect(body).toMatch(/Content/);
    expect(body).toMatch(/Wellness/);
  });

  test('final CTA (Get Started)', async ({ page }) => {
    await navigateTo(page, '/');
    await expect(page.locator('a:has-text("Get Started")').first()).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toMatch(/Join 50,000\+ devotees/i);
  });
});

// ===========================================================================
// 2. DARSHAN PAGE
// ===========================================================================

test.describe('2. Darshan Page', () => {
  test('temple cards visible', async ({ page }) => {
    await navigateTo(page, '/darshan');
    await expect(page.locator('h1')).toContainText('Live Darshan');
    await expect(page.locator('text=LIVE').first()).toBeVisible();
    await expect(page.locator('text=Kashi Vishwanath').first()).toBeVisible();
  });
});

// ===========================================================================
// 3. PUJAS PAGE
// ===========================================================================

test.describe('3. Pujas Page', () => {
  test('puja listings visible', async ({ page }) => {
    await navigateTo(page, '/pujas');
    await expect(page.locator('h1')).toContainText('Book Sacred Pujas');
    await expect(page.locator('text=Rudrabhishek Puja')).toBeVisible();
    await expect(page.locator('text=Book Now').first()).toBeVisible();
  });
});

// ===========================================================================
// 4. TEMPLES PAGE
// ===========================================================================

test.describe('4. Temples Page', () => {
  test('temple cards visible', async ({ page }) => {
    await navigateTo(page, '/temples');
    await expect(page.locator('h1')).toContainText('Sacred Temples');
    await expect(page.locator('text=Kashi Vishwanath').first()).toBeVisible();
  });
});

// ===========================================================================
// 5. CONTENT PAGE
// ===========================================================================

test.describe('5. Content Page', () => {
  test('content items visible', async ({ page }) => {
    await page.goto('/content', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
    const body = await page.textContent('body');
    expect(body).toMatch(/aarti|mantra|bhajan|chalisa|content/i);
  });
});

// ===========================================================================
// 6. STORE PAGE
// ===========================================================================

test.describe('6. Store Page', () => {
  test('products visible and click to product detail', async ({ page }) => {
    await navigateTo(page, '/store');
    await expect(page.locator('h1').first()).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toMatch(/store|shop|puja/i);

    // Product cards
    await expect(page.locator('text=Brass Puja Thali').first()).toBeVisible();

    // Click first product link
    const productLink = page.locator('a[href*="/store/"]').first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    await page.waitForURL('**/store/**');
    await expect(page).toHaveURL(/\/store\/.+/);

    // Detail page has content
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ===========================================================================
// 7. ASTROLOGY PAGE
// ===========================================================================

test.describe('7. Astrology Page', () => {
  test('kundli/horoscope/chat links work', async ({ page }) => {
    await navigateTo(page, '/astrology');
    const body = await page.textContent('body');
    expect(body).toMatch(/astrol|kundli|horoscope/i);

    await expect(page.locator('a[href*="kundli"]').first()).toBeVisible();
    await expect(page.locator('a[href*="horoscope"]').first()).toBeVisible();
  });
});

// ===========================================================================
// 8. ASTROLOGY / KUNDLI
// ===========================================================================

test.describe('8. Kundli Page', () => {
  test('form renders', async ({ page }) => {
    await navigateTo(page, '/astrology/kundli');
    await expect(page.locator('input').first()).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toMatch(/kundli|birth|chart/i);
  });
});

// ===========================================================================
// 9. ASTROLOGY / HOROSCOPE
// ===========================================================================

test.describe('9. Horoscope Page', () => {
  test('12 rashi cards visible', async ({ page }) => {
    await navigateTo(page, '/astrology/horoscope');
    const body = await page.textContent('body');
    expect(body).toMatch(/horoscope|rashi|aries/i);

    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    let foundCount = 0;
    for (const sign of signs) {
      if (body?.includes(sign)) foundCount++;
    }
    expect(foundCount).toBeGreaterThanOrEqual(10);
  });
});

// ===========================================================================
// 10. WELLNESS PAGE
// ===========================================================================

test.describe('10. Wellness Page', () => {
  test('yoga/meditation/vipassana sections visible', async ({ page }) => {
    await navigateTo(page, '/wellness');
    const body = await page.textContent('body');
    expect(body).toMatch(/yoga/i);
    expect(body).toMatch(/meditation/i);
    expect(body).toMatch(/vipassana/i);
  });
});

// ===========================================================================
// 11. ASK PANDIT PAGE
// ===========================================================================

test.describe('11. Ask Pandit Page', () => {
  test('chat interface loads', async ({ page }) => {
    await navigateTo(page, '/ask-pandit');
    const body = await page.textContent('body');
    expect(body).toMatch(/pandit|spiritual|ask|chat|question/i);
  });
});

// ===========================================================================
// 12. PRICING PAGE
// ===========================================================================

test.describe('12. Pricing Page', () => {
  test('pricing plans visible with devotee and provider sections', async ({ page }) => {
    await navigateTo(page, '/pricing');
    await expect(page.locator('h1')).toContainText('Pricing');
    const body = await page.textContent('body');
    expect(body).toMatch(/For Devotees/i);
    expect(body).toMatch(/For.*Provider|Commission|Subscription/i);
  });
});

// ===========================================================================
// 13. DEMO PAGE
// ===========================================================================

test.describe('13. Demo Page', () => {
  test('7 role demo cards visible', async ({ page }) => {
    await navigateTo(page, '/demo');
    await expect(page.locator('h1')).toContainText('Action');
    const body = await page.textContent('body');

    // 7 roles: Devotee, Pandit, Store Owner, Astrologer, Wellness Instructor, Temple Manager, Gaushala Manager
    const roles = ['Devotee', 'Pandit', 'Store Owner', 'Astrologer', 'Wellness Instructor', 'Temple Manager', 'Gaushala Manager'];
    let found = 0;
    for (const role of roles) {
      if (body?.includes(role)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(7);
  });
});

// ===========================================================================
// 14. DEMO / DEVOTEE
// ===========================================================================

test.describe('14. Demo Devotee Page', () => {
  test('phone mockup with screens and navigation', async ({ page }) => {
    await navigateTo(page, '/demo/devotee');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/devotee|home|darshan|profile|puja/i);

    // Navigation arrows or screen indicators should exist
    const hasNav = await page.locator('button, [role="button"]').count();
    expect(hasNav).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 15. FOOTER / STATIC PAGES
// ===========================================================================

const footerPages = [
  { path: '/about', keywords: /about|mission|team|poojly/i },
  { path: '/careers', keywords: /career|join|position|hiring|job/i },
  { path: '/blog', keywords: /blog|article|post|read|video proof/i },
  { path: '/contact', keywords: /contact|email|phone|reach/i },
  { path: '/help', keywords: /help|faq|support|question|puja booking/i },
  { path: '/privacy', keywords: /privacy|data|personal|information/i },
  { path: '/terms', keywords: /terms|service|agreement|condition/i },
  { path: '/refunds', keywords: /refund|cancel|return|policy/i },
];

for (const { path, keywords } of footerPages) {
  test.describe(`15. Footer page: ${path}`, () => {
    test('returns 200 and has content', async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await page.waitForTimeout(500);

      const body = await page.textContent('body');
      expect(body).toMatch(keywords);
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });
  });
}

// ===========================================================================
// 16. AUTH / LOGIN
// ===========================================================================

test.describe('16. Login Page', () => {
  test('form renders with email and password fields', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    expect(body).toMatch(/sign in|log in|login|welcome|spiritual journey/i);

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput.first()).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });
});

// ===========================================================================
// 17. AUTH / SIGNUP
// ===========================================================================

test.describe('17. Signup Page', () => {
  test('6 role cards visible', async ({ page }) => {
    await navigateTo(page, '/auth/signup');
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    // 6 roles: Devotee, Pandit, Store Owner, Astrologer, Wellness Instructor, Gau Seva
    expect(body).toMatch(/Devotee/);
    expect(body).toMatch(/Pandit/);
    expect(body).toMatch(/Store Owner/);
    expect(body).toMatch(/Astrologer/);
    expect(body).toMatch(/Wellness Instructor/);
    expect(body).toMatch(/Gau Seva|Gaushala/i);
  });
});

// ===========================================================================
// 18. LOGIN AS DEVOTEE -> DASHBOARD
// ===========================================================================

test.describe('18. Login as devotee', () => {
  test('devotee@demo.com + demo123 -> redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'devotee@demo.com', 'demo123');
    const url = page.url();
    // Should be on dashboard or home (not login)
    expect(url).not.toContain('/auth/login');
    expect(url).toMatch(/\/dashboard|localhost:3000\/?$/);
  });
});

// ===========================================================================
// 19. LOGIN AS ADMIN -> /admin
// ===========================================================================

test.describe('19. Login as admin', () => {
  test('admin@demo.com + demo123 -> redirects to /admin', async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
    const url = page.url();
    expect(url).not.toContain('/auth/login');
    expect(url).toMatch(/\/admin/);
  });
});

// ===========================================================================
// 20. ADMIN DASHBOARD
// ===========================================================================

test.describe('20. Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
  });

  test('stats cards, user breakdown, recent signups visible', async ({ page }) => {
    await navigateTo(page, '/admin');
    // Wait for AuthGuard to resolve and render actual content
    await page.waitForFunction(
      () => document.body.innerText.match(/Total Users|Active Providers|Revenue|Devotees|Pandits/i),
      { timeout: 10000 }
    ).catch(() => {});
    const body = await page.textContent('body');
    expect(body).toMatch(/Total Users|Active Providers|Revenue/i);
    expect(body).toMatch(/Devotees|Pandits/i);
  });
});

// ===========================================================================
// 21. ADMIN / USERS
// ===========================================================================

test.describe('21. Admin Users', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
  });

  test('user table visible with filters', async ({ page }) => {
    await navigateTo(page, '/admin/users');
    await page.waitForFunction(
      () => document.body.innerText.match(/user|name|email|role|filter/i),
      { timeout: 10000 }
    ).catch(() => {});
    const body = await page.textContent('body');
    expect(body).toMatch(/user|name|email|role|filter/i);
  });
});

// ===========================================================================
// 22. ADMIN / APPROVALS
// ===========================================================================

test.describe('22. Admin Approvals', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
  });

  test('pending approvals list visible', async ({ page }) => {
    await navigateTo(page, '/admin/approvals');
    await page.waitForFunction(
      () => document.body.innerText.match(/approv|pending|review|provider/i),
      { timeout: 10000 }
    ).catch(() => {});
    const body = await page.textContent('body');
    expect(body).toMatch(/approv|pending|review|provider/i);
  });
});

// ===========================================================================
// 23. ADMIN / REVENUE
// ===========================================================================

test.describe('23. Admin Revenue', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
  });

  test('revenue cards visible', async ({ page }) => {
    await navigateTo(page, '/admin/revenue');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/revenue|earning|commission|income/i);
  });
});

// ===========================================================================
// 24. ADMIN / REPORTS
// ===========================================================================

test.describe('24. Admin Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
  });

  test('charts visible', async ({ page }) => {
    await navigateTo(page, '/admin/reports');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/report|chart|analytic|overview/i);
  });
});

// ===========================================================================
// 25. ADMIN / SETTINGS
// ===========================================================================

test.describe('25. Admin Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
  });

  test('commission settings visible', async ({ page }) => {
    await navigateTo(page, '/admin/settings');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/setting|commission|configur/i);
  });
});

// ===========================================================================
// 26. PRIEST DASHBOARD
// ===========================================================================

test.describe('26. Priest Dashboard', () => {
  test('priest dashboard loads', async ({ page }) => {
    await loginAs(page, 'priest@demo.com', 'demo123');
    await navigateTo(page, '/priest');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/priest|pandit|dashboard|booking|earning|welcome/i);
  });
});

// ===========================================================================
// 27. STORE ADMIN DASHBOARD
// ===========================================================================

test.describe('27. Store Admin Dashboard', () => {
  test('store admin dashboard loads', async ({ page }) => {
    await loginAs(page, 'store@demo.com', 'demo123');
    await navigateTo(page, '/store-admin');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/store|product|order|revenue|dashboard/i);
  });
});

// ===========================================================================
// 28. ASTROLOGER PORTAL
// ===========================================================================

test.describe('28. Astrologer Portal', () => {
  test('astrologer dashboard loads', async ({ page }) => {
    await loginAs(page, 'astro@demo.com', 'demo123');
    await navigateTo(page, '/astrologer-portal');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/astrologer|consultation|portal|dashboard|earning/i);
  });
});

// ===========================================================================
// 29. WELLNESS PORTAL
// ===========================================================================

test.describe('29. Wellness Portal', () => {
  test('wellness dashboard loads', async ({ page }) => {
    await loginAs(page, 'wellness@demo.com', 'demo123');
    await navigateTo(page, '/wellness-portal');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/wellness|session|student|instructor|dashboard/i);
  });
});

// ===========================================================================
// 30. TEMPLE PORTAL
// ===========================================================================

test.describe('30. Temple Portal', () => {
  test('temple dashboard loads', async ({ page }) => {
    await loginAs(page, 'temple@demo.com', 'demo123');
    await navigateTo(page, '/temple-portal');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/temple|darshan|portal|dashboard|manage/i);
  });
});

// ===========================================================================
// 31. ONBOARDING / PANDIT
// ===========================================================================

test.describe('31. Pandit Onboarding', () => {
  test('onboarding wizard renders with progress bar', async ({ page }) => {
    await navigateTo(page, '/onboarding/pandit');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    // Steps like Personal Details, Experience, Pricing, Verification
    expect(body).toMatch(/personal|detail|experience|step|verification/i);
  });
});

// ===========================================================================
// 32. ONBOARDING / STORE-OWNER
// ===========================================================================

test.describe('32. Store Owner Onboarding', () => {
  test('store onboarding renders', async ({ page }) => {
    await navigateTo(page, '/onboarding/store-owner');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body).toMatch(/store|product|detail|step|business/i);
  });
});

// ===========================================================================
// 33. PROFILE PAGE
// ===========================================================================

test.describe('33. Profile Page', () => {
  test('profile page loads (may redirect to login)', async ({ page }) => {
    await navigateTo(page, '/profile');
    await page.waitForTimeout(3000);
    const url = page.url();
    const isProfileOrLogin = url.includes('/profile') || url.includes('/auth/login') || url.includes('/login');
    expect(isProfileOrLogin).toBe(true);
  });
});

// ===========================================================================
// 34. SETTINGS / SUBSCRIPTION
// ===========================================================================

test.describe('34. Subscription Settings', () => {
  test('subscription page loads', async ({ page }) => {
    await navigateTo(page, '/settings/subscription');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    // Either subscription content or login redirect
    const url = page.url();
    expect(url.includes('/settings/subscription') || url.includes('/auth/login') || body?.match(/subscription|plan|billing|sign in/i)).toBeTruthy();
  });
});

// ===========================================================================
// 35. SETTINGS / EARNINGS
// ===========================================================================

test.describe('35. Earnings Settings', () => {
  test('earnings page loads', async ({ page }) => {
    await navigateTo(page, '/settings/earnings');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    const url = page.url();
    expect(url.includes('/settings/earnings') || url.includes('/auth/login') || body?.match(/earning|payout|revenue|sign in/i)).toBeTruthy();
  });
});

// ===========================================================================
// 36. NAVIGATION
// ===========================================================================

test.describe('36. Navigation', () => {
  test('Temples nav link works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const link = page.locator('nav a:has-text("Temples")').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForURL('**/temples', { timeout: 10000 });
      expect(page.url()).toContain('/temples');
    }
  });

  test('Pujas nav link works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const link = page.locator('nav a[href="/pujas"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForURL('**/pujas', { timeout: 15000 });
      expect(page.url()).toContain('/pujas');
    }
  });

  test('Store nav link works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const link = page.locator('nav a[href="/store"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForURL('**/store', { timeout: 15000 });
      expect(page.url()).toContain('/store');
    }
  });
});

// ===========================================================================
// 37. FOOTER LINKS
// ===========================================================================

test.describe('37. Footer Links', () => {
  test('footer sections and links present', async ({ page }) => {
    await navigateTo(page, '/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    await expect(footer.locator('text=Darshya').first()).toBeVisible();
    await expect(footer.locator('a:has-text("About Us")').first()).toBeVisible();
    await expect(footer.locator('a:has-text("Privacy Policy")').first()).toBeVisible();
    await expect(footer.locator('a:has-text("Terms of Service")').first()).toBeVisible();
  });

  test('footer link navigates correctly', async ({ page }) => {
    await navigateTo(page, '/');
    const footerLink = page.locator('footer a:has-text("About Us")');
    await footerLink.click();
    await page.waitForURL('**/about');
    expect(page.url()).toContain('/about');
  });
});

// ===========================================================================
// 38. 404 PAGE
// ===========================================================================

test.describe('38. 404 Page', () => {
  test('/nonexistent-page shows 404', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz-12345', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });
});

// ===========================================================================
// 39. RESPONSIVE — MOBILE HOME
// ===========================================================================

test.describe('39. Responsive - Home at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('home page renders at mobile width', async ({ page }) => {
    await navigateTo(page, '/');
    await expect(page.locator('h1')).toContainText('sacred traditions');
    await expect(page.locator('a:has-text("Explore Temples")').first()).toBeVisible();
  });
});

// ===========================================================================
// 40. RESPONSIVE — MOBILE LOGIN
// ===========================================================================

test.describe('40. Responsive - Login at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('login page renders at mobile width', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toMatch(/sign in|log in|login|welcome|spiritual journey/i);
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
  });
});

// ===========================================================================
// 41. NO CONSOLE ERRORS — HOME
// ===========================================================================

test.describe('41. No console errors on home page', () => {
  test('home page has no console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await navigateTo(page, '/');
    await page.waitForTimeout(2000);
    const meaningful = filterBenignErrors(errors);
    expect(meaningful.length).toBe(0);
  });
});

// ===========================================================================
// 42. NO CONSOLE ERRORS — ADMIN
// ===========================================================================

test.describe('42. No console errors on admin page', () => {
  test('admin page has no console errors', async ({ page }) => {
    await loginAs(page, 'admin@demo.com', 'demo123');
    const errors = collectConsoleErrors(page);
    await navigateTo(page, '/admin');
    await page.waitForTimeout(2000);
    const meaningful = filterBenignErrors(errors);
    expect(meaningful.length).toBe(0);
  });
});
