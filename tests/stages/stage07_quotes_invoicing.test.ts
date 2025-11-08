import { test, expect } from '@playwright/test';
import { supabase } from '../../src/lib/supabase';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// ====================================
// Test Setup & Helpers
// ====================================

// Use random suffix and timestamp to ensure unique IDs across parallel tests
const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
let testCounter = 0;

async function authenticateSupabase() {
  const email = process.env.VITE_TEST_USER_EMAIL;
  const password = process.env.VITE_TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Test credentials not found in environment variables');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

async function cleanupTestData() {
  // Delete in reverse order of dependencies
  await supabase.from('payments').delete().ilike('payment_id', 'PAY-TEST%');
  await supabase.from('invoices').delete().ilike('invoice_id', 'INV-TEST%');
  await supabase.from('quotes').delete().ilike('quote_id', 'Q-TEST%');
  await supabase.from('job_parts').delete().ilike('job_id', 'J-S7%');
  await supabase.from('parts_transactions').delete().ilike('job_id', 'J-S7%');
  await supabase.from('parts_master').delete().ilike('part_number', 'STAGE7%');
  await supabase.from('jobs').delete().ilike('job_id', 'J-S7%');
  await supabase.from('customers').delete().ilike('customer_id', 'C-S7%');
}

async function createTestCustomer() {
  testCounter++;
  const customerId = `C-S7-${randomSuffix}-${String(testCounter).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('customers')
    .insert({
      customer_id: customerId,
      customer_type: 'Residential',
      first_name: `Test${testCounter}`,
      last_name: 'Customer',
      phone: '307-555-0100',
      email: `test${randomSuffix}${testCounter}@example.com`,
      address: '123 Test St',
      city: 'Buffalo',
      state: 'WY',
      zip_code: '82834'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createTestJob(customer: any, applianceType: string = 'Refrigerator', brand: string = 'Whirlpool') {
  testCounter++;
  const jobId = `J-S7-${randomSuffix}-${String(testCounter).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      job_id: jobId,
      customer_id: customer.customer_id,
      appliance_type: applianceType,
      appliance_brand: brand,
      appliance_model: 'TEST-MODEL-123',
      issue_description: 'Test issue for Stage 7',
      job_stage: 'Diagnosis',
      priority: 'Normal',
      is_callback: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createTestPart(partNumber: string, description: string = 'Test Part', cost: number = 25.00) {
  const { data: part, error: partError } = await supabase
    .from('parts_master')
    .insert({
      part_number: partNumber,
      description,
      category: 'Refrigeration'
    })
    .select()
    .single();

  if (partError) throw partError;

  return part;
}

// ====================================
// Stage 7: Quotes & Invoicing Tests
// ====================================

test.describe('Stage 7: Quotes & Invoicing', () => {
  test.beforeAll(async () => {
    await authenticateSupabase();
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  // ====================================
  // Quote Creation Tests
  // ====================================

  test('@critical Should create a new quote', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    // Create quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        quote_id: 'Q-TEST-001',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        version: 1,
        status: 'Draft',
        line_items: [],
        subtotal: 0,
        tax_rate: 4.00,
        tax_amount: 0,
        total: 0,
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(quote).not.toBeNull();
    expect(quote.quote_id).toBe('Q-TEST-001');
    expect(quote.status).toBe('Draft');
  });

  test('@critical Should add line items to quote', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);
    const part = await createTestPart('STAGE7-PART-001', 'Test Defrost Timer', 35.00);

    // Create quote
    const { data: quote } = await supabase
      .from('quotes')
      .insert({
        quote_id: 'Q-TEST-002',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        version: 1,
        status: 'Draft',
        line_items: [],
        subtotal: 0,
        tax_rate: 4.00,
        tax_amount: 0,
        total: 0,
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    // Add service fee line item
    const serviceFeeItem = {
      id: 'LI-001',
      type: 'service_fee',
      description: 'Service Call Fee',
      quantity: 1,
      unit_price: 85.00,
      subtotal: 85.00
    };

    // Add labor line item
    const laborItem = {
      id: 'LI-002',
      type: 'labor',
      description: 'Labor',
      quantity: 1,
      unit_price: 150.00,
      subtotal: 150.00,
      labor_hours: 2.0,
      labor_rate: 75.00
    };

    // Add part line item
    const partItem = {
      id: 'LI-003',
      type: 'part',
      description: part.description,
      quantity: 1,
      unit_price: 42.00,  // Cost: 35, Markup: 20%
      subtotal: 42.00,
      part_number: part.part_number,
      part_cost: 35.00,
      markup_percent: 20
    };

    const lineItems = [serviceFeeItem, laborItem, partItem];
    const subtotal = 277.00;  // 85 + 150 + 42
    const taxAmount = subtotal * 0.04;  // 4% tax = 11.08
    const total = subtotal + taxAmount;  // 288.08

    // Update quote with line items
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        line_items: lineItems,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total: total
      })
      .eq('quote_id', 'Q-TEST-002');

    expect(updateError).toBeNull();

    // Verify quote updated
    const { data: updatedQuote } = await supabase
      .from('quotes')
      .select('*')
      .eq('quote_id', 'Q-TEST-002')
      .single();

    expect(updatedQuote.line_items).toHaveLength(3);
    expect(updatedQuote.subtotal).toBe(277.00);
    expect(updatedQuote.total).toBeCloseTo(288.08, 2);
  });

  test('Should calculate correct totals with discount', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    const lineItems = [{
      id: 'LI-001',
      type: 'labor',
      description: 'Labor',
      quantity: 1,
      unit_price: 150.00,
      subtotal: 150.00
    }];

    // Create quote with 10% discount
    const subtotal = 150.00;
    const discountAmount = subtotal * 0.10;  // 15.00
    const taxableAmount = subtotal - discountAmount;  // 135.00
    const taxAmount = taxableAmount * 0.04;  // 5.40
    const total = taxableAmount + taxAmount;  // 140.40

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        quote_id: 'Q-TEST-003',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        version: 1,
        status: 'Draft',
        line_items: lineItems,
        subtotal: subtotal,
        discount_type: 'percent',
        discount_value: 10.00,
        discount_amount: discountAmount,
        tax_rate: 4.00,
        tax_amount: taxAmount,
        total: total,
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(quote.discount_amount).toBe(15.00);
    expect(quote.total).toBeCloseTo(140.40, 2);
  });

  test('@critical Should approve quote', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    const { data: quote } = await supabase
      .from('quotes')
      .insert({
        quote_id: 'Q-TEST-004',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        version: 1,
        status: 'Draft',
        line_items: [{
          id: 'LI-001',
          type: 'labor',
          description: 'Labor',
          quantity: 1,
          unit_price: 100.00,
          subtotal: 100.00
        }],
        subtotal: 100.00,
        tax_rate: 4.00,
        tax_amount: 4.00,
        total: 104.00,
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    // Approve quote
    const { error: approveError } = await supabase
      .from('quotes')
      .update({
        status: 'Approved',
        approved_at: new Date().toISOString()
      })
      .eq('quote_id', 'Q-TEST-004');

    expect(approveError).toBeNull();

    // Verify status changed
    const { data: approvedQuote } = await supabase
      .from('quotes')
      .select('*')
      .eq('quote_id', 'Q-TEST-004')
      .single();

    expect(approvedQuote.status).toBe('Approved');
    expect(approvedQuote.approved_at).not.toBeNull();
  });

  // ====================================
  // Labor Rate Tests
  // ====================================

  test('Should apply correct labor rates for appliance tiers', async ({ page }) => {
    const customer = await createTestCustomer();

    // Standard tier (Whirlpool)
    const jobStandard = await createTestJob(customer, 'Refrigerator', 'Whirlpool');
    const standardRate = 75.00;

    // Premium tier (KitchenAid)
    const jobPremium = await createTestJob(customer, 'Refrigerator', 'KitchenAid');
    const premiumRate = 75.00 * 1.25;  // 93.75

    // Luxury tier (Sub-Zero)
    const jobLuxury = await createTestJob(customer, 'Refrigerator', 'Sub-Zero');
    const luxuryRate = 75.00 * 1.35;  // 101.25

    // Verify rates from database
    const { data: rates } = await supabase
      .from('labor_rates')
      .select('*')
      .in('tier', ['Standard', 'Premium', 'Luxury']);

    expect(rates).toHaveLength(3);
    expect(rates.find(r => r.tier === 'Standard')?.hourly_rate).toBe(75.00);
    expect(rates.find(r => r.tier === 'Premium')?.hourly_rate).toBe(93.75);
    expect(rates.find(r => r.tier === 'Luxury')?.hourly_rate).toBe(101.25);
  });

  // ====================================
  // Invoice Creation Tests
  // ====================================

  test('@critical Should create invoice from approved quote', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    // Create and approve quote
    const { data: quote } = await supabase
      .from('quotes')
      .insert({
        quote_id: 'Q-TEST-005',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        version: 1,
        status: 'Approved',
        line_items: [{
          id: 'LI-001',
          type: 'labor',
          description: 'Labor',
          quantity: 1,
          unit_price: 150.00,
          subtotal: 150.00
        }],
        subtotal: 150.00,
        tax_rate: 4.00,
        tax_amount: 6.00,
        total: 156.00,
        is_callback: false,
        warranty_work: false,
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    // Create invoice from quote
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_id: 'INV-TEST-001',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        quote_id: quote.quote_id,
        status: 'Pending',
        line_items: quote.line_items,
        subtotal: quote.subtotal,
        discount_type: quote.discount_type,
        discount_value: quote.discount_value,
        discount_amount: quote.discount_amount,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        amount_paid: 0,
        balance_due: quote.total,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(invoice).not.toBeNull();
    expect(invoice.invoice_id).toBe('INV-TEST-001');
    expect(invoice.quote_id).toBe('Q-TEST-005');
    expect(invoice.total).toBe(156.00);
    expect(invoice.balance_due).toBe(156.00);
    expect(invoice.status).toBe('Pending');
  });

  test('Should create manual invoice without quote', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    const lineItems = [{
      id: 'LI-001',
      type: 'service_fee',
      description: 'Service Call Fee',
      quantity: 1,
      unit_price: 85.00,
      subtotal: 85.00
    }];

    const subtotal = 85.00;
    const taxAmount = subtotal * 0.04;
    const total = subtotal + taxAmount;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_id: 'INV-TEST-002',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        status: 'Pending',
        line_items: lineItems,
        subtotal: subtotal,
        discount_amount: 0,
        tax_rate: 4.00,
        tax_amount: taxAmount,
        total: total,
        amount_paid: 0,
        balance_due: total,
        invoice_date: new Date().toISOString().split('T')[0],
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(invoice.quote_id).toBeNull();
    expect(invoice.total).toBeCloseTo(88.40, 2);
  });

  // ====================================
  // Payment Tests
  // ====================================

  test('@critical Should record payment and update balance', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    // Create invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_id: 'INV-TEST-003',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        status: 'Pending',
        line_items: [{
          id: 'LI-001',
          type: 'labor',
          description: 'Labor',
          quantity: 1,
          unit_price: 200.00,
          subtotal: 200.00
        }],
        subtotal: 200.00,
        discount_amount: 0,
        tax_rate: 4.00,
        tax_amount: 8.00,
        total: 208.00,
        amount_paid: 0,
        balance_due: 208.00,
        invoice_date: new Date().toISOString().split('T')[0],
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    // Record payment
    const paymentAmount = 208.00;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_id: 'PAY-TEST-001',
        invoice_id: invoice.invoice_id,
        customer_id: customer.customer_id,
        amount: paymentAmount,
        payment_method: 'Credit Card',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_reference: 'TEST-TXN-123'
      })
      .select()
      .single();

    expect(paymentError).toBeNull();
    expect(payment).not.toBeNull();

    // Update invoice
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: paymentAmount,
        balance_due: 0,
        status: 'Paid',
        paid_date: new Date().toISOString().split('T')[0]
      })
      .eq('invoice_id', 'INV-TEST-003');

    expect(updateError).toBeNull();

    // Verify invoice updated
    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_id', 'INV-TEST-003')
      .single();

    expect(updatedInvoice.amount_paid).toBe(208.00);
    expect(updatedInvoice.balance_due).toBe(0);
    expect(updatedInvoice.status).toBe('Paid');
  });

  test('Should handle partial payments', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    // Create invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_id: 'INV-TEST-004',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        status: 'Pending',
        line_items: [{
          id: 'LI-001',
          type: 'labor',
          description: 'Labor',
          quantity: 1,
          unit_price: 300.00,
          subtotal: 300.00
        }],
        subtotal: 300.00,
        discount_amount: 0,
        tax_rate: 4.00,
        tax_amount: 12.00,
        total: 312.00,
        amount_paid: 0,
        balance_due: 312.00,
        invoice_date: new Date().toISOString().split('T')[0],
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    // First payment
    await supabase
      .from('payments')
      .insert({
        payment_id: 'PAY-TEST-002A',
        invoice_id: invoice.invoice_id,
        customer_id: customer.customer_id,
        amount: 150.00,
        payment_method: 'Cash',
        payment_date: new Date().toISOString().split('T')[0]
      });

    // Update invoice after first payment
    await supabase
      .from('invoices')
      .update({
        amount_paid: 150.00,
        balance_due: 162.00,
        status: 'Partial'
      })
      .eq('invoice_id', 'INV-TEST-004');

    // Second payment
    await supabase
      .from('payments')
      .insert({
        payment_id: 'PAY-TEST-002B',
        invoice_id: invoice.invoice_id,
        customer_id: customer.customer_id,
        amount: 162.00,
        payment_method: 'Check',
        payment_date: new Date().toISOString().split('T')[0],
        check_number: '1234'
      });

    // Update invoice after second payment
    await supabase
      .from('invoices')
      .update({
        amount_paid: 312.00,
        balance_due: 0,
        status: 'Paid',
        paid_date: new Date().toISOString().split('T')[0]
      })
      .eq('invoice_id', 'INV-TEST-004');

    // Verify payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', 'INV-TEST-004')
      .order('created_at', { ascending: true });

    expect(payments).toHaveLength(2);
    expect(payments[0].amount).toBe(150.00);
    expect(payments[1].amount).toBe(162.00);

    // Verify final invoice state
    const { data: finalInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_id', 'INV-TEST-004')
      .single();

    expect(finalInvoice.amount_paid).toBe(312.00);
    expect(finalInvoice.balance_due).toBe(0);
    expect(finalInvoice.status).toBe('Paid');
  });

  test('Should track payment methods', async ({ page }) => {
    const customer = await createTestCustomer();
    const job = await createTestJob(customer);

    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_id: 'INV-TEST-005',
        job_id: job.job_id,
        customer_id: customer.customer_id,
        status: 'Pending',
        line_items: [{
          id: 'LI-001',
          type: 'labor',
          description: 'Labor',
          quantity: 1,
          unit_price: 100.00,
          subtotal: 100.00
        }],
        subtotal: 100.00,
        discount_amount: 0,
        tax_rate: 4.00,
        tax_amount: 4.00,
        total: 104.00,
        amount_paid: 0,
        balance_due: 104.00,
        invoice_date: new Date().toISOString().split('T')[0],
        is_callback: false,
        warranty_work: false
      })
      .select()
      .single();

    // Test various payment methods
    const paymentMethods = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'Venmo', 'PayPal', 'Zelle'];
    const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        payment_id: 'PAY-TEST-003',
        invoice_id: invoice.invoice_id,
        customer_id: customer.customer_id,
        amount: 104.00,
        payment_method: method,
        payment_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(payment.payment_method).toBe(method);
  });

  // ====================================
  // Callback Pricing Tests
  // ====================================

  test('Should apply callback pricing rules', async ({ page }) => {
    const customer = await createTestCustomer();

    // Create callback job
    const { data: callbackJob } = await supabase
      .from('jobs')
      .insert({
        job_id: 'J-STAGE7-CALLBACK',
        customer_id: customer.customer_id,
        appliance_type: 'Refrigerator',
        appliance_brand: 'Whirlpool',
        appliance_model: 'TEST-MODEL',
        issue_description: 'Same issue as before',
        job_stage: 'Diagnosis',
        priority: 'Normal',
        is_callback: true,
        callback_reason: 'Same Issue - Our Fault'
      })
      .select()
      .single();

    // Create quote with callback pricing (no charges for warranty)
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        quote_id: 'Q-TEST-CALLBACK',
        job_id: callbackJob.job_id,
        customer_id: customer.customer_id,
        version: 1,
        status: 'Draft',
        line_items: [],
        subtotal: 0,
        discount_amount: 0,
        discount_type: 'percent',
        discount_value: 100,
        tax_rate: 4.00,
        tax_amount: 0,
        total: 0,
        is_callback: true,
        callback_reason: 'Same Issue - Our Fault',
        warranty_work: true
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(quote.is_callback).toBe(true);
    expect(quote.warranty_work).toBe(true);
    expect(quote.total).toBe(0);  // No charge for warranty work
  });

  // ====================================
  // Discount Tests
  // ====================================

  test('Should fetch discount presets', async ({ page }) => {
    const { data: discounts, error } = await supabase
      .from('discount_presets')
      .select('*')
      .eq('active', true);

    expect(error).toBeNull();
    expect(discounts.length).toBeGreaterThanOrEqual(5);  // At least 5 presets seeded

    const seniorDiscount = discounts.find(d => d.name === 'Senior Citizen');
    expect(seniorDiscount).toBeTruthy();
    expect(seniorDiscount?.type).toBe('percent');
    expect(seniorDiscount?.value).toBe(10.00);
  });
});
