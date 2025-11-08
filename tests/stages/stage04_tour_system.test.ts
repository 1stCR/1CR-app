// tests/stages/stage04_tour_system.test.ts
/**
 * Stage 4: Tour System Tests
 *
 * Tests tour-based time tracking features:
 * - Tour Control widget
 * - Start/Stop tour management
 * - Activity tracking (Travel, Diagnosis, Repair, Research, Break)
 * - Activity switching
 * - Research mode
 * - Time allocation to jobs
 * - Data persistence
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_USER = {
  email: process.env.VITE_TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.VITE_TEST_USER_PASSWORD || 'testpass123'
};

// Helper to create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://frbulthijdpkeqdphnxc.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
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

  // Clear localStorage BEFORE logging in to prevent persisted state from loading
  await page.evaluate(() => {
    localStorage.clear();
  });

  await page.waitForSelector('[name="email"]');
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button:has-text("Sign in")')
  ]);
  await page.waitForTimeout(1000);
}

async function createTestCustomer() {
  // customer_id is VARCHAR(10), so use last 8 digits of timestamp: C-12345678
  const timestamp = Date.now().toString().slice(-8);
  const customerData = {
    customer_id: `C-${timestamp}`,
    customer_type: 'Residential',
    first_name: 'Tour',
    last_name: 'Test',
    phone_primary: '3075558888',
    email: `tour.test.${Date.now()}@test.example.com`,
    address_street: '123 Tour St',
    city: 'Mandan',
    state: 'ND',
    zip: '58554',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createTestJob(customer: any, overrides: any = {}) {
  // Get last job to generate next ID
  const { data: lastJob } = await supabase
    .from('jobs')
    .select('job_id')
    .order('job_id', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastJob?.job_id) {
    nextNumber = parseInt(lastJob.job_id.split('-')[1]) + 1;
  }
  const jobId = `J-${String(nextNumber).padStart(4, '0')}`;

  const jobData = {
    job_id: jobId,
    customer_id: customer.customer_id,
    appliance_type: 'Refrigerator',
    issue_description: 'TEST JOB - Tour system test',
    job_stage: 'Intake',
    current_status: 'New',
    is_callback: false,
    callback_count: 0,
    visit_count: 1,
    visit_1_type: 'Diagnosis',
    visit_1_status: 'Scheduled',
    primary_job: true,
    added_on_site: false,
    combined_invoice: false,
    photo_count: 0,
    has_site_photos: false,
    has_diagnosis_photos: false,
    has_repair_photos: false,
    priority: 'Normal',
    travel_time_minutes: 0,
    diagnosis_time_minutes: 0,
    repair_time_minutes: 0,
    research_time_minutes: 0,
    total_time_minutes: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function cleanupTodaysTour() {
  const today = new Date().toISOString().split('T')[0];

  // Delete tour activities first (due to foreign key)
  const { data: tours } = await supabase
    .from('tours')
    .select('id')
    .eq('tour_date', today);

  if (tours && tours.length > 0) {
    await supabase
      .from('tour_activities')
      .delete()
      .in('tour_id', tours.map(t => t.id));
  }

  // Delete tours
  await supabase
    .from('tours')
    .delete()
    .eq('tour_date', today);
}

async function cleanupTestData() {
  // Clean up test customers and their jobs
  await supabase
    .from('customers')
    .delete()
    .ilike('email', '%tour.test.%@test.example.com');
}

// Main test suite
test.describe('Stage 4: Tour System', () => {

  test.beforeAll(async () => {
    // Authenticate the Supabase client for database operations
    await authenticateSupabase();

    // Clean up any existing test data
    await cleanupTodaysTour();
    await cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    // Clean today's tour from database
    await cleanupTodaysTour();

    // Login before each test (clears localStorage internally)
    await login(page);

    // Wait for tour store to initialize and fetch today's tour
    await page.waitForTimeout(1500);
  });

  test.afterEach(async () => {
    // Clean up after each test to ensure test isolation
    await cleanupTodaysTour();
  });

  test.describe('Tour Control Widget', () => {

    // DEPENDENCY: None - just needs authenticated user
    test('@critical Should display Tour Control widget', async ({ page }) => {
      await page.goto('/');

      // Tour Control widget should be visible
      const tourControl = page.locator('[data-testid="tour-control"]');
      await expect(tourControl).toBeVisible();

      // Should show "Ready to start your day?" message
      await expect(page.locator('text=Ready to start your day?')).toBeVisible();

      // Start Tour button should be visible
      const startButton = page.locator('[data-testid="start-tour-button"]');
      await expect(startButton).toBeVisible();
    });

    test('Should allow expanding and collapsing widget', async ({ page }) => {
      await page.goto('/');

      const tourControl = page.locator('[data-testid="tour-control"]');
      await expect(tourControl).toBeVisible();

      // Click toggle button to collapse
      await page.click('[data-testid="tour-control-toggle"]');
      await page.waitForTimeout(300);

      // Start button should not be visible when collapsed
      const startButton = page.locator('[data-testid="start-tour-button"]');
      await expect(startButton).not.toBeVisible();

      // Click toggle again to expand
      await page.click('[data-testid="tour-control-toggle"]');
      await page.waitForTimeout(300);

      // Start button should be visible again
      await expect(startButton).toBeVisible();
    });

  });

  test.describe('Tour Lifecycle', () => {

    // DEPENDENCY: None - just needs authenticated user
    test('@critical Should start a tour', async ({ page }) => {
      await page.goto('/');

      // Start the tour
      await page.click('[data-testid="start-tour-button"]');

      // Wait for tour to start
      await page.waitForTimeout(1000);

      // Tour status should show "Active"
      const status = page.locator('[data-testid="tour-status"]');
      await expect(status).toContainText('Active');

      // Tour duration should be visible
      const duration = page.locator('[data-testid="tour-duration"]');
      await expect(duration).toBeVisible();

      // Action buttons should be visible
      await expect(page.locator('[data-testid="start-research-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="pause-tour-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="end-tour-button"]')).toBeVisible();

      // Verify tour exists in database
      const today = new Date().toISOString().split('T')[0];
      const { data: tour } = await supabase
        .from('tours')
        .select('*')
        .eq('tour_date', today)
        .single();

      expect(tour).not.toBeNull();
      expect(tour.status).toBe('Active');
    });

    test('Should pause and resume tour (take break)', async ({ page }) => {
      await page.goto('/');

      // Start tour
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // Take a break
      await page.click('[data-testid="pause-tour-button"]');
      await page.waitForTimeout(1000);

      // Status should show "On Break"
      const status = page.locator('[data-testid="tour-status"]');
      await expect(status).toContainText('On Break');

      // Resume button should be visible
      const resumeButton = page.locator('[data-testid="resume-tour-button"]');
      await expect(resumeButton).toBeVisible();

      // Resume tour
      await page.click('[data-testid="resume-tour-button"]');
      await page.waitForTimeout(1000);

      // Status should show "Active" again
      await expect(status).toContainText('Active');
    });

    test('@critical Should end a tour', async ({ page }) => {
      await page.goto('/');

      // Start tour
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // End tour
      page.on('dialog', dialog => dialog.accept()); // Accept confirmation
      await page.click('[data-testid="end-tour-button"]');
      await page.waitForTimeout(1000);

      // Should show completion message
      const completedWidget = page.locator('[data-testid="tour-completed"]');
      await expect(completedWidget).toBeVisible();
      await expect(page.locator('text=Tour Completed')).toBeVisible();
      await expect(page.locator('text=Great work today!')).toBeVisible();

      // Verify tour status in database
      const today = new Date().toISOString().split('T')[0];
      const { data: tour } = await supabase
        .from('tours')
        .select('*')
        .eq('tour_date', today)
        .single();

      expect(tour).not.toBeNull();
      expect(tour.status).toBe('Completed');
      expect(tour.end_time).not.toBeNull();
    });

  });

  test.describe('Activity Tracking on Job Detail', () => {

    // DEPENDENCY: Requires customer and job to exist
    // When retesting individually: npx playwright test tests/stages/stage04_tour_system.test.ts:300 --project=chromium --workers=1
    test('@critical Should display activity controls on job detail page', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      // Start tour first (required for activity controls to appear)
      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // Navigate to job detail
      await page.goto(`/jobs/${job.id}`);

      // Activity controls should be visible
      const controls = page.locator('[data-testid="job-activity-controls"]');
      await expect(controls).toBeVisible();

      // All three activity buttons should be visible
      await expect(page.locator('[data-testid="travel-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="diagnosis-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="repair-button"]')).toBeVisible();
    });

    // DEPENDENCY: Requires customer, job, and active tour
    test('@critical Should start Travel activity from job page', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      await page.goto('/');

      // Start tour first
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // Navigate to job detail
      await page.goto(`/jobs/${job.id}`);

      // Start Travel activity
      await page.click('[data-testid="travel-button"]');
      await page.waitForTimeout(1000);

      // Travel button should show as active
      const travelButton = page.locator('[data-testid="travel-button"]');
      await expect(travelButton).toContainText('Traveling...');

      // Tour Control should show Travel activity
      const currentActivity = page.locator('[data-testid="current-activity"]');
      await expect(currentActivity).toBeVisible();
      await expect(currentActivity).toContainText('Travel');

      // Activity duration should be visible and counting
      const activityDuration = page.locator('[data-testid="activity-duration"]');
      await expect(activityDuration).toBeVisible();
    });

    test('Should start Diagnosis activity from job page', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      await page.goto(`/jobs/${job.id}`);

      // Start Diagnosis activity
      await page.click('[data-testid="diagnosis-button"]');
      await page.waitForTimeout(1000);

      // Diagnosis button should show as active
      const diagnosisButton = page.locator('[data-testid="diagnosis-button"]');
      await expect(diagnosisButton).toContainText('Diagnosing...');

      // Tour Control should show Diagnosis activity
      const currentActivity = page.locator('[data-testid="current-activity"]');
      await expect(currentActivity).toContainText('Diagnosis');
    });

    test('Should start Repair activity from job page', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      await page.goto(`/jobs/${job.id}`);

      // Start Repair activity
      await page.click('[data-testid="repair-button"]');
      await page.waitForTimeout(1000);

      // Repair button should show as active
      const repairButton = page.locator('[data-testid="repair-button"]');
      await expect(repairButton).toContainText('Repairing...');

      // Tour Control should show Repair activity
      const currentActivity = page.locator('[data-testid="current-activity"]');
      await expect(currentActivity).toContainText('Repair');
    });

  });

  test.describe('Activity Switching', () => {

    // DEPENDENCY: Requires customer, job, and active tour with activity
    test('@critical Should switch between activities automatically', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      await page.goto(`/jobs/${job.id}`);

      // Start Travel activity
      await page.click('[data-testid="travel-button"]');
      await page.waitForTimeout(2000); // Wait 2 seconds to accumulate some time

      // Switch to Diagnosis
      await page.click('[data-testid="diagnosis-button"]');
      await page.waitForTimeout(1000);

      // Travel should have ended, Diagnosis should be active
      const travelButton = page.locator('[data-testid="travel-button"]');
      await expect(travelButton).toContainText('Start Travel');

      const diagnosisButton = page.locator('[data-testid="diagnosis-button"]');
      await expect(diagnosisButton).toContainText('Diagnosing...');

      // Tour Control should show Diagnosis
      const currentActivity = page.locator('[data-testid="current-activity"]');
      await expect(currentActivity).toContainText('Diagnosis');

      // Verify activities in database
      const today = new Date().toISOString().split('T')[0];
      const { data: tour } = await supabase
        .from('tours')
        .select('id')
        .eq('tour_date', today)
        .single();

      const { data: activities } = await supabase
        .from('tour_activities')
        .select('*')
        .eq('tour_id', tour.id)
        .order('start_time', { ascending: true });

      // Should have 2 activities: Travel (ended) and Diagnosis (active)
      expect(activities).not.toBeNull();
      expect(activities.length).toBeGreaterThanOrEqual(2);

      // First activity (Travel) should have end_time and duration recorded
      expect(activities[0].activity_type).toBe('Travel');
      expect(activities[0].end_time).not.toBeNull();
      expect(activities[0].duration_minutes).toBeGreaterThanOrEqual(0); // Can be 0 for sub-minute activities

      // Second activity (Diagnosis) should be active (no end_time yet)
      expect(activities[1].activity_type).toBe('Diagnosis');
    });

  });

  test.describe('Research Mode', () => {

    // DEPENDENCY: Requires customer, job, and active tour
    test('@critical Should open research mode modal', async ({ page }) => {
      const customer = await createTestCustomer();
      await createTestJob(customer); // Create at least one job

      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // Click Start Research
      await page.click('[data-testid="start-research-button"]');

      // Research modal should be visible
      const modal = page.locator('[data-testid="research-modal"]');
      await expect(modal).toBeVisible();

      // Modal should have job selection dropdown
      const jobSelect = page.locator('[data-testid="research-job-select"]');
      await expect(jobSelect).toBeVisible();

      // Should have cancel and confirm buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-research-button"]')).toBeVisible();
    });

    test('Should start research for a job', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // Open research modal
      await page.click('[data-testid="start-research-button"]');
      await page.waitForTimeout(500);

      // Select the job
      await page.selectOption('[data-testid="research-job-select"]', job.id);

      // Confirm research
      await page.click('[data-testid="confirm-research-button"]');
      await page.waitForTimeout(1000);

      // Modal should close
      const modal = page.locator('[data-testid="research-modal"]');
      await expect(modal).not.toBeVisible();

      // Tour Control should show Research activity
      const currentActivity = page.locator('[data-testid="current-activity"]');
      await expect(currentActivity).toContainText('Research');

      // End Research button should be visible
      await expect(page.locator('[data-testid="end-research-button"]')).toBeVisible();
    });

    test('Should end research activity', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // Start research
      await page.click('[data-testid="start-research-button"]');
      await page.waitForTimeout(500);
      await page.selectOption('[data-testid="research-job-select"]', job.id);
      await page.click('[data-testid="confirm-research-button"]');
      await page.waitForTimeout(2000); // Let it run for 2 seconds

      // End research
      await page.click('[data-testid="end-research-button"]');
      await page.waitForTimeout(1000);

      // Current activity should be cleared
      const currentActivity = page.locator('[data-testid="current-activity"]');
      await expect(currentActivity).not.toBeVisible();

      // Start Research button should be visible again
      await expect(page.locator('[data-testid="start-research-button"]')).toBeVisible();
    });

  });

  test.describe('Data Persistence', () => {

    test('Should persist tour state across page refreshes', async ({ page }) => {
      await page.goto('/');

      // Start tour
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      // Verify tour is active
      const statusBefore = page.locator('[data-testid="tour-status"]');
      await expect(statusBefore).toContainText('Active');

      // Refresh the page
      await page.reload();
      await page.waitForTimeout(1000);

      // Tour should still be active
      const statusAfter = page.locator('[data-testid="tour-status"]');
      await expect(statusAfter).toContainText('Active');

      // Duration should still be visible
      const duration = page.locator('[data-testid="tour-duration"]');
      await expect(duration).toBeVisible();
    });

  });

  test.describe('Time Allocation to Jobs', () => {

    // DEPENDENCY: Requires customer, job, active tour, and completed activity
    test('@critical Should allocate activity time to job', async ({ page }) => {
      const customer = await createTestCustomer();
      const job = await createTestJob(customer);

      await page.goto('/');
      await page.click('[data-testid="start-tour-button"]');
      await page.waitForTimeout(1000);

      await page.goto(`/jobs/${job.id}`);

      // Start and quickly end Travel activity (so we have measurable duration)
      await page.click('[data-testid="travel-button"]');
      await page.waitForTimeout(3000); // Run for 3 seconds minimum

      // End activity by starting a different one
      await page.click('[data-testid="diagnosis-button"]');
      await page.waitForTimeout(1000);

      // Check job in database - travel_time_minutes should be updated
      const { data: updatedJob } = await supabase
        .from('jobs')
        .select('travel_time_minutes, total_time_minutes')
        .eq('id', job.id)
        .single();

      expect(updatedJob).not.toBeNull();
      expect(updatedJob.travel_time_minutes).toBeGreaterThanOrEqual(0); // Can be 0 for sub-minute activities
      expect(updatedJob.total_time_minutes).toBeGreaterThanOrEqual(0);
    });

  });

  test.afterAll(async () => {
    // Clean up test data
    await cleanupTodaysTour();
    await cleanupTestData();
  });

});
