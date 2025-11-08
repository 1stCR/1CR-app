import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Package, DollarSign, TrendingUp, AlertCircle,
  ArrowLeft, ArrowUpDown, Search
} from 'lucide-react';

interface PartROI {
  part_number: string;
  description: string;
  category: string;
  brand: string;
  in_stock: number;
  min_stock: number;
  times_used: number;
  avg_cost: number;
  sell_price: number;
  markup_percent: number;
  profit_per_unit: number;
  margin_percent: number;
  inventory_value: number;
  potential_revenue: number;
  turnover_rate: number;
  lifetime_profit: number;
  days_since_last_use: number | null;
  fcc_jobs_count: number;
  stocking_score: number;
}

interface SummaryMetrics {
  total_inventory_value: number;
  total_potential_revenue: number;
  avg_margin_percent: number;
  total_parts_count: number;
  high_performers_count: number;
  low_performers_count: number;
  dead_stock_count: number;
}

type SortField = 'profit_per_unit' | 'margin_percent' | 'lifetime_profit' | 'turnover_rate' | 'times_used' | 'stocking_score';
type SortDirection = 'asc' | 'desc';

export default function PartsROI() {
  const [parts, setParts] = useState<PartROI[]>([]);
  const [filteredParts, setFilteredParts] = useState<PartROI[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('lifetime_profit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'high' | 'low' | 'dead'>('all');

  useEffect(() => {
    loadPartsROI();
  }, []);

  useEffect(() => {
    filterAndSortParts();
  }, [parts, searchTerm, categoryFilter, sortField, sortDirection, performanceFilter]);

  const loadPartsROI = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parts_roi_view')
        .select('*');

      if (error) throw error;

      setParts(data || []);

      // Calculate summary metrics
      if (data && data.length > 0) {
        const totalInventoryValue = data.reduce((sum, p) => sum + (p.inventory_value || 0), 0);
        const totalPotentialRevenue = data.reduce((sum, p) => sum + (p.potential_revenue || 0), 0);
        const avgMargin = data.reduce((sum, p) => sum + (p.margin_percent || 0), 0) / data.length;

        // Performance classifications
        const highPerformers = data.filter(p =>
          (p.times_used || 0) >= 5 && (p.margin_percent || 0) >= 30 && (p.turnover_rate || 0) >= 0.3
        );
        const lowPerformers = data.filter(p =>
          (p.times_used || 0) < 5 && (p.in_stock || 0) > 0
        );
        const deadStock = data.filter(p =>
          (p.times_used || 0) === 0 && (p.in_stock || 0) > 0 && (!p.days_since_last_use || p.days_since_last_use > 180)
        );

        setSummary({
          total_inventory_value: totalInventoryValue,
          total_potential_revenue: totalPotentialRevenue,
          avg_margin_percent: avgMargin,
          total_parts_count: data.length,
          high_performers_count: highPerformers.length,
          low_performers_count: lowPerformers.length,
          dead_stock_count: deadStock.length
        });
      }

    } catch (error) {
      console.error('Error loading parts ROI:', error);
      alert('Failed to load parts ROI data');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortParts = () => {
    let filtered = [...parts];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.part_number.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Performance filter
    if (performanceFilter === 'high') {
      filtered = filtered.filter(p =>
        (p.times_used || 0) >= 5 && (p.margin_percent || 0) >= 30 && (p.turnover_rate || 0) >= 0.3
      );
    } else if (performanceFilter === 'low') {
      filtered = filtered.filter(p =>
        (p.times_used || 0) < 5 && (p.in_stock || 0) > 0
      );
    } else if (performanceFilter === 'dead') {
      filtered = filtered.filter(p =>
        (p.times_used || 0) === 0 && (p.in_stock || 0) > 0 && (!p.days_since_last_use || p.days_since_last_use > 180)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredParts(filtered);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getCategories = () => {
    const categories = new Set(parts.map(p => p.category).filter(Boolean));
    return Array.from(categories).sort();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">Loading parts ROI analysis...</div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold">Parts ROI Analysis</h1>
            <p className="text-gray-600 mt-1">Optimize inventory investment and profitability</p>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Inventory Value"
            value={`$${summary.total_inventory_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle={`${summary.total_parts_count} parts`}
            icon={<Package className="w-6 h-6" />}
            color="blue"
          />

          <SummaryCard
            title="Potential Revenue"
            value={`$${summary.total_potential_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle="If all stock sold"
            icon={<DollarSign className="w-6 h-6" />}
            color="green"
          />

          <SummaryCard
            title="Avg Margin"
            value={`${summary.avg_margin_percent.toFixed(1)}%`}
            subtitle="Across all parts"
            icon={<TrendingUp className="w-6 h-6" />}
            color="purple"
          />

          <SummaryCard
            title="Dead Stock"
            value={summary.dead_stock_count}
            subtitle={`${summary.high_performers_count} high performers`}
            icon={<AlertCircle className="w-6 h-6" />}
            color="red"
            alert={summary.dead_stock_count > 5}
          />
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {getCategories().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Performance Filter */}
          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Parts</option>
            <option value="high">High Performers</option>
            <option value="low">Low Performers</option>
            <option value="dead">Dead Stock</option>
          </select>

          {/* Results Count */}
          <div className="flex items-center justify-center text-sm text-gray-600">
            Showing {filteredParts.length} of {parts.length} parts
          </div>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Part Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('times_used')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Uses
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('profit_per_unit')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Profit/Unit
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('margin_percent')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Margin %
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('lifetime_profit')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Lifetime Profit
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('turnover_rate')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Turnover
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('stocking_score')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Score
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredParts.length > 0 ? (
                filteredParts.map((part) => (
                  <tr key={part.part_number} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {part.part_number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{part.description || 'N/A'}</div>
                      <div className="text-xs text-gray-500">
                        {part.brand && `${part.brand} • `}
                        {part.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={part.in_stock <= part.min_stock ? 'text-red-600 font-medium' : ''}>
                        {part.in_stock}
                      </span>
                      <span className="text-xs text-gray-500"> / {part.min_stock}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {part.times_used}
                      {part.fcc_jobs_count > 0 && (
                        <div className="text-xs text-green-600">
                          {part.fcc_jobs_count} FCC
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      ${part.profit_per_unit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${
                        part.margin_percent >= 50 ? 'text-green-600' :
                        part.margin_percent >= 30 ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {part.margin_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      ${part.lifetime_profit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {part.turnover_rate.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <PerformanceBadge score={part.stocking_score} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No parts found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {parts
              .filter(p => (p.times_used || 0) >= 5)
              .sort((a, b) => (b.lifetime_profit || 0) - (a.lifetime_profit || 0))
              .slice(0, 5)
              .map((part, index) => (
                <div key={part.part_number} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-green-600">#{index + 1}</div>
                    <div>
                      <div className="font-medium text-sm">{part.part_number}</div>
                      <div className="text-xs text-gray-600">{part.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">${part.lifetime_profit.toFixed(0)}</div>
                    <div className="text-xs text-gray-600">{part.times_used} uses</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Action Items
          </h3>
          <div className="space-y-3">
            {summary && summary.dead_stock_count > 0 && (
              <ActionItem
                type="warning"
                title="Dead Stock Detected"
                description={`${summary.dead_stock_count} parts haven't been used in 180+ days. Consider liquidation.`}
                action="View Dead Stock"
                onAction={() => setPerformanceFilter('dead')}
              />
            )}
            {summary && summary.low_performers_count > 10 && (
              <ActionItem
                type="info"
                title="Low Turnover Parts"
                description={`${summary.low_performers_count} parts have low usage. Review stocking levels.`}
                action="View Low Performers"
                onAction={() => setPerformanceFilter('low')}
              />
            )}
            {parts.filter(p => p.in_stock <= p.min_stock && p.times_used >= 3).length > 0 && (
              <ActionItem
                type="critical"
                title="High-Use Parts Low Stock"
                description={`${parts.filter(p => p.in_stock <= p.min_stock && p.times_used >= 3).length} frequently used parts are at or below minimum stock.`}
                action="Reorder Now"
                onAction={() => {}}
              />
            )}
            {parts.filter(p => p.margin_percent < 20 && p.times_used > 0).length > 0 && (
              <ActionItem
                type="warning"
                title="Low Margin Parts"
                description={`${parts.filter(p => p.margin_percent < 20 && p.times_used > 0).length} parts have margins below 20%. Review pricing.`}
                action="Review Pricing"
                onAction={() => {}}
              />
            )}
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">Parts ROI Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
          <ul className="space-y-2">
            <li>• Stock parts with high turnover and good margins</li>
            <li>• Review dead stock quarterly and liquidate if necessary</li>
            <li>• Maintain 30-50% minimum margin on all parts</li>
            <li>• Track FCC contribution when making stocking decisions</li>
          </ul>
          <ul className="space-y-2">
            <li>• Use stocking score to prioritize inventory investments</li>
            <li>• Monitor parts that contribute to first call complete</li>
            <li>• Adjust pricing on low-margin, high-use parts</li>
            <li>• Consider consignment for slow-moving specialty parts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red';
  alert?: boolean;
}

function SummaryCard({ title, value, subtitle, icon, color, alert }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${alert ? 'border-2 border-red-300' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-gray-600">{title}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function PerformanceBadge({ score }: { score: number }) {
  let color = 'bg-gray-100 text-gray-600';
  let label = 'N/A';

  if (score >= 80) {
    color = 'bg-green-100 text-green-700';
    label = 'Excellent';
  } else if (score >= 60) {
    color = 'bg-blue-100 text-blue-700';
    label = 'Good';
  } else if (score >= 40) {
    color = 'bg-yellow-100 text-yellow-700';
    label = 'Fair';
  } else if (score >= 20) {
    color = 'bg-orange-100 text-orange-700';
    label = 'Poor';
  } else if (score > 0) {
    color = 'bg-red-100 text-red-700';
    label = 'Critical';
  }

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </div>
  );
}

interface ActionItemProps {
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}

function ActionItem({ type, title, description, action, onAction }: ActionItemProps) {
  const config = {
    critical: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const { bgColor, borderColor, iconColor, buttonColor } = config[type];

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className={`w-4 h-4 ${iconColor}`} />
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>
          <p className="text-sm text-gray-700 mb-3">{description}</p>
          <button
            onClick={onAction}
            className={`text-xs px-3 py-1 rounded text-white ${buttonColor} transition`}
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}
