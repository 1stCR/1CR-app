-- Convert UUID columns to VARCHAR for customers and jobs tables
-- This allows custom ID formats like "C-STAGE7-001" and "J-STAGE7-001"

-- ====================================
-- 1. Drop foreign key constraints that reference these columns
-- ====================================

-- Find and drop FK constraints on jobs table
ALTER TABLE IF EXISTS quotes DROP CONSTRAINT IF EXISTS quotes_customer_id_fkey;
ALTER TABLE IF EXISTS quotes DROP CONSTRAINT IF EXISTS quotes_job_id_fkey;
ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_job_id_fkey;
ALTER TABLE IF EXISTS job_parts DROP CONSTRAINT IF EXISTS job_parts_job_id_fkey;
ALTER TABLE IF EXISTS parts_transactions DROP CONSTRAINT IF EXISTS parts_transactions_job_id_fkey;

-- ====================================
-- 2. Convert customer_id from UUID to VARCHAR in customers table
-- ====================================
ALTER TABLE customers
  ALTER COLUMN customer_id TYPE VARCHAR(20) USING customer_id::text;

-- ====================================
-- 3. Convert job_id from UUID to VARCHAR in jobs table
-- ====================================
ALTER TABLE jobs
  ALTER COLUMN job_id TYPE VARCHAR(20) USING job_id::text;

-- ====================================
-- 4. Convert foreign key columns in related tables
-- ====================================

-- Quotes table
ALTER TABLE quotes
  ALTER COLUMN customer_id TYPE VARCHAR(20) USING customer_id::text;

ALTER TABLE quotes
  ALTER COLUMN job_id TYPE VARCHAR(20) USING job_id::text;

-- Invoices table
ALTER TABLE invoices
  ALTER COLUMN customer_id TYPE VARCHAR(20) USING customer_id::text;

ALTER TABLE invoices
  ALTER COLUMN job_id TYPE VARCHAR(20) USING job_id::text;

-- Job parts table (if job_id is UUID)
ALTER TABLE job_parts
  ALTER COLUMN job_id TYPE VARCHAR(20) USING job_id::text;

-- Parts transactions table (if job_id is UUID)
ALTER TABLE parts_transactions
  ALTER COLUMN job_id TYPE VARCHAR(20) USING job_id::text;

-- ====================================
-- 5. Recreate foreign key constraints
-- ====================================

ALTER TABLE quotes
  ADD CONSTRAINT quotes_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE;

ALTER TABLE quotes
  ADD CONSTRAINT quotes_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE;

ALTER TABLE job_parts
  ADD CONSTRAINT job_parts_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE;

ALTER TABLE parts_transactions
  ADD CONSTRAINT parts_transactions_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL;

-- ====================================
-- 6. Refresh schema cache
-- ====================================
NOTIFY pgrst, 'reload schema';
