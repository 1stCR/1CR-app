# End-to-End Testing Specification for Appliance Management System

## 🎯 Testing Agent Instructions

You are an automated testing agent using Playwright MCP to thoroughly test the Appliance Management System. Execute all test suites systematically and report any failures with screenshots and detailed error descriptions.

## 🌐 Application Overview

**Application:** Field Service Management System for Appliance Repair Business
**URL:** http://localhost:5174 (development) or https://appliance-manager.vercel.app (production)
**Tech Stack:** React + TypeScript + Vite + Supabase + Tailwind CSS
**Authentication:** Email/Password via Supabase Auth

## 🔑 Test Credentials

```javascript
const TEST_ACCOUNTS = {
  technician: {
    email: 'tech@appliancetest.com',
    password: 'TestPass123!'
  },
  newUser: {
    email: 'newuser@appliancetest.com',
    password: 'NewUser123!'
  }
}

const TEST_CUSTOMER = {
  residential: {
    firstName: 'John',
    lastName: 'TestCustomer',
    phone: '307-555-0001',
    email: 'john.test@example.com',
    address: '123 Test Street',
    city: 'Buffalo',
    state: 'WY',
    zip: '82834'
  },
  commercial: {
    businessName: 'Test Restaurant LLC',
    firstName: 'Jane',
    lastName: 'Manager',
    phone: '307-555-0002',
    email: 'manager@testrestaurant.com'
  }
}
```

## 📋 CRITICAL TEST SUITES

### **SUITE 1: Authentication & Authorization**

```javascript
test.describe('Authentication Flow', () => {
  test('Should create new account successfully', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Fill signup form
    await page.fill('input[name="email"]', TEST_ACCOUNTS.newUser.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.newUser.password);
    await page.fill('input[name="confirm-password"]', TEST_ACCOUNTS.newUser.password);
    
    // Submit and verify redirect to dashboard
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Should login with existing account', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ACCOUNTS.technician.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.technician.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('Should protect routes when not authenticated', async ({ page }) => {
    // Clear session
    await page.context().clearCookies();
    
    // Try to access protected routes
    await page.goto('/customers');
    await expect(page).toHaveURL('/login');
    
    await page.goto('/jobs');
    await expect(page).toHaveURL('/login');
  });

  test('Should logout successfully', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_ACCOUNTS.technician);
    
    // Click logout
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL('/login');
  });
});
```

### **SUITE 2: Customer Management**

```javascript
test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers');
  });

  test('Should auto-generate customer ID in sequence', async ({ page }) => {
    // Create first customer
    await page.click('button:has-text("Add Customer")');
    await page.fill('input[name="first_name"]', 'First');
    await page.fill('input[name="last_name"]', 'Customer');
    await page.click('button:has-text("Create Customer")');
    
    // Verify C-0001
    await expect(page.locator('text=C-0001')).toBeVisible();
    
    // Create second customer
    await page.click('button:has-text("Add Customer")');
    await page.fill('input[name="first_name"]', 'Second');
    await page.fill('input[name="last_name"]', 'Customer');
    await page.click('button:has-text("Create Customer")');
    
    // Verify C-0002
    await expect(page.locator('text=C-0002')).toBeVisible();
  });

  test('Should create residential customer', async ({ page }) => {
    await page.click('button:has-text("Add Customer")');
    
    // Select residential
    await page.click('button:has-text("Residential")');
    
    // Fill form
    await page.fill('input[name="first_name"]', TEST_CUSTOMER.residential.firstName);
    await page.fill('input[name="last_name"]', TEST_CUSTOMER.residential.lastName);
    await page.fill('input[name="phone_primary"]', TEST_CUSTOMER.residential.phone);
    await page.fill('input[name="email"]', TEST_CUSTOMER.residential.email);
    await page.fill('input[name="address_street"]', TEST_CUSTOMER.residential.address);
    await page.fill('input[name="city"]', TEST_CUSTOMER.residential.city);
    await page.selectOption('select[name="state"]', TEST_CUSTOMER.residential.state);
    await page.fill('input[name="zip"]', TEST_CUSTOMER.residential.zip);
    
    // Submit
    await page.click('button:has-text("Create Customer")');
    
    // Verify creation
    await expect(page.locator(`text=${TEST_CUSTOMER.residential.firstName}`)).toBeVisible();
    await expect(page.locator('text=Residential')).toBeVisible();
  });

  test('Should create commercial customer with contacts', async ({ page }) => {
    // Create commercial customer
    await page.click('button:has-text("Add Customer")');
    await page.click('button:has-text("Commercial")');
    
    // Business name should appear
    await expect(page.locator('input[name="business_name"]')).toBeVisible();
    
    await page.fill('input[name="business_name"]', TEST_CUSTOMER.commercial.businessName);
    await page.fill('input[name="first_name"]', TEST_CUSTOMER.commercial.firstName);
    await page.fill('input[name="last_name"]', TEST_CUSTOMER.commercial.lastName);
    await page.click('button:has-text("Create Customer")');
    
    // Go to customer detail
    await page.click(`text=${TEST_CUSTOMER.commercial.businessName}`);
    
    // Add additional contact
    await page.click('button:has-text("Add Contact")');
    await page.fill('input[placeholder="Contact Name"]', 'Assistant Manager');
    await page.fill('input[placeholder="Role"]', 'Assistant');
    await page.fill('input[placeholder="Phone"]', '307-555-0003');
    await page.click('button:has-text("Save Contact")');
    
    // Verify contact added
    await expect(page.locator('text=Assistant Manager')).toBeVisible();
  });

  test('Should search customers', async ({ page }) => {
    // Search by name
    await page.fill('input[placeholder*="Search customers"]', 'John');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    
    // Search by phone
    await page.fill('input[placeholder*="Search customers"]', '307-555');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    
    // Search with no results
    await page.fill('input[placeholder*="Search customers"]', 'NonexistentCustomer');
    await expect(page.locator('text=No customers found')).toBeVisible();
  });

  test('Should filter by customer type', async ({ page }) => {
    // Filter residential
    await page.click('button:has-text("Residential")');
    const residentialRows = await page.locator('text=Residential').count();
    expect(residentialRows).toBeGreaterThan(0);
    
    // Filter commercial
    await page.click('button:has-text("Commercial")');
    const commercialRows = await page.locator('text=Commercial').count();
    expect(commercialRows).toBeGreaterThan(0);
  });

  test('Should edit customer information', async ({ page }) => {
    // Click edit on first customer
    await page.click('table tbody tr:first-child a:has-text("Edit")');
    
    // Update phone number
    await page.fill('input[name="phone_primary"]', '307-555-9999');
    await page.click('button:has-text("Update Customer")');
    
    // Verify update
    await expect(page.locator('text=307-555-9999')).toBeVisible();
  });

  test('Should delete customer with confirmation', async ({ page }) => {
    const customerName = 'DeleteMe Customer';
    
    // Create customer to delete
    await page.click('button:has-text("Add Customer")');
    await page.fill('input[name="first_name"]', 'DeleteMe');
    await page.fill('input[name="last_name"]', 'Customer');
    await page.click('button:has-text("Create Customer")');
    
    // Delete with confirmation
    page.on('dialog', dialog => dialog.accept());
    await page.click(`tr:has-text("${customerName}") button[aria-label="Delete"]`);
    
    // Verify deletion
    await expect(page.locator(`text=${customerName}`)).not.toBeVisible();
  });
});
```

### **SUITE 3: Job Management**

```javascript
test.describe('Job Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
  });

  test('Should auto-generate job ID in sequence', async ({ page }) => {
    await page.goto('/jobs');
    
    // Create first job
    await createJob(page, 'J-0001');
    
    // Create second job
    await createJob(page, 'J-0002');
    
    // Verify both IDs exist
    await page.goto('/jobs');
    await expect(page.locator('text=J-0001')).toBeVisible();
    await expect(page.locator('text=J-0002')).toBeVisible();
  });

  test('Should complete job creation wizard', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Step 1: Select Customer
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();
    await page.click('div:has-text("John TestCustomer")');
    await page.click('button:has-text("Next")');
    
    // Step 2: Appliance & Issue
    await expect(page.locator('text=Step 2 of 3')).toBeVisible();
    await page.selectOption('select[name="appliance_type"]', 'Refrigerator');
    await page.fill('input[name="brand"]', 'Whirlpool');
    await page.fill('input[name="model_number"]', 'WRF555SDFZ');
    await page.fill('textarea[name="issue_description"]', 'Not cooling properly');
    await page.click('button:has-text("Next")');
    
    // Step 3: Schedule
    await expect(page.locator('text=Step 3 of 3')).toBeVisible();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="date"]', tomorrow.toISOString().split('T')[0]);
    await page.selectOption('select[name="scheduled_time_window"]', '10:00 AM - 12:00 PM');
    
    // Submit
    await page.click('button:has-text("Create Job")');
    
    // Verify redirect to job detail
    await expect(page).toHaveURL(/\/jobs\/[a-f0-9-]+$/);
    await expect(page.locator('text=Refrigerator')).toBeVisible();
  });

  test('Should track job stages correctly', async ({ page }) => {
    // Create a job
    const jobId = await createJob(page);
    
    // Go to job detail
    await page.goto(`/jobs/${jobId}`);
    
    // Verify initial stage
    await expect(page.locator('text=Intake')).toBeVisible();
    
    // Update to Diagnosis
    await page.click('button:has-text("Update Status")');
    await page.selectOption('select[name="stage"]', 'Diagnosis');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Diagnosis')).toBeVisible();
    
    // Update to Parts
    await page.click('button:has-text("Update Status")');
    await page.selectOption('select[name="stage"]', 'Parts');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Parts')).toBeVisible();
    
    // Update to Repair
    await page.click('button:has-text("Update Status")');
    await page.selectOption('select[name="stage"]', 'Repair');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Repair')).toBeVisible();
    
    // Complete job
    await page.click('button:has-text("Complete Job")');
    await expect(page.locator('text=Complete')).toBeVisible();
  });

  test('Should create callback job', async ({ page }) => {
    // Create original job first
    const originalJobId = await createJob(page);
    
    // Go to job detail
    await page.goto(`/jobs/${originalJobId}`);
    
    // Create callback
    await page.click('button:has-text("Create Callback")');
    await page.selectOption('select[name="callback_reason"]', 'Same Issue - Our Fault');
    await page.click('button:has-text("Create Callback Job")');
    
    // Verify callback job created
    await expect(page.locator('text=Callback')).toBeVisible();
    await expect(page.locator('text=Original Job: J-')).toBeVisible();
  });

  test('Should track multiple visits', async ({ page }) => {
    const jobId = await createJob(page);
    await page.goto(`/jobs/${jobId}`);
    
    // Add second visit
    await page.click('button:has-text("Add Visit")');
    await page.selectOption('select[name="visit_type"]', 'Repair');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    await page.fill('input[name="visit_date"]', nextWeek.toISOString().split('T')[0]);
    await page.click('button:has-text("Save Visit")');
    
    // Verify visits
    await expect(page.locator('text=Visit #1')).toBeVisible();
    await expect(page.locator('text=Visit #2')).toBeVisible();
  });

  test('Should filter jobs by stage', async ({ page }) => {
    await page.goto('/jobs');
    
    // Filter by Intake
    await page.selectOption('select[name="stage_filter"]', 'Intake');
    const intakeJobs = await page.locator('td:has-text("Intake")').count();
    expect(intakeJobs).toBeGreaterThan(0);
    
    // Filter by Complete
    await page.selectOption('select[name="stage_filter"]', 'Complete');
    // Should show completed jobs or "No jobs found"
  });
});
```

### **SUITE 4: Tour System (Time Tracking)**

```javascript
test.describe('Tour Time Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/tour');
  });

  test('Should start and end tour', async ({ page }) => {
    // Start tour
    await page.click('button:has-text("Start Tour")');
    await expect(page.locator('text=Tour Active')).toBeVisible();
    
    // Timer should be running
    await expect(page.locator('[data-testid="tour-timer"]')).toBeVisible();
    
    // End tour
    await page.click('button:has-text("End Tour")');
    page.on('dialog', dialog => dialog.accept()); // Confirm
    
    await expect(page.locator('text=No Active Tour')).toBeVisible();
  });

  test('Should track activities at job', async ({ page }) => {
    // Start tour
    await page.click('button:has-text("Start Tour")');
    
    // Select job
    await page.click('button:has-text("Select Job")');
    await page.click('div:has-text("J-0001")');
    
    // Arrive at job
    await page.click('button:has-text("Arrive at Job")');
    await page.selectOption('select[name="activity"]', 'Diagnosis');
    
    // Switch activities
    await page.click('button:has-text("Switch to Repair")');
    await expect(page.locator('text=Current Activity: Repair')).toBeVisible();
    
    // Take break
    await page.click('button:has-text("Start Break")');
    await expect(page.locator('text=ON BREAK')).toBeVisible();
    
    // End break
    await page.click('button:has-text("Resume Tour")');
    
    // Depart job
    await page.click('button:has-text("Depart Job")');
  });

  test('Should calculate mileage automatically', async ({ page }) => {
    // Start tour with home address
    await page.click('button:has-text("Start Tour")');
    
    // Arrive at first job (should calculate distance)
    await page.click('button:has-text("Arrive at Job")');
    await page.selectOption('select[name="job"]', 'J-0001');
    
    // Check mileage recorded
    await expect(page.locator('[data-testid="tour-mileage"]')).not.toHaveText('0.0');
  });

  test('Should handle research mode', async ({ page }) => {
    // Start tour
    await page.click('button:has-text("Start Tour")');
    
    // Enter research mode
    await page.click('button:has-text("Research Mode")');
    await page.selectOption('select[name="research_job"]', 'J-0002');
    
    // Research timer should start
    await expect(page.locator('text=Research Timer')).toBeVisible();
    
    // End research
    await page.click('button:has-text("End Research")');
  });
});
```

### **SUITE 5: Parts Inventory**

```javascript
test.describe('Parts Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/parts');
  });

  test('Should add part to inventory', async ({ page }) => {
    await page.click('button:has-text("Add Part")');
    
    await page.fill('input[name="part_number"]', 'W10408179');
    await page.fill('input[name="description"]', 'Whirlpool Icemaker');
    await page.selectOption('select[name="category"]', 'Icemaker');
    await page.fill('input[name="brand"]', 'Whirlpool');
    await page.fill('input[name="quantity"]', '5');
    await page.fill('input[name="cost"]', '45.50');
    await page.fill('input[name="markup"]', '20');
    
    await page.click('button:has-text("Add to Inventory")');
    
    // Verify part added
    await expect(page.locator('text=W10408179')).toBeVisible();
    await expect(page.locator('text=5 in stock')).toBeVisible();
  });

  test('Should track FIFO costing', async ({ page }) => {
    const partNumber = 'FIFO-TEST-001';
    
    // Add part at $10
    await addPartToInventory(page, partNumber, 3, 10.00);
    
    // Add more at $12
    await addPartToInventory(page, partNumber, 2, 12.00);
    
    // Use 1 part (should use $10 cost)
    await page.goto('/jobs/new');
    // ... create job and add part
    
    // Verify FIFO cost used
    await page.goto('/parts');
    await page.click(`tr:has-text("${partNumber}") a:has-text("View Transactions")`);
    await expect(page.locator('text=Used from stock - Cost: $10.00')).toBeVisible();
  });

  test('Should trigger auto-replenishment alert', async ({ page }) => {
    // Set min stock
    await page.click('tr:has-text("W10408179") button:has-text("Edit")');
    await page.fill('input[name="min_stock"]', '3');
    await page.check('input[name="auto_replenish"]');
    await page.click('button:has-text("Save")');
    
    // Use parts to trigger alert
    // ... simulate using parts to go below min
    
    // Check for alert
    await expect(page.locator('text=Low Stock Alert')).toBeVisible();
    await expect(page.locator('text=W10408179 below minimum')).toBeVisible();
  });

  test('Should handle multiple storage locations', async ({ page }) => {
    await page.click('button:has-text("Manage Locations")');
    
    // Add truck location
    await page.click('button:has-text("Add Location")');
    await page.selectOption('select[name="location_type"]', 'Vehicle');
    await page.fill('input[name="location_name"]', 'Truck #1');
    await page.click('button:has-text("Save")');
    
    // Add bin
    await page.click('button:has-text("Add Sub-Location")');
    await page.fill('input[name="location_name"]', 'Bin A (Red)');
    await page.click('button:has-text("Save")');
    
    // Transfer part
    await page.goto('/parts');
    await page.click('tr:has-text("W10408179") button:has-text("Transfer")');
    await page.selectOption('select[name="to_location"]', 'Truck #1 > Bin A (Red)');
    await page.fill('input[name="quantity"]', '2');
    await page.click('button:has-text("Transfer")');
    
    // Verify location updated
    await expect(page.locator('text=Truck #1 > Bin A')).toBeVisible();
  });
});
```

### **SUITE 6: AI Integration**

```javascript
test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
  });

  test('Should auto-lookup cross-references for new part', async ({ page }) => {
    await page.goto('/parts');
    await page.click('button:has-text("Add Part")');
    
    // Enter new part number
    await page.fill('input[name="part_number"]', 'NEW-PART-123');
    
    // Wait for AI lookup (mock or real)
    await page.waitForTimeout(2000);
    
    // Should show cross-references
    await expect(page.locator('text=Cross-References Found')).toBeVisible();
    await expect(page.locator('text=Compatible Parts')).toBeVisible();
  });

  test('Should show AI-generated repair guides', async ({ page }) => {
    await page.goto('/jobs/[job-id]');
    
    // Click on model compilation
    await page.click('button:has-text("View Repair Aids")');
    
    // Should show AI-generated content
    await expect(page.locator('text=Service Manual')).toBeVisible();
    await expect(page.locator('text=Common Issues')).toBeVisible();
    await expect(page.locator('text=Testing Procedures')).toBeVisible();
  });
});
```

### **SUITE 7: Quote & Invoice Generation**

```javascript
test.describe('Quoting and Invoicing', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
  });

  test('Should generate quote with proper calculations', async ({ page }) => {
    const jobId = await createJob(page);
    await page.goto(`/jobs/${jobId}`);
    
    // Add diagnosis
    await page.click('button:has-text("Add Diagnosis")');
    await page.fill('textarea[name="diagnosis"]', 'Needs new compressor');
    
    // Add part
    await page.click('button:has-text("Add Part")');
    await page.fill('input[name="part_number"]', 'COMP-123');
    await page.fill('input[name="part_cost"]', '250.00');
    
    // Set labor hours
    await page.fill('input[name="labor_hours"]', '2.5');
    
    // Generate quote
    await page.click('button:has-text("Generate Quote")');
    
    // Verify calculations
    // Service fee: $85
    // Parts: $250 * 1.2 (20% markup) = $300
    // Labor: 2.5 * $75 = $187.50
    // Subtotal: $572.50
    // Tax (6%): $34.35
    // Total: $606.85
    
    await expect(page.locator('text=$606.85')).toBeVisible();
  });

  test('Should apply callback pricing correctly', async ({ page }) => {
    // Create callback job
    const jobId = await createCallbackJob(page, 'Same Issue - Our Fault');
    await page.goto(`/jobs/${jobId}`);
    
    // Generate quote
    await page.click('button:has-text("Generate Quote")');
    
    // Should show no charge for warranty
    await expect(page.locator('text=No Charge - Warranty')).toBeVisible();
    await expect(page.locator('text=$0.00')).toBeVisible();
  });

  test('Should handle payment tracking', async ({ page }) => {
    const jobId = await createJobWithInvoice(page);
    await page.goto(`/jobs/${jobId}`);
    
    // Mark as paid
    await page.click('button:has-text("Record Payment")');
    await page.selectOption('select[name="payment_method"]', 'Credit Card');
    await page.fill('input[name="amount_paid"]', '606.85');
    await page.fill('input[name="reference"]', 'AUTH-12345');
    await page.click('button:has-text("Save Payment")');
    
    // Verify payment recorded
    await expect(page.locator('text=PAID')).toBeVisible();
    await expect(page.locator('text=Credit Card')).toBeVisible();
  });
});
```

### **SUITE 8: Dashboard & Analytics**

```javascript
test.describe('Dashboard and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/');
  });

  test('Should display accurate dashboard stats', async ({ page }) => {
    // Check all stat cards
    await expect(page.locator('[data-testid="total-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="parts-in-stock"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible();
    
    // Stats should be numbers
    const customerCount = await page.locator('[data-testid="total-customers"]').textContent();
    expect(parseInt(customerCount)).toBeGreaterThanOrEqual(0);
  });

  test('Should show recent customers widget', async ({ page }) => {
    await expect(page.locator('text=Recent Customers')).toBeVisible();
    
    // Should show up to 5 recent customers
    const customerItems = await page.locator('[data-testid="recent-customer-item"]').count();
    expect(customerItems).toBeLessThanOrEqual(5);
  });

  test('Should show FCC rate analytics', async ({ page }) => {
    await page.goto('/analytics');
    
    // Check FCC metrics
    await expect(page.locator('text=First Call Completion Rate')).toBeVisible();
    await expect(page.locator('[data-testid="fcc-percentage"]')).toBeVisible();
    
    // Should show percentage
    const fccRate = await page.locator('[data-testid="fcc-percentage"]').textContent();
    expect(fccRate).toMatch(/\d+%/);
  });
});
```

### **SUITE 9: Mobile Responsiveness**

```javascript
test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('Should show mobile menu', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    
    // Menu should be hidden, hamburger visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await expect(page.locator('nav.sidebar')).not.toBeVisible();
    
    // Open menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('nav.sidebar')).toBeVisible();
  });

  test('Should handle touch interactions', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers');
    
    // Swipe actions should work
    const customer = page.locator('table tbody tr').first();
    await customer.swipe({ direction: 'left' });
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });

  test('Should display forms properly on mobile', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers/new');
    
    // Form should be single column
    const formWidth = await page.locator('form').boundingBox();
    expect(formWidth.width).toBeLessThan(400);
    
    // Inputs should be full width
    const inputWidth = await page.locator('input[name="first_name"]').boundingBox();
    expect(inputWidth.width).toBeGreaterThan(300);
  });
});
```

### **SUITE 10: Data Integrity**

```javascript
test.describe('Data Integrity', () => {
  test('Should prevent duplicate customer IDs', async ({ page }) => {
    // Attempt to create duplicate ID (should auto-increment)
    const customer1 = await createCustomer(page);
    const customer2 = await createCustomer(page);
    
    expect(customer1.id).not.toBe(customer2.id);
  });

  test('Should cascade delete properly', async ({ page }) => {
    // Create customer with jobs
    const customerId = await createCustomer(page);
    const jobId = await createJobForCustomer(page, customerId);
    
    // Delete customer
    await deleteCustomer(page, customerId);
    
    // Job should also be deleted or orphaned properly
    await page.goto(`/jobs/${jobId}`);
    await expect(page.locator('text=Job not found')).toBeVisible();
  });

  test('Should maintain referential integrity', async ({ page }) => {
    // Try to create job without customer
    await page.goto('/api/jobs');
    const response = await page.evaluate(async () => {
      return await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliance_type: 'Test' })
      });
    });
    
    expect(response.status).toBe(400);
  });
});
```

## 🔍 Edge Cases to Test

```javascript
test.describe('Edge Cases', () => {
  test('Should handle network disconnection gracefully', async ({ page, context }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    
    // Go offline
    await context.setOffline(true);
    
    // Try to save
    await page.goto('/customers/new');
    await page.fill('input[name="first_name"]', 'Offline');
    await page.click('button:has-text("Create Customer")');
    
    // Should show error message
    await expect(page.locator('text=Network error')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Retry should work
    await page.click('button:has-text("Retry")');
    await expect(page.locator('text=Customer created')).toBeVisible();
  });

  test('Should handle concurrent updates', async ({ browser }) => {
    // Open two sessions
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await loginUser(page1, TEST_ACCOUNTS.technician);
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await loginUser(page2, TEST_ACCOUNTS.technician);
    
    // Both edit same customer
    const customerId = 'test-customer-id';
    await page1.goto(`/customers/${customerId}/edit`);
    await page2.goto(`/customers/${customerId}/edit`);
    
    // Save from page1
    await page1.fill('input[name="phone_primary"]', '111-111-1111');
    await page1.click('button:has-text("Update Customer")');
    
    // Save from page2 should detect conflict
    await page2.fill('input[name="phone_primary"]', '222-222-2222');
    await page2.click('button:has-text("Update Customer")');
    
    await expect(page2.locator('text=This record was modified')).toBeVisible();
  });

  test('Should handle maximum input lengths', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers/new');
    
    // Test max length inputs
    const longString = 'a'.repeat(500);
    await page.fill('input[name="first_name"]', longString);
    
    // Should truncate or show error
    const value = await page.inputValue('input[name="first_name"]');
    expect(value.length).toBeLessThanOrEqual(100);
  });

  test('Should handle special characters', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers/new');
    
    // Test special characters
    await page.fill('input[name="first_name"]', "O'Brien");
    await page.fill('input[name="business_name"]', 'Smith & Sons, LLC');
    await page.fill('input[name="email"]', 'test+tag@example.com');
    
    await page.click('button:has-text("Create Customer")');
    
    // Should save correctly
    await expect(page.locator("text=O'Brien")).toBeVisible();
    await expect(page.locator('text=Smith & Sons, LLC')).toBeVisible();
  });
});
```

## 📊 Performance Tests

```javascript
test.describe('Performance', () => {
  test('Should load dashboard in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('Should handle 1000+ customers efficiently', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers');
    
    // Assuming test data with 1000+ customers
    const startTime = Date.now();
    await page.fill('input[placeholder*="Search"]', 'test');
    await page.waitForTimeout(500); // Debounce
    const searchTime = Date.now() - startTime;
    
    expect(searchTime).toBeLessThan(1000);
  });

  test('Should paginate large datasets', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/jobs');
    
    // Should show pagination if >50 items
    const rowCount = await page.locator('table tbody tr').count();
    if (rowCount === 50) {
      await expect(page.locator('button:has-text("Next")')).toBeVisible();
    }
  });
});
```

## 🔐 Security Tests

```javascript
test.describe('Security', () => {
  test('Should prevent SQL injection', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers');
    
    // Try SQL injection in search
    await page.fill('input[placeholder*="Search"]', "'; DROP TABLE customers; --");
    await page.waitForTimeout(1000);
    
    // Should handle safely
    await expect(page.locator('text=No customers found')).toBeVisible();
    
    // Table should still exist
    await page.reload();
    await expect(page.locator('table')).toBeVisible();
  });

  test('Should prevent XSS attacks', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.technician);
    await page.goto('/customers/new');
    
    // Try XSS in input
    await page.fill('input[name="first_name"]', '<script>alert("XSS")</script>');
    await page.fill('input[name="last_name"]', 'Test');
    await page.click('button:has-text("Create Customer")');
    
    // Should escape HTML
    await expect(page.locator('text=<script>')).toBeVisible();
    
    // No alert should appear
    page.on('dialog', () => {
      throw new Error('XSS vulnerability detected!');
    });
  });

  test('Should enforce authentication on API', async ({ page }) => {
    // Clear cookies
    await page.context().clearCookies();
    
    // Try to access API directly
    const response = await page.evaluate(async () => {
      return await fetch('/api/customers');
    });
    
    expect(response.status).toBe(401);
  });
});
```

## 🎯 Helper Functions

```javascript
// Helper functions for tests
async function loginUser(page, credentials) {
  await page.goto('/login');
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function createCustomer(page, data = {}) {
  await page.goto('/customers/new');
  await page.fill('input[name="first_name"]', data.firstName || 'Test');
  await page.fill('input[name="last_name"]', data.lastName || 'Customer');
  await page.click('button:has-text("Create Customer")');
  await page.waitForURL('/customers');
  
  // Return customer ID
  const customerId = await page.locator('table tbody tr:first-child td:first-child').textContent();
  return customerId;
}

async function createJob(page, expectedId = null) {
  await page.goto('/jobs/new');
  
  // Quick job creation
  await page.click('div:has-text("Test Customer")');
  await page.click('button:has-text("Next")');
  
  await page.selectOption('select[name="appliance_type"]', 'Refrigerator');
  await page.fill('textarea[name="issue_description"]', 'Test issue');
  await page.click('button:has-text("Next")');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.fill('input[type="date"]', tomorrow.toISOString().split('T')[0]);
  await page.click('button:has-text("Create Job")');
  
  if (expectedId) {
    await expect(page.locator(`text=${expectedId}`)).toBeVisible();
  }
  
  // Return job ID from URL
  const url = page.url();
  const jobId = url.split('/').pop();
  return jobId;
}

async function createCallbackJob(page, reason) {
  const originalJobId = await createJob(page);
  await page.goto(`/jobs/${originalJobId}`);
  await page.click('button:has-text("Create Callback")');
  await page.selectOption('select[name="callback_reason"]', reason);
  await page.click('button:has-text("Create Callback Job")');
  const url = page.url();
  return url.split('/').pop();
}

async function addPartToInventory(page, partNumber, quantity, cost) {
  await page.goto('/parts');
  await page.click('button:has-text("Add Part")');
  await page.fill('input[name="part_number"]', partNumber);
  await page.fill('input[name="quantity"]', quantity.toString());
  await page.fill('input[name="cost"]', cost.toString());
  await page.click('button:has-text("Add to Inventory")');
  await page.waitForTimeout(500);
}
```

## 📈 Test Execution Configuration

```javascript
// playwright.config.js
module.exports = {
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5174',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
};
```

## 🏆 Success Criteria

All tests must pass with:
- ✅ 100% of critical paths covered
- ✅ No console errors during tests
- ✅ Response times under 3 seconds
- ✅ Mobile tests pass on iPhone and Android viewports
- ✅ Data integrity maintained across all operations
- ✅ Security tests show no vulnerabilities
- ✅ Accessibility score > 90

## 📝 Reporting Format

After each test run, generate a report containing:
1. Total tests run
2. Pass/fail count
3. Failed test details with screenshots
4. Performance metrics
5. Coverage percentage
6. Recommended fixes for failures

## 🚨 Critical Failures

Stop testing and alert immediately if:
- Authentication system fails
- Data loss detected
- Security vulnerability found
- Database corruption
- Payment processing errors
- Customer data exposed

---

Execute all test suites in order and provide comprehensive results with any issues found, screenshots of failures, and specific recommendations for fixes.
