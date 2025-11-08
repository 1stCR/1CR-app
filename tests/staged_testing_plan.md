# 🧪 Staged Testing Plan for Appliance Business Management System

## Overview
This document provides a complete testing strategy for each development stage, ensuring quality without noise from unbuilt features.

---

## 📊 Testing Philosophy

### **Progressive Testing Model**
- Test only completed features at each stage
- Build confidence incrementally
- Avoid false failures from unimplemented features
- Run full E2E only after Stage 12

### **Test Pyramid per Stage**
```
         /\
        /E2E\      <- Stage 12 only
       /------\
      /Integr. \   <- After key stages
     /----------\
    / Unit Tests \  <- Every stage
   /--------------\
```

---

## 🎯 Stage-by-Stage Testing Specifications

### **Stage 1: Foundation & Auth**
**What to Test:**
```javascript
// tests/stage01_foundation.test.js
describe('Stage 1: Foundation & Auth', () => {
  test('Database connection', async () => {
    // Verify Supabase connection
    const { data, error } = await supabase.auth.getSession();
    expect(error).toBeNull();
  });

  test('Auth flow - login', async () => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpass123');
    await page.click('button:text("Login")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('Protected routes redirect', async () => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('Database schema exists', async () => {
    const tables = ['customers', 'jobs', 'parts_master'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      expect(error?.message).not.toContain('does not exist');
    }
  });
});
```

**Success Criteria:**
- ✅ Auth works (login/logout)
- ✅ Database connected
- ✅ All tables created
- ✅ Protected routes secured

---

### **Stage 2: Customer Management**
**What to Test:**
```javascript
// tests/stage02_customers.test.js
describe('Stage 2: Customer Management', () => {
  // Include Stage 1 regression tests
  beforeAll(async () => {
    await runStage1Tests();
  });

  test('Customer ID auto-generation', async () => {
    // Create first customer
    const customer1 = await createCustomer({
      firstName: 'John',
      lastName: 'Doe'
    });
    expect(customer1.customerId).toBe('C-0001');

    // Create second customer
    const customer2 = await createCustomer({
      firstName: 'Jane',
      lastName: 'Smith'
    });
    expect(customer2.customerId).toBe('C-0002');
  });

  test('Customer type switching', async () => {
    await page.click('[data-testid="customer-type-business"]');
    await expect(page.locator('[name="businessName"]')).toBeVisible();
    await expect(page.locator('[name="billingContact"]')).toBeVisible();
  });

  test('Multi-contact for business', async () => {
    await createBusinessCustomer();
    await page.click('button:text("Add Contact")');
    await page.fill('[name="contactName"]', 'Manager');
    await page.fill('[name="contactPhone"]', '307-555-0001');
    await page.click('button:text("Save Contact")');
    await expect(page.locator('text=Manager')).toBeVisible();
  });

  test('Customer search', async () => {
    await page.fill('[placeholder="Search customers"]', 'Smith');
    await page.waitForTimeout(500); // Debounce
    await expect(page.locator('[data-testid="customer-row"]')).toHaveCount(1);
  });

  test('Customer edit preserves ID', async () => {
    const customerId = 'C-0001';
    await editCustomer(customerId, { phone: '307-555-9999' });
    const updated = await getCustomer(customerId);
    expect(updated.customerId).toBe(customerId);
    expect(updated.phone).toBe('307-555-9999');
  });
});
```

**Success Criteria:**
- ✅ Customer IDs: C-0001, C-0002, C-0003
- ✅ Business/Residential types work
- ✅ Multi-contact system functional
- ✅ Search filters correctly
- ✅ CRUD operations complete

---

### **Stage 3: Job Management**
**What to Test:**
```javascript
// tests/stage03_jobs.test.js
describe('Stage 3: Job Management', () => {
  // Include Stage 1-2 regression
  beforeAll(async () => {
    await runStage1Tests();
    await runStage2Tests();
  });

  test('Job ID auto-generation', async () => {
    const job1 = await createJob({ customerId: 'C-0001' });
    expect(job1.jobId).toBe('J-0001');
    
    const job2 = await createJob({ customerId: 'C-0002' });
    expect(job2.jobId).toBe('J-0002');
  });

  test('Job status progression', async () => {
    const jobId = 'J-0001';
    
    // Intake → Diagnosis
    await updateJobStatus(jobId, 'Diagnosis');
    let job = await getJob(jobId);
    expect(job.jobStage).toBe('Diagnosis');
    
    // Diagnosis → Parts Needed
    await updateJobStatus(jobId, 'Parts Needed');
    job = await getJob(jobId);
    expect(job.jobStage).toBe('Parts');
  });

  test('Callback job creation', async () => {
    const callback = await createCallbackJob({
      originalJobId: 'J-0001',
      reason: 'Same Issue - Our Fault'
    });
    
    expect(callback.isCallback).toBe('Yes');
    expect(callback.originalJobId).toBe('J-0001');
    expect(callback.serviceCharge).toBe(0); // Warranty
  });

  test('Visit tracking', async () => {
    const jobId = 'J-0001';
    
    await addVisit(jobId, {
      visitNumber: 1,
      type: 'Diagnosis',
      date: '2025-11-01'
    });
    
    await addVisit(jobId, {
      visitNumber: 2,
      type: 'Repair',
      date: '2025-11-03'
    });
    
    const job = await getJob(jobId);
    expect(job.visitCount).toBe(2);
  });

  test('Job-Customer relationship', async () => {
    await page.goto('/jobs/J-0001');
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=C-0001')).toBeVisible();
  });
});
```

**Success Criteria:**
- ✅ Job IDs: J-0001, J-0002, J-0003
- ✅ Status workflow works
- ✅ Callbacks track correctly
- ✅ Multi-visit support
- ✅ Links to customers

---

### **Stage 4: Tour & Time Tracking**
**What to Test:**
```javascript
// tests/stage04_tour.test.js
describe('Stage 4: Tour System', () => {
  test('Tour start/stop', async () => {
    await page.click('button:text("Start Tour")');
    await expect(page.locator('[data-testid="tour-timer"]')).toBeVisible();
    
    await page.waitForTimeout(5000); // Let timer run
    
    await page.click('button:text("End Tour")');
    const tourLog = await getLatestTourLog();
    expect(tourLog.duration).toBeGreaterThan(0);
  });

  test('Activity tracking', async () => {
    await startTour();
    
    // Start job activity
    await page.click('button:text("Start Job")');
    await page.selectOption('[name="activity"]', 'Diagnosis');
    await page.waitForTimeout(3000);
    
    // Switch to break
    await page.click('button:text("Take Break")');
    await page.waitForTimeout(2000);
    
    // Resume job
    await page.click('button:text("Resume Job")');
    await page.waitForTimeout(2000);
    
    await endTour();
    
    const activities = await getTourActivities();
    expect(activities).toHaveLength(3); // Job, Break, Job
  });

  test('Mileage calculation', async () => {
    await startTour();
    
    await page.fill('[name="startOdometer"]', '50000');
    await visitJob('J-0001'); // Has address
    await visitJob('J-0002'); // Different address
    await page.fill('[name="endOdometer"]', '50025');
    
    await endTour();
    
    const tour = await getLatestTour();
    expect(tour.totalMiles).toBe(25);
  });

  test('Time allocation to jobs', async () => {
    await startTour();
    
    // Work on J-0001 for 10 minutes
    await selectJob('J-0001');
    await page.click('button:text("Start Diagnosis")');
    await page.waitForTimeout(10 * 60 * 1000); // Simulate 10 min
    
    // Switch to J-0002 for 5 minutes
    await selectJob('J-0002');
    await page.click('button:text("Start Repair")');
    await page.waitForTimeout(5 * 60 * 1000); // Simulate 5 min
    
    await endTour();
    
    const job1Time = await getJobTime('J-0001');
    const job2Time = await getJobTime('J-0002');
    
    expect(job1Time.diagnosis).toBeCloseTo(10, 1);
    expect(job2Time.repair).toBeCloseTo(5, 1);
  });

  test('Flexible research mode', async () => {
    await startTour();
    await selectJob('J-0001');
    await page.click('button:text("Start Diagnosis")');
    
    // Start researching different job while on-site
    await page.click('button:text("Research Mode")');
    await page.selectOption('[name="researchJob"]', 'J-0003');
    await page.waitForTimeout(3000);
    
    await page.click('button:text("End Research")');
    
    const logs = await getTourLogs();
    expect(logs).toContainEqual(
      expect.objectContaining({
        jobId: 'J-0003',
        activity: 'Research'
      })
    );
  });
});
```

**Success Criteria:**
- ✅ Tour timer works
- ✅ Activities track correctly
- ✅ Mileage calculates
- ✅ Time allocates to jobs
- ✅ Research mode functional

---

### **Stage 5: Parts & Inventory Core**
**What to Test:**
```javascript
// tests/stage05_parts.test.js
describe('Stage 5: Parts Core', () => {
  test('Part number entry and lookup', async () => {
    await page.fill('[name="partNumber"]', 'W10408179');
    await page.click('button:text("Search")');
    
    await expect(page.locator('text=Whirlpool Icemaker')).toBeVisible();
    await expect(page.locator('text=$45.50')).toBeVisible();
  });

  test('FIFO cost calculation', async () => {
    // Add inventory at different costs
    await addPartToInventory('TEST-001', {
      qty: 5,
      unitCost: 10.00,
      date: '2025-10-01'
    });
    
    await addPartToInventory('TEST-001', {
      qty: 3,
      unitCost: 12.00,
      date: '2025-10-15'
    });
    
    // Use 6 parts (5 @ $10, 1 @ $12)
    const cost = await calculatePartsCost('TEST-001', 6);
    
    expect(cost.details).toEqual([
      { qty: 5, unitCost: 10.00, subtotal: 50.00 },
      { qty: 1, unitCost: 12.00, subtotal: 12.00 }
    ]);
    expect(cost.total).toBe(62.00);
    expect(cost.avgCost).toBe(10.33);
  });

  test('Stock level tracking', async () => {
    await addPartToInventory('W10408179', { qty: 3 });
    let stock = await getStock('W10408179');
    expect(stock).toBe(3);
    
    await usePart('W10408179', { qty: 1, jobId: 'J-0001' });
    stock = await getStock('W10408179');
    expect(stock).toBe(2);
  });

  test('Auto-replenishment alerts', async () => {
    // Set minimum stock
    await setMinStock('W10408179', 3);
    
    // Use part to trigger alert
    await usePart('W10408179', { qty: 1 }); // Now at 2
    
    const alerts = await getReplenishmentAlerts();
    expect(alerts).toContainEqual(
      expect.objectContaining({
        partNumber: 'W10408179',
        currentStock: 2,
        minStock: 3,
        qtyNeeded: 2 // To get to min + 1
      })
    );
  });

  test('Direct order vs stock usage', async () => {
    // Use from stock
    await usePartFromStock('W10408179', {
      jobId: 'J-0001',
      qty: 1
    });
    
    let transaction = await getLatestTransaction('W10408179');
    expect(transaction.type).toBe('Used');
    expect(transaction.source).toBe('Stock');
    
    // Direct order (not stocked)
    await orderPartDirect('SPECIAL-001', {
      jobId: 'J-0002',
      qty: 1,
      supplier: 'SupplyHouse'
    });
    
    transaction = await getLatestTransaction('SPECIAL-001');
    expect(transaction.type).toBe('Direct Order');
    expect(transaction.source).toBe('SupplyHouse');
  });
});
```

**Success Criteria:**
- ✅ Parts add to inventory
- ✅ FIFO costing accurate
- ✅ Stock levels update
- ✅ Auto-replenish triggers
- ✅ Direct orders work

---

### **Stage 6: AI Integration**
**What to Test:**
```javascript
// tests/stage06_ai.test.js
describe('Stage 6: AI Integration', () => {
  test('Cross-reference lookup', async () => {
    await page.fill('[name="partNumber"]', 'W10408179');
    await page.click('button:text("Find Alternatives")');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="cross-refs"]', {
      timeout: 20000
    });
    
    const refs = await page.locator('[data-testid="xref-item"]').count();
    expect(refs).toBeGreaterThan(0);
    
    // Verify cross-refs saved to database
    const savedRefs = await getCrossReferences('W10408179');
    expect(savedRefs.length).toBeGreaterThan(0);
  });

  test('Model compilation lookup', async () => {
    await page.fill('[name="modelNumber"]', 'WED5000DW');
    await page.click('button:text("Get Model Info")');
    
    await page.waitForSelector('[data-testid="model-resources"]', {
      timeout: 20000
    });
    
    // Check for expected resources
    await expect(page.locator('text=Service Manual')).toBeVisible();
    await expect(page.locator('text=Parts Diagram')).toBeVisible();
    await expect(page.locator('text=Common Issues')).toBeVisible();
  });

  test('Testing guide generation', async () => {
    await requestTestingGuide('W10408179');
    
    await page.waitForSelector('[data-testid="testing-guide"]', {
      timeout: 20000
    });
    
    const guide = await page.locator('[data-testid="testing-guide"]').textContent();
    expect(guide).toContain('voltage');
    expect(guide).toContain('ohms');
    expect(guide).toContain('continuity');
  });

  test('Cross-reference grouping', async () => {
    // After AI finds alternatives
    const group = await getXRefGroup('W10408179');
    
    expect(group.partNumbers).toContain('W10408179');
    expect(group.partNumbers).toContain('WPW10408179');
    expect(group.partNumbers).toContain('2198597');
    
    // Check combined stock
    const groupStock = await getGroupStock(group.groupId);
    expect(groupStock).toBe(5); // Sum of all parts in group
  });

  test('AI data caching', async () => {
    // First lookup
    const start1 = Date.now();
    await lookupPart('NEW-PART-001');
    const time1 = Date.now() - start1;
    
    // Second lookup (cached)
    const start2 = Date.now();
    await lookupPart('NEW-PART-001');
    const time2 = Date.now() - start2;
    
    expect(time2).toBeLessThan(time1 / 5); // Much faster
  });
});
```

**Success Criteria:**
- ✅ AI lookups work
- ✅ Cross-refs save
- ✅ Model data retrieves
- ✅ Caching functions
- ✅ Groups created

---

### **Stage 7: Quotes & Invoicing**
**What to Test:**
```javascript
// tests/stage07_invoicing.test.js
describe('Stage 7: Invoicing', () => {
  test('Quote calculation accuracy', async () => {
    const quote = await generateQuote({
      jobId: 'J-0001',
      serviceCharge: 85.00,
      laborHours: 2.5,
      laborRate: 75.00,
      parts: [
        { partNumber: 'W10408179', qty: 1, price: 54.60 }
      ],
      taxRate: 0.08
    });
    
    expect(quote.service).toBe(85.00);
    expect(quote.labor).toBe(187.50); // 2.5 * 75
    expect(quote.parts).toBe(54.60);
    expect(quote.subtotal).toBe(327.10);
    expect(quote.tax).toBe(26.17); // 8% of 327.10
    expect(quote.total).toBe(353.27);
  });

  test('Appliance tier pricing', async () => {
    // Standard brand
    let rate = await getLaborRate('Whirlpool');
    expect(rate).toBe(75.00);
    
    // Premium brand
    rate = await getLaborRate('KitchenAid');
    expect(rate).toBe(93.75); // 75 * 1.25
    
    // Luxury brand
    rate = await getLaborRate('Sub-Zero');
    expect(rate).toBe(101.25); // 75 * 1.35
  });

  test('Callback pricing logic', async () => {
    // Same issue - our fault
    let pricing = await getCallbackPricing({
      originalJobId: 'J-0001',
      reason: 'Same Issue - Our Fault'
    });
    expect(pricing.serviceCharge).toBe(0);
    expect(pricing.laborDiscount).toBe(100);
    
    // New issue
    pricing = await getCallbackPricing({
      originalJobId: 'J-0001',
      reason: 'New Issue'
    });
    expect(pricing.serviceCharge).toBe(85.00);
    expect(pricing.laborDiscount).toBe(10);
  });

  test('Payment recording', async () => {
    await recordPayment({
      jobId: 'J-0001',
      amount: 353.27,
      method: 'Credit Card',
      date: '2025-11-01'
    });
    
    const job = await getJob('J-0001');
    expect(job.paymentStatus).toBe('Paid');
    expect(job.paymentAmount).toBe(353.27);
    expect(job.outstandingBalance).toBe(0);
  });

  test('Credit and refund handling', async () => {
    // Apply credit
    await applyCredit({
      jobId: 'J-0002',
      creditAmount: 50.00,
      source: 'Previous Payment'
    });
    
    const job = await getJob('J-0002');
    expect(job.creditApplied).toBe('Yes');
    expect(job.creditAmount).toBe(50.00);
    
    // Process refund
    await processRefund({
      jobId: 'J-0003',
      refundAmount: 25.00,
      method: 'Check'
    });
    
    const refund = await getRefund('J-0003');
    expect(refund.issued).toBe('Yes');
    expect(refund.amount).toBe(25.00);
  });
});
```

**Success Criteria:**
- ✅ Quotes calculate correctly
- ✅ Tier pricing applies
- ✅ Callbacks price right
- ✅ Payments record
- ✅ Credits/refunds work

---

### **Stage 8: Advanced Parts Features**
**What to Test:**
```javascript
// tests/stage08_parts_advanced.test.js
describe('Stage 8: Advanced Parts', () => {
  test('Multi-location transfers', async () => {
    await transferPart({
      partNumber: 'W10408179',
      qty: 2,
      from: 'Home Storage > Shelf 1',
      to: 'Truck #1 > Bin A',
      reason: 'For tomorrow\'s jobs'
    });
    
    const truckStock = await getLocationStock('Truck #1 > Bin A');
    const homeStock = await getLocationStock('Home Storage > Shelf 1');
    
    expect(truckStock['W10408179']).toBe(2);
    expect(homeStock['W10408179']).toBe(1); // Had 3, moved 2
  });

  test('Shipment grouping', async () => {
    const shipment = await createShipment({
      supplier: 'SupplyHouse',
      parts: [
        { partNumber: 'W10408179', jobId: 'J-0001' },
        { partNumber: 'W10447783', jobId: 'J-0002' },
        { partNumber: 'W10772617', jobId: 'J-0001' }
      ]
    });
    
    expect(shipment.partsCount).toBe(3);
    expect(shipment.jobsAffected).toBe(2);
    
    // Update tracking for entire shipment
    await updateTracking(shipment.id, {
      trackingNumber: '1Z999999999',
      carrier: 'UPS'
    });
    
    // All jobs should be notified
    const job1 = await getJob('J-0001');
    const job2 = await getJob('J-0002');
    
    expect(job1.shipmentTracking).toBe('1Z999999999');
    expect(job2.shipmentTracking).toBe('1Z999999999');
  });

  test('Core charge tracking', async () => {
    await addPartWithCore({
      partNumber: 'COMP-001',
      coreCharge: 75.00,
      jobId: 'J-0001'
    });
    
    let transaction = await getLatestTransaction('COMP-001');
    expect(transaction.hasCoreCharge).toBe(true);
    expect(transaction.coreAmount).toBe(75.00);
    
    // Return core
    await returnCore({
      partNumber: 'COMP-001',
      trackingNumber: 'CORE123',
      creditExpected: 75.00
    });
    
    transaction = await getCoreTransaction('COMP-001');
    expect(transaction.coreReturnStatus).toBe('Shipped');
  });

  test('Stocking score calculation', async () => {
    const score = await calculateStockingScore('W10408179');
    
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(10);
    expect(score.breakdown).toHaveProperty('frequency');
    expect(score.breakdown).toHaveProperty('recency');
    expect(score.breakdown).toHaveProperty('fccImpact');
    expect(score.recommendation).toBeTruthy();
  });

  test('Specialty tools alerts', async () => {
    await addPartToJob({
      jobId: 'J-0001',
      partNumber: 'W10314173' // Requires snap ring pliers
    });
    
    const alerts = await getToolAlerts('J-0001');
    expect(alerts).toContainEqual(
      expect.objectContaining({
        tool: 'Snap Ring Pliers',
        location: 'Truck Drawer 2'
      })
    );
  });
});
```

**Success Criteria:**
- ✅ Transfers work
- ✅ Shipments group
- ✅ Core charges track
- ✅ Scoring calculates
- ✅ Tool alerts show

---

### **Stage 9: Analytics & Reporting**
**What to Test:**
```javascript
// tests/stage09_analytics.test.js
describe('Stage 9: Analytics', () => {
  test('Dashboard metrics calculation', async () => {
    const metrics = await getDashboardMetrics();
    
    expect(metrics).toHaveProperty('totalJobs');
    expect(metrics).toHaveProperty('fccRate');
    expect(metrics).toHaveProperty('avgRepairTime');
    expect(metrics).toHaveProperty('partsUsed');
    expect(metrics).toHaveProperty('revenue');
  });

  test('FCC rate tracking', async () => {
    const fccAnalysis = await getFCCAnalysis();
    
    expect(fccAnalysis.rate).toBeGreaterThanOrEqual(0);
    expect(fccAnalysis.rate).toBeLessThanOrEqual(100);
    expect(fccAnalysis.breakdown).toHaveProperty('completed');
    expect(fccAnalysis.breakdown).toHaveProperty('callbacks');
    expect(fccAnalysis.missingParts).toBeInstanceOf(Array);
  });

  test('Parts ROI analysis', async () => {
    const roi = await getPartsROI();
    
    roi.forEach(part => {
      expect(part).toHaveProperty('partNumber');
      expect(part).toHaveProperty('timesUsed');
      expect(part).toHaveProperty('revenue');
      expect(part).toHaveProperty('stockingCost');
      expect(part).toHaveProperty('roi');
    });
  });

  test('Customer lifetime value', async () => {
    const clv = await getCustomerValue('C-0001');
    
    expect(clv).toHaveProperty('totalJobs');
    expect(clv).toHaveProperty('totalRevenue');
    expect(clv).toHaveProperty('avgJobValue');
    expect(clv).toHaveProperty('lastService');
  });

  test('Export functionality', async () => {
    // Export jobs report
    const csv = await exportReport('jobs', {
      startDate: '2025-10-01',
      endDate: '2025-10-31',
      format: 'csv'
    });
    
    expect(csv).toContain('Job ID,Customer,Date,Status,Total');
    expect(csv.split('\n').length).toBeGreaterThan(1);
  });
});
```

**Success Criteria:**
- ✅ Metrics calculate
- ✅ FCC tracks correctly
- ✅ ROI analysis works
- ✅ CLV computes
- ✅ Exports generate

---

### **Stage 10: Mobile Optimization**
**What to Test:**
```javascript
// tests/stage10_mobile.test.js
describe('Stage 10: Mobile', () => {
  beforeEach(async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('Responsive navigation', async () => {
    await page.goto('/');
    
    // Hamburger menu visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Desktop menu hidden
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeHidden();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu"]');
    await expect(page.locator('[data-testid="mobile-nav-drawer"]')).toBeVisible();
  });

  test('Touch-friendly buttons', async () => {
    await page.goto('/tour');
    
    const startButton = page.locator('button:text("Start Tour")');
    const box = await startButton.boundingBox();
    
    // Minimum 44x44px for touch
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  });

  test('Single column layout', async () => {
    await page.goto('/jobs');
    
    const cards = await page.locator('[data-testid="job-card"]').all();
    const positions = await Promise.all(
      cards.map(card => card.boundingBox())
    );
    
    // All cards should be vertically stacked
    positions.forEach((pos, i) => {
      if (i > 0) {
        expect(pos.y).toBeGreaterThan(positions[i-1].y);
      }
    });
  });

  test('Swipe gestures', async () => {
    await page.goto('/jobs/J-0001');
    
    // Swipe between tabs
    await page.locator('[data-testid="job-tabs"]').swipe({
      direction: 'left',
      distance: 100
    });
    
    await expect(page.locator('[data-testid="parts-tab"]')).toHaveClass(/active/);
  });

  test('Offline mode indicators', async () => {
    // Simulate offline
    await page.context().setOffline(true);
    
    await page.goto('/');
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    
    // Try to save (should queue)
    await createJob({ customerId: 'C-0001' });
    await expect(page.locator('text=Saved locally')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    await expect(page.locator('text=Syncing...')).toBeVisible();
  });
});
```

**Success Criteria:**
- ✅ Mobile nav works
- ✅ Touch targets ≥44px
- ✅ Single column layout
- ✅ Swipe gestures work
- ✅ Offline mode shows

---

### **Stage 11: External Integrations**
**What to Test:**
```javascript
// tests/stage11_integrations.test.js
describe('Stage 11: Integrations', () => {
  test('Google Calendar sync', async () => {
    const job = await createJob({
      customerId: 'C-0001',
      scheduledDate: '2025-11-05',
      scheduledTime: '09:00'
    });
    
    // Wait for calendar sync
    await page.waitForTimeout(2000);
    
    const event = await getCalendarEvent(job.jobId);
    expect(event).toBeTruthy();
    expect(event.title).toContain('J-0001');
    expect(event.start).toBe('2025-11-05T09:00:00');
  });

  test('SMS notifications', async () => {
    // Mock Twilio
    const twilioMock = jest.spyOn(twilio, 'sendSMS');
    
    await updateJobStatus('J-0001', 'Parts Shipped');
    
    expect(twilioMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+13075551234',
        body: expect.stringContaining('parts shipped')
      })
    );
  });

  test('Parts supplier API', async () => {
    const prices = await lookupPartPrices('W10408179');
    
    expect(prices).toContainEqual(
      expect.objectContaining({
        supplier: 'SupplyHouse',
        price: expect.any(Number),
        inStock: expect.any(Boolean),
        leadTime: expect.any(Number)
      })
    );
  });

  test('Tracking updates', async () => {
    await updateShipmentTracking({
      shipmentId: 'SHIP-001',
      trackingNumber: '1Z9999999999'
    });
    
    // Wait for API call
    await page.waitForTimeout(3000);
    
    const shipment = await getShipment('SHIP-001');
    expect(shipment.status).toBe('In Transit');
    expect(shipment.estimatedDelivery).toBeTruthy();
  });

  test('QuickBooks export', async () => {
    const qbExport = await exportToQuickBooks({
      startDate: '2025-10-01',
      endDate: '2025-10-31'
    });
    
    expect(qbExport.invoices).toBeGreaterThan(0);
    expect(qbExport.format).toBe('IIF');
    expect(qbExport.file).toContain('TRNS');
  });
});
```

**Success Criteria:**
- ✅ Calendar syncs
- ✅ SMS sends
- ✅ Supplier APIs work
- ✅ Tracking updates
- ✅ QuickBooks exports

---

### **Stage 12: Polish & Performance**
**What to Test:**
```javascript
// tests/stage12_polish.test.js
describe('Stage 12: Final Polish', () => {
  test('Performance benchmarks', async () => {
    // Dashboard load
    const dashStart = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const dashTime = Date.now() - dashStart;
    expect(dashTime).toBeLessThan(2000);
    
    // Search performance
    const searchStart = Date.now();
    await page.fill('[placeholder="Search"]', 'Smith');
    await page.waitForSelector('[data-testid="search-results"]');
    const searchTime = Date.now() - searchStart;
    expect(searchTime).toBeLessThan(500);
  });

  test('Accessibility compliance', async () => {
    const violations = await checkA11y(page);
    expect(violations).toHaveLength(0);
  });

  test('Browser compatibility', async () => {
    const browsers = ['chromium', 'firefox', 'webkit'];
    
    for (const browserType of browsers) {
      const browser = await playwright[browserType].launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
      
      await browser.close();
    }
  });

  test('Error boundaries', async () => {
    // Trigger an error
    await page.evaluate(() => {
      throw new Error('Test error');
    });
    
    // Should show error boundary, not white screen
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('text=Something went wrong')).toBeVisible();
  });

  test('Data validation', async () => {
    // Try invalid inputs
    const invalidTests = [
      { field: 'phone', value: '123', error: 'Invalid phone' },
      { field: 'email', value: 'notanemail', error: 'Invalid email' },
      { field: 'laborHours', value: '-5', error: 'Must be positive' }
    ];
    
    for (const test of invalidTests) {
      await page.fill(`[name="${test.field}"]`, test.value);
      await page.click('button:text("Save")');
      await expect(page.locator(`text=${test.error}`)).toBeVisible();
    }
  });
});
```

**Success Criteria:**
- ✅ Performance meets targets
- ✅ Accessibility passes
- ✅ Cross-browser works
- ✅ Errors handled gracefully
- ✅ Validation complete

---

## 🎯 FULL E2E TEST (Stage 12 Only)

```javascript
// tests/full_e2e.test.js
// This file contains ALL 170+ tests from every stage
// Only run after Stage 12 is complete!

describe('Complete E2E Test Suite', () => {
  // All Stage 1-12 tests combined
  describe('Foundation', () => { /* ... */ });
  describe('Customers', () => { /* ... */ });
  describe('Jobs', () => { /* ... */ });
  describe('Tour', () => { /* ... */ });
  describe('Parts', () => { /* ... */ });
  describe('AI', () => { /* ... */ });
  describe('Invoicing', () => { /* ... */ });
  describe('Advanced Parts', () => { /* ... */ });
  describe('Analytics', () => { /* ... */ });
  describe('Mobile', () => { /* ... */ });
  describe('Integrations', () => { /* ... */ });
  describe('Polish', () => { /* ... */ });
});
```

---

## 📋 Test Execution Commands

```json
// package.json
{
  "scripts": {
    "test:stage1": "playwright test tests/stage01_*.test.js",
    "test:stage2": "playwright test tests/stage0[1-2]_*.test.js",
    "test:stage3": "playwright test tests/stage0[1-3]_*.test.js",
    "test:stage4": "playwright test tests/stage0[1-4]_*.test.js",
    "test:stage5": "playwright test tests/stage0[1-5]_*.test.js",
    "test:stage6": "playwright test tests/stage0[1-6]_*.test.js",
    "test:stage7": "playwright test tests/stage0[1-7]_*.test.js",
    "test:stage8": "playwright test tests/stage0[1-8]_*.test.js",
    "test:stage9": "playwright test tests/stage0[1-9]_*.test.js",
    "test:stage10": "playwright test tests/stage0[1-9]_*.test.js tests/stage10_*.test.js",
    "test:stage11": "playwright test tests/stage0[1-9]_*.test.js tests/stage1[0-1]_*.test.js",
    "test:stage12": "playwright test tests/stage*.test.js",
    "test:all": "playwright test tests/full_e2e.test.js",
    "test:smoke": "playwright test --grep @smoke",
    "test:critical": "playwright test --grep @critical",
    "test:report": "playwright show-report"
  }
}
```

---

## 🚦 Go/No-Go Criteria per Stage

### **Stage Gate Requirements:**

| Stage | Must Pass Before Proceeding |
|-------|----------------------------|
| 1 | Auth works, DB connected |
| 2 | Customer IDs generate correctly |
| 3 | Job workflow complete |
| 4 | Time tracking accurate |
| 5 | FIFO costing correct |
| 6 | AI responses cached |
| 7 | Invoices calculate properly |
| 8 | Parts transfers work |
| 9 | Analytics accurate |
| 10 | Mobile responsive |
| 11 | Integrations connected |
| 12 | All tests pass |

---

## 📊 Test Coverage Report

After each stage, generate coverage report:

```bash
npm run test:coverage

# Expected coverage targets:
# Stage 1:  15% total coverage
# Stage 3:  30% total coverage
# Stage 6:  50% total coverage
# Stage 9:  70% total coverage
# Stage 12: 90%+ total coverage
```

---

## 🐛 Common Issues & Solutions

### **Issue: Tests fail on unbuilt features**
**Solution:** Only run tests for completed stages

### **Issue: Flaky tests due to timing**
**Solution:** Add proper waits:
```javascript
await page.waitForSelector('[data-testid="element"]');
await page.waitForLoadState('networkidle');
```

### **Issue: Database conflicts between tests**
**Solution:** Reset test data before each suite:
```javascript
beforeEach(async () => {
  await resetTestDatabase();
});
```

### **Issue: AI tests timeout**
**Solution:** Increase timeout for AI tests:
```javascript
test('AI lookup', async () => {
  // Increase timeout to 30s
  test.setTimeout(30000);
  // ... test code
});
```

---

## ✅ Final Checklist

Before considering the application complete:

- [ ] All 12 stage test suites pass individually
- [ ] Full E2E suite passes (170+ tests)
- [ ] Performance benchmarks met
- [ ] Mobile testing on real devices
- [ ] Security scan completed
- [ ] Accessibility audit passed
- [ ] Cross-browser verified
- [ ] Load testing performed
- [ ] Backup/restore tested
- [ ] Documentation complete

---

## 📈 Success Metrics

Your app is ready when:
- **Test Pass Rate:** >98%
- **Code Coverage:** >90%
- **Performance:** <2s load time
- **Accessibility:** WCAG 2.1 AA compliant
- **Mobile:** Works on all devices
- **Reliability:** 99.9% uptime capable

---

This staged testing plan ensures quality at every step without the noise of testing unbuilt features!
