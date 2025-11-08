-- Fix jobs.customer_id column type from UUID to VARCHAR(20)

-- Drop the foreign key constraint from jobs to customers
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_customer_id_fkey;

-- Convert jobs.customer_id from UUID to VARCHAR(20)
ALTER TABLE jobs
  ALTER COLUMN customer_id TYPE VARCHAR(20) USING customer_id::text;

-- Recreate foreign key constraint to customers.customer_id (VARCHAR column)
ALTER TABLE jobs
  ADD CONSTRAINT jobs_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
