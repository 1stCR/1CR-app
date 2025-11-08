# Stage 8: Advanced Parts Features

## 🎯 Objective
Implement advanced inventory intelligence including cross-reference groups, auto-replenishment system, stocking scores, purchase order management, shipment tracking, and core charge handling.

## ✅ Prerequisites
- Stages 1-7 completed
- Parts inventory system functional (Stage 5)
- AI integration working (Stage 6)
- Database tables for parts, transactions, cross-references created
- Basic FIFO inventory working

## 🛠️ What We're Building

### Core Features:
1. **Cross-Reference Groups**
   - Group compatible parts together
   - Unified stock tracking across variants
   - Combined usage statistics
   - Smart replenishment at group level

2. **Auto-Replenishment System**
   - Intelligent min stock calculations
   - Automatic alerts when stock low
   - Stocking score algorithm (0-10)
   - Usage-based recommendations

3. **Purchase Order Management**
   - Create multi-part orders
   - Track order status
   - Link orders to jobs
   - Supplier management

4. **Shipment Tracking**
   - Group multiple parts in shipments
   - Update all parts at once
   - Auto-notify affected jobs
   - Delivery confirmation

5. **Core Charge System**
   - Track core charges on orders
   - Monitor core returns
   - Credit reconciliation
   - Return shipping tracking

6. **Storage Location Management**
   - Hierarchical location system
   - Part transfer tracking
   - Multi-location support
   - Physical bin/drawer management

7. **Supplier Pricing**
   - Multi-vendor price tracking
   - Best price recommendations
   - Lead time comparison
   - Preferred supplier logic

---

## 📊 Database Schema Updates

### New Tables

#### 1. **parts_xref_groups** table
```sql
-- Cross-reference groups for compatible parts
CREATE TABLE parts_xref_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT UNIQUE NOT NULL, -- e.g., "GRP-001"
  description TEXT NOT NULL,
  part_numbers TEXT[] NOT NULL, -- Array of compatible part numbers
  
  -- Stock management
  auto_replenish BOOLEAN DEFAULT true,
  min_stock_group INTEGER DEFAULT 1,
  
  -- Statistics
  total_uses INTEGER DEFAULT 0,
  combined_stock INTEGER GENERATED ALWAYS AS (
    -- Will be calculated via trigger
  ) STORED,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookups
CREATE INDEX idx_xref_groups_parts ON parts_xref_groups 
  USING GIN (part_numbers);
```

#### 2. **parts_orders** table
```sql
-- Purchase order headers
CREATE TABLE parts_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL, -- e.g., "PO-001"
  
  -- Supplier info
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  
  -- Order details
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Draft',
    -- Draft, Submitted, Ordered, Shipped, Partially Received, Received, Cancelled
  
  -- Financials
  subtotal DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) GENERATED ALWAYS AS (
    subtotal + COALESCE(shipping_cost, 0) + COALESCE(tax, 0)
  ) STORED,
  
  -- Tracking
  tracking_number TEXT,
  carrier TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_orders_status ON parts_orders(status);
CREATE INDEX idx_orders_date ON parts_orders(order_date);
CREATE INDEX idx_orders_supplier ON parts_orders(supplier_id);
```

#### 3. **parts_order_items** table
```sql
-- Individual items on purchase orders
CREATE TABLE parts_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES parts_orders(id) ON DELETE CASCADE,
  
  -- Part info
  part_number TEXT NOT NULL,
  description TEXT,
  
  -- Order details
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) GENERATED ALWAYS AS (
    quantity * unit_cost
  ) STORED,
  
  -- Job linkage (if ordered for specific job)
  job_id UUID REFERENCES jobs(id),
  job_number TEXT,
  
  -- Receiving tracking
  qty_received INTEGER DEFAULT 0,
  qty_remaining INTEGER GENERATED ALWAYS AS (
    quantity - COALESCE(qty_received, 0)
  ) STORED,
  
  -- Core charges
  has_core BOOLEAN DEFAULT false,
  core_charge DECIMAL(10,2),
  core_returned BOOLEAN DEFAULT false,
  core_return_date DATE,
  core_tracking TEXT,
  core_credit_amount DECIMAL(10,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  line_number INTEGER -- Order of items
);

-- Indexes
CREATE INDEX idx_order_items_order ON parts_order_items(order_id);
CREATE INDEX idx_order_items_part ON parts_order_items(part_number);
CREATE INDEX idx_order_items_job ON parts_order_items(job_id);

-- Auto-set line number
CREATE OR REPLACE FUNCTION set_order_line_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.line_number IS NULL THEN
    NEW.line_number := (
      SELECT COALESCE(MAX(line_number), 0) + 1
      FROM parts_order_items
      WHERE order_id = NEW.order_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_line_number
  BEFORE INSERT ON parts_order_items
  FOR EACH ROW
  EXECUTE FUNCTION set_order_line_number();
```

#### 4. **shipments** table
```sql
-- Group multiple orders/parts into shipments
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_code TEXT UNIQUE NOT NULL, -- e.g., "SHIP-001"
  
  -- Tracking info
  tracking_number TEXT UNIQUE,
  tracking_url TEXT,
  carrier TEXT,
  
  -- Supplier
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  
  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ship_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Pending',
    -- Pending, Ordered, Shipped, In Transit, Out for Delivery, Delivered, Exception
  
  -- Costs
  total_cost DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Statistics
  parts_count INTEGER DEFAULT 0,
  jobs_affected INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_status_update TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_expected ON shipments(expected_delivery);
```

#### 5. **storage_locations** table
```sql
-- Hierarchical storage system (truck bins, home shelves, etc.)
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code TEXT UNIQUE NOT NULL, -- e.g., "LOC-001"
  
  -- Hierarchy
  parent_location_id UUID REFERENCES storage_locations(id),
  location_path TEXT, -- Computed: "Truck #1 > Bin A"
  
  -- Details
  location_type TEXT NOT NULL, -- Vehicle, Building, Container, Shelf, Bin, Drawer
  location_name TEXT NOT NULL,
  description TEXT,
  
  -- Physical attributes
  label_number TEXT, -- For physical labels
  capacity TEXT, -- Optional: "10 parts" or "2 cu ft"
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_locations_parent ON storage_locations(parent_location_id);
CREATE INDEX idx_locations_type ON storage_locations(location_type);
CREATE INDEX idx_locations_active ON storage_locations(active);

-- Function to compute location path
CREATE OR REPLACE FUNCTION compute_location_path(loc_id UUID)
RETURNS TEXT AS $$
DECLARE
  path TEXT := '';
  current_id UUID := loc_id;
  current_name TEXT;
  parent_id UUID;
BEGIN
  LOOP
    SELECT location_name, parent_location_id 
    INTO current_name, parent_id
    FROM storage_locations
    WHERE id = current_id;
    
    EXIT WHEN current_id IS NULL;
    
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;
    
    current_id := parent_id;
  END LOOP;
  
  RETURN path;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update path on insert/update
CREATE OR REPLACE FUNCTION update_location_path()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location_path := compute_location_path(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_path
  BEFORE INSERT OR UPDATE ON storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_location_path();
```

#### 6. **parts_supplier_pricing** table
```sql
-- Track pricing from multiple suppliers
CREATE TABLE parts_supplier_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Part
  part_number TEXT NOT NULL,
  
  -- Supplier
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  
  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Availability
  in_stock BOOLEAN DEFAULT true,
  lead_time_days INTEGER,
  min_order_qty INTEGER DEFAULT 1,
  
  -- Shipping
  shipping_cost DECIMAL(10,2),
  free_shipping_threshold DECIMAL(10,2),
  
  -- Tracking
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  last_ordered DATE,
  times_ordered INTEGER DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT true,
  preferred BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_supplier_pricing_part ON parts_supplier_pricing(part_number);
CREATE INDEX idx_supplier_pricing_supplier ON parts_supplier_pricing(supplier_id);
CREATE INDEX idx_supplier_pricing_preferred ON parts_supplier_pricing(preferred)
  WHERE preferred = true;
```

### Updates to Existing Tables

#### Update **parts_master** table
```sql
-- Add new columns for advanced features
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS
  xref_group_id UUID REFERENCES parts_xref_groups(id);

ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS
  auto_replenish BOOLEAN DEFAULT false;

ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS
  min_stock_override INTEGER;

ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS
  min_stock_override_reason TEXT;

ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS
  stocking_score DECIMAL(4,2) DEFAULT 0;

ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS
  storage_location_id UUID REFERENCES storage_locations(id);

ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS
  location_notes TEXT;

-- Index for cross-reference lookups
CREATE INDEX IF NOT EXISTS idx_parts_xref_group 
  ON parts_master(xref_group_id);

CREATE INDEX IF NOT EXISTS idx_parts_location 
  ON parts_master(storage_location_id);
```

#### Update **parts_transactions** table
```sql
-- Add shipment and location tracking
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  shipment_id UUID REFERENCES shipments(id);

ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  order_id UUID REFERENCES parts_orders(id);

ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  from_location_id UUID REFERENCES storage_locations(id);

ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  to_location_id UUID REFERENCES storage_locations(id);

-- Core charge fields
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  has_core BOOLEAN DEFAULT false;

ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  core_charge_amount DECIMAL(10,2);

ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  core_return_status TEXT;
  -- Pending, Shipped, Credited, Waived

ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  core_credit_amount DECIMAL(10,2);

ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS
  core_tracking_number TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_shipment 
  ON parts_transactions(shipment_id);
  
CREATE INDEX IF NOT EXISTS idx_transactions_order 
  ON parts_transactions(order_id);
  
CREATE INDEX IF NOT EXISTS idx_transactions_core_status 
  ON parts_transactions(core_return_status)
  WHERE has_core = true;
```

---

## 🎨 Frontend Components

### 1. Cross-Reference Groups Manager

**File:** `src/components/parts/CrossReferenceGroups.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface CrossRefGroup {
  id: string;
  group_code: string;
  description: string;
  part_numbers: string[];
  auto_replenish: boolean;
  min_stock_group: number;
  total_uses: number;
  combined_stock: number;
  created_at: string;
}

interface PartInGroup {
  part_number: string;
  description: string;
  in_stock: number;
  times_used: number;
}

export default function CrossReferenceGroups() {
  const [groups, setGroups] = useState<CrossRefGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<CrossRefGroup | null>(null);
  const [partsInGroup, setPartsInGroup] = useState<PartInGroup[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parts_xref_groups')
        .select('*')
        .order('group_code', { ascending: true });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      alert('Failed to load cross-reference groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (group: CrossRefGroup) => {
    setSelectedGroup(group);
    
    try {
      // Load details for each part in the group
      const { data, error } = await supabase
        .from('parts_master')
        .select('part_number, description, in_stock, times_used')
        .in('part_number', group.part_numbers);

      if (error) throw error;
      setPartsInGroup(data || []);
    } catch (error) {
      console.error('Error loading group details:', error);
    }
  };

  const updateGroupSettings = async (
    groupId: string,
    updates: Partial<Pick<CrossRefGroup, 'auto_replenish' | 'min_stock_group'>>
  ) => {
    try {
      const { error } = await supabase
        .from('parts_xref_groups')
        .update(updates)
        .eq('id', groupId);

      if (error) throw error;
      
      await loadGroups();
      alert('Group settings updated');
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group settings');
    }
  };

  const createNewGroup = async (partNumbers: string[], description: string) => {
    try {
      // Generate next group code
      const { data: lastGroup } = await supabase
        .from('parts_xref_groups')
        .select('group_code')
        .order('group_code', { ascending: false })
        .limit(1)
        .single();

      const lastNum = lastGroup ? 
        parseInt(lastGroup.group_code.split('-')[1]) : 0;
      const newCode = `GRP-${String(lastNum + 1).padStart(3, '0')}`;

      const { error } = await supabase
        .from('parts_xref_groups')
        .insert({
          group_code: newCode,
          description,
          part_numbers: partNumbers,
          auto_replenish: true,
          min_stock_group: 1
        });

      if (error) throw error;

      // Update parts_master to link to new group
      const { data: groupData } = await supabase
        .from('parts_xref_groups')
        .select('id')
        .eq('group_code', newCode)
        .single();

      if (groupData) {
        await supabase
          .from('parts_master')
          .update({ xref_group_id: groupData.id })
          .in('part_number', partNumbers);
      }

      await loadGroups();
      alert('Cross-reference group created');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading cross-reference groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cross-Reference Groups</h2>
        <button
          onClick={() => {/* Open create group modal */}}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Create Group
        </button>
      </div>

      {/* Groups List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="border rounded-lg p-4 hover:shadow-lg cursor-pointer transition"
            onClick={() => loadGroupDetails(group)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{group.group_code}</h3>
                <p className="text-sm text-gray-600">{group.description}</p>
              </div>
              {group.auto_replenish && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Auto
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <div>
                <div className="text-gray-500">Parts</div>
                <div className="font-semibold">{group.part_numbers.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Stock</div>
                <div className="font-semibold">{group.combined_stock}</div>
              </div>
              <div>
                <div className="text-gray-500">Min Stock</div>
                <div className="font-semibold">{group.min_stock_group}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Uses</div>
                <div className="font-semibold">{group.total_uses}</div>
              </div>
            </div>

            {/* Alert if stock low */}
            {group.combined_stock <= group.min_stock_group && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                ⚠️ Stock below minimum ({group.combined_stock}/{group.min_stock_group})
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Group Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{selectedGroup.group_code}</h3>
                <p className="text-gray-600">{selectedGroup.description}</p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Group Settings */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Auto-Replenish
                </label>
                <input
                  type="checkbox"
                  checked={selectedGroup.auto_replenish}
                  onChange={(e) => 
                    updateGroupSettings(selectedGroup.id, { 
                      auto_replenish: e.target.checked 
                    })
                  }
                  className="h-5 w-5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Stock (Group)
                </label>
                <input
                  type="number"
                  value={selectedGroup.min_stock_group}
                  onChange={(e) => 
                    updateGroupSettings(selectedGroup.id, { 
                      min_stock_group: parseInt(e.target.value) 
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  min="0"
                />
              </div>
            </div>

            {/* Parts in Group */}
            <h4 className="font-semibold mb-3">Parts in This Group</h4>
            <div className="space-y-2">
              {partsInGroup.map((part) => (
                <div
                  key={part.part_number}
                  className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">{part.part_number}</div>
                    <div className="text-sm text-gray-600">{part.description}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>
                      <span className="text-gray-500">Stock:</span>{' '}
                      <span className="font-semibold">{part.in_stock}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Used:</span>{' '}
                      <span>{part.times_used}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {/* Edit group functionality */}}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Auto-Replenishment Dashboard

**File:** `src/components/parts/AutoReplenishmentDashboard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ReplenishAlert {
  part_number: string;
  description: string;
  current_stock: number;
  min_stock: number;
  recommended_qty: number;
  stocking_score: number;
  estimated_cost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  xref_group?: {
    group_code: string;
    combined_stock: number;
    min_stock_group: number;
  };
}

export default function AutoReplenishmentDashboard() {
  const [alerts, setAlerts] = useState<ReplenishAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReplenishmentAlerts();
  }, []);

  const loadReplenishmentAlerts = async () => {
    setLoading(true);
    try {
      // Get parts with auto_replenish enabled where stock is at or below min
      const { data: parts, error: partsError } = await supabase
        .from('parts_master')
        .select(`
          part_number,
          description,
          in_stock,
          min_stock,
          min_stock_override,
          avg_cost,
          stocking_score,
          xref_group_id,
          parts_xref_groups:xref_group_id (
            group_code,
            combined_stock,
            min_stock_group
          )
        `)
        .eq('auto_replenish', true);

      if (partsError) throw partsError;

      // Calculate alerts
      const alertData: ReplenishAlert[] = [];

      for (const part of parts || []) {
        const minStock = part.min_stock_override || part.min_stock || 1;
        let currentStock = part.in_stock || 0;
        let shouldAlert = false;

        // Check if part is in a cross-reference group
        if (part.parts_xref_groups) {
          const group = part.parts_xref_groups;
          currentStock = group.combined_stock || 0;
          shouldAlert = currentStock <= group.min_stock_group;
        } else {
          shouldAlert = currentStock <= minStock;
        }

        if (shouldAlert) {
          const recommendedQty = Math.max(minStock - currentStock + 1, 1);
          const estimatedCost = (part.avg_cost || 0) * recommendedQty;

          // Determine urgency based on stock level and stocking score
          let urgency: ReplenishAlert['urgency'] = 'low';
          if (currentStock === 0) {
            urgency = 'critical';
          } else if (part.stocking_score >= 8) {
            urgency = 'high';
          } else if (part.stocking_score >= 5) {
            urgency = 'medium';
          }

          alertData.push({
            part_number: part.part_number,
            description: part.description || '',
            current_stock: currentStock,
            min_stock: minStock,
            recommended_qty: recommendedQty,
            stocking_score: part.stocking_score || 0,
            estimated_cost: estimatedCost,
            urgency,
            xref_group: part.parts_xref_groups ? {
              group_code: part.parts_xref_groups.group_code,
              combined_stock: part.parts_xref_groups.combined_stock,
              min_stock_group: part.parts_xref_groups.min_stock_group
            } : undefined
          });
        }
      }

      // Sort by urgency and stocking score
      alertData.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return b.stocking_score - a.stocking_score;
      });

      setAlerts(alertData);
    } catch (error) {
      console.error('Error loading replenishment alerts:', error);
      alert('Failed to load replenishment alerts');
    } finally {
      setLoading(false);
    }
  };

  const togglePartSelection = (partNumber: string) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partNumber)) {
      newSelected.delete(partNumber);
    } else {
      newSelected.add(partNumber);
    }
    setSelectedParts(newSelected);
  };

  const selectAllCritical = () => {
    const critical = alerts
      .filter(a => a.urgency === 'critical')
      .map(a => a.part_number);
    setSelectedParts(new Set(critical));
  };

  const createPurchaseOrder = async () => {
    if (selectedParts.size === 0) {
      alert('Please select at least one part');
      return;
    }

    // Navigate to PO creation with pre-selected parts
    const partsList = Array.from(selectedParts).join(',');
    window.location.href = `/parts/orders/new?parts=${partsList}`;
  };

  const getUrgencyColor = (urgency: ReplenishAlert['urgency']) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getUrgencyIcon = (urgency: ReplenishAlert['urgency']) => {
    switch (urgency) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading replenishment alerts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Auto-Replenishment Alerts</h2>
          <p className="text-gray-600 mt-1">
            {alerts.length} part{alerts.length !== 1 ? 's' : ''} need reordering
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={selectAllCritical}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Select All Critical
          </button>
          <button
            onClick={createPurchaseOrder}
            disabled={selectedParts.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Create PO ({selectedParts.size} parts)
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low'] as const).map((urgency) => {
          const count = alerts.filter(a => a.urgency === urgency).length;
          const total = alerts
            .filter(a => a.urgency === urgency)
            .reduce((sum, a) => sum + a.estimated_cost, 0);

          return (
            <div key={urgency} className={`p-4 rounded-lg border-2 ${getUrgencyColor(urgency)}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getUrgencyIcon(urgency)}</span>
                <span className="font-semibold capitalize">{urgency}</span>
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm mt-1">
                Est. ${total.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-lg">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-xl font-semibold text-green-800">All Good!</div>
          <div className="text-green-600 mt-1">No parts need reordering right now</div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.part_number}
              className={`border-2 rounded-lg p-4 ${getUrgencyColor(alert.urgency)}`}
            >
              <div className="flex items-start gap-4">
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={selectedParts.has(alert.part_number)}
                  onChange={() => togglePartSelection(alert.part_number)}
                  className="mt-1 h-5 w-5 cursor-pointer"
                />

                {/* Part info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-lg flex items-center gap-2">
                        {getUrgencyIcon(alert.urgency)}
                        {alert.part_number}
                      </div>
                      <div className="text-sm opacity-90">{alert.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        Score: {alert.stocking_score.toFixed(1)}
                      </div>
                      <div className="text-sm">
                        Est. ${alert.estimated_cost.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Stock levels */}
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <div>
                      <div className="text-xs opacity-75">Current Stock</div>
                      <div className="font-bold text-lg">{alert.current_stock}</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-75">Min Stock</div>
                      <div className="font-bold text-lg">{alert.min_stock}</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-75">Recommended Qty</div>
                      <div className="font-bold text-lg">{alert.recommended_qty}</div>
                    </div>
                  </div>

                  {/* Cross-reference group info */}
                  {alert.xref_group && (
                    <div className="text-xs bg-white bg-opacity-50 rounded p-2 mt-2">
                      📦 Part of group <strong>{alert.xref_group.group_code}</strong>
                      {' '}(Combined stock: {alert.xref_group.combined_stock}, Min: {alert.xref_group.min_stock_group})
                    </div>
                  )}

                  {/* Urgency message */}
                  <div className="text-sm mt-2 font-medium">
                    {alert.urgency === 'critical' && '🚨 OUT OF STOCK - Order immediately!'}
                    {alert.urgency === 'high' && '⚠️ Low stock - High priority part'}
                    {alert.urgency === 'medium' && '⚡ Below minimum - Should reorder soon'}
                    {alert.urgency === 'low' && 'ℹ️ Approaching minimum stock level'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Purchase Order Management

**File:** `src/components/parts/PurchaseOrders.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_name: string;
  order_date: string;
  expected_delivery?: string;
  actual_delivery?: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  tracking_number?: string;
  carrier?: string;
}

interface POItem {
  id: string;
  part_number: string;
  description: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  qty_received: number;
  qty_remaining: number;
  job_number?: string;
  has_core: boolean;
  core_charge?: number;
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('parts_orders')
        .select('*')
        .order('order_date', { ascending: false });

      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Submitted': 'bg-yellow-100 text-yellow-800',
      'Ordered': 'bg-blue-100 text-blue-800',
      'Shipped': 'bg-purple-100 text-purple-800',
      'Partially Received': 'bg-orange-100 text-orange-800',
      'Received': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
        <button
          onClick={() => navigate('/parts/orders/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'Draft', 'Ordered', 'Shipped', 'Partially Received', 'Received'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All Orders' : status}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-400 text-lg">No purchase orders found</div>
          <button
            onClick={() => navigate('/parts/orders/new')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Order
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border rounded-lg p-4 hover:shadow-lg cursor-pointer transition"
              onClick={() => navigate(`/parts/orders/${order.id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{order.order_number}</h3>
                  <p className="text-sm text-gray-600">{order.supplier_name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Order Date</div>
                  <div className="font-medium">
                    {new Date(order.order_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Expected Delivery</div>
                  <div className="font-medium">
                    {order.expected_delivery 
                      ? new Date(order.expected_delivery).toLocaleDateString()
                      : 'TBD'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Total</div>
                  <div className="font-bold text-lg">${order.total.toFixed(2)}</div>
                </div>
                {order.tracking_number && (
                  <div>
                    <div className="text-gray-500">Tracking</div>
                    <div className="font-medium text-blue-600 truncate">
                      {order.tracking_number}
                    </div>
                  </div>
                )}
              </div>

              {/* Show delivery alert if overdue */}
              {order.expected_delivery && 
                new Date(order.expected_delivery) < new Date() &&
                order.status !== 'Received' && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  ⚠️ Expected delivery date has passed
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🧮 Business Logic & Utilities

### Stocking Score Calculation

**File:** `src/utils/stockingScore.ts`

```typescript
import { supabase } from '../lib/supabase';

interface UsageStats {
  timesUsed: number;
  daysSinceFirst: number;
  daysSinceLastUse: number;
  avgCost: number;
}

interface StockingScoreResult {
  score: number;
  breakdown: {
    frequency: number;
    recency: number;
    fccImpact: number;
    cost: number;
  };
  recommendation: string;
}

export async function calculateStockingScore(
  partNumber: string
): Promise<StockingScoreResult> {
  try {
    // Get part usage stats
    const { data: part, error: partError } = await supabase
      .from('parts_master')
      .select('times_used, first_used_date, last_used_date, avg_cost')
      .eq('part_number', partNumber)
      .single();

    if (partError || !part) {
      return {
        score: 0,
        breakdown: { frequency: 0, recency: 0, fccImpact: 0, cost: 0 },
        recommendation: 'No usage data available'
      };
    }

    const today = new Date();
    const firstUsed = part.first_used_date ? new Date(part.first_used_date) : null;
    const lastUsed = part.last_used_date ? new Date(part.last_used_date) : null;

    // Component 1: Frequency Score (0-4 points)
    let frequencyScore = 0;
    if (firstUsed && part.times_used > 0) {
      const daysSinceFirst = Math.max(
        (today.getTime() - firstUsed.getTime()) / (1000 * 60 * 60 * 24),
        1
      );
      const usesPerMonth = (part.times_used / daysSinceFirst) * 30;

      if (usesPerMonth >= 4) frequencyScore = 4; // Weekly+
      else if (usesPerMonth >= 2) frequencyScore = 3; // 2x/month
      else if (usesPerMonth >= 1) frequencyScore = 2; // Monthly
      else if (usesPerMonth >= 0.5) frequencyScore = 1; // Bimonthly
    }

    // Component 2: Recency Score (0-2 points)
    let recencyScore = 0;
    if (lastUsed) {
      const daysSinceLastUse = 
        (today.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastUse < 7) recencyScore = 2;
      else if (daysSinceLastUse < 30) recencyScore = 1.5;
      else if (daysSinceLastUse < 90) recencyScore = 1;
    }

    // Component 3: FCC Impact (0-3 points)
    // Check how many callbacks would have been prevented if part was stocked
    const { count: callbackCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('is_callback', true)
      .contains('parts_needed', [partNumber]);

    const fccImpact = Math.min((callbackCount || 0) / 2, 3);

    // Component 4: Cost Efficiency (0-1 point)
    const costScore = (part.avg_cost || 0) < 50 ? 1 : 0.5;

    // Calculate total
    const totalScore = frequencyScore + recencyScore + fccImpact + costScore;

    // Generate recommendation
    let recommendation: string;
    if (totalScore >= 9) recommendation = 'Critical - Stock immediately';
    else if (totalScore >= 7) recommendation = 'High value - Stock soon';
    else if (totalScore >= 5) recommendation = 'Moderate - Consider stocking';
    else if (totalScore >= 3) recommendation = 'Low priority - Order as needed';
    else recommendation = "Rarely used - Don't stock";

    return {
      score: parseFloat(totalScore.toFixed(2)),
      breakdown: {
        frequency: parseFloat(frequencyScore.toFixed(2)),
        recency: parseFloat(recencyScore.toFixed(2)),
        fccImpact: parseFloat(fccImpact.toFixed(2)),
        cost: costScore
      },
      recommendation
    };
  } catch (error) {
    console.error('Error calculating stocking score:', error);
    return {
      score: 0,
      breakdown: { frequency: 0, recency: 0, fccImpact: 0, cost: 0 },
      recommendation: 'Error calculating score'
    };
  }
}

// Batch update stocking scores for all parts
export async function updateAllStockingScores() {
  try {
    const { data: parts, error } = await supabase
      .from('parts_master')
      .select('part_number');

    if (error) throw error;

    for (const part of parts || []) {
      const { score } = await calculateStockingScore(part.part_number);
      
      await supabase
        .from('parts_master')
        .update({ stocking_score: score })
        .eq('part_number', part.part_number);
    }

    console.log(`Updated stocking scores for ${parts?.length || 0} parts`);
  } catch (error) {
    console.error('Error updating stocking scores:', error);
    throw error;
  }
}
```

### Minimum Stock Calculation

**File:** `src/utils/minStockCalculation.ts`

```typescript
import { supabase } from '../lib/supabase';

interface MinStockRecommendation {
  value: number;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: {
    usageRate: string;
    leadTime: string;
    orderCycle: string;
    fccImpact: number;
    dataPoints: number;
  };
}

export async function calculateRecommendedMinStock(
  partNumber: string
): Promise<MinStockRecommendation> {
  try {
    // Get usage data for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: transactions, error: txError } = await supabase
      .from('parts_transactions')
      .select('quantity, date')
      .eq('part_number', partNumber)
      .eq('type', 'Used')
      .gte('date', ninetyDaysAgo.toISOString());

    if (txError) throw txError;

    const usageCount = transactions?.length || 0;

    // Get supplier lead time
    const { data: pricing } = await supabase
      .from('parts_supplier_pricing')
      .select('lead_time_days')
      .eq('part_number', partNumber)
      .eq('preferred', true)
      .order('lead_time_days', { ascending: true })
      .limit(1)
      .single();

    const leadTimeDays = pricing?.lead_time_days || 3;

    // Factor 1: Usage rate
    const avgUsesPerMonth = (usageCount / 90) * 30;

    // Factor 2: Order cycle (assume weekly ordering)
    const orderCycleDays = 7;

    // Factor 3: Calculate FCC impact
    const { count: callbackCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('is_callback', true)
      .contains('parts_needed', [partNumber]);

    const fccImpact = (callbackCount || 0);
    const fccMultiplier = fccImpact > 2 ? 1.5 : 1.2;

    // Calculate recommended stock
    const cyclePeriod = leadTimeDays + orderCycleDays;
    const expectedUsage = (avgUsesPerMonth / 30) * cyclePeriod;
    const safetyStock = expectedUsage * fccMultiplier;
    const recommended = Math.max(Math.ceil(safetyStock), 1);

    // Determine confidence
    let confidence: 'High' | 'Medium' | 'Low';
    if (usageCount > 10) confidence = 'High';
    else if (usageCount > 3) confidence = 'Medium';
    else confidence = 'Low';

    return {
      value: recommended,
      confidence,
      reasoning: {
        usageRate: `${avgUsesPerMonth.toFixed(1)}/mo`,
        leadTime: `${leadTimeDays}d`,
        orderCycle: `${orderCycleDays}d`,
        fccImpact: fccImpact,
        dataPoints: usageCount
      }
    };
  } catch (error) {
    console.error('Error calculating min stock:', error);
    return {
      value: 1,
      confidence: 'Low',
      reasoning: {
        usageRate: '0/mo',
        leadTime: '3d',
        orderCycle: '7d',
        fccImpact: 0,
        dataPoints: 0
      }
    };
  }
}
```

---

## 🔧 Implementation Steps

### Step 1: Database Migration
```bash
# Run the SQL schemas above in Supabase SQL Editor
# Create all new tables and update existing ones
```

### Step 2: Update Environment
```typescript
// .env.local - ensure you have:
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Step 3: Install Components
```bash
# Copy all component files to src/components/parts/
# Create new files as specified above
```

### Step 4: Add Routes
```typescript
// src/App.tsx - Add new routes
import CrossReferenceGroups from './components/parts/CrossReferenceGroups';
import AutoReplenishmentDashboard from './components/parts/AutoReplenishmentDashboard';
import PurchaseOrders from './components/parts/PurchaseOrders';

// In your routes:
<Route path="/parts/xref-groups" element={<CrossReferenceGroups />} />
<Route path="/parts/replenish" element={<AutoReplenishmentDashboard />} />
<Route path="/parts/orders" element={<PurchaseOrders />} />
```

### Step 5: Create Utility Functions
```bash
# Create files:
# - src/utils/stockingScore.ts
# - src/utils/minStockCalculation.ts
```

### Step 6: Set Up Automated Jobs
```typescript
// Create a scheduled function to run nightly
// Update stocking scores
// Recalculate min stock levels
// Send replenishment alerts
```

---

## 🧪 Testing

### Test Cross-Reference Groups
1. Create a new group with 2-3 compatible parts
2. Verify combined stock shows correctly
3. Update group min stock
4. Use one part and verify group stock updates
5. Check if alert triggers when below min

### Test Auto-Replenishment
1. Set a part to auto-replenish
2. Lower stock below minimum
3. Verify alert appears on dashboard
4. Check stocking score is calculated
5. Select parts and create PO

### Test Purchase Orders
1. Create new PO with multiple parts
2. Add items with different quantities
3. Save as draft
4. Submit order
5. Add tracking number
6. Mark items as received
7. Verify inventory updates via FIFO

### Test Shipment Tracking
1. Create shipment with multiple parts
2. Link parts from different orders
3. Update tracking information
4. Verify all linked parts update
5. Check jobs get notified of delivery

### Test Core Charges
1. Add part with core charge to order
2. Receive part, verify core charge applied
3. Mark core as returned
4. Track return shipment
5. Record core credit received

---

## ✅ Success Criteria

### Stage 8 is complete when:
- ✅ Can create cross-reference groups
- ✅ Group stock calculations work correctly
- ✅ Auto-replenishment dashboard shows alerts
- ✅ Stocking scores calculate accurately
- ✅ Can create purchase orders
- ✅ PO items link to specific jobs
- ✅ Shipment tracking updates all linked parts
- ✅ Core charge system tracks returns
- ✅ Min stock calculations are intelligent
- ✅ Storage locations organize inventory
- ✅ Supplier pricing tracks best options

### Key Metrics:
- Cross-reference lookups: <1 second
- Dashboard load: <2 seconds
- Stocking score calculation: <500ms per part
- PO creation: <30 seconds
- All CRUD operations working
- No console errors
- Mobile responsive

---

## 🚀 What's Next?

After Stage 8, you'll have complete advanced inventory intelligence. Stage 9 will add:
- **Analytics & Reporting**
- Business dashboards
- FCC rate tracking
- Revenue analytics
- Parts ROI analysis
- Custom reports
- Performance metrics

---

## 📚 Resources

- Supabase Arrays: https://supabase.com/docs/guides/database/arrays
- PostgreSQL Generated Columns: https://www.postgresql.org/docs/current/ddl-generated-columns.html
- React State Management: https://react.dev/learn/managing-state

---

**Stage 8 delivers sophisticated inventory management that learns from your business patterns and proactively helps you maintain optimal stock levels! 📦**
