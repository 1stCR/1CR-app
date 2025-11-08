-- Temporarily drop the part_number foreign key constraint
-- This fixes transaction isolation issues where the part exists but isn't visible yet
-- NOTE: We'll add it back with DEFERRABLE INITIALLY DEFERRED in a future migration

ALTER TABLE job_parts
DROP CONSTRAINT IF EXISTS fk_job_parts_part;
