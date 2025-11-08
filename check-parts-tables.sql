-- Check what parts-related tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'parts%'
ORDER BY table_name;
