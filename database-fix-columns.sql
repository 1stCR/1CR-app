-- ============================================================================
-- APPLIANCE MANAGER - FIX MISSING COLUMNS
-- ============================================================================
-- This script adds any missing columns to existing tables
-- ============================================================================

-- Fix JOBS table - Add all missing columns
DO $$
BEGIN
  -- Add job_stage if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='job_stage') THEN
    ALTER TABLE jobs ADD COLUMN job_stage VARCHAR(50) DEFAULT 'Intake';
  END IF;

  -- Add current_status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='current_status') THEN
    ALTER TABLE jobs ADD COLUMN current_status VARCHAR(50) DEFAULT 'New';
  END IF;

  -- Add parts_status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='parts_status') THEN
    ALTER TABLE jobs ADD COLUMN parts_status VARCHAR(50);
  END IF;

  -- Add scheduled_date if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='scheduled_date') THEN
    ALTER TABLE jobs ADD COLUMN scheduled_date DATE;
  END IF;

  -- Add scheduled_time_window if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='scheduled_time_window') THEN
    ALTER TABLE jobs ADD COLUMN scheduled_time_window VARCHAR(50);
  END IF;

  -- Add is_callback if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='is_callback') THEN
    ALTER TABLE jobs ADD COLUMN is_callback BOOLEAN DEFAULT false;
  END IF;

  -- Add callback_reason if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='callback_reason') THEN
    ALTER TABLE jobs ADD COLUMN callback_reason VARCHAR(100);
  END IF;

  -- Add original_job_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='original_job_id') THEN
    ALTER TABLE jobs ADD COLUMN original_job_id VARCHAR(10);
  END IF;

  -- Add callback_count if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='callback_count') THEN
    ALTER TABLE jobs ADD COLUMN callback_count INTEGER DEFAULT 0;
  END IF;

  -- Add visit_count if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='visit_count') THEN
    ALTER TABLE jobs ADD COLUMN visit_count INTEGER DEFAULT 1;
  END IF;

  -- Add quote_total if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='quote_total') THEN
    ALTER TABLE jobs ADD COLUMN quote_total DECIMAL(10,2);
  END IF;

  -- Add invoice_total if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='invoice_total') THEN
    ALTER TABLE jobs ADD COLUMN invoice_total DECIMAL(10,2);
  END IF;

  -- Add amount_paid if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='amount_paid') THEN
    ALTER TABLE jobs ADD COLUMN amount_paid DECIMAL(10,2);
  END IF;

  -- Add payment_status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='payment_status') THEN
    ALTER TABLE jobs ADD COLUMN payment_status VARCHAR(50);
  END IF;

  -- Add payment_method if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='payment_method') THEN
    ALTER TABLE jobs ADD COLUMN payment_method VARCHAR(50);
  END IF;

  -- Add payment_date if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='payment_date') THEN
    ALTER TABLE jobs ADD COLUMN payment_date DATE;
  END IF;

  -- Add travel_time_minutes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='travel_time_minutes') THEN
    ALTER TABLE jobs ADD COLUMN travel_time_minutes INTEGER;
  END IF;

  -- Add diagnosis_time_minutes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='diagnosis_time_minutes') THEN
    ALTER TABLE jobs ADD COLUMN diagnosis_time_minutes INTEGER;
  END IF;

  -- Add research_time_minutes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='research_time_minutes') THEN
    ALTER TABLE jobs ADD COLUMN research_time_minutes INTEGER;
  END IF;

  -- Add repair_time_minutes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='repair_time_minutes') THEN
    ALTER TABLE jobs ADD COLUMN repair_time_minutes INTEGER;
  END IF;

  -- Add total_time_minutes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='total_time_minutes') THEN
    ALTER TABLE jobs ADD COLUMN total_time_minutes INTEGER;
  END IF;

  -- Add mileage if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='mileage') THEN
    ALTER TABLE jobs ADD COLUMN mileage DECIMAL(5,1);
  END IF;

  -- Add completed_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='completed_at') THEN
    ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMP;
  END IF;
END $$;

-- Verify jobs table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;
