import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle, XCircle, AlertCircle, TrendingUp,
  TrendingDown, Wrench, ArrowLeft
} from 'lucide-react';

interface FCCMetrics {
  total_jobs: number;
  fcc_jobs: number;
  callback_jobs: number;
  fcc_rate: number;
  callback_rate: number;
  avg_visits_per_job: number;

  // Previous period for comparison
  fcc_rate_previous: number;
  callback_rate_previous: number;
}

interface CallbackReason {
  reason: string;
  count: number;
  percentage: number;
}

interface RecentCallback {
  job_id: string;
  customer_name: string;
  appliance_type: string;
  callback_reason: string;
  completed_at: string;
  visit_count: number;
}

interface TrendDataPoint {
  date: string;
  fcc_rate: number;
  callback_rate: number;
}

export default function FCCAnalytics() {
  const [metrics, setMetrics] = useState<FCCMetrics | null>(null);
  const [callbackReasons, setCallbackReasons] = useState<CallbackReason[]>([]);
  const [recentCallbacks, setRecentCallbacks] = useState<RecentCallback[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadFCCAnalytics();
  }, [period]);

  const loadFCCAnalytics = async () => {
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
      } else if (period === 'quarter') {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        currentStart = new Date(now.getFullYear(), quarterStart, 1);
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousStart = new Date(now.getFullYear(), quarterStart - 3, 1);
      } else { // year
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
      }

      // Load current period data
      const { data: currentData, error: currentError } = await supabase
        .from('job_metrics_view')
        .select('*')
        .gte('completed_at', currentStart.toISOString())
        .lte('completed_at', now.toISOString())
        .eq('job_stage', 'Complete');

      if (currentError) throw currentError;

      // Load previous period data
      const { data: previousData, error: previousError } = await supabase
        .from('job_metrics_view')
        .select('*')
        .gte('completed_at', previousStart.toISOString())
        .lte('completed_at', previousEnd.toISOString())
        .eq('job_stage', 'Complete');

      if (previousError) throw previousError;

      // Calculate metrics
      const calculateMetrics = (data: any[]) => {
        const totalJobs = data.length;
        const fccJobs = data.filter(j => j.is_fcc).length;
        const callbackJobs = data.filter(j => j.is_callback).length;
        const totalVisits = data.reduce((sum, j) => sum + (j.visit_count || 1), 0);

        return {
          total_jobs: totalJobs,
          fcc_jobs: fccJobs,
          callback_jobs: callbackJobs,
          fcc_rate: totalJobs > 0 ? (fccJobs / totalJobs) * 100 : 0,
          callback_rate: totalJobs > 0 ? (callbackJobs / totalJobs) * 100 : 0,
          avg_visits_per_job: totalJobs > 0 ? totalVisits / totalJobs : 0
        };
      };

      const current = calculateMetrics(currentData || []);
      const previous = calculateMetrics(previousData || []);

      setMetrics({
        ...current,
        fcc_rate_previous: previous.fcc_rate,
        callback_rate_previous: previous.callback_rate
      });

      // Analyze callback reasons
      const reasonCounts: Record<string, number> = {};
      const callbacksWithReasons = (currentData || []).filter(j => j.is_callback && j.callback_reason);

      callbacksWithReasons.forEach(job => {
        const reason = job.callback_reason || 'Unknown';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      const totalCallbacks = callbacksWithReasons.length;
      const reasons: CallbackReason[] = Object.entries(reasonCounts)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: totalCallbacks > 0 ? (count / totalCallbacks) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      setCallbackReasons(reasons);

      // Get recent callbacks
      const { data: recentCallbacksData } = await supabase
        .from('job_metrics_view')
        .select('job_id, customer_name, appliance_type, callback_reason, completed_at, visit_count')
        .eq('is_callback', true)
        .gte('completed_at', currentStart.toISOString())
        .order('completed_at', { ascending: false })
        .limit(10);

      setRecentCallbacks(recentCallbacksData || []);

      // Load trend data
      await loadTrendData(currentStart);

    } catch (error) {
      console.error('Error loading FCC analytics:', error);
      alert('Failed to load FCC analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async (startDate: Date) => {
    try {
      const { data, error } = await supabase
        .from('job_metrics_view')
        .select('completed_at, is_fcc, is_callback')
        .gte('completed_at', startDate.toISOString())
        .eq('job_stage', 'Complete')
        .order('completed_at', { ascending: true });

      if (error) throw error;

      // Group by week
      const weeklyData: Record<string, { total: number; fcc: number; callbacks: number }> = {};

      data?.forEach(job => {
        if (job.completed_at) {
          const date = new Date(job.completed_at);
          const weekStart = getWeekStart(date);
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { total: 0, fcc: 0, callbacks: 0 };
          }

          weeklyData[weekKey].total++;
          if (job.is_fcc) weeklyData[weekKey].fcc++;
          if (job.is_callback) weeklyData[weekKey].callbacks++;
        }
      });

      const trendPoints: TrendDataPoint[] = Object.entries(weeklyData)
        .map(([date, stats]) => ({
          date,
          fcc_rate: stats.total > 0 ? (stats.fcc / stats.total) * 100 : 0,
          callback_rate: stats.total > 0 ? (stats.callbacks / stats.total) * 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setTrendData(trendPoints);

    } catch (error) {
      console.error('Error loading trend data:', error);
    }
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
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
        <div className="text-gray-500">Loading FCC analytics...</div>
      </div>
    );
  }

  if (!metrics) return null;

  const fccChange = calculateChange(metrics.fcc_rate, metrics.fcc_rate_previous);
  const callbackChange = calculateChange(metrics.callback_rate, metrics.callback_rate_previous);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">First Call Complete Analysis</h1>
            <p className="text-gray-600 mt-1">Track and improve service efficiency</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
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

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FCC Rate */}
        <MetricCard
          title="First Call Complete Rate"
          value={`${metrics.fcc_rate.toFixed(1)}%`}
          subtitle={`${metrics.fcc_jobs} of ${metrics.total_jobs} jobs`}
          change={fccChange}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          isGood={fccChange.direction === 'up'}
        />

        {/* Callback Rate */}
        <MetricCard
          title="Callback Rate"
          value={`${metrics.callback_rate.toFixed(1)}%`}
          subtitle={`${metrics.callback_jobs} callbacks`}
          change={callbackChange}
          icon={<XCircle className="w-6 h-6" />}
          color="red"
          isGood={callbackChange.direction === 'down'}
        />

        {/* Avg Visits */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{metrics.avg_visits_per_job.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Avg Visits Per Job</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Target: 1.0 visits per job
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">FCC Rate Trend</h3>
        {trendData.length > 0 ? (
          <FCCTrendChart data={trendData} />
        ) : (
          <div className="text-center text-gray-500 py-12">
            No trend data available for selected period
          </div>
        )}
      </div>

      {/* Callback Reasons Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Callback Reasons Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Callback Reasons</h3>
          {callbackReasons.length > 0 ? (
            <div className="space-y-3">
              {callbackReasons.map((reason, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{reason.reason}</span>
                    <span className="text-sm text-gray-600">
                      {reason.count} ({reason.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${reason.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No callback data available
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <div className="space-y-4">
            {metrics.fcc_rate < 70 && (
              <RecommendationItem
                type="critical"
                message="FCC rate is below 70%. Review diagnostic procedures and parts stocking."
              />
            )}
            {metrics.fcc_rate >= 70 && metrics.fcc_rate < 85 && (
              <RecommendationItem
                type="warning"
                message="FCC rate is good but can be improved. Focus on the top callback reasons."
              />
            )}
            {metrics.fcc_rate >= 85 && (
              <RecommendationItem
                type="success"
                message="Excellent FCC rate! Maintain current procedures and training."
              />
            )}
            {metrics.callback_rate > 20 && (
              <RecommendationItem
                type="critical"
                message="High callback rate detected. Implement additional quality checks."
              />
            )}
            {callbackReasons[0] && callbackReasons[0].percentage > 40 && (
              <RecommendationItem
                type="warning"
                message={`Most callbacks are due to "${callbackReasons[0].reason}". Create targeted training for this issue.`}
              />
            )}
            {metrics.avg_visits_per_job > 1.3 && (
              <RecommendationItem
                type="warning"
                message="Average visits per job is high. Review parts availability and diagnostic accuracy."
              />
            )}
          </div>
        </div>
      </div>

      {/* Recent Callbacks Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Callbacks</h3>
        {recentCallbacks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appliance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentCallbacks.map((callback) => (
                  <tr key={callback.job_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {callback.job_id}
                    </td>
                    <td className="px-4 py-3 text-sm">{callback.customer_name}</td>
                    <td className="px-4 py-3 text-sm">{callback.appliance_type}</td>
                    <td className="px-4 py-3 text-sm">{callback.callback_reason || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{callback.visit_count}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(callback.completed_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            No recent callbacks
          </div>
        )}
      </div>

      {/* FCC Best Practices */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">FCC Best Practices</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Stock high-use parts to avoid return visits</li>
          <li>• Ensure thorough diagnosis before ordering parts</li>
          <li>• Verify repairs before leaving job site</li>
          <li>• Document all issues found, even if unrelated to main problem</li>
          <li>• Follow up with customers 24-48 hours after service</li>
          <li>• Track and analyze callback patterns monthly</li>
        </ul>
      </div>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  change: { percent: number; direction: 'up' | 'down' | 'neutral' };
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue';
  isGood: boolean;
}

function MetricCard({ title, value, subtitle, change, icon, color, isGood }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change.direction !== 'neutral' && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isGood ? 'text-green-600' : 'text-red-600'
          }`}>
            {change.direction === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {change.percent.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

interface RecommendationItemProps {
  type: 'success' | 'warning' | 'critical';
  message: string;
}

function RecommendationItem({ type, message }: RecommendationItemProps) {
  const config = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      icon: <AlertCircle className="w-5 h-5 text-yellow-600" />
    },
    critical: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      icon: <XCircle className="w-5 h-5 text-red-600" />
    }
  };

  const { bgColor, borderColor, textColor, icon } = config[type];

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-3 flex gap-3`}>
      <div className="flex-shrink-0">{icon}</div>
      <p className={`text-sm ${textColor}`}>{message}</p>
    </div>
  );
}

// FCC Trend Chart Component
function FCCTrendChart({ data }: { data: TrendDataPoint[] }) {
  if (data.length === 0) return null;

  const chartHeight = 250;
  const maxRate = 100; // FCC rate is always 0-100%

  return (
    <div className="relative" style={{ height: chartHeight + 60 }}>
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

        {/* FCC Rate Line */}
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (d.fcc_rate / maxRate * 90);
              return `${x}%,${(y * chartHeight) / 100}`;
            }).join(' ')}
          />
        )}

        {/* Callback Rate Line */}
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke="#EF4444"
            strokeWidth="3"
            strokeDasharray="6,3"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (d.callback_rate / maxRate * 90);
              return `${x}%,${(y * chartHeight) / 100}`;
            }).join(' ')}
          />
        )}

        {/* Data points - FCC */}
        {data.map((d, i) => {
          const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
          const y = 100 - (d.fcc_rate / maxRate * 90);
          return (
            <circle
              key={`fcc-${i}`}
              cx={`${x}%`}
              cy={(y * chartHeight) / 100}
              r="4"
              fill="#10B981"
            />
          );
        })}

        {/* Data points - Callbacks */}
        {data.map((d, i) => {
          const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
          const y = 100 - (d.callback_rate / maxRate * 90);
          return (
            <circle
              key={`callback-${i}`}
              cx={`${x}%`}
              cy={(y * chartHeight) / 100}
              r="4"
              fill="#EF4444"
            />
          );
        })}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500" style={{ width: '50px' }}>
        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500"></div>
          <span>FCC Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-red-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #EF4444, #EF4444 6px, transparent 6px, transparent 9px)' }}></div>
          <span>Callback Rate</span>
        </div>
      </div>
    </div>
  );
}
