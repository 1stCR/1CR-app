-- Stage 6: AI Integration Tables
-- IMPORTANT: All FK constraints use DEFERRABLE INITIALLY DEFERRED to prevent transaction isolation issues in tests

-- Parts Cross Reference Table
CREATE TABLE parts_cross_reference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_part VARCHAR(100) NOT NULL,
  alt_part_number VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  compatibility_level VARCHAR(50) NOT NULL,
  key_specs TEXT,
  installation_differences TEXT,
  ai_source VARCHAR(50) DEFAULT 'Claude',
  date_added TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED,
  verified_date TIMESTAMP,
  times_used INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(primary_part, alt_part_number)
);

CREATE INDEX idx_parts_xref_primary ON parts_cross_reference(primary_part);
CREATE INDEX idx_parts_xref_alt ON parts_cross_reference(alt_part_number);
CREATE INDEX idx_parts_xref_verified ON parts_cross_reference(verified);

-- Cross Reference Groups
CREATE TABLE parts_xref_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id VARCHAR(20) UNIQUE NOT NULL,
  part_numbers TEXT[] NOT NULL,
  description TEXT,
  total_uses INTEGER DEFAULT 0,
  combined_stock INTEGER DEFAULT 0,
  auto_replenish BOOLEAN DEFAULT TRUE,
  min_stock INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_xref_groups_part_numbers ON parts_xref_groups USING GIN(part_numbers);

-- AI Data Storage
CREATE TABLE parts_ai_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  ai_response_full JSONB,
  key_specs TEXT,
  testing_guide TEXT,
  common_failures TEXT,
  date_generated TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parts_ai_part ON parts_ai_data(part_number);

-- Model Database
CREATE TABLE model_database (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compilation_id VARCHAR(20) UNIQUE NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model_number VARCHAR(100) NOT NULL,
  model_family VARCHAR(100),
  aliases TEXT[],
  appliance_type VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  last_verified_date TIMESTAMP,
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_model_db_model ON model_database(model_number);
CREATE INDEX idx_model_db_brand ON model_database(brand);
CREATE INDEX idx_model_db_type ON model_database(appliance_type);

-- Model Compilation Items
CREATE TABLE model_compilation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) UNIQUE NOT NULL,
  compilation_id VARCHAR(20) REFERENCES model_database(compilation_id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  item_type VARCHAR(50) NOT NULL,
  resource_url TEXT,
  title TEXT,
  description TEXT,
  tags TEXT[],
  scope VARCHAR(50) NOT NULL,
  part_number VARCHAR(100),
  source VARCHAR(50),
  ai_generated BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  useful_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_model_items_compilation ON model_compilation_items(compilation_id);
CREATE INDEX idx_model_items_type ON model_compilation_items(item_type);
CREATE INDEX idx_model_items_part ON model_compilation_items(part_number);

-- Common Issues
CREATE TABLE common_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id VARCHAR(20) UNIQUE NOT NULL,
  model_number VARCHAR(100) NOT NULL,
  issue_description TEXT NOT NULL,
  frequency VARCHAR(20),
  frequency_count INTEGER DEFAULT 0,
  typical_parts TEXT[],
  diagnostic_steps TEXT,
  resolution_notes TEXT,
  success_rate DECIMAL(5,2),
  source VARCHAR(50),
  source_details TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_occurrence TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_common_issues_model ON common_issues(model_number);
CREATE INDEX idx_common_issues_active ON common_issues(active);

-- RPC Functions for atomic updates

-- Increment cross-reference usage
CREATE OR REPLACE FUNCTION increment_xref_usage(xref_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE parts_cross_reference
  SET times_used = times_used + 1
  WHERE id = xref_id;
END;
$$ LANGUAGE plpgsql;

-- Increment model usage
CREATE OR REPLACE FUNCTION increment_model_usage(comp_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE model_database
  SET times_used = times_used + 1,
      last_used = NOW()
  WHERE compilation_id = comp_id;
END;
$$ LANGUAGE plpgsql;

-- Increment item views
CREATE OR REPLACE FUNCTION increment_item_views(item_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE model_compilation_items
  SET view_count = view_count + 1
  WHERE item_id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Increment item useful count
CREATE OR REPLACE FUNCTION increment_item_useful(item_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE model_compilation_items
  SET useful_count = useful_count + 1
  WHERE item_id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies

-- Parts Cross Reference
ALTER TABLE parts_cross_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read cross references"
  ON parts_cross_reference FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert cross references"
  ON parts_cross_reference FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update cross references"
  ON parts_cross_reference FOR UPDATE
  TO authenticated
  USING (true);

-- XRef Groups
ALTER TABLE parts_xref_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read xref groups"
  ON parts_xref_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert xref groups"
  ON parts_xref_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update xref groups"
  ON parts_xref_groups FOR UPDATE
  TO authenticated
  USING (true);

-- AI Data
ALTER TABLE parts_ai_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read ai data"
  ON parts_ai_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert ai data"
  ON parts_ai_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ai data"
  ON parts_ai_data FOR UPDATE
  TO authenticated
  USING (true);

-- Model Database
ALTER TABLE model_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read models"
  ON model_database FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert models"
  ON model_database FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update models"
  ON model_database FOR UPDATE
  TO authenticated
  USING (true);

-- Model Compilation Items
ALTER TABLE model_compilation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read compilation items"
  ON model_compilation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert compilation items"
  ON model_compilation_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update compilation items"
  ON model_compilation_items FOR UPDATE
  TO authenticated
  USING (true);

-- Common Issues
ALTER TABLE common_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read common issues"
  ON common_issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert common issues"
  ON common_issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update common issues"
  ON common_issues FOR UPDATE
  TO authenticated
  USING (true);
