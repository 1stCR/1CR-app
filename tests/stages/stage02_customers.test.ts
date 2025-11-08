// tests/stages/stage02_customers.test.ts
/**
 * Stage 2: Customer Management Tests
 *
 * Tests customer management features:
 * - Customer CRUD operations
 * - Customer ID generation
 * - Residential vs Commercial customer types
 * - Search and filtering
 * - Form validation
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123'
};

// Helper to create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://frbulthijdpkeqdphnxc.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
);

// Helper functions
async function login(page: Page) {
  await page.goto('/login');

  // Wait for page to load
  await page.waitForSelector('[name="email"]');

  // Fill in credentials
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);

  // Click sign in and wait for navigation
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button:has-text("Sign in")')
  ]);

  // Verify we're logged in (should see the dashboard or nav)
  // Give it extra time as Supabase auth can be slow
  await page.waitForTimeout(1000);
}

async function navigateToCustomers(page: Page) {
  await page.click('a[href="/customers"]');
  await page.waitForURL('/customers');
}

async function cleanupTestCustomers() {
  // Clean up any test customers before running tests
  await supabase
    .from('customers')
    .delete()
    .ilike('email', '%@test.example.com');
}

// Main test suite
test.describe('Stage 2: Customer Management', () => {

  test.beforeAll(async () => {
    // Create test user if doesn't exist (for first-time setup)
    // Note: In production tests, you'd want to use a test database
    try {
      const { error } = await supabase.auth.signUp({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
      // Ignore error if user already exists
      if (error && !error.message.includes('already registered')) {
        console.log('Note: Test user setup:', error.message);
      }
    } catch (e) {
      // Ignore errors - user might already exist
    }

    // Clean up test data before running
    await cleanupTestCustomers();
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test.describe('Customer List View', () => {

    test('@critical Should display customer list page', async ({ page }) => {
      await navigateToCustomers(page);

      // Check page elements
      await expect(page.locator('h1:text("Customers")')).toBeVisible();
      await expect(page.locator('text=Manage your customer database')).toBeVisible();
      await expect(page.locator('a[href="/customers/new"]')).toBeVisible();
    });

    test('Should show empty state when no customers', async ({ page }) => {
      await navigateToCustomers(page);

      // If no customers, should show helpful message
      const noCustomersMessage = page.locator('text=No customers yet');
      const addFirstCustomerBtn = page.locator('text=Add Your First Customer');

      // Check if either message appears (depends on if you have existing customers)
      const count = await page.locator('tbody tr').count();
      if (count === 0) {
        await expect(noCustomersMessage).toBeVisible();
        await expect(addFirstCustomerBtn).toBeVisible();
      }
    });

    test('@smoke Should have search functionality', async ({ page }) => {
      await navigateToCustomers(page);

      // Search box should be visible
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('Should have customer type filters', async ({ page }) => {
      await navigateToCustomers(page);

      // Filter buttons
      await expect(page.locator('button:has-text("All")')).toBeVisible();
      await expect(page.locator('button:has-text("Residential")')).toBeVisible();
      await expect(page.locator('button:has-text("Commercial")')).toBeVisible();
    });
  });

  test.describe('Create Residential Customer', () => {

    test('@critical Should create a residential customer', async ({ page }) => {
      await navigateToCustomers(page);

      // Click add customer
      await page.click('a[href="/customers/new"]');
      await page.waitForURL('/customers/new');

      // Fill in residential customer form
      await page.fill('[name="first_name"]', 'John');
      await page.fill('[name="last_name"]', 'Doe');
      await page.fill('[name="phone_primary"]', '307-555-1234');
      await page.fill('[name="email"]', 'john.doe@test.example.com');
      await page.fill('[name="address"]', '123 Main St');
      await page.fill('[name="city"]', 'Mandan');
      await page.fill('[name="state"]', 'ND');
      await page.fill('[name="zip"]', '58554');

      // Save
      await page.click('button:has-text("Save Customer")');

      // Should redirect to customer list or detail
      await page.waitForURL(/\/(customers|customers\/.+)/, { timeout: 10000 });

      // Verify customer was created
      await expect(page.locator('text=John Doe')).toBeVisible();
    });

    test('Should auto-generate customer ID', async ({ page }) => {
      await navigateToCustomers(page);
      await page.click('a[href="/customers/new"]');
      await page.waitForURL('/customers/new');

      // Fill minimal required fields
      await page.fill('[name="first_name"]', 'Jane');
      await page.fill('[name="last_name"]', 'Smith');
      await page.fill('[name="phone_primary"]', '307-555-5678');
      await page.fill('[name="email"]', 'jane.smith@test.example.com');

      // Save
      await page.click('button:has-text("Save Customer")');
      await page.waitForURL(/\/(customers|customers\/.+)/, { timeout: 10000 });

      // Check that customer ID was generated (C-XXXX format)
      const customerIdPattern = /C-\d{4}/;
      const customerIdElement = await page.locator('text=/C-\\d{4}/').first();
      await expect(customerIdElement).toBeVisible();
    });

    test('Should validate required fields', async ({ page }) => {
      await navigateToCustomers(page);
      await page.click('a[href="/customers/new"]');
      await page.waitForURL('/customers/new');

      // Try to save without filling required fields
      await page.click('button:has-text("Save Customer")');

      // Should stay on the same page or show validation errors
      // (Implementation may vary - adjust based on your validation approach)
      const currentUrl = page.url();
      expect(currentUrl).toContain('/customers/new');
    });
  });

  test.describe('Create Commercial Customer', () => {

    test('@critical Should create a commercial customer', async ({ page }) => {
      await navigateToCustomers(page);
      await page.click('a[href="/customers/new"]');
      await page.waitForURL('/customers/new');

      // Select Commercial type
      const commercialOption = page.locator('input[value="Commercial"]');
      if (await commercialOption.count() > 0) {
        await commercialOption.click();
      }

      // Fill in commercial customer form
      await page.fill('[name="business_name"]', 'ABC Plumbing');
      await page.fill('[name="first_name"]', 'Bob');
      await page.fill('[name="last_name"]', 'Manager');
      await page.fill('[name="phone_primary"]', '307-555-9999');
      await page.fill('[name="email"]', 'bob@abcplumbing.test.example.com');
      await page.fill('[name="address"]', '456 Business Ave');
      await page.fill('[name="city"]', 'Bismarck');
      await page.fill('[name="state"]', 'ND');
      await page.fill('[name="zip"]', '58501');

      // Save
      await page.click('button:has-text("Save Customer")');
      await page.waitForURL(/\/(customers|customers\/.+)/, { timeout: 10000 });

      // Verify commercial customer was created
      await expect(page.locator('text=ABC Plumbing')).toBeVisible();
    });
  });

  test.describe('Customer Search and Filter', () => {

    // DEPENDENCY: Requires at least one customer to exist for meaningful search results
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:136 tests/stages/stage02_customers.test.ts:234 --project=chromium --workers=1
    test('Should search customers by name', async ({ page }) => {
      await navigateToCustomers(page);

      // Enter search term
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('Doe');

      // Wait for debounce
      await page.waitForTimeout(500);

      // Should only show matching customers
      const rows = page.locator('tbody tr');
      const count = await rows.count();

      if (count > 0) {
        // At least one row should contain "Doe"
        await expect(rows.first()).toContainText('Doe');
      }
    });

    test('Should filter by customer type', async ({ page }) => {
      await navigateToCustomers(page);

      // Click Residential filter
      await page.click('button:has-text("Residential")');

      // Wait for filter to apply
      await page.waitForTimeout(300);

      // Check that button is active (has primary color)
      const residentialBtn = page.locator('button:has-text("Residential")');
      await expect(residentialBtn).toHaveClass(/bg-primary/);
    });

    test('Should show customer count', async ({ page }) => {
      await navigateToCustomers(page);

      // Should display count in "All (X)" button
      const allButton = page.locator('button:has-text("All")');
      await expect(allButton).toBeVisible();
    });
  });

  test.describe('Customer Detail View', () => {

    // DEPENDENCY: Requires at least one customer to exist
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:136 tests/stages/stage02_customers.test.ts:279 --project=chromium --workers=1
    test('Should view customer details', async ({ page }) => {
      await navigateToCustomers(page);

      // Click on first customer "View" link
      const viewLink = page.locator('a:has-text("View")').first();
      if (await viewLink.count() > 0) {
        await viewLink.click();

        // Should navigate to detail page
        await page.waitForURL(/\/customers\/[a-f0-9-]+$/);

        // Should show customer information
        await expect(page.locator('text=/C-\\d{4}/')).toBeVisible();
      }
    });
  });

  test.describe('Edit Customer', () => {

    // DEPENDENCY: Requires at least one customer to exist
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:136 tests/stages/stage02_customers.test.ts:298 --project=chromium --workers=1
    test('Should edit existing customer', async ({ page }) => {
      await navigateToCustomers(page);

      // Click on first customer edit link
      const editLink = page.locator('a[href*="/edit"]').first();
      if (await editLink.count() > 0) {
        await editLink.click();

        // Should navigate to edit page
        await page.waitForURL(/\/customers\/[a-f0-9-]+\/edit$/);

        // Update phone number
        const phoneInput = page.locator('[name="phone_primary"]');
        await phoneInput.fill('307-555-0000');

        // Save changes
        await page.click('button:has-text("Save Customer")');

        // Should navigate away from edit page
        await page.waitForURL(/\/customers(?:\/[a-f0-9-]+)?$/);

        // Verify change was saved
        await expect(page.locator('text=307-555-0000')).toBeVisible();
      }
    });

    test('Should preserve customer ID when editing', async ({ page }) => {
      await navigateToCustomers(page);

      // Get the first customer ID
      const customerIdElement = page.locator('text=/C-\\d{4}/').first();
      if (await customerIdElement.count() > 0) {
        const originalId = await customerIdElement.textContent();

        // Edit the customer
        const editLink = page.locator('a[href*="/edit"]').first();
        await editLink.click();
        await page.waitForURL(/\/customers\/[a-f0-9-]+\/edit$/);

        // Make a change
        const cityInput = page.locator('[name="city"]');
        await cityInput.fill('Updated City');

        // Save
        await page.click('button:has-text("Save Customer")');
        await page.waitForURL(/\/customers(?:\/[a-f0-9-]+)?$/);

        // Verify ID hasn't changed
        await expect(page.locator(`text=${originalId}`)).toBeVisible();
      }
    });
  });

  test.describe('Delete Customer', () => {

    test('Should delete a customer', async ({ page }) => {
      await navigateToCustomers(page);

      // Create a test customer to delete
      await page.click('a[href="/customers/new"]');
      await page.fill('[name="first_name"]', 'ToDelete');
      await page.fill('[name="last_name"]', 'User');
      await page.fill('[name="phone_primary"]', '307-555-DELETE');
      await page.fill('[name="email"]', 'delete@test.example.com');
      await page.click('button:has-text("Save Customer")');
      await page.waitForURL(/\/(customers|customers\/.+)/);

      // Go back to list
      await navigateToCustomers(page);

      // Find and delete the test customer
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has(svg):near(:text("ToDelete User"))').first();
      if (await deleteButton.count() > 0) {
        // Setup dialog handler before clicking delete
        page.on('dialog', dialog => dialog.accept());

        await deleteButton.click();

        // Wait for deletion
        await page.waitForTimeout(1000);

        // Verify customer was deleted
        await expect(page.locator('text=ToDelete User')).not.toBeVisible();
      }
    });
  });

  test.describe('Database Integration', () => {

    test('Should persist customer to database', async ({ page }) => {
      await navigateToCustomers(page);

      // Create customer via UI
      await page.click('a[href="/customers/new"]');
      await page.fill('[name="first_name"]', 'Database');
      await page.fill('[name="last_name"]', 'Test');
      await page.fill('[name="phone_primary"]', '307-555-DB01');
      await page.fill('[name="email"]', 'dbtest@test.example.com');
      await page.click('button:has-text("Save Customer")');
      await page.waitForURL(/\/(customers|customers\/.+)/);

      // Query database directly
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('email', 'dbtest@test.example.com');

      // Verify customer exists in database
      expect(customers).not.toBeNull();
      expect(customers?.length).toBeGreaterThan(0);
      expect(customers?.[0].first_name).toBe('Database');
      expect(customers?.[0].last_name).toBe('Test');
    });

    test('Should generate sequential customer IDs', async ({ page }) => {
      // Get current max customer ID from database
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('customer_id')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastId = existingCustomers?.[0]?.customer_id;

      // Create new customer
      await navigateToCustomers(page);
      await page.click('a[href="/customers/new"]');
      await page.fill('[name="first_name"]', 'Sequential');
      await page.fill('[name="last_name"]', 'ID');
      await page.fill('[name="phone_primary"]', '307-555-SEQ1');
      await page.fill('[name="email"]', 'sequential@test.example.com');
      await page.click('button:has-text("Save Customer")');
      await page.waitForURL(/\/(customers|customers\/.+)/);

      // Get new customer from database
      const { data: newCustomers } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('email', 'sequential@test.example.com');

      const newId = newCustomers?.[0]?.customer_id;

      // Verify new ID follows pattern
      expect(newId).toMatch(/^C-\d{4}$/);

      // If we had a previous ID, new one should be higher
      if (lastId && newId) {
        const lastNum = parseInt(lastId.split('-')[1]);
        const newNum = parseInt(newId.split('-')[1]);
        expect(newNum).toBeGreaterThan(lastNum);
      }
    });
  });

  test.afterAll(async () => {
    // Clean up test data after running
    await cleanupTestCustomers();
  });
});
