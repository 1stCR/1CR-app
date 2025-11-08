# Stage 8: Advanced Parts Features - User Guide

## 🎯 Overview

Stage 8 transforms your parts inventory from basic tracking into an intelligent, self-optimizing system. It learns from your business patterns and helps you make smarter stocking decisions.

---

## 🚀 Getting Started

### 1. Run the Database Migration

First, make sure your Supabase instance is running and apply the Stage 8 migration:

```bash
# If using local Supabase
npx supabase start
npx supabase db reset

# Or apply just the Stage 8 migration
npx supabase migration up
```

This creates:
- Suppliers table
- Storage locations (hierarchical)
- Cross-reference groups
- Purchase orders and items
- Shipments
- Supplier pricing

### 2. Verify Tables Created

Check that the new tables exist:

```sql
-- In Supabase SQL Editor
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'suppliers',
  'storage_locations',
  'parts_xref_groups',
  'parts_orders',
  'parts_order_items',
  'shipments',
  'parts_supplier_pricing'
);
```

You should see all 7 tables listed.

---

## 📊 Core Features & How to Use Them

### Feature 1: Intelligent Stocking Scores

**What it does:** Calculates a 0-10 score for each part based on how valuable it is to keep in stock.

**How it works:**
- **Frequency (0-4 pts):** How often you use the part
  - Weekly use = 4 points
  - Monthly use = 2 points
  - Rarely = 0-1 points

- **Recency (0-2 pts):** When was it last used?
  - Last 7 days = 2 points
  - Last 30 days = 1.5 points
  - Last 90 days = 1 point

- **FCC Impact (0-3 pts):** How many callbacks would this prevent?
  - Each callback = 0.5 points (max 3)

- **Cost Efficiency (0-1 pt):** Is it affordable to stock?
  - Under $50 = 1 point
  - Over $50 = 0.5 points

**How to use it:**

```typescript
import { calculateStockingScore } from '../utils/stockingScore';

// Calculate score for a single part
const result = await calculateStockingScore('W10408179');

console.log(result);
// Output:
// {
//   score: 8.5,
//   breakdown: {
//     frequency: 3,
//     recency: 2,
//     fccImpact: 2.5,
//     cost: 1
//   },
//   recommendation: 'High value - Stock soon'
// }

// Update scores for all parts (run nightly)
import { updateAllStockingScores } from '../utils/stockingScore';
const updated = await updateAllStockingScores();
console.log(`Updated ${updated} parts`);
```

**Practical example:**

```typescript
// Find parts worth stocking
const { data: highValueParts } = await supabase
  .from('parts_master')
  .select('part_number, description, stocking_score, avg_cost')
  .gte('stocking_score', 7)  // High value parts
  .order('stocking_score', { ascending: false });

// These are your best candidates for keeping in stock
highValueParts.forEach(part => {
  console.log(`${part.part_number}: Score ${part.stocking_score}/10 - ${part.description}`);
});
```

---

### Feature 2: Smart Minimum Stock Calculation

**What it does:** Automatically calculates how many of each part you should keep in stock based on your usage patterns and supplier lead times.

**Formula:**
```
Lead Time = How long supplier takes to deliver (days)
Order Cycle = How often you order (7 days default)
Total Cycle = Lead Time + Order Cycle

Expected Usage = (Uses per month ÷ 30) × Total Cycle
Safety Stock = Expected Usage × FCC Multiplier (1.2-1.5x)
Recommended Min = Round up(Safety Stock)
```

**How to use it:**

```typescript
import { calculateRecommendedMinStock } from '../utils/minStockCalculation';

// Calculate for a part
const result = await calculateRecommendedMinStock('W10408179');

console.log(result);
// Output:
// {
//   value: 3,
//   confidence: 'High',
//   reasoning: {
//     usageRate: '4.5/mo',
//     leadTime: '3d',
//     orderCycle: '7d',
//     fccImpact: 2,
//     dataPoints: 15
//   }
// }
```

**Real-world scenario:**

Let's say you have a defrost timer that you use about 4 times per month:
- Usage: 4/month = 0.13/day
- Supplier lead time: 3 days
- Your order cycle: 7 days (weekly)
- Total cycle: 10 days
- Expected usage in 10 days: 1.3 parts
- FCC impact: You had 2 callbacks = 1.5x multiplier
- Safety stock: 1.3 × 1.5 = 1.95
- **Recommended min stock: 2 parts**

**Apply to your inventory:**

```typescript
// Enable auto-replenish for high-value parts
await supabase
  .from('parts_master')
  .update({ auto_replenish: true })
  .gte('stocking_score', 7);

// Calculate and set min stock for all auto-replenish parts
import { updateAllMinStockLevels } from '../utils/minStockCalculation';
const updated = await updateAllMinStockLevels();
console.log(`Set min stock for ${updated} parts`);
```

---

### Feature 3: Cross-Reference Groups

**What it does:** Groups compatible parts together so you can track combined stock and treat them as interchangeable.

**Example use case:**
You have 3 equivalent defrost timers:
- W10408179 (Whirlpool OEM) - 2 in stock
- WPW10408179 (Whirlpool replacement) - 1 in stock
- 2198597 (Generic compatible) - 3 in stock

Instead of tracking each separately, group them:
- **Combined stock: 6 parts**
- **Min stock (group): 3 parts**
- Only alert when **total** drops below 3

**How to create a group:**

```typescript
// Step 1: Create the cross-reference group
const { data: group } = await supabase
  .from('parts_xref_groups')
  .insert({
    group_code: 'GRP-001',
    description: 'Defrost Timer - Various Brands',
    part_numbers: ['W10408179', 'WPW10408179', '2198597'],
    auto_replenish: true,
    min_stock_group: 3,
    total_uses: 0,
    combined_stock: 6
  })
  .select()
  .single();

// Step 2: Link the parts to the group
await supabase
  .from('parts_master')
  .update({ xref_group_id: group.id })
  .in('part_number', ['W10408179', 'WPW10408179', '2198597']);
```

**Check group stock:**

```typescript
// Get all groups below minimum
const { data: lowStockGroups } = await supabase
  .from('parts_xref_groups')
  .select('*')
  .filter('combined_stock', 'lte', 'min_stock_group')
  .eq('auto_replenish', true);

lowStockGroups.forEach(group => {
  console.log(`⚠️ ${group.group_code}: Stock ${group.combined_stock}/${group.min_stock_group}`);
  console.log(`   Parts: ${group.part_numbers.join(', ')}`);
});
```

---

### Feature 4: Purchase Orders

**What it does:** Complete PO system with line items, receiving, core charges, and automatic inventory updates.

**Complete workflow:**

#### Step 1: Create a Purchase Order

```typescript
import { usePurchaseOrderStore } from '../stores/purchaseOrderStore';

const poStore = usePurchaseOrderStore.getState();

// Create new PO
const orderId = await poStore.createOrder(
  'SupplyHouse.com',  // Supplier name
  'supplier-uuid-here' // Optional supplier ID
);

console.log('Created order:', orderId);
```

#### Step 2: Add Items to the Order

```typescript
// Add a regular part
await poStore.addItem(orderId, {
  part_number: 'W10408179',
  description: 'Defrost Timer',
  quantity: 5,
  unit_cost: 45.50,
  job_id: 'J-0123',  // Optional - link to specific job
  job_number: 'J-0123',
  has_core: false
});

// Add a part with core charge (like a compressor)
await poStore.addItem(orderId, {
  part_number: 'COMP-12345',
  description: 'Compressor - 1/4 HP',
  quantity: 1,
  unit_cost: 185.00,
  has_core: true,
  core_charge: 75.00  // You get this back when you return the old compressor
});

// Add shipping cost
await poStore.updateOrder(orderId, {
  shipping_cost: 12.50,
  tax: 15.85
});
```

#### Step 3: Submit the Order

```typescript
// Mark as submitted (ready to send to supplier)
await poStore.submitOrder(orderId);

// Supplier confirms and provides tracking
await poStore.markAsShipped(orderId, '1Z999999999', 'UPS');
```

#### Step 4: Receive Items

```typescript
// When shipment arrives, receive the items
await poStore.receiveItems(orderId, [
  { itemId: 'item-uuid-1', qtyReceived: 5 },  // Received all 5 timers
  { itemId: 'item-uuid-2', qtyReceived: 1 }   // Received 1 compressor
]);

// This automatically:
// 1. Updates qty_received on each item
// 2. Creates parts_transactions records
// 3. Updates parts_inventory via FIFO
// 4. Marks order as 'Received' if all items received
```

#### Step 5: Handle Core Return

```typescript
// After installing the new compressor, return the old one
await poStore.markCoreReturned(
  'item-uuid-2',
  'CORE-TRACK-123',  // Return tracking number
  75.00              // Expected credit
);

// Track the core return status in the order
```

**Query purchase orders:**

```typescript
// Get all open orders
const { data: openOrders } = await supabase
  .from('parts_orders')
  .select('*')
  .in('status', ['Draft', 'Submitted', 'Ordered', 'Shipped'])
  .order('order_date', { ascending: false });

// Get orders for a specific supplier
const { data: supplierOrders } = await supabase
  .from('parts_orders')
  .select('*')
  .eq('supplier_id', 'supplier-uuid')
  .order('order_date', { ascending: false });

// Get orders with items
const { data: orderWithItems } = await supabase
  .from('parts_orders')
  .select(`
    *,
    items:parts_order_items(*)
  `)
  .eq('order_number', 'PO-0001')
  .single();
```

---

### Feature 5: Storage Locations (Hierarchical)

**What it does:** Organize parts across multiple locations with parent-child relationships.

**Example structure:**
```
Home Storage                    (Building)
├─ Shelf 1                     (Shelf)
│  ├─ Bin A                    (Bin)
│  └─ Bin B                    (Bin)
└─ Shelf 2                     (Shelf)
   └─ Drawer 1                 (Drawer)

Truck #1                       (Vehicle)
├─ Bin A                       (Bin)
├─ Bin B                       (Bin)
└─ Toolbox                     (Container)
   ├─ Drawer 1                 (Drawer)
   └─ Drawer 2                 (Drawer)
```

**How to create locations:**

```typescript
// Create parent location (Truck)
const { data: truck } = await supabase
  .from('storage_locations')
  .insert({
    location_code: 'LOC-TRUCK-01',
    location_type: 'Vehicle',
    location_name: 'Truck #1',
    description: 'Primary service vehicle',
    active: true
  })
  .select()
  .single();

// Create child locations (Bins inside truck)
const { data: binA } = await supabase
  .from('storage_locations')
  .insert({
    location_code: 'LOC-TRUCK-01-BINA',
    location_type: 'Bin',
    location_name: 'Bin A',
    parent_location_id: truck.id,
    label_number: 'A1',
    active: true
  })
  .select()
  .single();

// Assign parts to locations
await supabase
  .from('parts_master')
  .update({
    storage_location_id: binA.id,
    location_notes: 'Keep 2-3 in stock in truck'
  })
  .eq('part_number', 'W10408179');
```

**Transfer parts between locations:**

```typescript
// Transfer 3 timers from Home Storage to Truck
await supabase
  .from('parts_transactions')
  .insert({
    part_number: 'W10408179',
    type: 'Transfer',
    quantity: 3,
    from_location_id: homeShelfId,
    to_location_id: truckBinId,
    date: new Date().toISOString(),
    notes: 'Stocking truck for tomorrow\'s jobs'
  });
```

**Find parts by location:**

```typescript
// What's in Truck #1?
const { data: truckParts } = await supabase
  .from('parts_master')
  .select(`
    part_number,
    description,
    in_stock,
    storage_locations!storage_location_id (
      location_name,
      location_path
    )
  `)
  .eq('storage_locations.location_code', 'LOC-TRUCK-01');
```

---

### Feature 6: Supplier Pricing Comparison

**What it does:** Track pricing from multiple suppliers for the same part, compare lead times, and find best deals.

**Add pricing from multiple suppliers:**

```typescript
// Add pricing from Supplier A
await supabase
  .from('parts_supplier_pricing')
  .insert({
    part_number: 'W10408179',
    supplier_id: 'supplier-a-uuid',
    supplier_name: 'SupplyHouse.com',
    unit_price: 45.50,
    in_stock: true,
    lead_time_days: 2,
    shipping_cost: 8.99,
    free_shipping_threshold: 100.00,
    preferred: true,
    active: true
  });

// Add pricing from Supplier B
await supabase
  .from('parts_supplier_pricing')
  .insert({
    part_number: 'W10408179',
    supplier_id: 'supplier-b-uuid',
    supplier_name: 'AppliancePartsPros',
    unit_price: 42.00,
    in_stock: true,
    lead_time_days: 5,
    shipping_cost: 12.99,
    free_shipping_threshold: 150.00,
    preferred: false,
    active: true
  });
```

**Find best price:**

```typescript
// Get all suppliers for a part, sorted by total cost
async function findBestPrice(partNumber: string, quantity: number) {
  const { data: pricing } = await supabase
    .from('parts_supplier_pricing')
    .select('*')
    .eq('part_number', partNumber)
    .eq('active', true)
    .eq('in_stock', true);

  // Calculate total cost including shipping
  const withTotalCost = pricing.map(p => {
    const subtotal = p.unit_price * quantity;
    const shipping = subtotal >= (p.free_shipping_threshold || 999999)
      ? 0
      : (p.shipping_cost || 0);
    return {
      ...p,
      total_cost: subtotal + shipping,
      per_unit_delivered: (subtotal + shipping) / quantity
    };
  });

  // Sort by total cost
  withTotalCost.sort((a, b) => a.total_cost - b.total_cost);

  return withTotalCost;
}

// Use it
const options = await findBestPrice('W10408179', 5);
console.log('Best deal:', options[0]);
// Output:
// {
//   supplier_name: 'AppliancePartsPros',
//   unit_price: 42.00,
//   total_cost: 210.00,  // No shipping (over threshold)
//   per_unit_delivered: 42.00,
//   lead_time_days: 5
// }
```

---

## 🔄 Automated Workflows

### Daily/Weekly Automation

Set up automated jobs to run these functions:

```typescript
// Run nightly (via cron job or scheduled function)
async function nightlyInventoryMaintenance() {
  console.log('Starting nightly inventory maintenance...');

  // 1. Update all stocking scores
  const scoresUpdated = await updateAllStockingScores();
  console.log(`✓ Updated ${scoresUpdated} stocking scores`);

  // 2. Recalculate min stock levels
  const minStockUpdated = await updateAllMinStockLevels();
  console.log(`✓ Updated ${minStockUpdated} min stock levels`);

  // 3. Update cross-reference group combined stock
  const { data: groups } = await supabase
    .from('parts_xref_groups')
    .select('id, part_numbers');

  for (const group of groups || []) {
    const { data: parts } = await supabase
      .from('parts_inventory')
      .select('quantity_on_hand')
      .in('part_number', group.part_numbers);

    const combinedStock = parts?.reduce((sum, p) => sum + p.quantity_on_hand, 0) || 0;

    await supabase
      .from('parts_xref_groups')
      .update({ combined_stock: combinedStock })
      .eq('id', group.id);
  }
  console.log(`✓ Updated ${groups?.length} cross-reference groups`);

  console.log('Nightly maintenance complete!');
}
```

### Auto-Replenishment Alerts

```typescript
// Check what needs to be reordered
async function checkReplenishmentAlerts() {
  // Individual parts below min stock
  const { data: lowParts } = await supabase
    .from('parts_master')
    .select('part_number, description, in_stock, min_stock, avg_cost')
    .eq('auto_replenish', true)
    .filter('in_stock', 'lte', 'min_stock');

  // Groups below min stock
  const { data: lowGroups } = await supabase
    .from('parts_xref_groups')
    .select('*')
    .eq('auto_replenish', true)
    .filter('combined_stock', 'lte', 'min_stock_group');

  console.log(`⚠️  ${lowParts?.length || 0} parts need reordering`);
  console.log(`⚠️  ${lowGroups?.length || 0} groups need reordering`);

  // Send alert email/notification
  if (lowParts && lowParts.length > 0) {
    sendReplenishmentEmail(lowParts, lowGroups);
  }

  return { lowParts, lowGroups };
}
```

---

## 📈 Real-World Example Workflow

### Scenario: You're a busy appliance repair tech

**Monday Morning:**
```typescript
// 1. Check what's low in stock
const alerts = await checkReplenishmentAlerts();

// Output:
// ⚠️ 3 parts need reordering:
//   - W10408179 (Defrost Timer): Stock 1/3
//   - W10447783 (Water Valve): Stock 0/2
//   - COMP-12345 (Compressor): Stock 0/1

// 2. Create purchase order
const orderId = await poStore.createOrder('SupplyHouse.com');

await poStore.addItem(orderId, {
  part_number: 'W10408179',
  description: 'Defrost Timer',
  quantity: 5,
  unit_cost: 45.50,
  has_core: false
});

await poStore.addItem(orderId, {
  part_number: 'W10447783',
  description: 'Water Valve',
  quantity: 3,
  unit_cost: 32.00,
  has_core: false
});

await poStore.submitOrder(orderId);
```

**Wednesday - Parts Arrive:**
```typescript
// 1. Receive items
await poStore.receiveItems(orderId, [
  { itemId: 'item-1', qtyReceived: 5 },
  { itemId: 'item-2', qtyReceived: 3 }
]);

// 2. Stock truck for the week
await supabase
  .from('parts_transactions')
  .insert([
    {
      part_number: 'W10408179',
      type: 'Transfer',
      quantity: 2,
      from_location_id: homeStorageId,
      to_location_id: truckBinId,
      date: new Date().toISOString()
    },
    {
      part_number: 'W10447783',
      type: 'Transfer',
      quantity: 1,
      from_location_id: homeStorageId,
      to_location_id: truckBinId,
      date: new Date().toISOString()
    }
  ]);
```

**Friday - Complete a Job:**
```typescript
// 1. Use a part on a job
await supabase
  .from('parts_used')
  .insert({
    job_id: 'J-0123',
    part_number: 'W10408179',
    quantity: 1,
    cost: 45.50
  });

// 2. System automatically:
//    - Updates inventory
//    - Tracks usage for stocking score
//    - Updates last_used_date
//    - Checks if stock below min (triggers alert if needed)
```

**End of Month:**
```typescript
// Run maintenance job
await nightlyInventoryMaintenance();

// Review stocking decisions
const { data: highValueParts } = await supabase
  .from('parts_master')
  .select('part_number, description, stocking_score, times_used, avg_cost')
  .gte('stocking_score', 7)
  .eq('auto_replenish', false);  // Not yet stocking these

console.log('Consider adding these to auto-replenish:');
highValueParts?.forEach(p => {
  console.log(`  ${p.part_number}: Score ${p.stocking_score}, Used ${p.times_used}x, Cost $${p.avg_cost}`);
});
```

---

## 🎓 Best Practices

### 1. Start Small
- Enable auto-replenish for your top 10-20 parts first
- Monitor for a month before expanding
- Adjust min stock levels based on real experience

### 2. Use Cross-Reference Groups Wisely
- Only group truly interchangeable parts
- Set group min stock = max(individual mins)
- Review group stock weekly

### 3. Track Core Charges Carefully
- Always record core charge amount
- Set reminders to return cores (30 days)
- Track core credits received

### 4. Organize Storage by Usage
- Most-used parts → Truck/easy access
- Moderate-use → Home storage
- Rarely-used → Order as needed

### 5. Review Stocking Scores Monthly
- Parts that increase in score → Add to auto-replenish
- Parts that decrease → Consider removing from stock
- Parts with FCC impact > 2 → Always stock

---

## 🔍 Troubleshooting

### "Stocking scores are all 0"
**Problem:** No usage data yet.
**Solution:** Use parts on jobs for 30-60 days, then scores will populate.

### "Min stock calculations seem too high/low"
**Problem:** Not enough usage history or unusual patterns.
**Solution:**
- Manually override with `min_stock_override`
- Document reason in `min_stock_override_reason`
- Re-evaluate after 90 days

### "Cross-reference group stock not updating"
**Problem:** Trigger/calculation not running.
**Solution:** Run nightly maintenance job manually:
```typescript
await nightlyInventoryMaintenance();
```

### "Purchase order totals don't match"
**Problem:** Need to recalculate.
**Solution:**
```typescript
await poStore.recalculateOrder(orderId);
```

---

## 📚 Quick Reference

### Key Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `calculateStockingScore(partNumber)` | Get 0-10 score for a part | `{ score, breakdown, recommendation }` |
| `calculateRecommendedMinStock(partNumber)` | Calculate smart min stock | `{ value, confidence, reasoning }` |
| `updateAllStockingScores()` | Batch update all scores | Count of updated parts |
| `updateAllMinStockLevels()` | Batch update min stocks | Count of updated parts |
| `poStore.createOrder(supplier)` | Create new PO | Order ID |
| `poStore.addItem(orderId, item)` | Add line item to PO | void |
| `poStore.receiveItems(orderId, items)` | Receive shipment | void |

### Status Values

**Purchase Orders:**
- Draft
- Submitted
- Ordered
- Shipped
- Partially Received
- Received
- Cancelled

**Shipments:**
- Pending
- Ordered
- Shipped
- In Transit
- Out for Delivery
- Delivered
- Exception

**Storage Location Types:**
- Vehicle
- Building
- Container
- Shelf
- Bin
- Drawer

---

## 🎯 Next Steps

1. **Run the migration** - Set up all the tables
2. **Add your suppliers** - Create supplier records
3. **Set up storage locations** - Organize your inventory
4. **Enable auto-replenish** - Start with top 10 parts
5. **Create your first PO** - Test the workflow
6. **Monitor for 30 days** - Let the system learn your patterns
7. **Review stocking scores** - Adjust auto-replenish parts

---

Stage 8 is now ready to make your inventory smarter! 🚀
