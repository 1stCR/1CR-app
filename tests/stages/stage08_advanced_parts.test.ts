import { test, expect } from '@playwright/test';
import { supabase } from '../../src/lib/supabase';
import dotenv from 'dotenv';
import { calculateStockingScore } from '../../src/utils/stockingScore';
import { calculateRecommendedMinStock } from '../../src/utils/minStockCalculation';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// ====================================
// Test Setup & Helpers
// ====================================

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
  await supabase.from('parts_order_items').delete().ilike('part_number', 'STAGE8%');
  await supabase.from('parts_orders').delete().ilike('order_number', 'PO-TEST%');
  await supabase.from('shipments').delete().ilike('shipment_code', 'SHIP-TEST%');
  await supabase.from('parts_supplier_pricing').delete().ilike('part_number', 'STAGE8%');
  await supabase.from('parts_xref_groups').delete().ilike('group_code', 'GRP-TEST%');
  await supabase.from('storage_locations').delete().ilike('location_code', 'LOC-TEST%');
  await supabase.from('parts_transactions').delete().ilike('part_number', 'STAGE8%');
  await supabase.from('parts_master').delete().ilike('part_number', 'STAGE8%');
  await supabase.from('suppliers').delete().ilike('supplier_code', 'SUP-TEST%');
}

async function createTestSupplier() {
  testCounter++;
  const supplierCode = `SUP-TEST-${String(testCounter).padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      supplier_code: supplierCode,
      supplier_name: `Test Supplier ${testCounter}`,
      contact_name: 'Test Contact',
      phone: '307-555-0100',
      active: true,
      preferred: false
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
      category: 'Test',
      avg_cost: cost,
      auto_replenish: false,
      in_stock: 5,
      location_notes: 'Test Warehouse - A1'
    })
    .select()
    .single();

  if (partError) throw partError;

  return part;
}

// ====================================
// Stage 8: Advanced Parts Tests
// ====================================

test.describe('Stage 8: Advanced Parts Features', () => {
  test.beforeAll(async () => {
    await authenticateSupabase();
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  // ====================================
  // Supplier Tests
  // ====================================

  test('@critical Should create a supplier', async ({ page }) => {
    const supplier = await createTestSupplier();

    expect(supplier).not.toBeNull();
    expect(supplier.supplier_code).toMatch(/SUP-TEST-\d{3}/);
    expect(supplier.supplier_name).toContain('Test Supplier');
    expect(supplier.active).toBe(true);
  });

  test('Should fetch active suppliers', async ({ page }) => {
    await createTestSupplier();
    await createTestSupplier();

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('active', true)
      .ilike('supplier_code', 'SUP-TEST%');

    expect(error).toBeNull();
    expect(suppliers.length).toBeGreaterThanOrEqual(2);
  });

  // ====================================
  // Storage Location Tests
  // ====================================

  test('@critical Should create storage location', async ({ page }) => {
    const { data: location, error } = await supabase
      .from('storage_locations')
      .insert({
        location_code: 'LOC-TEST-001',
        location_type: 'Shelf',
        location_name: 'Test Shelf A',
        description: 'Test storage shelf',
        active: true
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(location).not.toBeNull();
    expect(location.location_code).toBe('LOC-TEST-001');
    expect(location.location_type).toBe('Shelf');
  });

  test('Should create hierarchical storage locations', async ({ page }) => {
    // Create parent location
    const { data: parent } = await supabase
      .from('storage_locations')
      .insert({
        location_code: 'LOC-TEST-PARENT',
        location_type: 'Vehicle',
        location_name: 'Test Truck',
        active: true
      })
      .select()
      .single();

    // Create child location
    const { data: child, error } = await supabase
      .from('storage_locations')
      .insert({
        location_code: 'LOC-TEST-CHILD',
        location_type: 'Bin',
        location_name: 'Bin A',
        parent_location_id: parent.id,
        active: true
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(child.parent_location_id).toBe(parent.id);
  });

  // ====================================
  // Cross-Reference Groups Tests
  // ====================================

  test('@critical Should create cross-reference group', async ({ page }) => {
    const part1 = await createTestPart('STAGE8-XREF-001A', 'Test Part A', 30.00);
    const part2 = await createTestPart('STAGE8-XREF-001B', 'Test Part B', 32.00);

    const { data: group, error } = await supabase
      .from('parts_xref_groups')
      .insert({
        group_code: 'GRP-TEST-001',
        description: 'Test Cross-Reference Group',
        part_numbers: [part1.part_number, part2.part_number],
        auto_replenish: true,
        min_stock_group: 2,
        total_uses: 0,
        combined_stock: 10
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(group).not.toBeNull();
    expect(group.group_code).toBe('GRP-TEST-001');
    expect(group.part_numbers).toHaveLength(2);
    expect(group.part_numbers).toContain(part1.part_number);
    expect(group.part_numbers).toContain(part2.part_number);
  });

  test('Should link parts to cross-reference group', async ({ page }) => {
    const part = await createTestPart('STAGE8-XREF-002', 'Test Part C', 25.00);

    const { data: group } = await supabase
      .from('parts_xref_groups')
      .insert({
        group_code: 'GRP-TEST-002',
        description: 'Test Group 2',
        part_numbers: [part.part_number],
        auto_replenish: true,
        min_stock_group: 1
      })
      .select()
      .single();

    // Link part to group
    const { error } = await supabase
      .from('parts_master')
      .update({ xref_group_id: group.id })
      .eq('part_number', part.part_number);

    expect(error).toBeNull();

    // Verify link
    const { data: updatedPart } = await supabase
      .from('parts_master')
      .select('xref_group_id')
      .eq('part_number', part.part_number)
      .single();

    expect(updatedPart.xref_group_id).toBe(group.id);
  });

  // ====================================
  // Purchase Order Tests
  // ====================================

  test('@critical Should create purchase order', async ({ page }) => {
    const supplier = await createTestSupplier();

    const { data: order, error } = await supabase
      .from('parts_orders')
      .insert({
        order_number: 'PO-TEST-001',
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        order_date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        subtotal: 0,
        shipping_cost: 0,
        tax: 0,
        total: 0
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(order).not.toBeNull();
    expect(order.order_number).toBe('PO-TEST-001');
    expect(order.status).toBe('Draft');
  });

  test('Should add items to purchase order', async ({ page }) => {
    const supplier = await createTestSupplier();
    const part = await createTestPart('STAGE8-PO-ITEM', 'Test PO Part', 45.00);

    // Create order
    const { data: order } = await supabase
      .from('parts_orders')
      .insert({
        order_number: 'PO-TEST-002',
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        order_date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        subtotal: 0,
        shipping_cost: 0,
        tax: 0,
        total: 0
      })
      .select()
      .single();

    // Add item
    const { data: item, error } = await supabase
      .from('parts_order_items')
      .insert({
        order_id: order.id,
        part_number: part.part_number,
        description: part.description,
        quantity: 3,
        unit_cost: 45.00,
        has_core: false
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(item).not.toBeNull();
    expect(item.part_number).toBe(part.part_number);
    expect(item.quantity).toBe(3);
    expect(item.line_total).toBe(135.00); // 3 * 45
    expect(item.qty_remaining).toBe(3);
  });

  test('Should handle core charges on order items', async ({ page }) => {
    const supplier = await createTestSupplier();
    const part = await createTestPart('STAGE8-CORE-PART', 'Part with Core', 100.00);

    const { data: order } = await supabase
      .from('parts_orders')
      .insert({
        order_number: 'PO-TEST-CORE',
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        status: 'Draft',
        subtotal: 0,
        total: 0
      })
      .select()
      .single();

    // Add item with core charge
    const { data: item, error } = await supabase
      .from('parts_order_items')
      .insert({
        order_id: order.id,
        part_number: part.part_number,
        description: part.description,
        quantity: 1,
        unit_cost: 100.00,
        has_core: true,
        core_charge: 25.00,
        core_returned: false
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(item.has_core).toBe(true);
    expect(item.core_charge).toBe(25.00);
    expect(item.core_returned).toBe(false);

    // Mark core as returned
    const { error: updateError } = await supabase
      .from('parts_order_items')
      .update({
        core_returned: true,
        core_return_date: new Date().toISOString().split('T')[0],
        core_tracking: 'CORE-TRACK-123',
        core_credit_amount: 25.00
      })
      .eq('id', item.id);

    expect(updateError).toBeNull();

    // Verify update
    const { data: updatedItem } = await supabase
      .from('parts_order_items')
      .select('*')
      .eq('id', item.id)
      .single();

    expect(updatedItem.core_returned).toBe(true);
    expect(updatedItem.core_credit_amount).toBe(25.00);
  });

  // ====================================
  // Shipment Tests
  // ====================================

  test('@critical Should create shipment', async ({ page }) => {
    const supplier = await createTestSupplier();

    const { data: shipment, error } = await supabase
      .from('shipments')
      .insert({
        shipment_code: 'SHIP-TEST-001',
        tracking_number: 'TEST-TRACK-001',
        carrier: 'UPS',
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        order_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        total_cost: 0,
        shipping_cost: 0,
        parts_count: 0,
        jobs_affected: 0
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(shipment).not.toBeNull();
    expect(shipment.shipment_code).toBe('SHIP-TEST-001');
    expect(shipment.tracking_number).toBe('TEST-TRACK-001');
    expect(shipment.status).toBe('Pending');
  });

  test('Should update shipment status', async ({ page }) => {
    const supplier = await createTestSupplier();

    const { data: shipment } = await supabase
      .from('shipments')
      .insert({
        shipment_code: 'SHIP-TEST-002',
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        status: 'Pending'
      })
      .select()
      .single();

    // Update to Shipped
    const { error } = await supabase
      .from('shipments')
      .update({
        status: 'Shipped',
        ship_date: new Date().toISOString().split('T')[0],
        last_status_update: new Date().toISOString()
      })
      .eq('id', shipment.id);

    expect(error).toBeNull();

    // Verify
    const { data: updated } = await supabase
      .from('shipments')
      .select('status, ship_date')
      .eq('id', shipment.id)
      .single();

    expect(updated.status).toBe('Shipped');
    expect(updated.ship_date).not.toBeNull();
  });

  // ====================================
  // Stocking Score Tests
  // ====================================

  test('@critical Should calculate stocking score', async ({ page }) => {
    const part = await createTestPart('STAGE8-SCORE-PART', 'Part for Scoring', 30.00);

    // Add some usage data
    await supabase
      .from('parts_master')
      .update({
        times_used: 5,
        first_used_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        last_used_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
      })
      .eq('part_number', part.part_number);

    const result = await calculateStockingScore(part.part_number);

    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.breakdown).toHaveProperty('frequency');
    expect(result.breakdown).toHaveProperty('recency');
    expect(result.breakdown).toHaveProperty('fccImpact');
    expect(result.breakdown).toHaveProperty('cost');
    expect(result.recommendation).toBeTruthy();
  });

  // ====================================
  // Min Stock Calculation Tests
  // ====================================

  test('@critical Should calculate recommended min stock', async ({ page }) => {
    const part = await createTestPart('STAGE8-MINSTOCK-PART', 'Part for Min Stock', 25.00);

    // Add usage transactions
    for (let i = 0; i < 5; i++) {
      await supabase
        .from('parts_transactions')
        .insert({
          part_number: part.part_number,
          type: 'Used',
          quantity: 1,
          date: new Date(Date.now() - i * 10 * 24 * 60 * 60 * 1000).toISOString() // Every 10 days
        });
    }

    const result = await calculateRecommendedMinStock(part.part_number);

    expect(result).not.toBeNull();
    expect(result.value).toBeGreaterThanOrEqual(1);
    expect(result.confidence).toMatch(/High|Medium|Low/);
    expect(result.reasoning).toHaveProperty('usageRate');
    expect(result.reasoning).toHaveProperty('leadTime');
    expect(result.reasoning).toHaveProperty('dataPoints');
  });

  // ====================================
  // Supplier Pricing Tests
  // ====================================

  test('Should track supplier pricing', async ({ page }) => {
    const supplier = await createTestSupplier();
    const part = await createTestPart('STAGE8-PRICING-PART', 'Part with Pricing', 50.00);

    const { data: pricing, error } = await supabase
      .from('parts_supplier_pricing')
      .insert({
        part_number: part.part_number,
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        unit_price: 50.00,
        in_stock: true,
        lead_time_days: 3,
        min_order_qty: 1,
        active: true,
        preferred: true
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(pricing).not.toBeNull();
    expect(pricing.unit_price).toBe(50.00);
    expect(pricing.lead_time_days).toBe(3);
    expect(pricing.preferred).toBe(true);
  });
});
