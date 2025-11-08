# Stage 5: Testing Preparation Guide

## Testing-First Development Approach

This guide outlines how to approach Stage 5 development using the testing-first methodology established in previous stages.

## Pre-Implementation Checklist

### 1. Define Stage 5 Features
Before writing any code, document:
- [ ] What features will be implemented?
- [ ] What user problems do they solve?
- [ ] What data structures are needed?
- [ ] What UI components are required?
- [ ] What API endpoints/database operations?

### 2. Identify Database Requirements
Document schema needs:
- [ ] New tables required?
- [ ] Modifications to existing tables?
- [ ] Column types and constraints (VARCHAR lengths, etc.)
- [ ] Foreign key relationships
- [ ] RLS policies needed?
- [ ] Indexes for performance?

### 3. Plan Test Scenarios
List test cases BEFORE coding:
- [ ] Happy path scenarios
- [ ] Edge cases
- [ ] Error conditions
- [ ] State transitions
- [ ] Data validation
- [ ] User workflows

### 4. Set Up Test Infrastructure
Prepare test file:
- [ ] Copy Stage 4 test template
- [ ] Update test suite name
- [ ] Add authenticateSupabase() function
- [ ] Create helper functions for test data
- [ ] Set up beforeAll/beforeEach/afterEach hooks
- [ ] Define cleanup functions

## Stage 4 Testing Template

Use this as your starting point for Stage 5:

```typescript
// tests/stages/stage05_[feature_name].test.ts
import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123'
};

// Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://frbulthijdpkeqdphnxc.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
);

// Authenticate Supabase client
async function authenticateSupabase() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  if (error) throw error;
  return data;
}

// Login helper
async function login(page: Page) {
  await page.goto('/login');

  // Clear localStorage to prevent state pollution
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

// Test data helpers
async function createTestCustomer() {
  const timestamp = Date.now().toString().slice(-8);
  const customerData = {
    customer_id: `C-${timestamp}`, // Max 10 chars
    customer_type: 'Residential',
    first_name: 'Test',
    last_name: 'Customer',
    phone_primary: '3075551234', // Max 10 digits
    email: `test-${timestamp}@example.com`,
    address_street: '123 Test St',
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

// Cleanup functions
async function cleanupTestData() {
  // Delete test customers created during tests
  await supabase
    .from('customers')
    .delete()
    .ilike('email', '%@example.com');
}

// Main test suite
test.describe('Stage 5: [Feature Name]', () => {

  test.beforeAll(async () => {
    // Authenticate Supabase client
    await authenticateSupabase();

    // Clean up any existing test data
    await cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    // Clean up before each test
    await cleanupTestData();

    // Login
    await login(page);

    // Wait for app to initialize
    await page.waitForTimeout(1500);
  });

  test.afterEach(async () => {
    // Clean up after each test
    await cleanupTestData();
  });

  // Your tests here
  test('Should [describe expected behavior]', async ({ page }) => {
    // Arrange - Set up test data

    // Act - Perform action

    // Assert - Verify results
  });

});
```

## Database Schema Best Practices

### From Stage 4 Lessons:

#### 1. VARCHAR Constraints
**Always document and respect VARCHAR limits:**
```typescript
// ❌ BAD - Will fail if too long
customer_id: `C-TEST-${Date.now()}` // ~20 characters

// ✅ GOOD - Respects VARCHAR(10) constraint
customer_id: `C-${Date.now().toString().slice(-8)}` // Exactly 10 characters
```

#### 2. Phone Number Fields
**Use numeric-only format:**
```typescript
// ❌ BAD - Has dashes, 12 characters
phone_primary: '307-555-1234'

// ✅ GOOD - Numeric only, 10 digits
phone_primary: '3075551234'
```

#### 3. Timestamp Fields
**Use ISO format with timezone:**
```typescript
// ✅ GOOD
created_at: new Date().toISOString()
// Output: "2025-11-02T19:10:06.738Z"
```

#### 4. Foreign Keys
**Always verify parent records exist:**
```typescript
// ✅ GOOD - Check before inserting
const customer = await createTestCustomer();
const job = await createTestJob(customer.id); // Use verified ID
```

## State Management Testing Strategy

### localStorage Handling
```typescript
// Always clear at start of test
await page.evaluate(() => {
  localStorage.clear();
});

// Test persistence
const storedData = await page.evaluate(() => {
  return localStorage.getItem('your-key');
});
expect(storedData).toBeTruthy();
```

### Database Synchronization
```typescript
// Verify UI matches database
const { data: dbRecord } = await supabase
  .from('table')
  .select('*')
  .eq('id', recordId)
  .single();

const uiValue = await page.textContent('[data-testid="field"]');
expect(uiValue).toBe(dbRecord.field_value);
```

### Component State
```typescript
// Verify state transitions
await page.click('[data-testid="start-button"]');
await page.waitForTimeout(1000);
await expect(page.locator('[data-testid="status"]')).toContainText('Active');
```

## Timing and Async Best Practices

### Wait Strategies
```typescript
// ✅ GOOD - Explicit waits
await page.waitForTimeout(1000); // After state changes
await page.waitForSelector('[data-testid="element"]'); // Before interactions

// ❌ BAD - No wait
await page.click('[data-testid="button"]');
expect(page.locator('[data-testid="result"]')).toBeVisible(); // May fail
```

### Duration Calculations
```typescript
// ✅ GOOD - Account for Math.floor behavior
expect(duration_minutes).toBeGreaterThanOrEqual(0); // Sub-minute activities

// Add comment explaining
// Can be 0 for sub-minute activities due to Math.floor()

// Consider for production code
const durationMinutes = Math.max(1, Math.floor(actualMinutes)); // Minimum 1 minute
```

## Test Data Patterns

### Test Data Factories
Create reusable factories for common entities:

```typescript
// Factory pattern
async function createTestCustomer(overrides = {}) {
  const timestamp = Date.now().toString().slice(-8);
  const defaults = {
    customer_id: `C-${timestamp}`,
    customer_type: 'Residential',
    first_name: 'Test',
    last_name: 'Customer',
    // ... other defaults
  };

  return await supabase
    .from('customers')
    .insert([{ ...defaults, ...overrides }])
    .select()
    .single();
}

// Usage with custom data
const customer = await createTestCustomer({
  first_name: 'John',
  customer_type: 'Commercial'
});
```

### Cleanup Strategies
```typescript
// Pattern 1: Email-based cleanup (recommended)
await supabase
  .from('customers')
  .delete()
  .ilike('email', '%@test.example.com');

// Pattern 2: Timestamp-based cleanup
const cutoffTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
await supabase
  .from('customers')
  .delete()
  .lt('created_at', cutoffTime)
  .ilike('email', '%@test%');

// Pattern 3: Test flag cleanup
await supabase
  .from('customers')
  .delete()
  .eq('is_test', true);
```

## RLS Policy Testing

### Always Authenticate Before Database Ops
```typescript
test.beforeAll(async () => {
  // ✅ REQUIRED - Otherwise RLS blocks operations
  await authenticateSupabase();
});
```

### Test RLS Policies Explicitly
```typescript
test('Should enforce RLS policies', async ({ page }) => {
  // Create record as authenticated user
  const record = await createTestRecord();

  // Create unauthenticated client
  const anonClient = createClient(supabaseUrl, anonKey);

  // Verify cannot access
  const { data, error } = await anonClient
    .from('table')
    .select('*')
    .eq('id', record.id);

  expect(error).toBeTruthy();
  expect(error.code).toBe('42501'); // RLS violation
});
```

## Test Organization

### Describe Blocks by Feature Area
```typescript
test.describe('Stage 5: Feature Name', () => {

  test.describe('Feature Area 1', () => {
    test('Should do X', async ({ page }) => { });
    test('Should do Y', async ({ page }) => { });
  });

  test.describe('Feature Area 2', () => {
    test('Should do Z', async ({ page }) => { });
  });

});
```

### Use Descriptive Test Names
```typescript
// ✅ GOOD - Clear what is being tested
test('Should display error message when form submitted with empty required fields', ...)

// ❌ BAD - Vague
test('Form validation', ...)
```

### Mark Critical Tests
```typescript
test('@critical Should save user data to database', async ({ page }) => {
  // Critical path test
});
```

## Common Pitfalls to Avoid

### 1. Not Cleaning Up Test Data
**Problem**: Tests fail on second run due to duplicate data
**Solution**: Always implement afterEach cleanup

### 2. Hard-Coding IDs
**Problem**: Tests fail when database IDs change
**Solution**: Generate IDs dynamically or query for them

### 3. Race Conditions
**Problem**: Tests fail intermittently
**Solution**: Use explicit waits, run with --workers=1

### 4. Assuming State
**Problem**: Test depends on previous test's state
**Solution**: Set up all required state in beforeEach

### 5. Over-Asserting
**Problem**: Tests break when unrelated UI changes
**Solution**: Assert only what's necessary for the test

## Test Execution Workflow

### Development Phase
```bash
# Run individual test while developing
npx playwright test tests/stages/stage05_*.test.ts:123 --project=chromium --workers=1 --headed

# Run test category
npx playwright test tests/stages/stage05_*.test.ts --grep "Feature Area" --project=chromium
```

### Validation Phase
```bash
# Run full suite
npx playwright test tests/stages/stage05_*.test.ts --project=chromium --workers=1

# Run with retries for flaky tests
npx playwright test tests/stages/stage05_*.test.ts --project=chromium --workers=1 --retries=2
```

### CI/CD Phase
```bash
# Run all stage tests
npx playwright test tests/stages/ --project=chromium --workers=1

# Generate report
npx playwright show-report
```

## Success Criteria

Before marking Stage 5 complete:

- [ ] All tests passing (≥90%)
- [ ] Test coverage documented
- [ ] Known issues documented
- [ ] Edge cases tested
- [ ] Error handling tested
- [ ] State persistence tested
- [ ] Database operations tested
- [ ] RLS policies verified
- [ ] Performance acceptable (<5 min test suite)
- [ ] No flaky tests (or documented with retries)

## Documentation Deliverables

Create these docs as you build Stage 5:

1. **Feature Specification** - What was built
2. **Test Plan** - What was tested
3. **Test Results** - Pass/fail summary
4. **Known Issues** - Bugs or limitations
5. **Lessons Learned** - Update this guide with new patterns

## Ready to Start?

Once you have:
1. ✅ Defined Stage 5 features
2. ✅ Designed database schema
3. ✅ Planned test scenarios
4. ✅ Set up test file using template
5. ✅ Created test data factories

You're ready to begin test-first development!

## Questions to Ask Before Starting

1. What existing features does Stage 5 depend on?
2. What new database tables/columns are needed?
3. What are the database constraint limits (VARCHAR, etc.)?
4. Will RLS policies affect the feature?
5. Does the feature involve state persistence?
6. Are there timing-sensitive operations?
7. What are the edge cases?
8. How will errors be handled?

Answer these questions first, then proceed with confidence!
