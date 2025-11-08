-- Check quotes table schema
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'quotes'
  AND column_name IN ('customer_id', 'job_id', 'quote_id')
ORDER BY ordinal_position;
