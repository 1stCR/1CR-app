-- Fix Stage 7 Schema Issues
-- Created: 2025-01-03
-- Fixes: Missing appliance_brand column, ID column sizes

-- ====================================
-- 1. Fix ID Column Sizes
-- ====================================
-- The tests use IDs like 'C-STAGE7-001' (12 chars) and 'J-STAGE7-001' (12 chars)
-- But the tables have VARCHAR(10) which is too small

ALTER TABLE customers
  ALTER COLUMN customer_id TYPE VARCHAR(20);

ALTER TABLE jobs
  ALTER COLUMN job_id TYPE VARCHAR(20);

-- ====================================
-- 2. Add missing appliance_brand column to jobs table
-- ====================================
-- The tests expect this column but it doesn't exist in the schema

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS appliance_brand VARCHAR(100);

-- ====================================
-- 3. Refresh schema cache
-- ====================================
NOTIFY pgrst, 'reload schema';
