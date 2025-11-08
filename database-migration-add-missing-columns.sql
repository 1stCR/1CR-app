-- ============================================================================
-- DATABASE MIGRATION: Add Missing Columns to Jobs Table
-- ============================================================================
-- Run this in Supabase SQL Editor to add all missing columns
-- that the application expects but aren't in the current schema
-- ============================================================================

-- Add priority column
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal';

-- Add visit tracking columns (visit 1)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS visit_1_date DATE,
ADD COLUMN IF NOT EXISTS visit_1_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS visit_1_status VARCHAR(50);

-- Add visit tracking columns (visit 2)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS visit_2_date DATE,
ADD COLUMN IF NOT EXISTS visit_2_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS visit_2_status VARCHAR(50);

-- Add visit tracking columns (visit 3)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS visit_3_date DATE,
ADD COLUMN IF NOT EXISTS visit_3_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS visit_3_status VARCHAR(50);

-- Add visit tracking columns (visit 4)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS visit_4_date DATE,
ADD COLUMN IF NOT EXISTS visit_4_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS visit_4_status VARCHAR(50);

-- Add visit tracking columns (visit 5)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS visit_5_date DATE,
ADD COLUMN IF NOT EXISTS visit_5_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS visit_5_status VARCHAR(50);

-- Add job management flags
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS primary_job BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS added_on_site BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS combined_invoice BOOLEAN DEFAULT false;

-- Add photo tracking columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_site_photos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_diagnosis_photos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_repair_photos BOOLEAN DEFAULT false;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after the migration to verify all columns were added

SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND table_schema = 'public'
ORDER BY column_name;

-- ============================================================================
-- TEST INSERT
-- ============================================================================
-- Test that all new columns work

-- This insert should now succeed:
-- INSERT INTO jobs (
--   job_id,
--   customer_id,
--   job_stage,
--   current_status,
--   priority,
--   is_callback,
--   callback_count,
--   visit_count,
--   visit_1_type,
--   visit_1_status,
--   visit_1_date
-- ) VALUES (
--   'J-TEST-001',
--   NULL,
--   'Intake',
--   'New',
--   'High',
--   false,
--   0,
--   1,
--   'Diagnosis',
--   'Scheduled',
--   CURRENT_DATE
-- );

-- Clean up test:
-- DELETE FROM jobs WHERE job_id = 'J-TEST-001';

-- ============================================================================
-- DONE!
-- ============================================================================
