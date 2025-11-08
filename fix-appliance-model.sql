-- Add missing appliance_model column to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS appliance_model VARCHAR(100);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
