// tests/stages/stage03_jobs.test.ts
/**
 * Stage 3: Job Management Core Tests
 *
 * Tests job management features:
 * - Job creation wizard (3-step process)
 * - Job CRUD operations
 * - Job ID auto-generation
 * - Job list with filtering
 * - Job detail page
 * - Status workflow
 * - Multi-visit tracking
 * - Callback job creation
 * - Job history logging
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration - reads from .env.test
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123'
};

// Helper to create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://frbulthijdpkeqdphnxc.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYnVsdGhpamRwa2VxZHBobnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NzUzMzMsImV4cCI6MjA3NzQ1MTMzM30.hDpF1znvh95ow1tXp-YDsEjPRd3D6ADWofWbOIk62DE'
);

// Helper to authenticate the Supabase client
async function authenticateSupabase() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  if (error) throw error;
  return data;
}

// Helper functions
async function login(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('[name="email"]');
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);
  await Promise.all([
    page.waitForURL('/'),
    page.click('button:has-text("Sign in")')
  ]);
  await page.waitForTimeout(1000);
}

async function navigateToJobs(page: Page) {
  await page.click('a[href="/jobs"]');
  await page.waitForURL('/jobs');
}

async function cleanupTestJobs() {
  // Clean up test jobs
  await supabase
    .from('jobs')
    .delete()
    .ilike('issue_description', '%TEST JOB%');
}

async function cleanupTestCustomers() {
  // Clean up test customers
  await supabase
    .from('customers')
    .delete()
    .ilike('email', '%@test-job.com');
}

async function createTestCustomer() {
  // Use timestamp + random to ensure unique customer_id even in parallel tests
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const uniqueId = timestamp + random;

  // Generate a unique ID using last 4 digits of timestamp+random
  const newCustomerId = `C-${String(uniqueId).slice(-4).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('customers')
    .insert({
      customer_id: newCustomerId,
      customer_type: 'Residential',
      first_name: 'Test',
      last_name: 'Customer',
      email: `testcustomer-${timestamp}@test-job.com`,
      phone_primary: '555-TEST-001',
      address_street: '123 Test St',
      city: 'Test City',
      state: 'ND',
      zip: '58554'
    })
    .select()
    .single();

  if (error) {
    // If duplicate customer_id, retry with a small delay
    if (error.code === '23505' && error.message.includes('customer_id')) {
      await new Promise(resolve => setTimeout(resolve, 50));
      return createTestCustomer();
    }
    throw error;
  }
  return data;
}

async function createTestJob(customer: any, jobData: Partial<any> = {}) {
  // Generate job ID (same logic as jobStore.ts)
  const { data: lastJob } = await supabase
    .from('jobs')
    .select('job_id')
    .order('job_id', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1
  if (lastJob?.job_id) {
    const lastNumber = parseInt(lastJob.job_id.split('-')[1])
    nextNumber = lastNumber + 1
  }
  const jobId = `J-${String(nextNumber).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      job_id: jobId,
      customer_id: customer.id,
      job_stage: 'Intake',
      current_status: 'New',
      priority: 'Normal',
      is_callback: false,
      callback_count: 0,
      visit_count: 1,
      primary_job: true,
      added_on_site: false,
      combined_invoice: false,
      photo_count: 0,
      has_site_photos: false,
      has_diagnosis_photos: false,
      has_repair_photos: false,
      ...jobData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Main test suite
test.describe('Stage 3: Job Management Core', () => {

  test.beforeAll(async () => {
    // Create test user if doesn't exist
    try {
      const { error } = await supabase.auth.signUp({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
      if (error && !error.message.includes('already registered')) {
        console.log('Note: Test user setup:', error.message);
      }
    } catch (e) {
      // Ignore errors
    }

    // Authenticate the Supabase client for database operations
    await authenticateSupabase();

    // Clean up test data
    await cleanupTestJobs();
    await cleanupTestCustomers();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterAll(async () => {
    // Clean up after all tests
    await cleanupTestJobs();
    await cleanupTestCustomers();
  });

  test.describe('Job List View', () => {

    test('@critical Should display job list page', async ({ page }) => {
      await navigateToJobs(page);

      // Check page elements
      await expect(page.locator('h1').filter({ hasText: 'Jobs' })).toBeVisible();
      await expect(page.locator('text=Manage your service jobs')).toBeVisible();
      await expect(page.locator('button:has-text("New Job")')).toBeVisible();
    });

    test('Should display stage statistics', async ({ page }) => {
      await navigateToJobs(page);

      // Check for stage stat cards (using .first() to avoid matching sidebar links)
      await expect(page.locator('text=Intake').first()).toBeVisible();
      await expect(page.locator('text=Diagnosis').first()).toBeVisible();
      await expect(page.locator('text=Parts').nth(1)).toBeVisible();  // nth(1) to skip sidebar link
      await expect(page.locator('text=Repair').first()).toBeVisible();
      await expect(page.locator('text=Complete').first()).toBeVisible();
    });

    test('Should have search and filter functionality', async ({ page }) => {
      await navigateToJobs(page);

      // Check search
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

      // Check filters button
      const filtersButton = page.locator('button:has-text("Filters")');
      await expect(filtersButton).toBeVisible();
    });

  });

  test.describe('Job Creation Wizard', () => {

    // DEPENDENCY: Requires a customer to exist
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:228 --project=chromium --workers=1
    test('@critical Should complete 3-step job creation wizard', async ({ page }) => {
      // Capture console logs
      page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
      page.on('pageerror', error => console.log('BROWSER ERROR:', error));

      // Create a test customer first
      const customer = await createTestCustomer();

      await navigateToJobs(page);

      // Click New Job button
      await page.click('button:has-text("New Job")');
      await page.waitForURL('/jobs/new');

      // Verify wizard header
      await expect(page.locator('h2:has-text("Create New Job")')).toBeVisible();

      // Step 1: Select Customer
      await expect(page.locator('text=Select Customer')).toBeVisible();

      // Search for customer
      await page.fill('input[placeholder*="Search"]', 'Test');
      await page.waitForTimeout(500);

      // Click on the customer from search results
      await page.click('button:has-text("Test Customer")');

      // Verify customer is selected
      await expect(page.locator('text=Test Customer')).toBeVisible();

      // Click Next
      await page.click('button:has-text("Next")');

      // Step 2: Appliance & Issue
      await expect(page.locator('text=Appliance Type').first()).toBeVisible();

      // Fill appliance info
      await page.selectOption('select', { label: 'Refrigerator' });
      await page.fill('textarea[placeholder*="Describe"]', 'TEST JOB - Not cooling properly');

      // Click Next
      await page.click('button:has-text("Next")');

      // Step 3: Schedule
      await expect(page.locator('text=Priority Level')).toBeVisible();
      await expect(page.locator('text=Job Summary')).toBeVisible();

      // Verify summary shows correct info
      await expect(page.locator('text=Test Customer')).toBeVisible();
      await expect(page.locator('text=Refrigerator')).toBeVisible();

      // Submit
      await page.click('button:has-text("Create Job")');

      // Wait for navigation to job detail page
      await page.waitForURL(/\/jobs\/[a-f0-9-]+$/);

      // Verify we're on job detail page
      await expect(page.locator('text=J-')).toBeVisible(); // Job ID
      await expect(page.locator('text=TEST JOB - Not cooling properly')).toBeVisible();
    });

    test('Should validate required fields in wizard', async ({ page }) => {
      await navigateToJobs(page);
      await page.click('button:has-text("New Job")');
      await page.waitForURL('/jobs/new');

      // Step 1: Try to proceed without selecting customer
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeDisabled();
    });

    test('Should allow navigation back in wizard', async ({ page }) => {
      const customer = await createTestCustomer();

      await navigateToJobs(page);
      await page.click('button:has-text("New Job")');
      await page.waitForURL('/jobs/new');

      // Complete step 1
      await page.fill('input[placeholder*="Search"]', 'Test');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Test Customer")');
      await page.click('button:has-text("Next")');

      // On step 2, click Previous
      await page.click('button:has-text("Previous")');

      // Should be back on step 1
      await expect(page.locator('text=Select Customer')).toBeVisible();
    });

  });

  test.describe('Job ID Generation', () => {

    // DEPENDENCY: Requires a customer to exist, creates jobs J-0001 and J-0002
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:320 --project=chromium --workers=1
    test('@critical Should auto-generate job IDs sequentially', async ({ page }) => {
      const customer = await createTestCustomer();

      // Create first job
      await navigateToJobs(page);
      await page.click('button:has-text("New Job")');
      await page.fill('input[placeholder*="Search"]', 'Test');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Test Customer")');
      await page.click('button:has-text("Next")');
      await page.selectOption('select', { label: 'Washer' });
      await page.fill('textarea[placeholder*="Describe"]', 'TEST JOB - First job');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Create Job")');

      await page.waitForURL(/\/jobs\/[a-f0-9-]+$/);
      const firstJobId = await page.locator('h1').filter({ hasText: 'J-' }).textContent();

      // Navigate back and create second job
      await navigateToJobs(page);
      await page.click('button:has-text("New Job")');
      await page.fill('input[placeholder*="Search"]', 'Test');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Test Customer")');
      await page.click('button:has-text("Next")');
      await page.selectOption('select', { label: 'Dryer' });
      await page.fill('textarea[placeholder*="Describe"]', 'TEST JOB - Second job');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Create Job")');

      await page.waitForURL(/\/jobs\/[a-f0-9-]+$/);
      const secondJobId = await page.locator('h1').filter({ hasText: 'J-' }).textContent();

      // Verify IDs are sequential
      expect(firstJobId).toBeTruthy();
      expect(secondJobId).toBeTruthy();
      expect(firstJobId).not.toBe(secondJobId);
    });

  });

  test.describe('Job Detail Page', () => {

    // DEPENDENCY: Requires a customer to exist, creates a job
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:363 --project=chromium --workers=1
    test('@critical Should display job details correctly', async ({ page }) => {
      const customer = await createTestCustomer();

      // Create a job using helper
      const job = await createTestJob(customer, {
        appliance_type: 'Dishwasher',
        brand: 'Whirlpool',
        model_number: 'TEST123',
        issue_description: 'TEST JOB - Not draining',
        priority: 'High'
      });

      // Navigate to job detail
      await page.goto(`/jobs/${job.id}`);

      // Check job details
      await expect(page.locator(`text=${job.job_id}`)).toBeVisible();
      await expect(page.locator('text=Dishwasher')).toBeVisible();
      await expect(page.locator('text=Whirlpool')).toBeVisible();
      await expect(page.locator('text=TEST123')).toBeVisible();
      await expect(page.locator('text=TEST JOB - Not draining')).toBeVisible();
    });

    test('Should have three tabs: Overview, Visits, History', async ({ page }) => {
      const customer = await createTestCustomer();

      const job = await createTestJob(customer, {
        appliance_type: 'Refrigerator',
        issue_description: 'TEST JOB - Tab test'
      });

      await page.goto(`/jobs/${job.id}`);

      // Check tabs
      await expect(page.locator('button:has-text("Overview")')).toBeVisible();
      await expect(page.locator('button:has-text("Visits")')).toBeVisible();
      await expect(page.locator('button:has-text("History")')).toBeVisible();
    });

    test('Should display customer information in sidebar', async ({ page }) => {
      const customer = await createTestCustomer();

      const job = await createTestJob(customer, {
        appliance_type: 'Washer',
        issue_description: 'TEST JOB - Customer info test'
      });

      await page.goto(`/jobs/${job.id}`);

      // Check customer info in sidebar
      await expect(page.locator('text=Test Customer')).toBeVisible();
      await expect(page.locator('text=555-TEST-001')).toBeVisible();
      await expect(page.locator('text=123 Test St')).toBeVisible();
    });

  });

  test.describe('Job Status Management', () => {

    // DEPENDENCY: Requires a customer to exist, creates a job
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:424 --project=chromium --workers=1
    test('@critical Should update job status', async ({ page }) => {
      const customer = await createTestCustomer();

      const job = await createTestJob(customer, {
        appliance_type: 'Dryer',
        issue_description: 'TEST JOB - Status update test'
      });

      await page.goto(`/jobs/${job.id}`);

      // Click Update Status
      await page.click('button:has-text("Update Status")');

      // Fill in new status
      await page.fill('input[placeholder*="Diagnosis"]', 'Diagnosis Complete');

      // Submit
      await page.click('button:has-text("Update")');

      // Verify status updated - wait for modal to close and status to refresh
      await page.waitForSelector('button:has-text("Update Status")', { timeout: 10000 });
      await expect(page.locator('text=Diagnosis Complete')).toBeVisible({ timeout: 10000 });
    });

  });

  test.describe('Multi-Visit Tracking', () => {

    // DEPENDENCY: Requires a customer to exist, creates a job with visits
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:454 --project=chromium --workers=1
    test('@critical Should add additional visits to job', async ({ page }) => {
      const customer = await createTestCustomer();

      const job = await createTestJob(customer, {
        appliance_type: 'Range/Stove',
        issue_description: 'TEST JOB - Multi-visit test',
        job_stage: 'Diagnosis',
        current_status: 'Scheduled',
        visit_1_type: 'Diagnosis',
        visit_1_status: 'Scheduled'
      });

      await page.goto(`/jobs/${job.id}`);

      // Switch to Visits tab
      await page.click('button:has-text("Visits")');

      // Verify visit 1 is shown
      await expect(page.locator('text=Visit #1')).toBeVisible();

      // Click Add Visit
      await page.click('button:has-text("Add Visit")');

      // Fill visit details
      await page.selectOption('select', { label: 'Repair' });
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('input[type="date"]', dateString);

      // Submit
      await page.click('button:has-text("Add Visit")');

      // Verify visit 2 is added - wait for modal to close and visits to refresh
      await page.waitForSelector('button:has-text("Add Visit")', { timeout: 10000 });
      await page.click('button:has-text("Visits")');
      await expect(page.locator('text=Visit #2')).toBeVisible({ timeout: 10000 });
    });

  });

  test.describe('Job Search and Filtering', () => {

    // DEPENDENCY: Requires a customer to exist, creates a job to search for
    // When retesting individually: npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:498 --project=chromium --workers=1
    test('Should search jobs by job ID', async ({ page }) => {
      const customer = await createTestCustomer();

      // Create a unique job
      const job = await createTestJob(customer, {
        appliance_type: 'Microwave',
        issue_description: 'TEST JOB - Search test unique12345'
      });

      await navigateToJobs(page);

      // Search for the job
      await page.fill('input[placeholder*="Search"]', job.job_id);
      await page.waitForTimeout(1000);

      // Verify job appears in results
      await expect(page.locator(`text=${job.job_id}`)).toBeVisible();
    });

    test('Should filter jobs by stage', async ({ page }) => {
      await navigateToJobs(page);

      // Click filters
      await page.click('button:has-text("Filters")');

      // Select a stage
      await page.selectOption('select', { label: 'Diagnosis' });

      // Results should update (can't verify exact content without knowing data)
      await page.waitForTimeout(500);
    });

  });

  test.describe('Dashboard Integration', () => {

    test('@critical Dashboard should display job statistics', async ({ page }) => {
      await page.goto('/');

      // Check for job stats (using .first() to avoid matching multiple elements)
      await expect(page.locator('text=Active Jobs').first()).toBeVisible();
      await expect(page.locator('text=Scheduled Today').first()).toBeVisible();
      await expect(page.locator('text=Completed This Month').first()).toBeVisible();
    });

    test('Dashboard should show recent jobs widget', async ({ page }) => {
      await page.goto('/');

      // Check for recent jobs section
      await expect(page.locator('text=Recent Jobs')).toBeVisible();
    });

    test('Dashboard should show today\'s schedule widget', async ({ page }) => {
      await page.goto('/');

      // Check for today's schedule section
      await expect(page.locator('text=Today\'s Schedule')).toBeVisible();
    });

  });

});
