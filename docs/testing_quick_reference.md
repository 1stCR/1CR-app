# Testing Quick Reference Guide

Quick lookup for common patterns and solutions encountered in Stages 1-4 testing.

## Essential Test Setup

### Minimal Test Template
```typescript
import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123'
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function authenticateSupabase() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  if (error) throw error;
  return data;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.fill('[name="email"]', TEST_USER.email);
  await page.fill('[name="password"]', TEST_USER.password);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button:has-text("Sign in")')
  ]);
  await page.waitForTimeout(1000);
}

test.describe('Test Suite', () => {
  test.beforeAll(async () => {
    await authenticateSupabase();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1500);
  });

  test('Test name', async ({ page }) => {
    // Test body
  });
});
```

## Database Schema Constraints

### VARCHAR Limits
```typescript
// ✅ Customer ID (VARCHAR 10)
customer_id: `C-${Date.now().toString().slice(-8)}`  // "C-12345678"

// ✅ Phone Numbers (VARCHAR 10-20, numeric only)
phone_primary: '3075551234'  // No dashes

// ✅ Email (VARCHAR 255)
email: `test-${Date.now()}@example.com`

// ✅ Job ID (VARCHAR 10)
job_id: `J-${String(number).padStart(4, '0')}`  // "J-0001"
```

### Common Data Types
```typescript
// Timestamps
created_at: new Date().toISOString()  // "2025-11-02T19:10:06.738Z"

// Booleans
is_active: true

// Numbers
count: 0
price: 99.99

// Enums/Text
status: 'Active' | 'Inactive' | 'Pending'
```

## Test Data Creation

### Customer
```typescript
async function createTestCustomer() {
  const timestamp = Date.now().toString().slice(-8);
  return await supabase
    .from('customers')
    .insert([{
      customer_id: `C-${timestamp}`,
      customer_type: 'Residential',
      first_name: 'Test',
      last_name: 'Customer',
      phone_primary: '3075551234',
      email: `test-${timestamp}@example.com`,
      address_street: '123 Test St',
      city: 'Mandan',
      state: 'ND',
      zip: '58554',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
}
```

### Job
```typescript
async function createTestJob(customer) {
  const { data: lastJob } = await supabase
    .from('jobs')
    .select('job_id')
    .order('job_id', { ascending: false })
    .limit(1)
    .single();

  const nextNumber = lastJob
    ? parseInt(lastJob.job_id.split('-')[1]) + 1
    : 1;

  return await supabase
    .from('jobs')
    .insert([{
      job_id: `J-${String(nextNumber).padStart(4, '0')}`,
      customer_id: customer.id,
      appliance_type: 'Refrigerator',
      issue_description: 'TEST JOB',
      job_stage: 'Intake',
      current_status: 'New',
      scheduled_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
}
```

## Cleanup Patterns

### Email-based (Recommended)
```typescript
await supabase
  .from('customers')
  .delete()
  .ilike('email', '%@example.com');
```

### Description-based (for jobs)
```typescript
await supabase
  .from('jobs')
  .delete()
  .ilike('issue_description', '%TEST JOB%');
```

### Date-based (for tours)
```typescript
const today = new Date().toISOString().split('T')[0];
await supabase
  .from('tours')
  .delete()
  .eq('tour_date', today);
```

## Common Wait Patterns

```typescript
// After navigation
await page.goto('/path');
await page.waitForTimeout(1000);

// After clicking button
await page.click('[data-testid="button"]');
await page.waitForTimeout(1000);

// Before checking element
await page.waitForSelector('[data-testid="element"]');

// After form submission
await Promise.all([
  page.waitForNavigation(),
  page.click('button[type="submit"]')
]);

// For app initialization
await page.waitForTimeout(1500);
```

## Assertion Patterns

### Element Visibility
```typescript
await expect(page.locator('[data-testid="element"]')).toBeVisible();
await expect(page.locator('[data-testid="element"]')).not.toBeVisible();
```

### Text Content
```typescript
await expect(page.locator('[data-testid="element"]')).toContainText('Expected');
await expect(page.locator('[data-testid="element"]')).toHaveText('Exact Match');
```

### Form Values
```typescript
await expect(page.locator('input[name="field"]')).toHaveValue('value');
```

### Database Records
```typescript
const { data } = await supabase
  .from('table')
  .select('*')
  .eq('id', recordId)
  .single();

expect(data).not.toBeNull();
expect(data.field).toBe('expected value');
```

### Counts
```typescript
expect(array.length).toBe(5);
expect(array.length).toBeGreaterThan(0);
expect(array.length).toBeGreaterThanOrEqual(0); // For sub-minute durations
```

## Common Issues & Solutions

### Issue: RLS Policy Violation
```
Error: new row violates row-level security policy
```
**Solution**: Add `await authenticateSupabase()` in `test.beforeAll()`

---

### Issue: localStorage Pollution
```
Error: Widget showing "Completed" instead of "Not Started"
```
**Solution**: `await page.evaluate(() => localStorage.clear())` in login()

---

### Issue: VARCHAR Constraint
```
Error: value too long for type character varying(10)
```
**Solution**: Check schema limits, use `.slice(-8)` for timestamps

---

### Issue: Element Not Found
```
Error: element(s) not found
```
**Solutions**:
1. Add `await page.waitForTimeout(1000)` after navigation
2. Check data-testid spelling
3. Verify element actually renders in this state

---

### Issue: Duration is 0
```
Error: Expected: > 0, Received: 0
```
**Solution**: Use `toBeGreaterThanOrEqual(0)` for sub-minute durations

---

### Issue: Test Timeout
```
Error: Test timeout of 30000ms exceeded
```
**Solutions**:
1. Increase timeout: `test('name', async ({ page }) => { }, { timeout: 60000 });`
2. Add wait after slow operations
3. Check for infinite loops or hanging promises

---

### Issue: Flaky Tests
**Solutions**:
1. Use `--workers=1` to eliminate race conditions
2. Add explicit waits instead of relying on implicit timing
3. Use `--retries=2` for acceptable flakiness
4. Check for shared state between tests

## Test Execution Commands

```bash
# Run specific test file
npx playwright test tests/stages/stage04_tour_system.test.ts --project=chromium --workers=1

# Run specific test by line number
npx playwright test tests/stages/stage04_tour_system.test.ts:204 --project=chromium --workers=1

# Run with headed browser (see what's happening)
npx playwright test tests/stages/stage04_tour_system.test.ts --project=chromium --workers=1 --headed

# Run with debug mode
npx playwright test tests/stages/stage04_tour_system.test.ts --project=chromium --workers=1 --debug

# Run tests matching pattern
npx playwright test --grep "@critical" --project=chromium

# Run with retries (for flaky tests)
npx playwright test tests/stages/stage04_tour_system.test.ts --project=chromium --workers=1 --retries=2

# View HTML report
npx playwright show-report
```

## Debugging Tips

### Take Screenshot
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### Log Page HTML
```typescript
const html = await page.content();
console.log(html);
```

### Log All Test IDs
```typescript
const testIds = await page.evaluate(() => {
  const elements = document.querySelectorAll('[data-testid]');
  return Array.from(elements).map(el => el.getAttribute('data-testid'));
});
console.log('Found test IDs:', testIds);
```

### Log localStorage
```typescript
const storage = await page.evaluate(() => {
  return JSON.stringify(window.localStorage);
});
console.log('localStorage:', storage);
```

### Pause Execution
```typescript
await page.pause(); // Opens Playwright Inspector
```

## Test Organization Best Practices

### Use Describe Blocks
```typescript
test.describe('Feature Area', () => {
  test.describe('Sub-feature', () => {
    test('Specific behavior', async ({ page }) => { });
  });
});
```

### Mark Critical Tests
```typescript
test('@critical Should save data', async ({ page }) => { });
```

### Add Dependency Comments
```typescript
// DEPENDENCY: Requires active tour
test('Should track activity', async ({ page }) => { });
```

### Use Descriptive Names
```typescript
// ✅ GOOD
test('Should display error when email is invalid', ...)

// ❌ BAD
test('Email validation', ...)
```

## Performance Tips

### Parallel-Safe Operations
```typescript
// Can run in parallel (independent)
const [customer, part] = await Promise.all([
  createTestCustomer(),
  createTestPart()
]);
```

### Sequential Required Operations
```typescript
// Must run sequentially (dependent)
const customer = await createTestCustomer();
const job = await createTestJob(customer.id);
```

### Batch Database Operations
```typescript
// ✅ GOOD - Single query
await supabase.from('customers').delete().in('id', [id1, id2, id3]);

// ❌ BAD - Multiple queries
await supabase.from('customers').delete().eq('id', id1);
await supabase.from('customers').delete().eq('id', id2);
await supabase.from('customers').delete().eq('id', id3);
```

## Success Checklist

Before marking stage complete:

- [ ] All tests passing (≥90%)
- [ ] No hard-coded values (IDs, timestamps)
- [ ] Cleanup functions working
- [ ] RLS authenticated
- [ ] localStorage cleared
- [ ] Explicit waits added
- [ ] Data constraints respected
- [ ] Test IDs added to UI
- [ ] Edge cases tested
- [ ] Error handling tested

## File Locations

- **Test files**: `tests/stages/stage0X_*.test.ts`
- **Test config**: `playwright.config.ts`
- **Environment**: `.env.test`
- **Documentation**: `docs/`
- **Test reports**: `playwright-report/`

## Need Help?

1. Check `docs/stage04_testing_summary.md` for detailed lessons learned
2. Check `docs/stage05_testing_preparation.md` for comprehensive guide
3. Review passing tests in `tests/stages/` for working examples
4. Run with `--headed` to see what's happening
5. Use `page.pause()` to debug interactively

---

**Remember**: Test first, code second. When in doubt, add a wait. Always clean up after yourself.
