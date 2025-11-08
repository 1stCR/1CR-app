-- Verify schema for customers and jobs tables
-- Check column types for ID columns

-- Check customers table schema
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name IN ('customer_id', 'id')
ORDER BY ordinal_position;

-- Check jobs table schema
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('job_id', 'id', 'customer_id')
ORDER BY ordinal_position;

-- Check quotes table schema
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'quotes'
  AND column_name IN ('quote_id', 'job_id', 'customer_id')
ORDER BY ordinal_position;

-- Check invoices table schema
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name IN ('invoice_id', 'job_id', 'customer_id')
ORDER BY ordinal_position;

-- Check all UUID columns that might be related
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'uuid'
  AND (column_name LIKE '%customer%' OR column_name LIKE '%job%')
ORDER BY table_name, ordinal_position;
