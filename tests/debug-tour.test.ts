// Debug test to see what's rendering
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123'
};

test('Debug: Check what renders on page', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button:has-text("Sign in")')
  ]);

  // Wait a bit
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'debug-page.png', fullPage: true });

  // Check what elements exist
  const allTestIds = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-testid]');
    return Array.from(elements).map(el => el.getAttribute('data-testid'));
  });

  console.log('Found test IDs:', allTestIds);

  // Check for tour elements specifically
  const hasTourControl = await page.locator('[data-testid="tour-control"]').count();
  const hasTourCompleted = await page.locator('[data-testid="tour-completed"]').count();

  console.log('tour-control count:', hasTourControl);
  console.log('tour-completed count:', hasTourCompleted);

  // Check localStorage
  const localStorage = await page.evaluate(() => {
    return JSON.stringify(window.localStorage);
  });
  console.log('localStorage:', localStorage);
});
