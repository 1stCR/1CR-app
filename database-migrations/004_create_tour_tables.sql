-- Stage 4: Tour System Database Migration
-- Creates tours and tour_activities tables for time tracking

-- Tours table
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_duration_minutes INTEGER DEFAULT 0,
  travel_minutes INTEGER DEFAULT 0,
  diagnosis_minutes INTEGER DEFAULT 0,
  repair_minutes INTEGER DEFAULT 0,
  research_minutes INTEGER DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  total_mileage DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tour_date UNIQUE(tour_date)
);

-- Tour Activities table
CREATE TABLE IF NOT EXISTS tour_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  activity_type VARCHAR(20) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tours_date ON tours(tour_date);
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_activities_tour ON tour_activities(tour_id);
CREATE INDEX IF NOT EXISTS idx_activities_job ON tour_activities(job_id);
CREATE INDEX IF NOT EXISTS idx_activities_start ON tour_activities(start_time);
CREATE INDEX IF NOT EXISTS idx_activities_type ON tour_activities(activity_type);

-- Comments for documentation
COMMENT ON TABLE tours IS 'Daily tour tracking for technicians';
COMMENT ON TABLE tour_activities IS 'Individual activities within a tour (Travel, Diagnosis, Repair, Research, Break)';
COMMENT ON COLUMN tours.status IS 'Tour status: Active, On Break, Completed';
COMMENT ON COLUMN tour_activities.activity_type IS 'Activity type: Travel, Diagnosis, Repair, Research, Break';

-- Row Level Security (RLS)
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_activities ENABLE ROW LEVEL SECURITY;

-- Policies: Users can see all tours and activities (for now - can be restricted per user later)
CREATE POLICY "Enable read access for all users" ON tours FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON tours FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON tours FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON tours FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON tour_activities FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON tour_activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON tour_activities FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON tour_activities FOR DELETE USING (auth.role() = 'authenticated');
