-- Check parts_master table schema
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'parts_master'
ORDER BY ordinal_position;
