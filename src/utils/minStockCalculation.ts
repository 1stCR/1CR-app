import { supabase } from '../lib/supabase';

export interface MinStockRecommendation {
  value: number;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: {
    usageRate: string;
    leadTime: string;
    orderCycle: string;
    fccImpact: number;
    dataPoints: number;
  };
}

/**
 * Calculate recommended minimum stock level for a part
 * Based on usage patterns, supplier lead times, and FCC impact
 */
export async function calculateRecommendedMinStock(
  partNumber: string
): Promise<MinStockRecommendation> {
  try {
    // Get usage data for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: transactions, error: txError } = await supabase
      .from('parts_transactions')
      .select('quantity, date')
      .eq('part_number', partNumber)
      .eq('type', 'Used')
      .gte('date', ninetyDaysAgo.toISOString());

    if (txError) throw txError;

    const usageCount = transactions?.length || 0;

    // Get supplier lead time from pricing table
    const { data: pricing } = await supabase
      .from('parts_supplier_pricing')
      .select('lead_time_days')
      .eq('part_number', partNumber)
      .eq('preferred', true)
      .order('lead_time_days', { ascending: true })
      .limit(1)
      .maybeSingle();

    const leadTimeDays = pricing?.lead_time_days || 3;

    // Factor 1: Usage rate
    const avgUsesPerMonth = (usageCount / 90) * 30;

    // Factor 2: Order cycle (assume weekly ordering)
    const orderCycleDays = 7;

    // Factor 3: Calculate FCC impact
    const { data: callbackJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('is_callback', true);

    let callbackCount = 0;
    for (const job of callbackJobs || []) {
      const { data: partsUsed } = await supabase
        .from('parts_used')
        .select('id')
        .eq('job_id', job.id)
        .eq('part_number', partNumber);

      if (partsUsed && partsUsed.length > 0) {
        callbackCount++;
      }
    }

    const fccImpact = callbackCount;
    const fccMultiplier = fccImpact > 2 ? 1.5 : 1.2;

    // Calculate recommended stock
    const cyclePeriod = leadTimeDays + orderCycleDays;
    const expectedUsage = (avgUsesPerMonth / 30) * cyclePeriod;
    const safetyStock = expectedUsage * fccMultiplier;
    const recommended = Math.max(Math.ceil(safetyStock), 1);

    // Determine confidence
    let confidence: 'High' | 'Medium' | 'Low';
    if (usageCount > 10) confidence = 'High';
    else if (usageCount > 3) confidence = 'Medium';
    else confidence = 'Low';

    return {
      value: recommended,
      confidence,
      reasoning: {
        usageRate: `${avgUsesPerMonth.toFixed(1)}/mo`,
        leadTime: `${leadTimeDays}d`,
        orderCycle: `${orderCycleDays}d`,
        fccImpact: fccImpact,
        dataPoints: usageCount
      }
    };
  } catch (error) {
    console.error('Error calculating min stock:', error);
    return {
      value: 1,
      confidence: 'Low',
      reasoning: {
        usageRate: '0/mo',
        leadTime: '3d',
        orderCycle: '7d',
        fccImpact: 0,
        dataPoints: 0
      }
    };
  }
}

/**
 * Update minimum stock for a part
 */
export async function updatePartMinStock(
  partNumber: string,
  minStock: number,
  reason?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('parts_master')
      .update({
        min_stock_override: minStock,
        min_stock_override_reason: reason || 'Manually set'
      })
      .eq('part_number', partNumber);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating min stock:', error);
    throw error;
  }
}

/**
 * Batch calculate and update min stock for all parts with auto-replenish enabled
 */
export async function updateAllMinStockLevels(): Promise<number> {
  try {
    const { data: parts, error } = await supabase
      .from('parts_master')
      .select('part_number, min_stock_override')
      .eq('auto_replenish', true);

    if (error) throw error;

    let updated = 0;
    for (const part of parts || []) {
      // Skip if manually overridden
      if (part.min_stock_override) continue;

      const recommendation = await calculateRecommendedMinStock(part.part_number);

      if (recommendation.confidence === 'High' || recommendation.confidence === 'Medium') {
        await supabase
          .from('parts_master')
          .update({ min_stock: recommendation.value })
          .eq('part_number', part.part_number);

        updated++;
      }
    }

    console.log(`Updated min stock levels for ${updated} parts`);
    return updated;
  } catch (error) {
    console.error('Error updating min stock levels:', error);
    throw error;
  }
}
