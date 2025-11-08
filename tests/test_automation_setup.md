# 🤖 Test Automation Setup Guide

## Quick Start

### 1. Install Playwright
```bash
npm init playwright@latest

# Choose:
# - TypeScript
# - tests folder
# - GitHub Actions: Yes
# - Install browsers: Yes
```

### 2. Install Additional Dependencies
```bash
npm install --save-dev @faker-js/faker
npm install --save-dev @axe-core/playwright  # For accessibility
npm install --save-dev dotenv  # For environment variables
```

### 3. Create Test Structure
```bash
mkdir -p tests/{stages,helpers,fixtures,reports}
```

---

## 📁 Project Structure

```
tests/
├── stages/
│   ├── stage01_foundation.test.ts
│   ├── stage02_customers.test.ts
│   ├── stage03_jobs.test.ts
│   └── ... (all 12 stages)
├── helpers/
│   ├── database.ts        # Database utilities
│   ├── auth.ts           # Auth helpers
│   ├── generators.ts     # Test data generators
│   └── api.ts            # API helpers
├── fixtures/
│   ├── users.json        # Test user data
│   ├── customers.json    # Test customers
│   └── parts.json        # Test parts
└── reports/
    └── (generated reports)
```

---

## 🔧 Configuration Files

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run stages sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'tests/reports/html' }],
    ['json', { outputFile: 'tests/reports/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'Stage 1: Foundation',
      testMatch: /stage01.*\.test\.ts/,
    },
    {
      name: 'Stage 2: Customers', 
      testMatch: /stage0[1-2].*\.test\.ts/,
      dependencies: ['Stage 1: Foundation'],
    },
    {
      name: 'Stage 3: Jobs',
      testMatch: /stage0[1-3].*\.test\.ts/,
      dependencies: ['Stage 2: Customers'],
    },
    // ... continue for all stages
    {
      name: 'Full E2E',
      testMatch: /full_e2e\.test\.ts/,
      dependencies: ['Stage 12: Polish'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
```

### .env.test
```bash
# Test environment variables - Use your actual Supabase cloud instance credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
TEST_USER_EMAIL=test@appliancemandan.com
TEST_USER_PASSWORD=testpass123
CLAUDE_API_KEY=test-api-key
```

---

## 🎭 Test Helpers

### helpers/database.ts
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export async function resetTestDatabase() {
  // Clear all test data
  await supabase.from('jobs').delete().neq('job_id', '');
  await supabase.from('customers').delete().neq('customer_id', '');
  await supabase.from('parts_transactions').delete().neq('id', '');
  
  // Reset sequences
  await supabase.rpc('reset_customer_sequence');
  await supabase.rpc('reset_job_sequence');
}

export async function seedTestData() {
  // Add test customers
  const customers = [
    { first_name: 'John', last_name: 'Doe', phone: '307-555-0001' },
    { first_name: 'Jane', last_name: 'Smith', phone: '307-555-0002' },
  ];
  
  for (const customer of customers) {
    await supabase.from('customers').insert(customer);
  }
  
  // Add test parts
  const parts = [
    { part_number: 'W10408179', description: 'Icemaker', avg_cost: 45.50 },
    { part_number: 'W10447783', description: 'Transmission', avg_cost: 125.00 },
  ];
  
  for (const part of parts) {
    await supabase.from('parts_master').insert(part);
  }
}

export { supabase };
```

### helpers/generators.ts
```typescript
import { faker } from '@faker-js/faker';

export function generateCustomer() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number('307-555-####'),
    email: faker.internet.email(),
    address: faker.location.streetAddress(),
    city: 'Buffalo',
    state: 'WY',
    zip: '82834',
  };
}

export function generateJob(customerId: string) {
  const appliances = ['Washer', 'Dryer', 'Refrigerator', 'Dishwasher', 'Oven'];
  const brands = ['Whirlpool', 'GE', 'Samsung', 'LG', 'Maytag'];
  const issues = ['Not starting', 'Leaking', 'Not heating', 'Making noise', 'Not cooling'];
  
  return {
    customerId,
    applianceType: faker.helpers.arrayElement(appliances),
    brand: faker.helpers.arrayElement(brands),
    modelNumber: faker.string.alphanumeric(10).toUpperCase(),
    issueDescription: faker.helpers.arrayElement(issues),
    scheduledDate: faker.date.future(),
  };
}

export function generatePart() {
  return {
    partNumber: faker.string.alphanumeric(10).toUpperCase(),
    description: faker.commerce.productName(),
    cost: faker.number.float({ min: 10, max: 200, precision: 0.01 }),
    quantity: faker.number.int({ min: 1, max: 10 }),
  };
}
```

### helpers/auth.ts
```typescript
import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
  await page.click('button:text("Login")');
  await page.waitForURL('/dashboard');
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('button:text("Logout")');
  await page.waitForURL('/login');
}
```

---

## 📝 Example Test Implementation

### tests/stages/stage01_foundation.test.ts
```typescript
import { test, expect } from '@playwright/test';
import { resetTestDatabase, seedTestData } from '../helpers/database';
import { login } from '../helpers/auth';

test.describe('Stage 1: Foundation & Auth', () => {
  test.beforeAll(async () => {
    await resetTestDatabase();
    await seedTestData();
  });

  test('Should connect to database', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.database).toBe('connected');
  });

  test('Should handle login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Check login form exists
    await expect(page.locator('form[data-testid="login-form"]')).toBeVisible();
    
    // Try invalid login
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpass');
    await page.click('button:text("Login")');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    
    // Valid login
    await login(page);
    await expect(page).toHaveURL('/dashboard');
    
    // Check user is authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('Should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    
    // Login and verify access
    await login(page);
    await page.goto('/jobs');
    await expect(page).toHaveURL('/jobs');
  });

  test('Should handle logout', async ({ page }) => {
    await login(page);
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('button:text("Logout")');
    
    await expect(page).toHaveURL('/login');
    
    // Verify can't access protected routes
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('Should verify all required tables exist', async ({ page }) => {
    await login(page);
    
    const tables = [
      'customers',
      'jobs',
      'parts_master',
      'parts_transactions',
      'tour_logs',
    ];
    
    for (const table of tables) {
      const response = await page.request.get(`/api/tables/${table}/exists`);
      expect(response.status()).toBe(200);
    }
  });
});
```

---

## 🚀 Running Tests

### Stage-by-Stage Commands
```bash
# Run specific stage
npm test -- --project="Stage 1: Foundation"
npm test -- --project="Stage 2: Customers"
npm test -- --project="Stage 3: Jobs"

# Run multiple stages (1-3)
npm test -- --project="Stage 1: Foundation" --project="Stage 2: Customers" --project="Stage 3: Jobs"

# Run all completed stages (example: stages 1-5)
npx playwright test tests/stages/stage0[1-5]*.test.ts

# Run with UI mode for debugging
npx playwright test --ui

# Run specific test file
npx playwright test tests/stages/stage01_foundation.test.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
```

### Debugging Tests
```bash
# Debug mode (opens inspector)
npx playwright test --debug

# Step through test
PWDEBUG=1 npx playwright test tests/stages/stage01_foundation.test.ts

# Generate trace for debugging
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Generate Reports
```bash
# Run tests and generate HTML report
npx playwright test --reporter=html

# View HTML report
npx playwright show-report

# Generate multiple reports
npx playwright test --reporter=html,json,junit

# Custom report location
npx playwright test --reporter=html:tests/reports/custom-report.html
```

---

## 🏷️ Test Tagging System

### Using Tags
```typescript
test('@smoke Should load dashboard quickly', async ({ page }) => {
  // Quick smoke test
});

test('@critical Customer ID must auto-generate', async ({ page }) => {
  // Critical business logic
});

test('@mobile Should be responsive', async ({ page }) => {
  // Mobile-specific test
});
```

### Running Tagged Tests
```bash
# Run only smoke tests
npx playwright test --grep @smoke

# Run critical tests
npx playwright test --grep @critical

# Run all except slow tests
npx playwright test --grep-invert @slow

# Run mobile tests
npx playwright test --grep @mobile
```

---

## 📊 Coverage Tracking

### Setup Coverage
```bash
npm install --save-dev @playwright/test nyc
```

### playwright.config.ts addition
```typescript
use: {
  // Enable coverage collection
  coverage: {
    enabled: true,
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.{ts,tsx}'],
  },
},
```

### Generate Coverage Report
```bash
# Run tests with coverage
npx playwright test --coverage

# Generate HTML coverage report
npx nyc report --reporter=html

# View coverage report
open coverage/index.html
```

---

## 🔄 CI/CD Integration

### GitHub Actions (.github/workflows/playwright.yml)
```yaml
name: Playwright Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        stage: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    
    steps:
    - uses: actions/checkout@v3
    
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    
    - name: Run Stage ${{ matrix.stage }} tests
      run: |
        npx playwright test tests/stages/stage$(printf "%02d" ${{ matrix.stage }})*.test.ts
    
    - uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report-stage-${{ matrix.stage }}
        path: playwright-report/
        retention-days: 30
```

---

## 🎯 Test Data Management

### Reset Between Tests
```typescript
test.beforeEach(async ({ page }) => {
  // Reset to clean state
  await resetTestDatabase();
  await seedTestData();
  await login(page);
});

test.afterEach(async ({ page }) => {
  // Clean up after test
  await logout(page);
});
```

### Preserve Data for Debugging
```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    // Don't clean up on failure for debugging
    console.log(`Test failed: ${testInfo.title}`);
    console.log(`Screenshot: ${testInfo.outputPath('screenshot.png')}`);
  } else {
    await resetTestDatabase();
  }
});
```

---

## 📱 Mobile Testing

### Mobile Viewport Tests
```typescript
test.describe('Mobile Tests', () => {
  test.use({ 
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });

  test('Should work on mobile', async ({ page }) => {
    await page.goto('/');
    // Mobile-specific tests
  });
});
```

### Device Emulation
```typescript
import { devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test('iPhone 13 test', async ({ page }) => {
  await page.goto('/');
  // iPhone-specific test
});
```

---

## ⚡ Performance Testing

### Measure Performance
```typescript
test('Should load dashboard quickly', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(2000); // Under 2 seconds
  
  // Check Core Web Vitals
  const metrics = await page.evaluate(() => ({
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
  }));
  
  expect(metrics.FCP).toBeLessThan(1000); // Under 1s
  expect(metrics.LCP).toBeLessThan(2500); // Under 2.5s
});
```

---

## 🔐 Security Testing

### Basic Security Checks
```typescript
test('Should prevent XSS attacks', async ({ page }) => {
  const xssPayload = '<script>alert("XSS")</script>';
  
  await page.fill('[name="customerName"]', xssPayload);
  await page.click('button:text("Save")');
  
  // Check script is not executed
  const alerts = [];
  page.on('dialog', dialog => alerts.push(dialog));
  
  await page.reload();
  expect(alerts).toHaveLength(0);
  
  // Check payload is escaped in display
  const displayed = await page.textContent('[data-testid="customer-name"]');
  expect(displayed).not.toContain('<script>');
});

test('Should prevent SQL injection', async ({ page }) => {
  const sqlPayload = "'; DROP TABLE customers; --";
  
  await page.fill('[name="search"]', sqlPayload);
  await page.click('button:text("Search")');
  
  // Table should still exist
  const response = await page.request.get('/api/tables/customers/exists');
  expect(response.status()).toBe(200);
});
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** Tests timeout
```typescript
// Increase timeout for slow operations
test('Slow test', async ({ page }) => {
  test.setTimeout(30000); // 30 seconds
  // ... test code
});
```

**Issue:** Flaky tests
```typescript
// Add proper waits
await page.waitForSelector('[data-testid="element"]');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Last resort
```

**Issue:** State pollution
```typescript
// Ensure clean state
test.beforeEach(async () => {
  await resetTestDatabase();
});
```

---

This setup guide provides everything needed to implement the staged testing plan!
