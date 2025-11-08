-- Stage 8 Fix: Add missing columns and create tables
-- Run this in Supabase SQL Editor if you got errors

-- Fix suppliers table
DO $$
BEGIN
    -- Drop and recreate suppliers table if it exists
    DROP TABLE IF EXISTS parts_supplier_pricing CASCADE;
    DROP TABLE IF EXISTS parts_orders CASCADE;
    DROP TABLE IF EXISTS suppliers CASCADE;

    CREATE TABLE suppliers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      supplier_code VARCHAR(20) UNIQUE NOT NULL,
      supplier_name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      website TEXT,
      active BOOLEAN DEFAULT TRUE,
      preferred BOOLEAN DEFAULT FALSE,
      total_orders INTEGER DEFAULT 0,
      avg_delivery_days INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
    CREATE INDEX idx_suppliers_active ON suppliers(active);
    CREATE INDEX idx_suppliers_preferred ON suppliers(preferred) WHERE preferred = TRUE;
END $$;

-- Create storage_locations table
DROP TABLE IF EXISTS storage_locations CASCADE;
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_code VARCHAR(20) UNIQUE NOT NULL,
  parent_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  location_path TEXT,
  location_type TEXT NOT NULL,
  location_name TEXT NOT NULL,
  description TEXT,
  label_number TEXT,
  capacity TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_parent ON storage_locations(parent_location_id);
CREATE INDEX idx_locations_type ON storage_locations(location_type);
CREATE INDEX idx_locations_active ON storage_locations(active);
CREATE INDEX idx_locations_code ON storage_locations(location_code);

-- Create parts_xref_groups table
DROP TABLE IF EXISTS parts_xref_groups CASCADE;
CREATE TABLE parts_xref_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  part_numbers TEXT[] NOT NULL,
  auto_replenish BOOLEAN DEFAULT TRUE,
  min_stock_group INTEGER DEFAULT 1,
  total_uses INTEGER DEFAULT 0,
  combined_stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_xref_groups_parts ON parts_xref_groups USING GIN (part_numbers);
CREATE INDEX idx_xref_groups_code ON parts_xref_groups(group_code);

-- Create parts_orders table
CREATE TABLE parts_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  status TEXT NOT NULL DEFAULT 'Draft',
  subtotal DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  tracking_number TEXT,
  carrier TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_orders_status ON parts_orders(status);
CREATE INDEX idx_orders_date ON parts_orders(order_date);
CREATE INDEX idx_orders_supplier ON parts_orders(supplier_id);
CREATE INDEX idx_orders_number ON parts_orders(order_number);

-- Create parts_order_items table
DROP TABLE IF EXISTS parts_order_items CASCADE;
CREATE TABLE parts_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES parts_orders(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) DEFAULT 0,
  job_id VARCHAR(20),
  job_number TEXT,
  qty_received INTEGER DEFAULT 0,
  qty_remaining INTEGER DEFAULT 0,
  has_core BOOLEAN DEFAULT FALSE,
  core_charge DECIMAL(10,2),
  core_returned BOOLEAN DEFAULT FALSE,
  core_return_date DATE,
  core_tracking TEXT,
  core_credit_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  line_number INTEGER
);

CREATE INDEX idx_order_items_order ON parts_order_items(order_id);
CREATE INDEX idx_order_items_part ON parts_order_items(part_number);
CREATE INDEX idx_order_items_job ON parts_order_items(job_id);

-- Trigger function
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
  NEW.line_total := NEW.quantity * NEW.unit_cost;
  NEW.qty_remaining := NEW.quantity - COALESCE(NEW.qty_received, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_line_number ON parts_order_items;
CREATE TRIGGER trigger_set_line_number
  BEFORE INSERT OR UPDATE ON parts_order_items
  FOR EACH ROW
  EXECUTE FUNCTION set_order_line_number();

-- Create shipments table
DROP TABLE IF EXISTS shipments CASCADE;
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_code VARCHAR(20) UNIQUE NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  carrier TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ship_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  total_cost DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  parts_count INTEGER DEFAULT 0,
  jobs_affected INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_status_update TIMESTAMP
);

CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_expected ON shipments(expected_delivery);
CREATE INDEX idx_shipments_code ON shipments(shipment_code);

-- Create parts_supplier_pricing table
CREATE TABLE parts_supplier_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_name TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  in_stock BOOLEAN DEFAULT TRUE,
  lead_time_days INTEGER,
  min_order_qty INTEGER DEFAULT 1,
  shipping_cost DECIMAL(10,2),
  free_shipping_threshold DECIMAL(10,2),
  last_checked TIMESTAMP DEFAULT NOW(),
  last_ordered DATE,
  times_ordered INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  preferred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_supplier_pricing_part ON parts_supplier_pricing(part_number);
CREATE INDEX idx_supplier_pricing_supplier ON parts_supplier_pricing(supplier_id);
CREATE INDEX idx_supplier_pricing_preferred ON parts_supplier_pricing(preferred) WHERE preferred = TRUE;

-- Update parts_master table
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS xref_group_id UUID REFERENCES parts_xref_groups(id) ON DELETE SET NULL;
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS auto_replenish BOOLEAN DEFAULT FALSE;
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS min_stock_override INTEGER;
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS min_stock_override_reason TEXT;
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS stocking_score DECIMAL(4,2) DEFAULT 0;
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;
ALTER TABLE parts_master ADD COLUMN IF NOT EXISTS location_notes TEXT;

DROP INDEX IF EXISTS idx_parts_xref_group;
DROP INDEX IF EXISTS idx_parts_location;
DROP INDEX IF EXISTS idx_parts_auto_replenish;

CREATE INDEX idx_parts_xref_group ON parts_master(xref_group_id);
CREATE INDEX idx_parts_location ON parts_master(storage_location_id);
CREATE INDEX idx_parts_auto_replenish ON parts_master(auto_replenish) WHERE auto_replenish = TRUE;

-- Update parts_transactions table
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL;
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES parts_orders(id) ON DELETE SET NULL;
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS from_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS to_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS has_core BOOLEAN DEFAULT FALSE;
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS core_charge_amount DECIMAL(10,2);
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS core_return_status TEXT;
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS core_credit_amount DECIMAL(10,2);
ALTER TABLE parts_transactions ADD COLUMN IF NOT EXISTS core_tracking_number TEXT;

DROP INDEX IF EXISTS idx_transactions_shipment;
DROP INDEX IF EXISTS idx_transactions_order;
DROP INDEX IF EXISTS idx_transactions_core_status;

CREATE INDEX idx_transactions_shipment ON parts_transactions(shipment_id);
CREATE INDEX idx_transactions_order ON parts_transactions(order_id);
CREATE INDEX idx_transactions_core_status ON parts_transactions(core_return_status) WHERE has_core = TRUE;

-- Seed default data
INSERT INTO suppliers (supplier_code, supplier_name, active, preferred)
SELECT 'SUP-001', 'Default Supplier', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM suppliers LIMIT 1);

INSERT INTO storage_locations (location_code, location_type, location_name, description, active)
SELECT 'LOC-001', 'Building', 'Home Storage', 'Main storage facility', TRUE
WHERE NOT EXISTS (SELECT 1 FROM storage_locations WHERE location_code = 'LOC-001');

INSERT INTO storage_locations (location_code, location_type, location_name, description, active)
SELECT 'LOC-002', 'Vehicle', 'Truck #1', 'Primary service vehicle', TRUE
WHERE NOT EXISTS (SELECT 1 FROM storage_locations WHERE location_code = 'LOC-002');
