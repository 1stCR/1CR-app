-- Fix ID Column Sizes for Stage 7 Tests
-- The tests use IDs like 'C-STAGE7-001' (12 chars) and 'J-STAGE7-001' (12 chars)
-- But the tables have VARCHAR(10) which is too small
-- Run this in Supabase SQL Editor

-- ====================================
-- Increase customer_id size in customers table
-- ====================================
ALTER TABLE customers
  ALTER COLUMN customer_id TYPE VARCHAR(20);

-- ====================================
-- Increase job_id size in jobs table
-- ====================================
ALTER TABLE jobs
  ALTER COLUMN job_id TYPE VARCHAR(20);

-- ====================================
-- Refresh schema cache
-- ====================================
NOTIFY pgrst, 'reload schema';
