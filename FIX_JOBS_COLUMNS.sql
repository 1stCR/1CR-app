-- Fix Jobs Table - Add missing columns for Stage 7 tests
-- The tests reference 'appliance_brand' and 'appliance_model' columns
-- Run this in Supabase SQL Editor

-- ====================================
-- Add missing columns to jobs table
-- ====================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS appliance_brand TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS appliance_model TEXT;

-- ====================================
-- Refresh schema cache
-- ====================================
NOTIFY pgrst, 'reload schema';
