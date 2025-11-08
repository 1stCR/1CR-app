-- Check jobs table schema
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;
