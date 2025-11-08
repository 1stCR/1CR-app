-- Check existing data in jobs table
SELECT job_id, customer_id, created_at
FROM jobs
ORDER BY created_at DESC
LIMIT 10;
