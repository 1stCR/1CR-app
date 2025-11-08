// tests/stages/stage03_jobs_ui.test.ts
/**
 * Stage 3: Job Management UI Tests
 *
 * Tests UI-specific features:
 * - Wizard progress indicators
 * - Form validation states
 * - Stage badges and colors
 * - Priority indicators
 * - Tab navigation
 * - Responsive design elements
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123'
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://frbulthijdpkeqdphnxc.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYnVsdGhpamRwa2VxZHBobnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NzUzMzMsImV4cCI6MjA3NzQ1MTMzM30.hDpF1znvh95ow1tXp-YDsEjPRd3D6ADWofWbOIk62DE'
);

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

async function createTestCustomer() {
  const { data } = await supabase
    .from('customers')
    .insert({
      customer_type: 'Residential',
      first_name: 'UI',
      last_name: 'TestCustomer',
      email: 'uitest@test-job.com',
      phone_primary: '555-UI-TEST',
      address_street: '789 UI St',
      city: 'UI City',
      state: 'ND',
      zip: '58554'
    })
    .select()
    .single();
  return data;
}

async function cleanupTestData() {
  await supabase.from('jobs').delete().ilike('issue_description', '%UI TEST JOB%');
  await supabase.from('customers').delete().ilike('email', '%@test-job.com');
}

test.describe('Stage 3: Job Management UI', () => {

  test.beforeAll(async () => {
    await cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.describe('Job Wizard UI', () => {

    test('@ui Should display wizard progress indicators', async ({ page }) => {
      await page.goto('/jobs/new');

      // Check step indicators
      await expect(page.locator('text=Customer').first()).toBeVisible();
      await expect(page.locator('text=Appliance & Issue').first()).toBeVisible();
      await expect(page.locator('text=Schedule').first()).toBeVisible();

      // First step should be highlighted
      const step1 = page.locator('div').filter({ hasText: /^1$/ }).first();
      await expect(step1).toHaveClass(/bg-blue-600/);
    });

    test('@ui Should show proper button states in wizard', async ({ page }) => {
      await page.goto('/jobs/new');

      // Next button should be disabled initially
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeDisabled();

      // Cancel button should be enabled
      const cancelButton = page.locator('button:has-text("Cancel")');
      await expect(cancelButton).toBeEnabled();
    });

    test('@ui Should display job summary in final step', async ({ page }) => {
      const customer = await createTestCustomer();

      await page.goto('/jobs/new');

      // Step 1: Select customer
      await page.fill('input[placeholder*="Search"]', 'UI TestCustomer');
      await page.waitForTimeout(500);
      await page.click('button:has-text("UI TestCustomer")');
      await page.click('button:has-text("Next")');

      // Step 2: Fill appliance info
      await page.selectOption('select', { label: 'Washer' });
      await page.fill('textarea', 'UI TEST JOB - Summary test');
      await page.click('button:has-text("Next")');

      // Step 3: Verify summary section exists
      await expect(page.locator('text=Job Summary')).toBeVisible();
      await expect(page.locator('text=UI TestCustomer')).toBeVisible();
      await expect(page.locator('text=Washer')).toBeVisible();
    });

  });

  test.describe('Job List UI', () => {

    test('@ui Should display stage badges with correct colors', async ({ page }) => {
      const customer = await createTestCustomer();

      // Create jobs with different stages
      await supabase.from('jobs').insert([
        {
          customer_id: customer.id,
          appliance_type: 'Test',
          issue_description: 'UI TEST JOB - Intake',
          job_stage: 'Intake',
          current_status: 'New',
          is_callback: false,
          callback_count: 0,
          visit_count: 1,
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        },
        {
          customer_id: customer.id,
          appliance_type: 'Test',
          issue_description: 'UI TEST JOB - Diagnosis',
          job_stage: 'Diagnosis',
          current_status: 'In Progress',
          is_callback: false,
          callback_count: 0,
          visit_count: 1,
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        }
      ]);

      await page.goto('/jobs');
      await page.waitForTimeout(1000);

      // Check stage badges are visible
      await expect(page.locator('.bg-gray-100').filter({ hasText: 'Intake' })).toBeVisible();
      await expect(page.locator('.bg-blue-100').filter({ hasText: 'Diagnosis' })).toBeVisible();
    });

    test('@ui Should display priority indicators', async ({ page }) => {
      const customer = await createTestCustomer();

      await supabase.from('jobs').insert({
        customer_id: customer.id,
        appliance_type: 'Test',
        issue_description: 'UI TEST JOB - Urgent priority',
        job_stage: 'Intake',
        current_status: 'New',
        priority: 'Urgent',
        is_callback: false,
        callback_count: 0,
        visit_count: 1,
        primary_job: true,
        added_on_site: false,
        combined_invoice: false,
        photo_count: 0,
        has_site_photos: false,
        has_diagnosis_photos: false,
        has_repair_photos: false
      });

      await page.goto('/jobs');
      await page.waitForTimeout(1000);

      // Check for urgent priority indicator
      await expect(page.locator('.text-red-600').filter({ hasText: 'Urgent' })).toBeVisible();
    });

    test('@ui Should show callback badge', async ({ page }) => {
      const customer = await createTestCustomer();

      await supabase.from('jobs').insert({
        customer_id: customer.id,
        appliance_type: 'Test',
        issue_description: 'UI TEST JOB - Callback',
        job_stage: 'Intake',
        current_status: 'New',
        is_callback: true,
        callback_reason: 'Same Issue - Our Fault',
        callback_count: 1,
        visit_count: 1,
        primary_job: true,
        added_on_site: false,
        combined_invoice: false,
        photo_count: 0,
        has_site_photos: false,
        has_diagnosis_photos: false,
        has_repair_photos: false
      });

      await page.goto('/jobs');
      await page.waitForTimeout(1000);

      // Check for callback badge
      await expect(page.locator('.bg-red-100').filter({ hasText: 'Callback' })).toBeVisible();
    });

    test('@ui Should display empty state when no jobs', async ({ page }) => {
      // Clean all jobs
      await supabase.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      await page.goto('/jobs');
      await page.waitForTimeout(1000);

      // Check for empty state
      await expect(page.locator('text=No jobs yet').or(page.locator('text=No jobs found'))).toBeVisible();
      await expect(page.locator('button:has-text("Create Your First Job")')).toBeVisible();
    });

  });

  test.describe('Job Detail UI', () => {

    test('@ui Should display job stage badge', async ({ page }) => {
      const customer = await createTestCustomer();

      const { data: job } = await supabase
        .from('jobs')
        .insert({
          customer_id: customer.id,
          appliance_type: 'Refrigerator',
          issue_description: 'UI TEST JOB - Stage badge test',
          job_stage: 'Diagnosis',
          current_status: 'Scheduled',
          is_callback: false,
          callback_count: 0,
          visit_count: 1,
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        })
        .select()
        .single();

      await page.goto(`/jobs/${job.id}`);

      // Check stage badge
      await expect(page.locator('.bg-blue-100').filter({ hasText: 'Diagnosis' })).toBeVisible();
    });

    test('@ui Should show callback alert box for callback jobs', async ({ page }) => {
      const customer = await createTestCustomer();

      const { data: job } = await supabase
        .from('jobs')
        .insert({
          customer_id: customer.id,
          appliance_type: 'Washer',
          issue_description: 'UI TEST JOB - Callback alert',
          job_stage: 'Intake',
          current_status: 'New',
          is_callback: true,
          callback_reason: 'Same Issue - Our Fault',
          callback_count: 1,
          visit_count: 1,
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        })
        .select()
        .single();

      await page.goto(`/jobs/${job.id}`);

      // Check callback alert
      await expect(page.locator('.bg-red-50').filter({ hasText: 'Callback Job' })).toBeVisible();
      await expect(page.locator('text=Same Issue - Our Fault')).toBeVisible();
    });

    test('@ui Should display tab navigation correctly', async ({ page }) => {
      const customer = await createTestCustomer();

      const { data: job } = await supabase
        .from('jobs')
        .insert({
          customer_id: customer.id,
          appliance_type: 'Dryer',
          issue_description: 'UI TEST JOB - Tab test',
          job_stage: 'Repair',
          current_status: 'In Progress',
          is_callback: false,
          callback_count: 0,
          visit_count: 2,
          visit_1_type: 'Diagnosis',
          visit_1_status: 'Completed',
          visit_2_type: 'Repair',
          visit_2_status: 'Scheduled',
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        })
        .select()
        .single();

      await page.goto(`/jobs/${job.id}`);

      // Click Visits tab
      await page.click('button:has-text("Visits")');

      // Should show visits content
      await expect(page.locator('text=Visit History')).toBeVisible();
      await expect(page.locator('text=Visit #1')).toBeVisible();

      // Click History tab
      await page.click('button:has-text("History")');

      // Should show history content
      await expect(page.locator('text=Job History')).toBeVisible();

      // Click Overview tab
      await page.click('button:has-text("Overview")');

      // Should show overview content
      await expect(page.locator('text=Appliance Information')).toBeVisible();
    });

    test('@ui Should display customer info with clickable links', async ({ page }) => {
      const customer = await createTestCustomer();

      const { data: job } = await supabase
        .from('jobs')
        .insert({
          customer_id: customer.id,
          appliance_type: 'Range/Stove',
          issue_description: 'UI TEST JOB - Customer info',
          job_stage: 'Intake',
          current_status: 'New',
          is_callback: false,
          callback_count: 0,
          visit_count: 1,
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        })
        .select()
        .single();

      await page.goto(`/jobs/${job.id}`);

      // Check customer sidebar
      await expect(page.locator('h3:has-text("Customer")')).toBeVisible();
      await expect(page.locator('text=UI TestCustomer')).toBeVisible();

      // Check phone link
      await expect(page.locator('a[href^="tel:"]')).toBeVisible();

      // Check address link to Google Maps
      await expect(page.locator('a[href*="google.com/maps"]')).toBeVisible();
    });

    test('@ui Should show priority with color coding', async ({ page }) => {
      const customer = await createTestCustomer();

      const { data: job } = await supabase
        .from('jobs')
        .insert({
          customer_id: customer.id,
          appliance_type: 'Dishwasher',
          issue_description: 'UI TEST JOB - High priority',
          job_stage: 'Intake',
          current_status: 'New',
          priority: 'High',
          is_callback: false,
          callback_count: 0,
          visit_count: 1,
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        })
        .select()
        .single();

      await page.goto(`/jobs/${job.id}`);

      // Check priority in sidebar with orange color
      await expect(page.locator('.text-orange-600').filter({ hasText: 'High' })).toBeVisible();
    });

  });

  test.describe('Responsive Design', () => {

    test('@ui Job list should be responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile size

      await page.goto('/jobs');

      // Should still show header
      await expect(page.locator('h1').filter({ hasText: 'Jobs' })).toBeVisible();

      // Should still show new job button
      await expect(page.locator('button:has-text("New Job")')).toBeVisible();
    });

    test('@ui Job wizard should work on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/jobs/new');

      // Should show wizard header
      await expect(page.locator('h2:has-text("Create New Job")')).toBeVisible();

      // Should show progress indicators (might stack on mobile)
      await expect(page.locator('text=Customer').first()).toBeVisible();
    });

  });

  test.describe('Form Validation UI', () => {

    test('@ui Should disable submit button until form is valid', async ({ page }) => {
      await page.goto('/jobs/new');

      // Next button should be disabled
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeDisabled();
    });

    test('@ui Should show required field indicators', async ({ page }) => {
      await page.goto('/jobs/new');

      // Should show asterisks for required fields
      await expect(page.locator('text=Select Customer *')).toBeVisible();
    });

  });

  test.describe('Performance UI', () => {

    test('@ui Job list should load quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/jobs');
      await page.waitForSelector('h1');
      const loadTime = Date.now() - startTime;

      // Should load in less than 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('@ui Job detail should load quickly', async ({ page }) => {
      const customer = await createTestCustomer();

      const { data: job } = await supabase
        .from('jobs')
        .insert({
          customer_id: customer.id,
          appliance_type: 'Microwave',
          issue_description: 'UI TEST JOB - Performance',
          job_stage: 'Intake',
          current_status: 'New',
          is_callback: false,
          callback_count: 0,
          visit_count: 1,
          primary_job: true,
          added_on_site: false,
          combined_invoice: false,
          photo_count: 0,
          has_site_photos: false,
          has_diagnosis_photos: false,
          has_repair_photos: false
        })
        .select()
        .single();

      const startTime = Date.now();
      await page.goto(`/jobs/${job.id}`);
      await page.waitForSelector('h1');
      const loadTime = Date.now() - startTime;

      // Should load in less than 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

  });

});
