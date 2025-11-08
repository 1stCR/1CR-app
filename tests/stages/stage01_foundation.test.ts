// tests/stages/stage01_foundation.test.ts
/**
 * Stage 1: Foundation & Auth Tests
 * 
 * Tests the basic foundation of the application:
 * - Database connectivity
 * - Authentication flow
 * - Protected routes
 * - Session management
 * - Basic table structure
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123',
  name: 'Test User'
};

const BASE_URL = process.env.BASE_URL || 'https://frbulthijdpkeqdphnxc.supabase.co';

// Helper to create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://frbulthijdpkeqdphnxc.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
);

// Helper functions
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);
  await page.click('button:text("Login")');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('button:text("Logout")');
  await page.waitForURL('/login');
}

// Main test suite
test.describe('Stage 1: Foundation & Auth', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
  });

  test.describe('Database Connection', () => {
    
    test('@critical Should connect to Supabase', async ({ page }) => {
      // Test API health endpoint
      const response = await page.request.get('/api/health');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('database', 'connected');
      expect(data).toHaveProperty('timestamp');
    });

    test('@critical Should verify all required tables exist', async () => {
      const requiredTables = [
        'customers',
        'contacts',
        'jobs',
        'job_history',
        'parts_master',
        'parts_transactions',
        'parts_cross_reference',
        'parts_orders',
        'tour_logs',
        'shipments',
        'model_database',
        'common_issues',
        'storage_locations',
        'suppliers',
        'settings'
      ];

      for (const table of requiredTables) {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        // Error should not be "table does not exist"
        if (error) {
          expect(error.message).not.toContain('does not exist');
        }
      }
    });

    test('Should verify ID sequence functions exist', async () => {
      // Check that ID generation functions are in place
      const { data: customers } = await supabase.rpc('get_next_customer_id');
      expect(customers).toMatch(/^C-\d{4}$/);
      
      const { data: jobs } = await supabase.rpc('get_next_job_id');
      expect(jobs).toMatch(/^J-\d{4}$/);
    });
  });

  test.describe('Authentication Flow', () => {
    
    test('@critical Should display login page', async ({ page }) => {
      await page.goto('/login');
      
      // Check all login elements present
      await expect(page.locator('h1:text("Appliance Man Dan")')).toBeVisible();
      await expect(page.locator('text=Field Service Management')).toBeVisible();
      await expect(page.locator('[name="email"]')).toBeVisible();
      await expect(page.locator('[name="password"]')).toBeVisible();
      await expect(page.locator('button:text("Login")')).toBeVisible();
    });

    test('@critical Should handle invalid login', async ({ page }) => {
      await page.goto('/login');
      
      // Try invalid credentials
      await page.fill('[name="email"]', 'invalid@example.com');
      await page.fill('[name="password"]', 'wrongpassword');
      await page.click('button:text("Login")');
      
      // Should show error
      await expect(page.locator('text=/Invalid credentials|Authentication failed/i')).toBeVisible();
      
      // Should stay on login page
      await expect(page).toHaveURL('/login');
    });

    test('@critical Should handle valid login', async ({ page }) => {
      await page.goto('/login');
      
      // Enter valid credentials
      await page.fill('[name="email"]', TEST_USER.email);
      await page.fill('[name="password"]', TEST_USER.password);
      
      // Click login
      await Promise.all([
        page.waitForNavigation(),
        page.click('button:text("Login")')
      ]);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      
      // Should show user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Should display user name or email
      await expect(page.locator(`text=${TEST_USER.email}`)).toBeVisible();
    });

    test('@critical Should maintain session', async ({ page, context }) => {
      // Login
      await login(page);
      
      // Open new tab
      const newPage = await context.newPage();
      await newPage.goto('/dashboard');
      
      // Should still be logged in
      await expect(newPage).toHaveURL('/dashboard');
      await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible();
      
      await newPage.close();
    });

    test('@critical Should handle logout', async ({ page }) => {
      // Login first
      await login(page);
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('button:text("Logout")');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect back to login
      await expect(page).toHaveURL('/login');
    });

    test('Should handle session expiry gracefully', async ({ page }) => {
      await login(page);
      
      // Simulate session expiry by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to navigate
      await page.goto('/jobs');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Should show session expired message
      await expect(page.locator('text=/Session expired|Please login again/i')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    
    test('@critical Should protect dashboard route', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });

    test('@critical Should protect customers route', async ({ page }) => {
      await page.goto('/customers');
      await expect(page).toHaveURL('/login');
    });

    test('@critical Should protect jobs route', async ({ page }) => {
      await page.goto('/jobs');
      await expect(page).toHaveURL('/login');
    });

    test('@critical Should protect parts route', async ({ page }) => {
      await page.goto('/parts');
      await expect(page).toHaveURL('/login');
    });

    test('@critical Should protect tour route', async ({ page }) => {
      await page.goto('/tour');
      await expect(page).toHaveURL('/login');
    });

    test('Should allow access after login', async ({ page }) => {
      await login(page);
      
      // Test each protected route
      const routes = ['/dashboard', '/customers', '/jobs', '/parts', '/tour'];
      
      for (const route of routes) {
        await page.goto(route);
        await expect(page).toHaveURL(route);
      }
    });
  });

  test.describe('Navigation', () => {
    
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('@smoke Should display main navigation', async ({ page }) => {
      // Desktop navigation
      if (await page.viewportSize()?.width! >= 768) {
        await expect(page.locator('nav[data-testid="main-nav"]')).toBeVisible();
        await expect(page.locator('a:text("Dashboard")')).toBeVisible();
        await expect(page.locator('a:text("Customers")')).toBeVisible();
        await expect(page.locator('a:text("Jobs")')).toBeVisible();
        await expect(page.locator('a:text("Parts")')).toBeVisible();
        await expect(page.locator('a:text("Tour")')).toBeVisible();
      }
    });

    test('Should navigate between pages', async ({ page }) => {
      // Click Customers
      await page.click('a:text("Customers")');
      await expect(page).toHaveURL('/customers');
      await expect(page.locator('h1:text("Customers")')).toBeVisible();
      
      // Click Jobs
      await page.click('a:text("Jobs")');
      await expect(page).toHaveURL('/jobs');
      await expect(page.locator('h1:text("Jobs")')).toBeVisible();
      
      // Click Parts
      await page.click('a:text("Parts")');
      await expect(page).toHaveURL('/parts');
      await expect(page.locator('h1:text("Parts")')).toBeVisible();
    });

    test('Should highlight active nav item', async ({ page }) => {
      await page.goto('/customers');
      
      const customersLink = page.locator('a:text("Customers")');
      await expect(customersLink).toHaveClass(/active|selected|current/);
    });
  });

  test.describe('Initial Data Setup', () => {
    
    test('Should have default settings', async () => {
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      expect(settings).toHaveProperty('labor_rate', 75.00);
      expect(settings).toHaveProperty('service_fee', 85.00);
      expect(settings).toHaveProperty('tax_rate', 0.08);
      expect(settings).toHaveProperty('business_name', 'Appliance Man Dan');
    });

    test('Should have storage locations configured', async () => {
      const { data: locations } = await supabase
        .from('storage_locations')
        .select('*');
      
      expect(locations?.length).toBeGreaterThan(0);
      
      // Check for truck location
      const truck = locations?.find(l => l.location_type === 'Vehicle');
      expect(truck).toBeDefined();
    });

    test('Should have suppliers configured', async () => {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('*')
        .eq('active', true);
      
      expect(suppliers?.length).toBeGreaterThan(0);
      
      // Check for at least one supplier
      expect(suppliers?.[0]).toHaveProperty('supplier_name');
      expect(suppliers?.[0]).toHaveProperty('priority');
    });
  });

  test.describe('Error Handling', () => {
    
    test('Should handle network errors gracefully', async ({ page, context }) => {
      // Login first
      await login(page);
      
      // Go offline
      await context.setOffline(true);
      
      // Try to load a page
      await page.goto('/customers').catch(() => {});
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Go back online
      await context.setOffline(false);
      
      // Should reconnect
      await page.reload();
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('Should handle API errors', async ({ page }) => {
      await login(page);
      
      // Intercept API call and return error
      await page.route('/api/customers', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.goto('/customers');
      
      // Should show error message
      await expect(page.locator('text=/Error loading|Something went wrong/i')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    
    test('@smoke Should load login page quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Under 3 seconds
    });

    test('@smoke Should complete login quickly', async ({ page }) => {
      await page.goto('/login');
      
      const startTime = Date.now();
      
      await page.fill('[name="email"]', TEST_USER.email);
      await page.fill('[name="password"]', TEST_USER.password);
      await page.click('button:text("Login")');
      await page.waitForURL('/dashboard');
      
      const loginTime = Date.now() - startTime;
      
      expect(loginTime).toBeLessThan(5000); // Under 5 seconds
    });
  });

  test.describe('Accessibility', () => {
    
    test('Should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');
      
      // Check form has proper labels
      const emailInput = page.locator('[name="email"]');
      const emailLabel = await emailInput.getAttribute('aria-label') || 
                        await page.locator(`label[for="${await emailInput.getAttribute('id')}"]`).textContent();
      expect(emailLabel).toBeTruthy();
      
      const passwordInput = page.locator('[name="password"]');
      const passwordLabel = await passwordInput.getAttribute('aria-label') ||
                           await page.locator(`label[for="${await passwordInput.getAttribute('id')}"]`).textContent();
      expect(passwordLabel).toBeTruthy();
    });

    test('Should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');
      
      // Tab through form
      await page.keyboard.press('Tab'); // Focus email
      await expect(page.locator('[name="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus password
      await expect(page.locator('[name="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus login button
      await expect(page.locator('button:text("Login")')).toBeFocused();
    });
  });
});

// Test report summary
test.afterAll(async () => {
  console.log('✅ Stage 1: Foundation & Auth tests completed');
  console.log('Next: Run Stage 2: Customer Management tests');
});
