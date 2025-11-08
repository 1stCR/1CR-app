# Stage 9: Analytics & Reporting

## 🎯 Objective
Build comprehensive business intelligence system with interactive dashboards, performance metrics, FCC rate tracking, revenue analytics, parts ROI analysis, and custom reporting capabilities.

## ✅ Prerequisites
- Stages 1-8 completed
- Job system with full history working
- Parts inventory with transaction tracking
- Tour time tracking functional
- Invoice and payment system operational
- Sufficient data for meaningful analytics (10+ jobs recommended)

## 🛠️ What We're Building

### Core Features:
1. **Executive Dashboard**
   - Key performance indicators (KPIs)
   - Revenue tracking (daily, weekly, monthly)
   - Job completion metrics
   - Parts inventory health
   - At-a-glance business health

2. **FCC Rate Analytics**
   - First Call Complete percentage
   - Callback rate tracking
   - Root cause analysis
   - Trend analysis over time
   - Prevention recommendations

3. **Revenue Analytics**
   - Revenue by service type
   - Revenue by customer type
   - Average job value
   - Payment collection rates
   - Outstanding receivables
   - Revenue forecasting

4. **Parts ROI Analysis**
   - Most used parts
   - Parts inventory value
   - Stock turnover rates
   - Dead stock identification
   - Stocking efficiency metrics
   - Cost savings from stocking

5. **Time Efficiency Metrics**
   - Average diagnosis time
   - Average repair time
   - Travel time analysis
   - Utilization rates
   - Billable vs non-billable time
   - Time by appliance type

6. **Customer Analytics**
   - Top customers by revenue
   - Repeat customer rate
   - Customer satisfaction trends
   - Geographic distribution
   - Customer lifetime value

7. **Custom Reports**
   - Date range filters
   - Export to CSV/PDF
   - Scheduled reports
   - Report templates
   - Saved report configurations

8. **Performance Trends**
   - Week-over-week comparisons
   - Month-over-month growth
   - Seasonal patterns
   - Goal tracking
   - Benchmark comparisons

---

## 📊 Database Schema Updates

### New Tables

#### 1. **analytics_cache** table
```sql
-- Cache complex analytics calculations for performance
CREATE TABLE analytics_cache (
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

-- Indexes
CREATE INDEX idx_analytics_cache_metric ON analytics_cache(metric_name);
CREATE INDEX idx_analytics_cache_period ON analytics_cache(period_start, period_end);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Auto-cleanup expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

#### 2. **performance_goals** table
```sql
-- Track business goals and targets
CREATE TABLE performance_goals (
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

-- Indexes
CREATE INDEX idx_goals_period ON performance_goals(period_start, period_end);
CREATE INDEX idx_goals_status ON performance_goals(status);
CREATE INDEX idx_goals_metric ON performance_goals(metric_type);
```

#### 3. **report_templates** table
```sql
-- Save custom report configurations
CREATE TABLE report_templates (
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

-- Indexes
CREATE INDEX idx_templates_type ON report_templates(report_type);
CREATE INDEX idx_templates_scheduled ON report_templates(scheduled) WHERE scheduled = true;
CREATE INDEX idx_templates_creator ON report_templates(created_by);
```

### Analytics Views

#### 1. **job_metrics_view**
```sql
-- Comprehensive job metrics in one view
CREATE OR REPLACE VIEW job_metrics_view AS
SELECT 
  j.id,
  j.job_number,
  j.customer_id,
  c.full_name as customer_name,
  c.customer_type,
  
  -- Job details
  j.appliance_type,
  j.brand,
  j.appliance_tier,
  j.job_stage,
  j.current_status,
  
  -- Dates
  j.created_date,
  j.scheduled_date,
  j.completed_date,
  
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
  
  -- Time metrics
  j.total_diagnosis_time,
  j.total_repair_time,
  j.total_travel_time,
  (COALESCE(j.total_diagnosis_time, 0) + 
   COALESCE(j.total_repair_time, 0) + 
   COALESCE(j.total_travel_time, 0)) as total_time_hours,
  
  -- Financial metrics
  j.service_charge,
  j.labor_total,
  j.parts_total,
  j.subtotal,
  j.discount_amount,
  j.tax_amount,
  j.total_amount,
  j.amount_paid,
  j.balance_due,
  
  CASE 
    WHEN j.balance_due = 0 AND j.total_amount > 0 THEN true 
    ELSE false 
  END as is_paid_full,
  
  -- Efficiency metrics
  CASE 
    WHEN j.total_diagnosis_time > 0 
    THEN j.labor_total / j.total_diagnosis_time 
  END as revenue_per_hour,
  
  -- Parts metrics
  (SELECT COUNT(*) 
   FROM parts_transactions pt 
   WHERE pt.job_id = j.id AND pt.type = 'Used') as parts_count,
  
  (SELECT SUM(pt.total_cost) 
   FROM parts_transactions pt 
   WHERE pt.job_id = j.id AND pt.type = 'Used') as parts_cost,
  
  -- Days metrics
  CASE 
    WHEN j.completed_date IS NOT NULL 
    THEN j.completed_date - j.created_date 
  END as days_to_complete,
  
  CASE 
    WHEN j.scheduled_date IS NOT NULL 
    THEN j.scheduled_date - j.created_date 
  END as days_to_schedule

FROM jobs j
LEFT JOIN customers c ON j.customer_id = c.id;

-- Grant access
GRANT SELECT ON job_metrics_view TO authenticated;
```

#### 2. **parts_roi_view**
```sql
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
  pm.auto_replenish,
  pm.stocking_score,
  
  -- Usage metrics
  pm.times_used,
  pm.first_used_date,
  pm.last_used_date,
  
  -- Financial metrics
  pm.avg_cost,
  pm.markup_percent,
  pm.sell_price,
  
  -- ROI calculations
  (pm.sell_price - pm.avg_cost) as profit_per_unit,
  ((pm.sell_price - pm.avg_cost) / NULLIF(pm.avg_cost, 0) * 100) as margin_percent,
  
  -- Inventory value
  (pm.in_stock * pm.avg_cost) as inventory_value,
  (pm.in_stock * pm.sell_price) as potential_revenue,
  
  -- Turnover metrics
  CASE 
    WHEN pm.first_used_date IS NOT NULL AND pm.times_used > 0
    THEN (pm.times_used::float / 
          GREATEST(EXTRACT(day FROM (NOW() - pm.first_used_date)) / 365.0, 0.1))
  END as annual_turnover_rate,
  
  -- Days since last use
  CASE 
    WHEN pm.last_used_date IS NOT NULL 
    THEN EXTRACT(day FROM (NOW() - pm.last_used_date))::integer
  END as days_since_last_use,
  
  -- Total profit generated
  (pm.times_used * (pm.sell_price - pm.avg_cost)) as lifetime_profit,
  
  -- FCC contribution
  (SELECT COUNT(DISTINCT job_id) 
   FROM parts_transactions pt
   WHERE pt.part_number = pm.part_number 
   AND pt.type = 'Used'
   AND EXISTS (
     SELECT 1 FROM job_metrics_view jm 
     WHERE jm.id = pt.job_id AND jm.is_fcc = true
   )) as fcc_jobs_count

FROM parts_master pm;

-- Grant access
GRANT SELECT ON parts_roi_view TO authenticated;
```

#### 3. **monthly_revenue_summary**
```sql
-- Monthly revenue rollup
CREATE OR REPLACE VIEW monthly_revenue_summary AS
SELECT 
  DATE_TRUNC('month', completed_date)::date as month,
  
  -- Job counts
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE is_fcc = true) as fcc_jobs,
  COUNT(*) FILTER (WHERE is_callback = true) as callback_jobs,
  COUNT(*) FILTER (WHERE customer_type = 'Residential') as residential_jobs,
  COUNT(*) FILTER (WHERE customer_type = 'Commercial') as commercial_jobs,
  
  -- Revenue metrics
  SUM(total_amount) as total_revenue,
  SUM(labor_total) as labor_revenue,
  SUM(parts_total) as parts_revenue,
  SUM(service_charge) as service_charge_revenue,
  AVG(total_amount) as avg_job_value,
  
  -- Payment metrics
  SUM(amount_paid) as total_collected,
  SUM(balance_due) as outstanding_balance,
  
  -- Time metrics
  SUM(total_time_hours) as total_hours,
  AVG(total_time_hours) as avg_hours_per_job,
  
  -- Efficiency
  CASE 
    WHEN SUM(total_time_hours) > 0 
    THEN SUM(labor_total) / SUM(total_time_hours)
  END as avg_hourly_rate

FROM job_metrics_view
WHERE completed_date IS NOT NULL
GROUP BY DATE_TRUNC('month', completed_date);

-- Grant access
GRANT SELECT ON monthly_revenue_summary TO authenticated;
```

---

## 🎨 Frontend Components

### 1. Executive Dashboard

**File:** `src/components/analytics/ExecutiveDashboard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, DollarSign, Wrench, Package, 
  Clock, Users, AlertCircle, CheckCircle 
} from 'lucide-react';

interface DashboardMetrics {
  // Current period
  revenue_current: number;
  jobs_current: number;
  fcc_rate_current: number;
  avg_job_value_current: number;
  
  // Previous period (for comparison)
  revenue_previous: number;
  jobs_previous: number;
  fcc_rate_previous: number;
  avg_job_value_previous: number;
  
  // Other metrics
  outstanding_balance: number;
  active_jobs: number;
  parts_value: number;
  parts_low_stock: number;
}

export default function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardMetrics();
  }, [period]);

  const loadDashboardMetrics = async () => {
    setLoading(true);
    try {
      // Calculate date ranges
      const now = new Date();
      let currentStart: Date, previousStart: Date;
      
      if (period === 'week') {
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 7);
        previousStart = new Date(currentStart);
        previousStart.setDate(currentStart.getDate() - 7);
      } else if (period === 'month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else { // year
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
      }

      // Load current period metrics
      const { data: currentData, error: currentError } = await supabase
        .from('job_metrics_view')
        .select('*')
        .gte('completed_date', currentStart.toISOString())
        .lte('completed_date', now.toISOString());

      if (currentError) throw currentError;

      // Load previous period metrics
      const { data: previousData, error: previousError } = await supabase
        .from('job_metrics_view')
        .select('*')
        .gte('completed_date', previousStart.toISOString())
        .lt('completed_date', currentStart.toISOString());

      if (previousError) throw previousError;

      // Calculate metrics
      const calculateMetrics = (data: any[]) => ({
        revenue: data.reduce((sum, j) => sum + (j.total_amount || 0), 0),
        jobs: data.length,
        fcc_rate: data.length > 0 
          ? (data.filter(j => j.is_fcc).length / data.length) * 100 
          : 0,
        avg_job_value: data.length > 0 
          ? data.reduce((sum, j) => sum + (j.total_amount || 0), 0) / data.length 
          : 0
      });

      const current = calculateMetrics(currentData || []);
      const previous = calculateMetrics(previousData || []);

      // Get outstanding balance
      const { data: outstandingData } = await supabase
        .from('jobs')
        .select('balance_due')
        .gt('balance_due', 0);

      const outstanding = outstandingData?.reduce(
        (sum, j) => sum + (j.balance_due || 0), 0
      ) || 0;

      // Get active jobs count
      const { count: activeCount } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .neq('job_stage', 'Complete');

      // Get parts metrics
      const { data: partsData } = await supabase
        .from('parts_master')
        .select('in_stock, avg_cost, min_stock');

      const partsValue = partsData?.reduce(
        (sum, p) => sum + (p.in_stock * p.avg_cost || 0), 0
      ) || 0;

      const lowStock = partsData?.filter(
        p => p.in_stock <= (p.min_stock || 0)
      ).length || 0;

      setMetrics({
        revenue_current: current.revenue,
        jobs_current: current.jobs,
        fcc_rate_current: current.fcc_rate,
        avg_job_value_current: current.avg_job_value,
        
        revenue_previous: previous.revenue,
        jobs_previous: previous.jobs,
        fcc_rate_previous: previous.fcc_rate,
        avg_job_value_previous: previous.avg_job_value,
        
        outstanding_balance: outstanding,
        active_jobs: activeCount || 0,
        parts_value: partsValue,
        parts_low_stock: lowStock
      });

      // Load chart data
      await loadChartData(currentStart);

    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
      alert('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (startDate: Date) => {
    try {
      const { data, error } = await supabase
        .from('job_metrics_view')
        .select('completed_date, total_amount')
        .gte('completed_date', startDate.toISOString())
        .order('completed_date', { ascending: true });

      if (error) throw error;

      // Group by day
      const dailyRevenue: Record<string, number> = {};
      data?.forEach(job => {
        const date = new Date(job.completed_date).toLocaleDateString();
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (job.total_amount || 0);
      });

      const chartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue
      }));

      setChartData(chartData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { percent: 0, direction: 'neutral' as const };
    const percent = ((current - previous) / previous) * 100;
    return {
      percent: Math.abs(percent),
      direction: percent > 0 ? 'up' as const : percent < 0 ? 'down' as const : 'neutral' as const
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!metrics) return null;

  const revenueChange = calculateChange(metrics.revenue_current, metrics.revenue_previous);
  const jobsChange = calculateChange(metrics.jobs_current, metrics.jobs_previous);
  const fccChange = calculateChange(metrics.fcc_rate_current, metrics.fcc_rate_previous);
  const avgValueChange = calculateChange(metrics.avg_job_value_current, metrics.avg_job_value_previous);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <p className="text-gray-600 mt-1">Business performance at a glance</p>
        </div>
        
        {/* Period selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg capitalize transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <KPICard
          title="Revenue"
          value={`$${metrics.revenue_current.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={revenueChange}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />

        {/* Jobs Completed */}
        <KPICard
          title="Jobs Completed"
          value={metrics.jobs_current.toString()}
          change={jobsChange}
          icon={<Wrench className="w-6 h-6" />}
          color="blue"
        />

        {/* FCC Rate */}
        <KPICard
          title="FCC Rate"
          value={`${metrics.fcc_rate_current.toFixed(1)}%`}
          change={fccChange}
          icon={<CheckCircle className="w-6 h-6" />}
          color="purple"
        />

        {/* Avg Job Value */}
        <KPICard
          title="Avg Job Value"
          value={`$${metrics.avg_job_value_current.toFixed(0)}`}
          change={avgValueChange}
          icon={<TrendingUp className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Jobs"
          value={metrics.active_jobs}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        
        <MetricCard
          title="Outstanding Balance"
          value={`$${metrics.outstanding_balance.toFixed(2)}`}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
          alert={metrics.outstanding_balance > 1000}
        />
        
        <MetricCard
          title="Parts Inventory Value"
          value={`$${metrics.parts_value.toFixed(2)}`}
          icon={<Package className="w-5 h-5" />}
          color="indigo"
        />
        
        <MetricCard
          title="Parts Low Stock"
          value={metrics.parts_low_stock}
          icon={<AlertCircle className="w-5 h-5" />}
          color="orange"
          alert={metrics.parts_low_stock > 0}
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        {chartData.length > 0 ? (
          <SimpleLineChart data={chartData} />
        ) : (
          <div className="text-center text-gray-500 py-12">
            No data available for selected period
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="View Detailed Revenue Report"
          description="Breakdown by customer, service type, and more"
          action={() => window.location.href = '/analytics/revenue'}
          buttonText="View Report"
        />
        
        <QuickActionCard
          title="FCC Analysis"
          description="Analyze first call complete rates and trends"
          action={() => window.location.href = '/analytics/fcc'}
          buttonText="Analyze"
        />
        
        <QuickActionCard
          title="Parts ROI"
          description="See which parts are most profitable"
          action={() => window.location.href = '/analytics/parts-roi'}
          buttonText="View ROI"
        />
      </div>
    </div>
  );
}

// Helper Components

interface KPICardProps {
  title: string;
  value: string;
  change: { percent: number; direction: 'up' | 'down' | 'neutral' };
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
}

function KPICard({ title, value, change, icon, color }: KPICardProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change.direction !== 'neutral' && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            change.direction === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {change.direction === 'up' ? '↑' : '↓'}
            {change.percent.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
}

function MetricCard({ title, value, icon, color, alert }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${alert ? 'border-2 border-red-300' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-sm text-gray-600">{title}</div>
        </div>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  action: () => void;
  buttonText: string;
}

function QuickActionCard({ title, description, action, buttonText }: QuickActionCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <button
        onClick={action}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        {buttonText}
      </button>
    </div>
  );
}

// Simple Line Chart Component
function SimpleLineChart({ data }: { data: any[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const chartHeight = 200;

  return (
    <div className="relative" style={{ height: chartHeight }}>
      <svg width="100%" height={chartHeight} className="text-gray-300">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(percent => {
          const y = (chartHeight * (100 - percent)) / 100;
          return (
            <line
              key={percent}
              x1="0"
              y1={y}
              x2="100%"
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4"
            />
          );
        })}
        
        {/* Line chart */}
        <polyline
          fill="none"
          stroke="#3B82F6"
          strokeWidth="3"
          points={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((d.revenue / maxRevenue) * 90);
            return `${x}%,${(y * chartHeight) / 100}`;
          }).join(' ')}
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((d.revenue / maxRevenue) * 90);
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={(y * chartHeight) / 100}
              r="4"
              fill="#3B82F6"
            />
          );
        })}
      </svg>
      
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
        <span>${(maxRevenue).toFixed(0)}</span>
        <span>${(maxRevenue * 0.75).toFixed(0)}</span>
        <span>${(maxRevenue * 0.5).toFixed(0)}</span>
        <span>${(maxRevenue * 0.25).toFixed(0)}</span>
        <span>$0</span>
      </div>
    </div>
  );
}
```

### 2. FCC Rate Analytics

**File:** `src/components/analytics/FCCAnalytics.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface FCCMetrics {
  total_jobs: number;
  fcc_jobs: number;
  two_visit_jobs: number;
  multi_visit_jobs: number;
  callback_jobs: number;
  
  fcc_rate: number;
  callback_rate: number;
  
  // Breakdown by reason
  callbacks_same_issue: number;
  callbacks_new_issue: number;
  callbacks_customer_error: number;
  
  // Common reasons for multi-visit
  multi_visit_parts: number;
  multi_visit_intermittent: number;
  multi_visit_complex: number;
}

interface CallbackDetail {
  job_number: string;
  customer_name: string;
  appliance_type: string;
  callback_reason: string;
  original_job_number: string;
  days_between: number;
  issue_description: string;
}

export default function FCCAnalytics() {
  const [metrics, setMetrics] = useState<FCCMetrics | null>(null);
  const [callbackDetails, setCallbackDetails] = useState<CallbackDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | '365'>('90');

  useEffect(() => {
    loadFCCMetrics();
  }, [dateRange]);

  const loadFCCMetrics = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Load completed jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('job_metrics_view')
        .select('*')
        .eq('job_stage', 'Complete')
        .gte('completed_date', daysAgo.toISOString());

      if (jobsError) throw jobsError;

      const totalJobs = jobs?.length || 0;
      const fccJobs = jobs?.filter(j => j.is_fcc).length || 0;
      const twoVisitJobs = jobs?.filter(j => j.visit_count === 2 && !j.is_callback).length || 0;
      const multiVisitJobs = jobs?.filter(j => j.visit_count > 2 && !j.is_callback).length || 0;
      const callbackJobs = jobs?.filter(j => j.is_callback).length || 0;

      // Callback breakdown
      const callbacksSameIssue = jobs?.filter(
        j => j.is_callback && j.callback_reason === 'Same Issue-Our Fault'
      ).length || 0;

      const callbacksNewIssue = jobs?.filter(
        j => j.is_callback && j.callback_reason === 'New Issue'
      ).length || 0;

      const callbacksCustomerError = jobs?.filter(
        j => j.is_callback && j.callback_reason === 'Customer Error'
      ).length || 0;

      // Multi-visit reasons (would need additional data)
      const multiVisitParts = jobs?.filter(
        j => j.visit_count > 1 && !j.is_callback && j.parts_count > 0
      ).length || 0;

      setMetrics({
        total_jobs: totalJobs,
        fcc_jobs: fccJobs,
        two_visit_jobs: twoVisitJobs,
        multi_visit_jobs: multiVisitJobs,
        callback_jobs: callbackJobs,
        
        fcc_rate: totalJobs > 0 ? (fccJobs / totalJobs) * 100 : 0,
        callback_rate: totalJobs > 0 ? (callbackJobs / totalJobs) * 100 : 0,
        
        callbacks_same_issue: callbacksSameIssue,
        callbacks_new_issue: callbacksNewIssue,
        callbacks_customer_error: callbacksCustomerError,
        
        multi_visit_parts: multiVisitParts,
        multi_visit_intermittent: 0, // Would need to track this
        multi_visit_complex: multiVisitJobs - multiVisitParts
      });

      // Load callback details
      const { data: callbacks } = await supabase
        .from('jobs')
        .select(`
          job_number,
          customer:customers(full_name),
          appliance_type,
          callback_reason,
          original_job_id,
          issue_description,
          completed_date
        `)
        .eq('is_callback', true)
        .gte('completed_date', daysAgo.toISOString())
        .order('completed_date', { ascending: false });

      // Get original job dates for days_between calculation
      const callbackDetailsData: CallbackDetail[] = [];
      for (const cb of callbacks || []) {
        const { data: originalJob } = await supabase
          .from('jobs')
          .select('job_number, completed_date')
          .eq('id', cb.original_job_id)
          .single();

        if (originalJob && cb.completed_date) {
          const daysBetween = Math.floor(
            (new Date(cb.completed_date).getTime() - 
             new Date(originalJob.completed_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          );

          callbackDetailsData.push({
            job_number: cb.job_number,
            customer_name: cb.customer?.full_name || 'Unknown',
            appliance_type: cb.appliance_type || '',
            callback_reason: cb.callback_reason || '',
            original_job_number: originalJob.job_number,
            days_between: daysBetween,
            issue_description: cb.issue_description || ''
          });
        }
      }

      setCallbackDetails(callbackDetailsData);

    } catch (error) {
      console.error('Error loading FCC metrics:', error);
      alert('Failed to load FCC analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">Loading FCC analytics...</div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">First Call Complete Analysis</h1>
          <p className="text-gray-600 mt-1">
            Tracking job efficiency and callback rates
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex gap-2">
          {(['30', '90', '180', '365'] as const).map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-4 py-2 rounded-lg transition ${
                dateRange === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Main FCC Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">FCC Rate</h3>
          <div className="text-5xl font-bold text-green-600 mb-2">
            {metrics.fcc_rate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">
            {metrics.fcc_jobs} of {metrics.total_jobs} jobs
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${metrics.fcc_rate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Callback Rate</h3>
          <div className="text-5xl font-bold text-red-600 mb-2">
            {metrics.callback_rate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">
            {metrics.callback_jobs} callbacks
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${metrics.callback_rate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Multi-Visit Jobs</h3>
          <div className="text-5xl font-bold text-orange-600 mb-2">
            {metrics.two_visit_jobs + metrics.multi_visit_jobs}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Two visits: {metrics.two_visit_jobs}</div>
            <div>3+ visits: {metrics.multi_visit_jobs}</div>
          </div>
        </div>
      </div>

      {/* Job Outcome Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Job Outcome Distribution</h3>
        <div className="space-y-3">
          <OutcomeBar
            label="First Call Complete"
            count={metrics.fcc_jobs}
            total={metrics.total_jobs}
            color="green"
          />
          <OutcomeBar
            label="Two Visit Complete"
            count={metrics.two_visit_jobs}
            total={metrics.total_jobs}
            color="blue"
          />
          <OutcomeBar
            label="Multi-Visit Complex"
            count={metrics.multi_visit_jobs}
            total={metrics.total_jobs}
            color="orange"
          />
          <OutcomeBar
            label="Callbacks"
            count={metrics.callback_jobs}
            total={metrics.total_jobs}
            color="red"
          />
        </div>
      </div>

      {/* Callback Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Callback Reasons</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">
              {metrics.callbacks_same_issue}
            </div>
            <div className="text-sm text-gray-600 mt-1">Same Issue - Our Fault</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">
              {metrics.callbacks_new_issue}
            </div>
            <div className="text-sm text-gray-600 mt-1">New Issue</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.callbacks_customer_error}
            </div>
            <div className="text-sm text-gray-600 mt-1">Customer Error</div>
          </div>
        </div>
      </div>

      {/* Callback Details Table */}
      {callbackDetails.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Callbacks</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Job</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Appliance</th>
                  <th className="text-left py-2">Reason</th>
                  <th className="text-left py-2">Original Job</th>
                  <th className="text-left py-2">Days Between</th>
                </tr>
              </thead>
              <tbody>
                {callbackDetails.map((cb, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3">{cb.job_number}</td>
                    <td className="py-3">{cb.customer_name}</td>
                    <td className="py-3">{cb.appliance_type}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        cb.callback_reason === 'Same Issue-Our Fault'
                          ? 'bg-red-100 text-red-800'
                          : cb.callback_reason === 'New Issue'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {cb.callback_reason}
                      </span>
                    </td>
                    <td className="py-3">{cb.original_job_number}</td>
                    <td className="py-3">{cb.days_between} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">
          💡 Recommendations to Improve FCC Rate
        </h3>
        <ul className="space-y-2 text-blue-800">
          {metrics.callbacks_same_issue > 0 && (
            <li>• Focus on reducing "Same Issue" callbacks through better diagnostics</li>
          )}
          {metrics.multi_visit_parts > 5 && (
            <li>• Stock more commonly needed parts to reduce multi-visit jobs</li>
          )}
          {metrics.fcc_rate < 70 && (
            <li>• Review diagnostic procedures to improve first-time fix rate</li>
          )}
          {metrics.callback_rate > 10 && (
            <li>• Implement quality checks before leaving customer site</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function OutcomeBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: 'green' | 'blue' | 'orange' | 'red';
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };

  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <span>{label}</span>
        <span className="font-semibold">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### 3. Parts ROI Dashboard

**File:** `src/components/analytics/PartsROI.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface PartROI {
  part_number: string;
  description: string;
  category: string;
  times_used: number;
  in_stock: number;
  avg_cost: number;
  sell_price: number;
  profit_per_unit: number;
  margin_percent: number;
  lifetime_profit: number;
  inventory_value: number;
  annual_turnover_rate: number;
  days_since_last_use: number;
  stocking_score: number;
}

export default function PartsROI() {
  const [parts, setParts] = useState<PartROI[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof PartROI>('lifetime_profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadPartsROI();
  }, [sortBy, sortOrder, filterCategory]);

  const loadPartsROI = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('parts_roi_view')
        .select('*');

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Sort data
      const sortedData = (data || []).sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });

      setParts(sortedData);

      // Get unique categories
      const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('Error loading parts ROI:', error);
      alert('Failed to load parts ROI data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field: keyof PartROI) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Calculate summary stats
  const totalInventoryValue = parts.reduce((sum, p) => sum + (p.inventory_value || 0), 0);
  const totalLifetimeProfit = parts.reduce((sum, p) => sum + (p.lifetime_profit || 0), 0);
  const avgMargin = parts.length > 0
    ? parts.reduce((sum, p) => sum + (p.margin_percent || 0), 0) / parts.length
    : 0;
  const deadStock = parts.filter(p => (p.days_since_last_use || 0) > 180).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">Loading parts ROI analysis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Parts ROI Analysis</h1>
        <p className="text-gray-600 mt-1">
          Return on investment and profitability analysis for your parts inventory
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Inventory Value</div>
          <div className="text-3xl font-bold text-blue-600">
            ${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Lifetime Profit</div>
          <div className="text-3xl font-bold text-green-600">
            ${totalLifetimeProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Average Margin</div>
          <div className="text-3xl font-bold text-purple-600">
            {avgMargin.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Dead Stock Items</div>
          <div className="text-3xl font-bold text-orange-600">
            {deadStock}
          </div>
          <div className="text-xs text-gray-500 mt-1">Not used in 180+ days</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Category:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as keyof PartROI)}
              className="px-3 py-2 border rounded"
            >
              <option value="lifetime_profit">Lifetime Profit</option>
              <option value="times_used">Times Used</option>
              <option value="margin_percent">Margin %</option>
              <option value="annual_turnover_rate">Turnover Rate</option>
              <option value="stocking_score">Stocking Score</option>
              <option value="inventory_value">Inventory Value</option>
            </select>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            {sortOrder === 'desc' ? '↓ Descending' : '↑ Ascending'}
          </button>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Part Number</th>
                <th className="text-left py-3 px-4 font-semibold">Description</th>
                <th className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('times_used')}>
                  Used {sortBy === 'times_used' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('margin_percent')}>
                  Margin {sortBy === 'margin_percent' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('lifetime_profit')}>
                  Total Profit {sortBy === 'lifetime_profit' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('inventory_value')}>
                  Stock Value {sortBy === 'inventory_value' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('stocking_score')}>
                  Score {sortBy === 'stocking_score' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{part.part_number}</td>
                  <td className="py-3 px-4">
                    <div>{part.description}</div>
                    <div className="text-xs text-gray-500">{part.category}</div>
                  </td>
                  <td className="py-3 px-4 text-right">{part.times_used}x</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-semibold ${
                      part.margin_percent > 25 ? 'text-green-600' :
                      part.margin_percent > 15 ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>
                      {part.margin_percent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">
                    ${part.lifetime_profit.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ${part.inventory_value.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      part.stocking_score >= 8 ? 'bg-green-100 text-green-800' :
                      part.stocking_score >= 5 ? 'bg-blue-100 text-blue-800' :
                      part.stocking_score >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {part.stocking_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 🧮 Utility Functions

### Analytics Calculator

**File:** `src/utils/analyticsCalculator.ts`

```typescript
import { supabase } from '../lib/supabase';

export async function calculateFCCRate(startDate: Date, endDate: Date): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('job_metrics_view')
      .select('is_fcc')
      .eq('job_stage', 'Complete')
      .gte('completed_date', startDate.toISOString())
      .lte('completed_date', endDate.toISOString());

    if (error) throw error;

    const total = data?.length || 0;
    const fccCount = data?.filter(j => j.is_fcc).length || 0;

    return total > 0 ? (fccCount / total) * 100 : 0;
  } catch (error) {
    console.error('Error calculating FCC rate:', error);
    return 0;
  }
}

export async function calculateRevenueMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalRevenue: number;
  laborRevenue: number;
  partsRevenue: number;
  avgJobValue: number;
  jobCount: number;
}> {
  try {
    const { data, error } = await supabase
      .from('job_metrics_view')
      .select('total_amount, labor_total, parts_total')
      .eq('job_stage', 'Complete')
      .gte('completed_date', startDate.toISOString())
      .lte('completed_date', endDate.toISOString());

    if (error) throw error;

    const totalRevenue = data?.reduce((sum, j) => sum + (j.total_amount || 0), 0) || 0;
    const laborRevenue = data?.reduce((sum, j) => sum + (j.labor_total || 0), 0) || 0;
    const partsRevenue = data?.reduce((sum, j) => sum + (j.parts_total || 0), 0) || 0;
    const jobCount = data?.length || 0;

    return {
      totalRevenue,
      laborRevenue,
      partsRevenue,
      avgJobValue: jobCount > 0 ? totalRevenue / jobCount : 0,
      jobCount
    };
  } catch (error) {
    console.error('Error calculating revenue metrics:', error);
    return {
      totalRevenue: 0,
      laborRevenue: 0,
      partsRevenue: 0,
      avgJobValue: 0,
      jobCount: 0
    };
  }
}

export async function cacheAnalytics(
  metricName: string,
  period: string,
  periodStart: Date,
  periodEnd: Date,
  data: any,
  expiresInHours: number = 24
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    await supabase
      .from('analytics_cache')
      .upsert({
        metric_name: metricName,
        period,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        data: data,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'metric_name,period,period_start'
      });
  } catch (error) {
    console.error('Error caching analytics:', error);
  }
}

export async function getCachedAnalytics(
  metricName: string,
  period: string,
  periodStart: Date
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('analytics_cache')
      .select('data, expires_at')
      .eq('metric_name', metricName)
      .eq('period', period)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    return data.data;
  } catch (error) {
    return null;
  }
}
```

---

## 🔧 Implementation Steps

### Step 1: Database Setup
```bash
# Run SQL in Supabase SQL Editor:
# 1. Create analytics_cache table
# 2. Create performance_goals table
# 3. Create report_templates table
# 4. Create all views (job_metrics_view, parts_roi_view, monthly_revenue_summary)
```

### Step 2: Install Components
```bash
# Install chart library
npm install recharts

# Or use the simple built-in charts in the components above
```

### Step 3: Add Routes
```typescript
// src/App.tsx
import ExecutiveDashboard from './components/analytics/ExecutiveDashboard';
import FCCAnalytics from './components/analytics/FCCAnalytics';
import PartsROI from './components/analytics/PartsROI';

// Add routes:
<Route path="/analytics" element={<ExecutiveDashboard />} />
<Route path="/analytics/fcc" element={<FCCAnalytics />} />
<Route path="/analytics/parts-roi" element={<PartsROI />} />
```

### Step 4: Add Navigation Links
```typescript
// Update your navigation menu
<NavLink to="/analytics">Analytics</NavLink>
```

---

## 🧪 Testing

### Test Executive Dashboard
1. Complete several jobs with payments
2. Open dashboard
3. Verify metrics display correctly
4. Change period (week/month/year)
5. Check calculations match manual count
6. Verify chart displays revenue trend

### Test FCC Analytics
1. Complete mix of FCC and multi-visit jobs
2. Create some callbacks
3. Open FCC Analytics
4. Verify FCC rate calculates correctly
5. Check callback breakdown
6. Verify recommendations appear

### Test Parts ROI
1. Use parts on jobs
2. Ensure parts have cost/sell price
3. Open Parts ROI dashboard
4. Verify profit calculations
5. Sort by different columns
6. Filter by category
7. Check dead stock identification

---

## ✅ Success Criteria

### Stage 9 is complete when:
- ✅ Executive dashboard loads with correct metrics
- ✅ FCC rate calculates accurately
- ✅ Revenue analytics show breakdowns
- ✅ Parts ROI analysis displays profitability
- ✅ Charts render properly
- ✅ Period filters work (week/month/year)
- ✅ Sorting and filtering functional
- ✅ All views query efficiently (<2 seconds)
- ✅ Mobile responsive layouts
- ✅ No console errors

### Key Performance Targets:
- Dashboard load time: <2 seconds
- Analytics queries: <1 second
- Chart rendering: <500ms
- Data accuracy: 100%
- Mobile usability: Full functionality

---

## 🚀 What's Next?

After Stage 9, you'll have comprehensive business intelligence! Stage 10 will add:
- **Mobile Optimization & PWA**
- Progressive Web App setup
- Offline capability
- Install prompts
- Push notifications
- Camera integration
- Touch-optimized UI

---

## 📚 Resources

- Recharts Documentation: https://recharts.org/
- PostgreSQL Views: https://www.postgresql.org/docs/current/sql-createview.html
- Analytics Best Practices: https://www.klipfolio.com/resources/articles/dashboard-best-practices

---

**Stage 9 delivers powerful business intelligence that helps you understand your performance, identify opportunities, and make data-driven decisions! 📊**
