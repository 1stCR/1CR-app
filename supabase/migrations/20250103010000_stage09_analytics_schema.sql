-- Stage 9: Analytics & Reporting Database Schema
-- Creates tables and views for business intelligence and reporting

-- ============================================================================
-- ANALYTICS TABLES
-- ============================================================================

-- 1. Analytics Cache Table
-- Cache complex analytics calculations for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key
  metric_name TEXT NOT NULL,
  period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Cached data
  data JSONB NOT NULL,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Unique constraint
  UNIQUE(metric_name, period, period_start)
);

-- Indexes for analytics_cache
CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric ON analytics_cache(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_period ON analytics_cache(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Auto-cleanup expired cache function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. Performance Goals Table
-- Track business goals and targets
CREATE TABLE IF NOT EXISTS performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Goal details
  goal_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
    -- 'revenue', 'fcc_rate', 'jobs_completed', 'avg_job_value', etc.

  -- Target
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,

  -- Period
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Status
  status TEXT DEFAULT 'Active',
    -- Active, Achieved, Missed, Cancelled
  achieved_date DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance_goals
CREATE INDEX IF NOT EXISTS idx_goals_period ON performance_goals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_goals_status ON performance_goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_metric ON performance_goals(metric_type);

-- 3. Report Templates Table
-- Save custom report configurations
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template info
  template_name TEXT NOT NULL,
  description TEXT,

  -- Configuration
  report_type TEXT NOT NULL,
    -- 'revenue', 'fcc', 'parts', 'time', 'customer', 'custom'

  filters JSONB DEFAULT '{}',
    -- Stored filter settings

  columns JSONB DEFAULT '[]',
    -- Selected columns to include

  grouping TEXT[],
    -- Group by fields

  sorting JSONB DEFAULT '{}',
    -- Sort configuration

  chart_type TEXT,
    -- 'bar', 'line', 'pie', 'table', etc.

  -- Scheduling
  scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT,
    -- 'daily', 'weekly', 'monthly'
  schedule_day INTEGER,
  schedule_time TIME,

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_run TIMESTAMPTZ
);

-- Indexes for report_templates
CREATE INDEX IF NOT EXISTS idx_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_templates_scheduled ON report_templates(scheduled) WHERE scheduled = true;
CREATE INDEX IF NOT EXISTS idx_templates_creator ON report_templates(created_by);

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- 1. Job Metrics View
-- Comprehensive job metrics in one view
CREATE OR REPLACE VIEW job_metrics_view AS
SELECT
  j.id,
  j.job_id,
  j.customer_id,
  c.first_name || ' ' || c.last_name as customer_name,
  c.customer_type,

  -- Job details
  j.appliance_type,
  j.appliance_brand,
  j.appliance_model,
  j.job_stage,
  j.current_status,

  -- Dates
  j.created_at,
  j.scheduled_date,
  j.completed_at,

  -- Visit tracking
  j.visit_count,
  j.is_callback,
  j.callback_reason,
  j.original_job_id,

  -- First Call Complete calculation
  CASE
    WHEN j.visit_count = 1 AND j.job_stage = 'Complete' AND j.is_callback = false
    THEN true
    ELSE false
  END as is_fcc,

  -- Time metrics (in minutes)
  j.travel_time_minutes,
  j.diagnosis_time_minutes,
  j.repair_time_minutes,
  j.total_time_minutes,

  -- Convert to hours for efficiency calculations
  COALESCE(j.total_time_minutes, 0) / 60.0 as total_time_hours,

  -- Financial metrics
  j.quote_total,
  j.invoice_total,
  j.amount_paid,
  j.payment_status,

  CASE
    WHEN j.payment_status = 'Paid' THEN true
    ELSE false
  END as is_paid_full,

  -- Efficiency metrics
  CASE
    WHEN j.total_time_minutes > 0
    THEN (j.invoice_total / (j.total_time_minutes / 60.0))
  END as revenue_per_hour,

  -- Parts metrics
  (SELECT COUNT(*)
   FROM job_parts jp
   WHERE jp.job_id = j.job_id) as parts_count,

  j.parts_cost,
  j.parts_total,

  -- Days metrics
  CASE
    WHEN j.completed_at IS NOT NULL
    THEN EXTRACT(day FROM (j.completed_at - j.created_at))::integer
  END as days_to_complete,

  CASE
    WHEN j.scheduled_date IS NOT NULL
    THEN EXTRACT(day FROM (j.scheduled_date::timestamp - j.created_at))::integer
  END as days_to_schedule

FROM jobs j
LEFT JOIN customers c ON j.customer_id = c.customer_id;

-- Grant access to view
GRANT SELECT ON job_metrics_view TO authenticated;

-- 2. Parts ROI View
-- Parts return on investment analysis
CREATE OR REPLACE VIEW parts_roi_view AS
SELECT
  pm.part_number,
  pm.description,
  pm.category,
  pm.brand,

  -- Stock metrics
  pm.in_stock,
  pm.min_stock,
  pm.stocking_score,

  -- Usage metrics
  (SELECT COUNT(*) FROM job_parts jp WHERE jp.part_number = pm.part_number) as times_used,

  -- Financial metrics
  pm.avg_cost,
  pm.sell_price,
  pm.markup_percent,

  -- ROI calculations
  (pm.sell_price - pm.avg_cost) as profit_per_unit,
  CASE
    WHEN pm.avg_cost > 0
    THEN ((pm.sell_price - pm.avg_cost) / pm.avg_cost * 100)
    ELSE 0
  END as margin_percent,

  -- Inventory value
  (pm.in_stock * pm.avg_cost) as inventory_value,
  (pm.in_stock * pm.sell_price) as potential_revenue,

  -- Turnover metrics (simplified - would need transaction dates for accurate calculation)
  CASE
    WHEN pm.in_stock > 0
    THEN ((SELECT COUNT(*) FROM job_parts jp WHERE jp.part_number = pm.part_number)::float / pm.in_stock)
    ELSE 0
  END as turnover_rate,

  -- Total profit generated (estimated)
  ((SELECT COUNT(*) FROM job_parts jp WHERE jp.part_number = pm.part_number) * (pm.sell_price - pm.avg_cost)) as lifetime_profit,

  -- Days since last use
  CASE
    WHEN pm.last_used_date IS NOT NULL
    THEN EXTRACT(day FROM (NOW() - pm.last_used_date))::integer
    ELSE NULL
  END as days_since_last_use,

  -- FCC contribution
  (SELECT COUNT(DISTINCT jp.job_id)
   FROM job_parts jp
   JOIN job_metrics_view jm ON jp.job_id = jm.job_id
   WHERE jp.part_number = pm.part_number
   AND jm.is_fcc = true) as fcc_jobs_count

FROM parts_master pm;

-- Grant access to view
GRANT SELECT ON parts_roi_view TO authenticated;

-- 3. Monthly Revenue Summary View
-- Monthly revenue rollup
CREATE OR REPLACE VIEW monthly_revenue_summary AS
SELECT
  DATE_TRUNC('month', completed_at)::date as month,

  -- Job counts
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE is_fcc = true) as fcc_jobs,
  COUNT(*) FILTER (WHERE is_callback = true) as callback_jobs,
  COUNT(*) FILTER (WHERE customer_type = 'Residential') as residential_jobs,
  COUNT(*) FILTER (WHERE customer_type = 'Commercial') as commercial_jobs,

  -- Revenue metrics
  SUM(invoice_total) as total_revenue,
  SUM(parts_total) as parts_revenue,
  AVG(invoice_total) as avg_job_value,

  -- Payment metrics
  SUM(amount_paid) as total_collected,
  SUM(CASE WHEN payment_status != 'Paid' THEN invoice_total - amount_paid ELSE 0 END) as outstanding_balance,

  -- Time metrics
  SUM(total_time_hours) as total_hours,
  AVG(total_time_hours) as avg_hours_per_job,

  -- Efficiency
  CASE
    WHEN SUM(total_time_hours) > 0
    THEN SUM(invoice_total) / SUM(total_time_hours)
    ELSE 0
  END as avg_hourly_rate

FROM job_metrics_view
WHERE completed_at IS NOT NULL
GROUP BY DATE_TRUNC('month', completed_at);

-- Grant access to view
GRANT SELECT ON monthly_revenue_summary TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Analytics Cache Policies
CREATE POLICY "Users can read analytics cache"
  ON analytics_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can write analytics cache"
  ON analytics_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update analytics cache"
  ON analytics_cache FOR UPDATE
  TO authenticated
  USING (true);

-- Performance Goals Policies
CREATE POLICY "Users can read performance goals"
  ON performance_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create performance goals"
  ON performance_goals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own performance goals"
  ON performance_goals FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Report Templates Policies
CREATE POLICY "Users can read public report templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create report templates"
  ON report_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own report templates"
  ON report_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own report templates"
  ON report_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate FCC rate for a period
CREATE OR REPLACE FUNCTION calculate_fcc_rate(start_date DATE, end_date DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_jobs INTEGER;
  fcc_jobs INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_fcc = true)
  INTO total_jobs, fcc_jobs
  FROM job_metrics_view
  WHERE completed_at >= start_date
    AND completed_at <= end_date
    AND job_stage = 'Complete';

  IF total_jobs = 0 THEN
    RETURN 0;
  END IF;

  RETURN (fcc_jobs::DECIMAL / total_jobs * 100);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes on jobs table for analytics queries
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON jobs(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_job_stage ON jobs(job_stage);
CREATE INDEX IF NOT EXISTS idx_jobs_is_callback ON jobs(is_callback);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- Add indexes on job_parts for ROI calculations
CREATE INDEX IF NOT EXISTS idx_job_parts_part_number ON job_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_job_parts_job_id ON job_parts(job_id);

-- ============================================================================
-- NOTIFY SCHEMA RELOAD
-- ============================================================================

NOTIFY pgrst, 'reload schema';
