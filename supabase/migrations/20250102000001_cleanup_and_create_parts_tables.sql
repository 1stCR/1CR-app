-- Stage 5: Parts Inventory Core - Database Tables (with cleanup)
-- Created: 2025-01-02
-- This version drops existing tables first to ensure clean migration

-- ====================================
-- CLEANUP: Drop existing tables if they exist
-- ====================================
DROP TRIGGER IF EXISTS trigger_update_job_parts_totals_delete ON job_parts;
DROP TRIGGER IF EXISTS trigger_update_job_parts_totals_update ON job_parts;
DROP TRIGGER IF EXISTS trigger_update_job_parts_totals_insert ON job_parts;
DROP TRIGGER IF EXISTS trigger_update_part_after_transaction ON parts_transactions;

DROP FUNCTION IF EXISTS update_job_parts_totals();
DROP FUNCTION IF EXISTS update_part_after_transaction();

DROP TABLE IF EXISTS job_parts CASCADE;
DROP TABLE IF EXISTS parts_transactions CASCADE;
DROP TABLE IF EXISTS parts_master CASCADE;
DROP TABLE IF EXISTS storage_locations CASCADE;

-- Remove columns from jobs table if they exist
ALTER TABLE jobs DROP COLUMN IF EXISTS parts_cost;
ALTER TABLE jobs DROP COLUMN IF EXISTS parts_total;

-- ====================================
-- Enable UUID extension if not already enabled
-- ====================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- Storage Locations Table
-- ====================================
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id VARCHAR(20) UNIQUE NOT NULL,
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('Vehicle', 'Building', 'Container')),
  location_name VARCHAR(100) NOT NULL,
  parent_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  description TEXT,
  label_number VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for location queries
CREATE INDEX idx_storage_locations_parent ON storage_locations(parent_location_id);
CREATE INDEX idx_storage_locations_active ON storage_locations(active);

-- ====================================
-- Parts Master Table
-- ====================================
CREATE TABLE parts_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  brand VARCHAR(100),
  avg_cost DECIMAL(10,2),
  markup_percent DECIMAL(5,2) DEFAULT 20,
  sell_price DECIMAL(10,2),
  in_stock INTEGER DEFAULT 0,
  min_stock INTEGER,
  min_stock_override INTEGER,
  min_stock_override_reason TEXT,
  auto_replenish BOOLEAN DEFAULT false,
  times_used INTEGER DEFAULT 0,
  last_used_date TIMESTAMPTZ,
  first_used_date TIMESTAMPTZ,
  storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  location_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for parts queries
CREATE INDEX idx_parts_part_number ON parts_master(part_number);
CREATE INDEX idx_parts_category ON parts_master(category);
CREATE INDEX idx_parts_brand ON parts_master(brand);
CREATE INDEX idx_parts_in_stock ON parts_master(in_stock);
CREATE INDEX idx_parts_location ON parts_master(storage_location_id);

-- ====================================
-- Parts Transactions Table
-- ====================================
CREATE TABLE parts_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  part_number VARCHAR(50) NOT NULL,
  qty INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Purchase', 'Used', 'Direct Order', 'Return to Supplier', 'Customer Return', 'Damaged/Lost', 'Transfer', 'Adjustment')),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  source VARCHAR(100),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  order_id VARCHAR(50),
  invoice_number VARCHAR(100),
  from_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key to parts_master (part_number instead of id for flexibility)
  CONSTRAINT fk_parts_transactions_part FOREIGN KEY (part_number) REFERENCES parts_master(part_number) ON DELETE CASCADE
);

-- Indexes for transaction queries
CREATE INDEX idx_transactions_part ON parts_transactions(part_number);
CREATE INDEX idx_transactions_job ON parts_transactions(job_id);
CREATE INDEX idx_transactions_date ON parts_transactions(transaction_date);
CREATE INDEX idx_transactions_type ON parts_transactions(type);

-- ====================================
-- Job Parts Table
-- ====================================
CREATE TABLE job_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  part_number VARCHAR(50) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  markup_percent DECIMAL(5,2) DEFAULT 20,
  sell_price DECIMAL(10,2) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('Stock', 'Direct Order')),
  transaction_id UUID REFERENCES parts_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key to parts_master
  CONSTRAINT fk_job_parts_part FOREIGN KEY (part_number) REFERENCES parts_master(part_number) ON DELETE RESTRICT
);

-- Indexes for job parts queries
CREATE INDEX idx_job_parts_job ON job_parts(job_id);
CREATE INDEX idx_job_parts_part ON job_parts(part_number);
CREATE INDEX idx_job_parts_transaction ON job_parts(transaction_id);

-- ====================================
-- Add parts cost fields to jobs table
-- ====================================
ALTER TABLE jobs ADD COLUMN parts_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE jobs ADD COLUMN parts_total DECIMAL(10,2) DEFAULT 0;

-- ====================================
-- Row Level Security (RLS) Policies
-- ====================================

-- Enable RLS on all tables
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_parts ENABLE ROW LEVEL SECURITY;

-- Storage Locations Policies
CREATE POLICY "Allow authenticated users to view storage locations"
  ON storage_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert storage locations"
  ON storage_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update storage locations"
  ON storage_locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete storage locations"
  ON storage_locations FOR DELETE
  TO authenticated
  USING (true);

-- Parts Master Policies
CREATE POLICY "Allow authenticated users to view parts"
  ON parts_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert parts"
  ON parts_master FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update parts"
  ON parts_master FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete parts"
  ON parts_master FOR DELETE
  TO authenticated
  USING (true);

-- Parts Transactions Policies
CREATE POLICY "Allow authenticated users to view transactions"
  ON parts_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert transactions"
  ON parts_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update transactions"
  ON parts_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete transactions"
  ON parts_transactions FOR DELETE
  TO authenticated
  USING (true);

-- Job Parts Policies
CREATE POLICY "Allow authenticated users to view job parts"
  ON job_parts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert job parts"
  ON job_parts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update job parts"
  ON job_parts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete job parts"
  ON job_parts FOR DELETE
  TO authenticated
  USING (true);

-- ====================================
-- Functions for automated calculations
-- ====================================

-- Function to update part stock and costs after transaction
CREATE OR REPLACE FUNCTION update_part_after_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_in_stock INTEGER;
  v_avg_cost DECIMAL(10,2);
  v_sell_price DECIMAL(10,2);
  v_markup_percent DECIMAL(5,2);
  v_total_cost DECIMAL(10,2);
  v_total_qty INTEGER;
BEGIN
  -- Calculate new stock level (sum of all transaction quantities)
  SELECT COALESCE(SUM(qty), 0)
  INTO v_in_stock
  FROM parts_transactions
  WHERE part_number = NEW.part_number;

  -- Calculate average cost from Purchase transactions only
  SELECT
    COALESCE(SUM(unit_cost * ABS(qty)), 0),
    COALESCE(SUM(ABS(qty)), 0)
  INTO v_total_cost, v_total_qty
  FROM parts_transactions
  WHERE part_number = NEW.part_number
    AND type = 'Purchase'
    AND unit_cost IS NOT NULL;

  IF v_total_qty > 0 THEN
    v_avg_cost := v_total_cost / v_total_qty;
  ELSE
    v_avg_cost := NULL;
  END IF;

  -- Get markup percentage and calculate sell price
  SELECT markup_percent
  INTO v_markup_percent
  FROM parts_master
  WHERE part_number = NEW.part_number;

  IF v_avg_cost IS NOT NULL AND v_markup_percent IS NOT NULL THEN
    v_sell_price := v_avg_cost * (1 + v_markup_percent / 100);
  ELSE
    v_sell_price := NULL;
  END IF;

  -- Update the part
  UPDATE parts_master
  SET
    in_stock = v_in_stock,
    avg_cost = v_avg_cost,
    sell_price = v_sell_price,
    updated_at = NOW()
  WHERE part_number = NEW.part_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update part after transaction insert
CREATE TRIGGER trigger_update_part_after_transaction
  AFTER INSERT ON parts_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_part_after_transaction();

-- Function to update job parts totals
CREATE OR REPLACE FUNCTION update_job_parts_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_parts_cost DECIMAL(10,2);
  v_parts_total DECIMAL(10,2);
BEGIN
  -- Calculate totals for the job
  SELECT
    COALESCE(SUM(total_cost), 0),
    COALESCE(SUM(sell_price), 0)
  INTO v_parts_cost, v_parts_total
  FROM job_parts
  WHERE job_id = COALESCE(NEW.job_id, OLD.job_id);

  -- Update the job
  UPDATE jobs
  SET
    parts_cost = v_parts_cost,
    parts_total = v_parts_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job totals after job_parts insert/update/delete
CREATE TRIGGER trigger_update_job_parts_totals_insert
  AFTER INSERT ON job_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_job_parts_totals();

CREATE TRIGGER trigger_update_job_parts_totals_update
  AFTER UPDATE ON job_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_job_parts_totals();

CREATE TRIGGER trigger_update_job_parts_totals_delete
  AFTER DELETE ON job_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_job_parts_totals();

-- ====================================
-- Sample Data (Optional - for testing)
-- ====================================

-- Sample storage locations
INSERT INTO storage_locations (location_id, location_type, location_name, description, active)
VALUES
  ('LOC-001', 'Vehicle', 'Truck - Front Bin', 'Main service truck front storage bin', true),
  ('LOC-002', 'Vehicle', 'Truck - Rear Bin', 'Main service truck rear storage bin', true),
  ('LOC-003', 'Building', 'Shop - Parts Room', 'Main parts storage room at shop', true);

-- Comments for documentation
COMMENT ON TABLE storage_locations IS 'Hierarchical storage locations for parts (vehicles, buildings, containers)';
COMMENT ON TABLE parts_master IS 'Master parts catalog with stock levels, costs, and pricing';
COMMENT ON TABLE parts_transactions IS 'Complete transaction history for FIFO cost tracking';
COMMENT ON TABLE job_parts IS 'Parts used on jobs with cost allocation';

COMMENT ON COLUMN parts_master.part_number IS 'Unique part identifier (uppercase)';
COMMENT ON COLUMN parts_master.avg_cost IS 'Weighted average cost from all purchases';
COMMENT ON COLUMN parts_master.sell_price IS 'Calculated sell price based on avg_cost and markup_percent';
COMMENT ON COLUMN parts_master.in_stock IS 'Current stock quantity (calculated from transactions)';

COMMENT ON COLUMN parts_transactions.qty IS 'Quantity (positive for additions, negative for usage)';
COMMENT ON COLUMN parts_transactions.type IS 'Transaction type: Purchase, Used, Direct Order, etc.';

COMMENT ON COLUMN job_parts.source IS 'Stock (from inventory) or Direct Order (job-specific purchase)';
COMMENT ON COLUMN job_parts.transaction_id IS 'Link to parts_transactions for stock source tracking';
