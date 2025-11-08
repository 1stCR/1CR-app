-- ============================================================================
-- APPLIANCE MANAGER - SAFE DATABASE SCHEMA
-- This version uses CREATE TABLE IF NOT EXISTS to avoid errors
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE ALL TABLES (Safe - won't fail if they exist)
-- ============================================================================

-- 1. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id VARCHAR(10) UNIQUE NOT NULL,
  customer_type VARCHAR(20) DEFAULT 'Residential',
  business_name VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_primary VARCHAR(20),
  phone_secondary VARCHAR(20),
  email VARCHAR(255),
  address_street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2) DEFAULT 'WY',
  zip VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id VARCHAR(10) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  role VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. JOBS
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id VARCHAR(10) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  appliance_type VARCHAR(50),
  brand VARCHAR(100),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),
  issue_description TEXT,
  job_stage VARCHAR(50) DEFAULT 'Intake',
  current_status VARCHAR(50) DEFAULT 'New',
  parts_status VARCHAR(50),
  scheduled_date DATE,
  scheduled_time_window VARCHAR(50),
  is_callback BOOLEAN DEFAULT false,
  callback_reason VARCHAR(100),
  original_job_id VARCHAR(10),
  callback_count INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 1,
  quote_total DECIMAL(10,2),
  invoice_total DECIMAL(10,2),
  amount_paid DECIMAL(10,2),
  payment_status VARCHAR(50),
  payment_method VARCHAR(50),
  payment_date DATE,
  travel_time_minutes INTEGER,
  diagnosis_time_minutes INTEGER,
  research_time_minutes INTEGER,
  repair_time_minutes INTEGER,
  total_time_minutes INTEGER,
  mileage DECIMAL(5,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 4. JOB_VISITS
CREATE TABLE IF NOT EXISTS job_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL,
  visit_date DATE,
  visit_type VARCHAR(50),
  visit_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TOUR_LOG
CREATE TABLE IF NOT EXISTS tour_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_date DATE DEFAULT CURRENT_DATE,
  event_type VARCHAR(50) NOT NULL,
  event_time TIMESTAMP DEFAULT NOW(),
  job_id VARCHAR(10),
  activity_type VARCHAR(50),
  location_address TEXT,
  mileage DECIMAL(5,1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. TOUR_SUMMARY
CREATE TABLE IF NOT EXISTS tour_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_date DATE UNIQUE NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  total_minutes INTEGER,
  travel_minutes INTEGER,
  work_minutes INTEGER,
  break_minutes INTEGER,
  total_mileage DECIMAL(6,1),
  jobs_completed INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. PARTS_MASTER
CREATE TABLE IF NOT EXISTS parts_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  brand VARCHAR(100),
  avg_cost DECIMAL(10,2),
  markup_percent DECIMAL(5,2) DEFAULT 20,
  sell_price DECIMAL(10,2),
  in_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  min_stock_override INTEGER,
  auto_replenish BOOLEAN DEFAULT false,
  times_used INTEGER DEFAULT 0,
  last_used_date DATE,
  stocking_score DECIMAL(3,1),
  xref_group_id UUID,
  storage_location_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. PARTS_TRANSACTIONS
CREATE TABLE IF NOT EXISTS parts_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(20) UNIQUE NOT NULL,
  transaction_date TIMESTAMP DEFAULT NOW(),
  part_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  source VARCHAR(100),
  job_id VARCHAR(10),
  shipment_id VARCHAR(20),
  order_id VARCHAR(20),
  has_core BOOLEAN DEFAULT false,
  core_charge_amount DECIMAL(10,2),
  core_return_status VARCHAR(50),
  notes TEXT,
  created_by VARCHAR(100)
);

-- 9. PARTS_ORDERS
CREATE TABLE IF NOT EXISTS parts_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id VARCHAR(20) UNIQUE NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  supplier_id UUID,
  order_status VARCHAR(50) DEFAULT 'Draft',
  total_cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  tracking_number VARCHAR(100),
  expected_delivery DATE,
  actual_delivery DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. PARTS_ORDER_ITEMS
CREATE TABLE IF NOT EXISTS parts_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES parts_orders(id) ON DELETE CASCADE,
  part_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  job_id VARCHAR(10),
  notes TEXT
);

-- 11. PARTS_CROSS_REFERENCE
CREATE TABLE IF NOT EXISTS parts_cross_reference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xref_id VARCHAR(20) UNIQUE NOT NULL,
  primary_part VARCHAR(100) NOT NULL,
  alt_part_number VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  compatibility_level VARCHAR(50),
  key_specs TEXT,
  installation_differences TEXT,
  ai_source VARCHAR(50),
  verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  verified_date DATE,
  times_used INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. PARTS_XREF_GROUPS
CREATE TABLE IF NOT EXISTS parts_xref_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id VARCHAR(20) UNIQUE NOT NULL,
  part_numbers TEXT[],
  description TEXT,
  total_uses INTEGER DEFAULT 0,
  combined_stock INTEGER DEFAULT 0,
  auto_replenish BOOLEAN DEFAULT false,
  min_stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. PARTS_AI_DATA
CREATE TABLE IF NOT EXISTS parts_ai_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  ai_response_full JSONB,
  key_specs JSONB,
  testing_guide TEXT,
  common_failures TEXT[],
  date_generated TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- 14. SHIPMENTS
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id VARCHAR(20) UNIQUE NOT NULL,
  order_date DATE,
  supplier VARCHAR(100),
  order_status VARCHAR(50),
  tracking_number VARCHAR(100),
  tracking_url TEXT,
  carrier VARCHAR(50),
  expected_delivery DATE,
  actual_delivery DATE,
  total_cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  parts_count INTEGER,
  jobs_affected INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. MODEL_DATABASE
CREATE TABLE IF NOT EXISTS model_database (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compilation_id VARCHAR(20) UNIQUE NOT NULL,
  brand VARCHAR(100),
  model_number VARCHAR(100),
  model_family VARCHAR(100),
  aliases TEXT[],
  appliance_type VARCHAR(50),
  verified BOOLEAN DEFAULT false,
  last_verified_date DATE,
  times_used INTEGER DEFAULT 0,
  last_used DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 16. MODEL_COMPILATION_ITEMS
CREATE TABLE IF NOT EXISTS model_compilation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) UNIQUE NOT NULL,
  compilation_id UUID REFERENCES model_database(id) ON DELETE CASCADE,
  item_type VARCHAR(50),
  resource_url TEXT,
  title VARCHAR(255),
  description TEXT,
  tags TEXT[],
  scope VARCHAR(50),
  part_number VARCHAR(100),
  source VARCHAR(50),
  ai_generated BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  useful_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 17. COMMON_ISSUES
CREATE TABLE IF NOT EXISTS common_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id VARCHAR(20) UNIQUE NOT NULL,
  model_number VARCHAR(100),
  issue_description TEXT,
  frequency VARCHAR(20),
  frequency_count INTEGER DEFAULT 0,
  typical_parts TEXT[],
  diagnostic_steps TEXT,
  resolution_notes TEXT,
  success_rate DECIMAL(5,2),
  source VARCHAR(50),
  source_details TEXT,
  last_occurrence DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 18. LABOR_ADJUSTMENTS
CREATE TABLE IF NOT EXISTS labor_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjustment_id VARCHAR(20) UNIQUE NOT NULL,
  part_number VARCHAR(100),
  part_description TEXT,
  repair_type VARCHAR(50),
  additional_hours DECIMAL(3,1),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  warning_keywords TEXT[],
  auto_apply BOOLEAN DEFAULT false,
  notes TEXT,
  times_applied INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 19. SPECIALTY_TOOLS
CREATE TABLE IF NOT EXISTS specialty_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id VARCHAR(20) UNIQUE NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  description TEXT,
  part_numbers TEXT[],
  models TEXT[],
  category VARCHAR(50),
  always_carry BOOLEAN DEFAULT false,
  location VARCHAR(100),
  times_needed INTEGER DEFAULT 0,
  last_used DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 20. STORAGE_LOCATIONS
CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id VARCHAR(20) UNIQUE NOT NULL,
  location_type VARCHAR(50),
  location_name VARCHAR(255) NOT NULL,
  parent_location_id UUID REFERENCES storage_locations(id),
  description TEXT,
  label_number VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 21. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id VARCHAR(20) UNIQUE NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  api_enabled BOOLEAN DEFAULT false,
  api_key TEXT,
  order_cutoff_time TIME,
  ships_same_day BOOLEAN DEFAULT false,
  default_shipping_cost DECIMAL(10,2),
  default_lead_time_days INTEGER,
  priority INTEGER,
  account_number VARCHAR(100),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  website_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 22. JOB_HISTORY
CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  change_date TIMESTAMP DEFAULT NOW(),
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(100),
  notes TEXT
);

-- 23. CALLBACKS
CREATE TABLE IF NOT EXISTS callbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_job_id UUID REFERENCES jobs(id),
  callback_job_id UUID REFERENCES jobs(id),
  callback_reason VARCHAR(100),
  callback_date DATE,
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 24. TAGS
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_name VARCHAR(50) UNIQUE NOT NULL,
  tag_category VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 25. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50),
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES (SAFE)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_job_stage ON jobs(job_stage);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_parts_transactions_part_number ON parts_transactions(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_transactions_job_id ON parts_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_tour_log_tour_date ON tour_log(tour_date);
CREATE INDEX IF NOT EXISTS idx_tour_log_job_id ON tour_log(job_id);

-- ============================================================================
-- INSERT DEFAULT SETTINGS (if not exists)
-- ============================================================================
INSERT INTO settings (setting_key, setting_value, setting_type, description)
SELECT 'business_name', 'Appliance Repair Co', 'text', 'Business name for invoices'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'business_name');

INSERT INTO settings (setting_key, setting_value, setting_type, description)
SELECT 'labor_rate', '75', 'number', 'Default labor rate per hour'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'labor_rate');

INSERT INTO settings (setting_key, setting_value, setting_type, description)
SELECT 'service_fee', '85', 'number', 'Default service call fee'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'service_fee');

INSERT INTO settings (setting_key, setting_value, setting_type, description)
SELECT 'tax_rate', '6', 'number', 'Default tax rate percentage'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'tax_rate');

INSERT INTO settings (setting_key, setting_value, setting_type, description)
SELECT 'parts_markup', '20', 'number', 'Default parts markup percentage'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'parts_markup');

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
