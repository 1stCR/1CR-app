-- Stage 4: Tour System Database Schema
-- Creates tables for tour-based time tracking

-- ============================================================================
-- TOUR TABLES
-- ============================================================================

-- 1. Tours Table
-- Main table for daily tours (one tour per technician per day)
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tour identification
  tour_date DATE NOT NULL,
  technician_id UUID REFERENCES auth.users(id),

  -- Tour status
  status TEXT NOT NULL DEFAULT 'Not Started',
    -- 'Not Started', 'Active', 'On Break', 'Completed'

  -- Time tracking
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_duration_minutes INTEGER DEFAULT 0,

  -- Activity breakdown (in minutes)
  travel_time_minutes INTEGER DEFAULT 0,
  diagnosis_time_minutes INTEGER DEFAULT 0,
  repair_time_minutes INTEGER DEFAULT 0,
  research_time_minutes INTEGER DEFAULT 0,
  break_time_minutes INTEGER DEFAULT 0,

  -- Statistics
  jobs_completed INTEGER DEFAULT 0,
  jobs_worked INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tour_date, technician_id)
);

-- 2. Tour Activities Table
-- Tracks individual activities throughout the tour
CREATE TABLE IF NOT EXISTS tour_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(job_id) ON DELETE SET NULL,
    -- Nullable for non-job activities (travel, break, research)

  -- Activity details
  activity_type TEXT NOT NULL,
    -- 'Travel', 'Diagnosis', 'Repair', 'Research', 'Break'

  activity_status TEXT DEFAULT 'Active',
    -- 'Active', 'Paused', 'Completed'

  -- Time tracking
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Activity context
  notes TEXT,
  location TEXT,
    -- For travel activities

  -- Research details (for Research activity type)
  research_topic TEXT,
  research_source TEXT,
    -- 'Manual', 'AI Suggested', 'Internet Search'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tour indexes
CREATE INDEX IF NOT EXISTS idx_tours_date ON tours(tour_date);
CREATE INDEX IF NOT EXISTS idx_tours_technician ON tours(technician_id);
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_tours_date_tech ON tours(tour_date, technician_id);

-- Tour activities indexes
CREATE INDEX IF NOT EXISTS idx_tour_activities_tour ON tour_activities(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_activities_job ON tour_activities(job_id);
CREATE INDEX IF NOT EXISTS idx_tour_activities_type ON tour_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_tour_activities_start ON tour_activities(start_time);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_activities ENABLE ROW LEVEL SECURITY;

-- Tours Policies
CREATE POLICY "Users can view their own tours"
  ON tours FOR SELECT
  TO authenticated
  USING (technician_id = auth.uid());

CREATE POLICY "Users can create their own tours"
  ON tours FOR INSERT
  TO authenticated
  WITH CHECK (technician_id = auth.uid());

CREATE POLICY "Users can update their own tours"
  ON tours FOR UPDATE
  TO authenticated
  USING (technician_id = auth.uid());

CREATE POLICY "Users can delete their own tours"
  ON tours FOR DELETE
  TO authenticated
  USING (technician_id = auth.uid());

-- Tour Activities Policies
CREATE POLICY "Users can view their own tour activities"
  ON tour_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = tour_activities.tour_id
      AND tours.technician_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own tour activities"
  ON tour_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = tour_activities.tour_id
      AND tours.technician_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tour activities"
  ON tour_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = tour_activities.tour_id
      AND tours.technician_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own tour activities"
  ON tour_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = tour_activities.tour_id
      AND tours.technician_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update tour statistics when activity ends
CREATE OR REPLACE FUNCTION update_tour_stats_on_activity_end()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if activity is being completed (end_time is set)
  IF NEW.end_time IS NOT NULL AND (OLD.end_time IS NULL OR OLD.end_time != NEW.end_time) THEN
    -- Calculate duration
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;

    -- Update tour statistics
    UPDATE tours
    SET
      travel_time_minutes = COALESCE((
        SELECT SUM(duration_minutes)
        FROM tour_activities
        WHERE tour_id = NEW.tour_id AND activity_type = 'Travel'
      ), 0),
      diagnosis_time_minutes = COALESCE((
        SELECT SUM(duration_minutes)
        FROM tour_activities
        WHERE tour_id = NEW.tour_id AND activity_type = 'Diagnosis'
      ), 0),
      repair_time_minutes = COALESCE((
        SELECT SUM(duration_minutes)
        FROM tour_activities
        WHERE tour_id = NEW.tour_id AND activity_type = 'Repair'
      ), 0),
      research_time_minutes = COALESCE((
        SELECT SUM(duration_minutes)
        FROM tour_activities
        WHERE tour_id = NEW.tour_id AND activity_type = 'Research'
      ), 0),
      break_time_minutes = COALESCE((
        SELECT SUM(duration_minutes)
        FROM tour_activities
        WHERE tour_id = NEW.tour_id AND activity_type = 'Break'
      ), 0),
      total_duration_minutes = COALESCE((
        SELECT SUM(duration_minutes)
        FROM tour_activities
        WHERE tour_id = NEW.tour_id
      ), 0),
      updated_at = NOW()
    WHERE id = NEW.tour_id;

    -- If this activity was associated with a job, update job time tracking
    IF NEW.job_id IS NOT NULL THEN
      UPDATE jobs
      SET
        travel_time_minutes = COALESCE((
          SELECT SUM(duration_minutes)
          FROM tour_activities
          WHERE job_id = NEW.job_id AND activity_type = 'Travel'
        ), 0),
        diagnosis_time_minutes = COALESCE((
          SELECT SUM(duration_minutes)
          FROM tour_activities
          WHERE job_id = NEW.job_id AND activity_type = 'Diagnosis'
        ), 0),
        repair_time_minutes = COALESCE((
          SELECT SUM(duration_minutes)
          FROM tour_activities
          WHERE job_id = NEW.job_id AND activity_type = 'Repair'
        ), 0),
        research_time_minutes = COALESCE((
          SELECT SUM(duration_minutes)
          FROM tour_activities
          WHERE job_id = NEW.job_id AND activity_type = 'Research'
        ), 0),
        total_time_minutes = COALESCE((
          SELECT SUM(duration_minutes)
          FROM tour_activities
          WHERE job_id = NEW.job_id AND activity_type IN ('Travel', 'Diagnosis', 'Repair')
        ), 0),
        updated_at = NOW()
      WHERE job_id = NEW.job_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when activity ends
CREATE TRIGGER update_tour_stats_trigger
  BEFORE UPDATE ON tour_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_stats_on_activity_end();

-- ============================================================================
-- NOTIFY SCHEMA RELOAD
-- ============================================================================

NOTIFY pgrst, 'reload schema';
