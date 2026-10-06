import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

async function mockSecurity(page) {
  await page.route('**/api/contact-config', route => route.fulfill({ json: { ok: true, siteKey: 'mock-public-key', privacyNoticeUrl: 'http://127.0.0.1:4173/privacy.html' } }));
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `
    window.turnstile = {
      render(selector, options) {
        window.mockTurnstileOptions = options;
        document.querySelector(selector).textContent = 'Security check (mock)';
        setTimeout(() => options.callback('mock-token'), 0);
        return 1;
      },
      reset() { setTimeout(() => window.mockTurnstileOptions.callback('mock-retry-token'), 0); }
    };
  ` }));
}
async function ready(page) {
  await mockSecurity(page);
  await page.goto('/');
  await expect(page.locator('[data-contact-submit]')).toBeEnabled();
}
async function fill(page) {
  await page.getByLabel('Your name or business').fill('Example business');
  await page.getByLabel('Email address').fill('hello@example.com');
  await page.getByLabel('What would you like').fill('Improve our site on mobile.');
}

for (const width of [320, 375, 599, 600, 767, 768, 899, 900, 1024, 1440]) {
  test(`navigation, form and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await ready(page);
    await page.getByRole('navigation').getByRole('link', { name: 'Let’s talk' }).click();
    await expect(page).toHaveURL(/#enquiry$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByLabel('I’d also like occasional emails')).not.toBeChecked();
    await mkdir('qa/screenshots', { recursive: true });
    await page.locator('#enquiry').screenshot({ path: `qa/screenshots/contact-${width}.png` });
    await page.getByRole('navigation').getByRole('link', { name: 'The work' }).click();
    await expect(page).toHaveURL(/#work$/);
    await page.locator('.portfolio-card').first().click();
    const dialog = page.locator('[data-portfolio-browser]');
    await expect(dialog).toBeVisible();
    await expect(page.frameLocator('[data-portfolio-frame]').getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.portfolio-card').first()).toBeFocused();
    expect(errors).toEqual([]);
  });
}
test('all four examples open and their return links preserve portfolio focus', async ({ page }) => {
  await ready(page);
  for (const slug of ['beach', 'mountain', 'trades', 'store']) {
    const link = page.locator(`.portfolio-card[data-portfolio="${slug}"]`).first();
    await link.click();
    const frame = page.frameLocator('[data-portfolio-frame]');
    await expect(frame.getByRole('heading', { level: 1 })).toBeVisible();
    const back = frame.locator('a[href="../../index.html"]').first();
    await back.click();
    await expect(page.locator('[data-portfolio-browser]')).not.toBeVisible();
    await expect(link).toBeFocused();
  }
});
test('accessible validation focuses the first invalid field without a request', async ({ page }) => {
  let writes = 0;
  await page.route('**/api/contact', route => { writes++; return route.fulfill({ json: { ok: true, reference: 'test' } }); });
  await ready(page);
  await page.locator('[data-contact-submit]').click();
  await expect(page.getByLabel('Your name or business')).toBeFocused();
  await expect(page.getByLabel('Your name or business')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Your name or business')).toHaveCSS('outline-color', 'rgb(64, 91, 70)');
  await expect(page.locator('#contact-error')).toHaveText('Check the highlighted fields.');
  await fill(page);
  await page.getByLabel('Current website').fill('ftp://example.com');
  await page.locator('[data-contact-submit]').click();
  await expect(page.getByLabel('Current website')).toBeFocused();
  expect(writes).toBe(0);
});
test('failed write preserves values, retry ID and consent separation before confirmed success', async ({ page }) => {
  const writes = [];
  await page.route('**/api/contact', async route => {
    writes.push(route.request().postDataJSON());
    await route.fulfill({ status: writes.length === 1 ? 502 : 201, json: writes.length === 1 ? { ok: false, error: 'We could not confirm your message was saved.' } : { ok: true, reference: 'mock_saved_123' } });
  });
  await ready(page);
  await fill(page);
  await page.locator('[data-contact-submit]').click();
  await expect(page.locator('#contact-error')).toBeFocused();
  await expect(page.locator('#contact-status')).toHaveText('Your notes are still here.');
  await expect(page.getByLabel('Email address')).toHaveValue('hello@example.com');
  await expect(page.locator('[data-contact-submit]')).toBeEnabled();
  await page.locator('[data-contact-submit]').click();
  await expect(page.locator('#contact-status')).toContainText('Your enquiry has been saved. Reference: mock_saved_123');
  await expect(page.locator('#contact-status')).toBeFocused();
  await expect(page.locator('[data-contact-submit]')).toBeDisabled();
  expect(writes).toHaveLength(2);
  expect(writes[0].submissionId).toBe(writes[1].submissionId);
  expect(writes[1].marketingConsent).toBe(false);
});
test('loading blocks double submission; explicit marketing choice stays optional', async ({ page }) => {
  let count = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/contact', async route => {
    count++;
    expect(route.request().postDataJSON().marketingConsent).toBe(true);
    await gate;
    await route.fulfill({ status: 201, json: { ok: true, reference: 'test_saved' } });
  });
  await ready(page);
  await fill(page);
  await page.getByLabel('I’d also like occasional emails').check();
  await page.locator('[data-contact-submit]').click();
  await expect(page.locator('#contact-status')).toHaveText('Sending your enquiry…');
  await expect(page.locator('[data-contact-submit]')).toBeDisabled();
  await expect(page.locator('#contact-form')).toHaveAttribute('aria-busy', 'true');
  await page.locator('#contact-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
  expect(count).toBe(1);
  release();
  await expect(page.locator('#contact-status')).toContainText('Your enquiry has been saved.');
});
test('network failure and malformed success do not claim saved', async ({ page }) => {
  let count = 0;
  await page.route('**/api/contact', route => ++count === 1 ? route.abort() : route.fulfill({ json: { ok: true } }));
  await ready(page);
  await fill(page);
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('[data-contact-submit]').click();
    await expect(page.locator('#contact-error')).toContainText('We could not confirm');
    await expect(page.locator('#contact-status')).toHaveText('Your notes are still here.');
    await expect(page.locator('[data-contact-submit]')).toBeEnabled();
  }
});
test('backend throttling disables immediate retries', async ({ page }) => {
  await page.route('**/api/contact', route => route.fulfill({ status: 429, json: { ok: false, error: 'Too many attempts. Please wait a minute before trying again.' } }));
  await ready(page);
  await fill(page);
  await page.locator('[data-contact-submit]').click();
  await expect(page.locator('#contact-error')).toContainText('Too many attempts');
  await expect(page.locator('[data-contact-submit]')).toBeDisabled();
});
test('unconfigured form stays disabled without requesting a third-party widget', async ({ page }) => {
  let widgetRequests = 0;
  await page.route('**/api/contact-config', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.route('https://challenges.cloudflare.com/**', route => { widgetRequests++; return route.abort(); });
  await page.goto('/');
  await expect(page.locator('#contact-status')).toContainText('currently unavailable');
  await expect(page.locator('[data-contact-submit]')).toBeDisabled();
  expect(widgetRequests).toBe(0);
});
test('expired and failed security checks disable sending', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.mockTurnstileOptions['expired-callback']());
  await expect(page.locator('[data-contact-submit]')).toBeDisabled();
  await expect(page.locator('#contact-status')).toContainText('new security check');
  await page.evaluate(() => window.mockTurnstileOptions['error-callback']());
  await expect(page.locator('#contact-status')).toContainText('security check is unavailable');
});
test('no JavaScript preserves navigation and an honest email fallback', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('noscript .no-js-note')).toBeVisible();
  await expect(page.locator('noscript .no-js-note')).toContainText('secure form needs JavaScript');
  await expect(page.locator('[data-contact-submit]')).toBeDisabled();
  await page.locator('.portfolio-card').first().click();
  await expect(page).toHaveURL(/examples\/beach\/index.html$/);
  await page.locator('a[href="../../index.html"]').first().click();
  await expect(page).toHaveURL(/\/index.html$/);
  await context.close();
});
test('normal motion intro, carousel pause and touch navigation remain functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const skip = page.locator('[data-intro-skip]');
  if (await skip.isVisible()) await skip.click();
  await expect(page.locator('html')).not.toHaveClass(/intro-pending|intro-running/);
  await page.locator('[data-carousel-toggle]').click();
  await expect(page.locator('[data-carousel-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-carousel-toggle]')).toHaveText('Play carousel');
  await page.screenshot({ path: 'qa/screenshots/desktop-motion.png' });
});
test('mobile touch form submission and modal close', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await mockSecurity(page);
  await page.route('**/api/contact', route => route.fulfill({ status: 201, json: { ok: true, reference: 'touch_saved' } }));
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('.portfolio-card').first().tap();
  await expect(page.locator('[data-portfolio-browser]')).toBeVisible();
  await page.locator('[data-browser-close]').tap();
  await fill(page);
  await page.locator('[data-contact-submit]').tap();
  await expect(page.locator('#contact-status')).toContainText('Your enquiry has been saved.');
  await context.close();
});

test('form accessibility, keyboard submission and error/success screenshots', async ({ page }) => {
  await ready(page);
  await page.locator('#enquiry').scrollIntoViewIfNeeded();
  let results = await new AxeBuilder({ page }).include('#enquiry').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.locator('[data-contact-submit]').click();
  await page.locator('#enquiry').screenshot({ path: 'qa/screenshots/validation-desktop.png' });
  results = await new AxeBuilder({ page }).include('#enquiry').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.route('**/api/contact', route => route.fulfill({ status: 202, json: { ok: true, reference: 'keyboard_saved' } }));
  await fill(page);
  await page.locator('[data-contact-submit]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contact-status')).toBeFocused();
  await page.locator('#enquiry').screenshot({ path: 'qa/screenshots/success-desktop.png' });
});
