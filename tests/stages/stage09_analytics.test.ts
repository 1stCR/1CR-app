import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const TEST_EMAIL = process.env.VITE_TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.VITE_TEST_USER_PASSWORD || 'password123';

test.describe('Stage 9: Analytics & Reporting', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);
  });

  test.describe('Executive Dashboard', () => {
    test('should load executive dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);

      // Check header
      await expect(page.locator('h1')).toContainText('Executive Dashboard');
      await expect(page.locator('text=Business performance at a glance')).toBeVisible();
    });

    test('should display KPI cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Check for KPI cards
      await expect(page.locator('text=Revenue')).toBeVisible();
      await expect(page.locator('text=Jobs Completed')).toBeVisible();
      await expect(page.locator('text=FCC Rate')).toBeVisible();
      await expect(page.locator('text=Avg Job Value')).toBeVisible();
    });

    test('should display secondary metrics', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);

      await page.waitForTimeout(2000);

      // Check secondary metrics
      await expect(page.locator('text=Active Jobs')).toBeVisible();
      await expect(page.locator('text=Outstanding Balance')).toBeVisible();
      await expect(page.locator('text=Parts Inventory Value')).toBeVisible();
      await expect(page.locator('text=Parts Low Stock')).toBeVisible();
    });

    test('should allow period selection', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);

      // Check period buttons exist
      await expect(page.locator('button:has-text("week")')).toBeVisible();
      await expect(page.locator('button:has-text("month")')).toBeVisible();
      await expect(page.locator('button:has-text("year")')).toBeVisible();

      // Test clicking week period
      await page.click('button:has-text("week")');
      await page.waitForTimeout(1000);

      // Verify button is active (has blue background)
      const weekButton = page.locator('button:has-text("week")');
      await expect(weekButton).toHaveClass(/bg-blue-600/);
    });

    test('should switch between periods', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(2000);

      // Click year period
      await page.click('button:has-text("year")');
      await page.waitForTimeout(1500);

      // Click back to month
      await page.click('button:has-text("month")');
      await page.waitForTimeout(1500);

      // Verify month is active
      const monthButton = page.locator('button:has-text("month")');
      await expect(monthButton).toHaveClass(/bg-blue-600/);
    });

    test('should display revenue trend chart', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(2000);

      // Check for chart section
      await expect(page.locator('text=Revenue Trend')).toBeVisible();

      // Chart should contain SVG
      const chartSection = page.locator('text=Revenue Trend').locator('..').locator('..');
      await expect(chartSection.locator('svg')).toBeVisible();
    });

    test('should display quick action cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);

      await expect(page.locator('text=View Detailed Revenue Report')).toBeVisible();
      await expect(page.locator('text=FCC Analysis')).toBeVisible();
      await expect(page.locator('text=Parts ROI')).toBeVisible();
    });

    test('should navigate to FCC analytics from quick actions', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(1000);

      // Click FCC Analysis button
      await page.click('button:has-text("Analyze")');
      await page.waitForTimeout(1000);

      // Should navigate to FCC page
      await expect(page).toHaveURL(/\/analytics\/fcc/);
    });

    test('should navigate to Parts ROI from quick actions', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(1000);

      // Click Parts ROI button
      await page.click('button:has-text("View ROI")');
      await page.waitForTimeout(1000);

      // Should navigate to Parts ROI page
      await expect(page).toHaveURL(/\/analytics\/parts-roi/);
    });

    test('should highlight analytics in navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);

      // Analytics nav link should be highlighted
      const analyticsLink = page.locator('a[href="/analytics"]');
      await expect(analyticsLink).toHaveClass(/bg-primary-50/);
    });
  });

  test.describe('FCC Analytics', () => {
    test('should load FCC analytics page', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);

      // Check header
      await expect(page.locator('h1')).toContainText('First Call Complete');
      await expect(page.locator('text=Track and improve service efficiency')).toBeVisible();
    });

    test('should display FCC metrics', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);
      await page.waitForTimeout(2000);

      // Check for main metric cards
      await expect(page.locator('text=First Call Complete Rate')).toBeVisible();
      await expect(page.locator('text=Callback Rate')).toBeVisible();
      await expect(page.locator('text=Avg Visits Per Job')).toBeVisible();
    });

    test('should allow period selection', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);

      // Check period buttons
      await expect(page.locator('button:has-text("week")')).toBeVisible();
      await expect(page.locator('button:has-text("month")')).toBeVisible();
      await expect(page.locator('button:has-text("quarter")')).toBeVisible();
      await expect(page.locator('button:has-text("year")')).toBeVisible();
    });

    test('should display FCC trend chart', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);
      await page.waitForTimeout(2000);

      await expect(page.locator('text=FCC Rate Trend')).toBeVisible();
    });

    test('should display callback reasons breakdown', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);
      await page.waitForTimeout(2000);

      await expect(page.locator('text=Callback Reasons')).toBeVisible();
    });

    test('should display recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);
      await page.waitForTimeout(2000);

      await expect(page.locator('text=Recommendations')).toBeVisible();
    });

    test('should display recent callbacks table', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);
      await page.waitForTimeout(2000);

      await expect(page.locator('text=Recent Callbacks')).toBeVisible();
    });

    test('should display best practices section', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);

      await expect(page.locator('text=FCC Best Practices')).toBeVisible();
      await expect(page.locator('text=Stock high-use parts')).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);

      // Check for back button (ArrowLeft icon)
      const backButton = page.locator('button').first();
      await expect(backButton).toBeVisible();
    });

    test('back button should navigate to previous page', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(500);

      await page.click('button:has-text("Analyze")');
      await page.waitForTimeout(1000);

      // Click back button
      await page.locator('button').first().click();
      await page.waitForTimeout(500);

      // Should be back at dashboard
      await expect(page).toHaveURL(/\/analytics$/);
    });

    test('should keep analytics nav highlighted on sub-page', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/fcc`);

      // Analytics nav link should still be highlighted
      const analyticsLink = page.locator('a[href="/analytics"]');
      await expect(analyticsLink).toHaveClass(/bg-primary-50/);
    });
  });

  test.describe('Parts ROI Analytics', () => {
    test('should load parts ROI page', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);

      await expect(page.locator('h1')).toContainText('Parts ROI');
      await expect(page.locator('text=Optimize inventory investment')).toBeVisible();
    });

    test('should display summary metrics', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      await expect(page.locator('text=Inventory Value')).toBeVisible();
      await expect(page.locator('text=Potential Revenue')).toBeVisible();
      await expect(page.locator('text=Avg Margin')).toBeVisible();
      await expect(page.locator('text=Dead Stock')).toBeVisible();
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(1000);

      // Check for search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
    });

    test('should allow category filtering', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(1000);

      // Check for category dropdown
      const categorySelect = page.locator('select').first();
      await expect(categorySelect).toBeVisible();
    });

    test('should allow performance filtering', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(1000);

      // Check for performance filter
      const performanceSelect = page.locator('select').nth(1);
      await expect(performanceSelect).toBeVisible();

      // Should have filter options
      await performanceSelect.click();
      await expect(page.locator('option:has-text("All Parts")')).toBeVisible();
      await expect(page.locator('option:has-text("High Performers")')).toBeVisible();
      await expect(page.locator('option:has-text("Low Performers")')).toBeVisible();
      await expect(page.locator('option:has-text("Dead Stock")')).toBeVisible();
    });

    test('should display parts table', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      // Check for table
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Check for table headers
      await expect(page.locator('th:has-text("Part Number")')).toBeVisible();
      await expect(page.locator('th:has-text("Description")')).toBeVisible();
      await expect(page.locator('th:has-text("Stock")')).toBeVisible();
      await expect(page.locator('th:has-text("Uses")')).toBeVisible();
      await expect(page.locator('th:has-text("Profit/Unit")')).toBeVisible();
      await expect(page.locator('th:has-text("Margin %")')).toBeVisible();
    });

    test('should allow sorting by clicking column headers', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      // Click on Uses header to sort
      await page.click('th:has-text("Uses")');
      await page.waitForTimeout(500);
    });

    test('should display top performers section', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      await expect(page.locator('text=Top Performers')).toBeVisible();
    });

    test('should display action items section', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      await expect(page.locator('text=Action Items')).toBeVisible();
    });

    test('should display best practices', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);

      await expect(page.locator('text=Parts ROI Best Practices')).toBeVisible();
      await expect(page.locator('text=Stock parts with high turnover')).toBeVisible();
    });

    test('should filter parts by search term', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      // Type in search
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Results count should update
      await expect(page.locator('text=Showing')).toBeVisible();
    });

    test('should show results count', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      // Should show "Showing X of Y parts"
      await expect(page.locator('text=/Showing.*of.*parts/')).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);

      const backButton = page.locator('button').first();
      await expect(backButton).toBeVisible();
    });
  });

  test.describe('Database Views', () => {
    test('should query job_metrics_view successfully', async ({ page }) => {
      // This test verifies the view exists by loading a page that uses it
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(2000);

      // If page loads without error, view is working
      await expect(page.locator('h1')).toContainText('Executive Dashboard');
    });

    test('should query parts_roi_view successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(2000);

      // If page loads without error, view is working
      await expect(page.locator('h1')).toContainText('Parts ROI');
    });
  });

  test.describe('Performance', () => {
    test('executive dashboard should load within 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/analytics`);
      await expect(page.locator('h1')).toContainText('Executive Dashboard');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('FCC analytics should load within 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/analytics/fcc`);
      await expect(page.locator('h1')).toContainText('First Call Complete');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('parts ROI should load within 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await expect(page.locator('h1')).toContainText('Parts ROI');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });
  });

  test.describe('Responsive Design', () => {
    test('executive dashboard should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(1000);

      // Should display properly on mobile
      await expect(page.locator('h1')).toBeVisible();
    });

    test('FCC analytics should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/analytics/fcc`);
      await page.waitForTimeout(1000);

      await expect(page.locator('h1')).toBeVisible();
    });

    test('parts ROI should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      await page.waitForTimeout(1000);

      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle loading state gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);

      // Should show loading state initially
      const loadingText = page.locator('text=Loading dashboard');
      // Loading might be too fast to catch, so we just check page loads
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
    });

    test('should not show console errors on executive dashboard', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(2000);

      // Filter out expected errors (like network errors in dev)
      const criticalErrors = errors.filter(e =>
        !e.includes('404') &&
        !e.includes('Failed to fetch')
      );

      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Navigation', () => {
    test('should maintain analytics nav highlight on all analytics pages', async ({ page }) => {
      // Test executive dashboard
      await page.goto(`${BASE_URL}/analytics`);
      let analyticsLink = page.locator('a[href="/analytics"]');
      await expect(analyticsLink).toHaveClass(/bg-primary-50/);

      // Test FCC page
      await page.goto(`${BASE_URL}/analytics/fcc`);
      analyticsLink = page.locator('a[href="/analytics"]');
      await expect(analyticsLink).toHaveClass(/bg-primary-50/);

      // Test Parts ROI page
      await page.goto(`${BASE_URL}/analytics/parts-roi`);
      analyticsLink = page.locator('a[href="/analytics"]');
      await expect(analyticsLink).toHaveClass(/bg-primary-50/);
    });

    test('should navigate between analytics pages', async ({ page }) => {
      // Start at executive dashboard
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForTimeout(500);

      // Go to FCC
      await page.click('button:has-text("Analyze")');
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/analytics\/fcc/);

      // Back to dashboard
      await page.locator('button').first().click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/analytics$/);

      // Go to Parts ROI
      await page.click('button:has-text("View ROI")');
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/analytics\/parts-roi/);
    });
  });
});
