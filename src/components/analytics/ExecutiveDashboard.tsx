import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp, DollarSign, Wrench, Package,
  Clock, AlertCircle, CheckCircle
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

interface ChartDataPoint {
  date: string;
  revenue: number;
}

export default function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    loadDashboardMetrics();
  }, [period]);

  const loadDashboardMetrics = async () => {
    setLoading(true);
    try {
      // Calculate date ranges
      const now = new Date();
      let currentStart: Date, previousStart: Date, previousEnd: Date;

      if (period === 'week') {
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousStart = new Date(previousEnd);
        previousStart.setDate(previousEnd.getDate() - 7);
      } else if (period === 'month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else { // year
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
      }

      // Load current period metrics
      const { data: currentData, error: currentError } = await supabase
        .from('job_metrics_view')
        .select('*')
        .gte('completed_at', currentStart.toISOString())
        .lte('completed_at', now.toISOString());

      if (currentError) throw currentError;

      // Load previous period metrics
      const { data: previousData, error: previousError } = await supabase
        .from('job_metrics_view')
        .select('*')
        .gte('completed_at', previousStart.toISOString())
        .lte('completed_at', previousEnd.toISOString());

      if (previousError) throw previousError;

      // Calculate metrics
      const calculateMetrics = (data: any[]) => ({
        revenue: data.reduce((sum, j) => sum + (j.invoice_total || 0), 0),
        jobs: data.length,
        fcc_rate: data.length > 0
          ? (data.filter(j => j.is_fcc).length / data.length) * 100
          : 0,
        avg_job_value: data.length > 0
          ? data.reduce((sum, j) => sum + (j.invoice_total || 0), 0) / data.length
          : 0
      });

      const current = calculateMetrics(currentData || []);
      const previous = calculateMetrics(previousData || []);

      // Get outstanding balance
      const { data: outstandingData } = await supabase
        .from('jobs')
        .select('invoice_total, amount_paid')
        .neq('payment_status', 'Paid');

      const outstanding = outstandingData?.reduce(
        (sum, j) => sum + ((j.invoice_total || 0) - (j.amount_paid || 0)), 0
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
        (sum, p) => sum + ((p.in_stock || 0) * (p.avg_cost || 0)), 0
      ) || 0;

      const lowStock = partsData?.filter(
        p => (p.in_stock || 0) <= (p.min_stock || 0)
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
        .select('completed_at, invoice_total')
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;

      // Group by day
      const dailyRevenue: Record<string, number> = {};
      data?.forEach(job => {
        if (job.completed_at) {
          const date = new Date(job.completed_at).toLocaleDateString();
          dailyRevenue[date] = (dailyRevenue[date] || 0) + (job.invoice_total || 0);
        }
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
    <div className="space-y-6 p-6">
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
function SimpleLineChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const chartHeight = 200;

  return (
    <div className="relative" style={{ height: chartHeight + 40 }}>
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
        {data.length > 1 && (
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
        )}

        {/* Data points */}
        {data.map((d, i) => {
          const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
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
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500" style={{ width: '60px' }}>
        <span>${(maxRevenue).toFixed(0)}</span>
        <span>${(maxRevenue * 0.75).toFixed(0)}</span>
        <span>${(maxRevenue * 0.5).toFixed(0)}</span>
        <span>${(maxRevenue * 0.25).toFixed(0)}</span>
        <span>$0</span>
      </div>
    </div>
  );
}
