-- Stage 7 Complete Fix: Add ALL missing columns to customers table
-- Run this in Supabase SQL Editor

-- ====================================
-- Fix customers table - add missing columns
-- ====================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- ====================================
-- Ensure all Stage 7 tables exist
-- ====================================

-- QUOTES TABLE
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id VARCHAR(20) UNIQUE NOT NULL,
  job_id VARCHAR(20) REFERENCES jobs(job_id) ON DELETE CASCADE,
  customer_id VARCHAR(20) REFERENCES customers(customer_id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'Draft',

  -- Line items stored as JSONB for flexibility
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_type VARCHAR(10), -- 'percent' or 'amount'
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 4.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Metadata
  notes TEXT,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),

  -- Callback/warranty pricing
  is_callback BOOLEAN DEFAULT FALSE,
  callback_reason VARCHAR(50),
  warranty_work BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_quotes_job ON quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at);

-- INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id VARCHAR(20) UNIQUE NOT NULL,
  job_id VARCHAR(20) REFERENCES jobs(job_id) ON DELETE CASCADE,
  customer_id VARCHAR(20) REFERENCES customers(customer_id) ON DELETE CASCADE,
  quote_id VARCHAR(20) REFERENCES quotes(quote_id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'Pending',

  -- Line items
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_type VARCHAR(10),
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 4.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Payment tracking
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Dates
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Callback/warranty
  is_callback BOOLEAN DEFAULT FALSE,
  callback_reason VARCHAR(50),
  warranty_work BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_balance ON invoices(balance_due);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id VARCHAR(20) UNIQUE NOT NULL,
  invoice_id VARCHAR(20) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  customer_id VARCHAR(20) REFERENCES customers(customer_id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,

  -- Reference info
  transaction_reference VARCHAR(100),
  check_number VARCHAR(50),

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- LABOR RATES TABLE
CREATE TABLE IF NOT EXISTS labor_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier VARCHAR(20) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labor_rates_tier ON labor_rates(tier);
CREATE INDEX IF NOT EXISTS idx_labor_rates_active ON labor_rates(active);

-- Seed default rates (only if table is empty)
INSERT INTO labor_rates (tier, hourly_rate, service_fee, active)
SELECT 'Standard', 75.00, 85.00, true
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE tier = 'Standard')
UNION ALL
SELECT 'Premium', 93.75, 85.00, true
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE tier = 'Premium')
UNION ALL
SELECT 'Luxury', 101.25, 85.00, true
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE tier = 'Luxury');

-- DISCOUNT PRESETS TABLE
CREATE TABLE IF NOT EXISTS discount_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL, -- 'percent' or 'amount'
  value DECIMAL(10,2) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_presets_active ON discount_presets(active);

-- Seed common discounts (only if table is empty)
INSERT INTO discount_presets (name, type, value, description, active)
SELECT 'Senior Citizen', 'percent', 10.00, '10% discount for seniors 65+', true
WHERE NOT EXISTS (SELECT 1 FROM discount_presets WHERE name = 'Senior Citizen')
UNION ALL
SELECT 'Military', 'percent', 10.00, '10% discount for military personnel', true
WHERE NOT EXISTS (SELECT 1 FROM discount_presets WHERE name = 'Military')
UNION ALL
SELECT 'Callback Courtesy', 'percent', 10.00, 'Courtesy discount for callbacks', true
WHERE NOT EXISTS (SELECT 1 FROM discount_presets WHERE name = 'Callback Courtesy')
UNION ALL
SELECT 'Repeat Customer', 'percent', 5.00, '5% discount for repeat customers', true
WHERE NOT EXISTS (SELECT 1 FROM discount_presets WHERE name = 'Repeat Customer')
UNION ALL
SELECT 'Referral', 'amount', 25.00, '$25 off for referrals', true
WHERE NOT EXISTS (SELECT 1 FROM discount_presets WHERE name = 'Referral');

-- ====================================
-- Refresh schema cache
-- ====================================
NOTIFY pgrst, 'reload schema';
