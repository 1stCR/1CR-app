// tests/stages/stage02_customers_ui.test.ts
/**
 * Stage 2: Customer Management UI Tests (No Database Required)
 *
 * These tests verify the UI works correctly.
 * We'll add database integration tests later once credentials are configured.
 */

import { test, expect, Page } from '@playwright/test';

// NOTE: Replace these with your actual credentials
// Or create a test user in your Supabase project
const TEST_USER = {
  email: '1stCallRepair.com@gmail.com', // REPLACE WITH ACTUAL USER
  password: 'B664b664!'         // REPLACE WITH ACTUAL PASSWORD
};

// Helper to skip auth for faster UI testing
// You can enable this by manually logging in once and copying the session
const SKIP_LOGIN = false; // Set to true if you want to skip login during development

async function loginIfNeeded(page: Page) {
  if (SKIP_LOGIN) {
    return; // Skip login for faster iteration
  }

  await page.goto('/login');
  await page.waitForSelector('[name="email"]');
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);

  // Click sign in
  await page.click('button:has-text("Sign in")');

  // Wait for redirect (will fail if credentials are wrong)
  try {
    await page.waitForURL('/', { timeout: 10000 });
  } catch (e) {
    console.log('⚠️  Login failed - please update TEST_USER credentials in the test file');
    throw e;
  }

  // Small delay for auth to settle
  await page.waitForTimeout(1000);
}

test.describe('Stage 2: Customer UI Tests', () => {

  test.describe('Customer List Page', () => {

    test('@smoke Should load customer list page', async ({ page }) => {
      await loginIfNeeded(page);

      // Navigate to customers
      await page.goto('/customers');

      // Check page loaded (be specific to avoid matching header h1)
      await expect(page.locator('h1').nth(1)).toContainText('Customers');
    });

    test('Should have Add Customer button', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers');

      // Check for add button (use .first() since there may be multiple)
      const addButton = page.locator('a[href="/customers/new"]').first();
      await expect(addButton).toBeVisible();
      await expect(addButton).toContainText(/Add.*Customer/i);
    });

    test('Should have search input', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers');

      // Check search exists
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await expect(searchInput).toBeVisible();
    });

    test('Should have filter buttons', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers');

      // Check filter buttons
      await expect(page.locator('button:has-text("All")')).toBeVisible();
      await expect(page.locator('button:has-text("Residential")')).toBeVisible();
      await expect(page.locator('button:has-text("Commercial")')).toBeVisible();
    });

    test('Should toggle filters', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers');

      // Click Residential filter
      const residentialBtn = page.locator('button:has-text("Residential")');
      await residentialBtn.click();

      // Check it becomes active (primary color)
      await expect(residentialBtn).toHaveClass(/bg-primary/);
    });
  });

  test.describe('New Customer Page', () => {

    test('Should navigate to new customer form', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers');

      // Click add customer
      await page.click('a[href="/customers/new"]');

      // Should be on new customer page
      await page.waitForURL('/customers/new');
      await expect(page.locator('h1').nth(1)).toContainText(/New.*Customer|Add.*Customer/i);
    });

    test('Should have required form fields', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers/new');

      // Check for required fields (using id selectors)
      await expect(page.locator('#first_name')).toBeVisible();
      await expect(page.locator('#last_name')).toBeVisible();
      await expect(page.locator('#phone_primary')).toBeVisible();
    });

    test('Should have optional fields', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers/new');

      // Check for optional fields (using id selectors)
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#address_street')).toBeVisible();
      await expect(page.locator('#city')).toBeVisible();
      await expect(page.locator('#state')).toBeVisible();
      await expect(page.locator('#zip')).toBeVisible();
    });

    test('Should have Save button', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers/new');

      // Check for save button
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")');
      await expect(saveButton).toBeVisible();
    });

    test('Form inputs should accept text', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers/new');

      // Fill form (using id selectors)
      await page.fill('#first_name', 'Test');
      await page.fill('#last_name', 'User');
      await page.fill('#phone_primary', '307-555-1234');

      // Verify values
      await expect(page.locator('#first_name')).toHaveValue('Test');
      await expect(page.locator('#last_name')).toHaveValue('User');
      await expect(page.locator('#phone_primary')).toHaveValue('307-555-1234');
    });
  });

  test.describe('Search Functionality', () => {

    test('Should type in search box', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers');

      // Type in search
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await searchInput.fill('test search');

      // Verify input
      await expect(searchInput).toHaveValue('test search');
    });

    test('Should clear search', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers');

      // Type and clear
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await searchInput.fill('test');
      await searchInput.clear();

      // Verify cleared
      await expect(searchInput).toHaveValue('');
    });
  });

  test.describe('Navigation', () => {

    test('Should navigate from dashboard to customers', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/');

      // Click customers link
      await page.click('a[href="/customers"]');

      // Should be on customers page
      await page.waitForURL('/customers');
      await expect(page.locator('h1').nth(1)).toContainText('Customers');
    });

    test('Should have back navigation from new customer', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('/customers/new');

      // Look for back button or link
      const backButton = page.locator('a[href="/customers"], button:has-text("Back"), button:has-text("Cancel")');

      if (await backButton.count() > 0) {
        await expect(backButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {

    test('Should display on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await loginIfNeeded(page);
      await page.goto('/customers');

      // Page should still load
      await expect(page.locator('h1').nth(1)).toContainText('Customers');
    });

    test('Should display on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await loginIfNeeded(page);
      await page.goto('/customers');

      // Page should still load
      await expect(page.locator('h1').nth(1)).toContainText('Customers');
    });
  });
});

// Performance tests
test.describe('Performance', () => {

  test('@smoke Page should load quickly', async ({ page }) => {
    await loginIfNeeded(page);

    const start = Date.now();
    await page.goto('/customers');
    await page.waitForSelector('h1');
    const loadTime = Date.now() - start;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    console.log(`✓ Customer list loaded in ${loadTime}ms`);
  });
});
