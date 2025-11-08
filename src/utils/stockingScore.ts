import { supabase } from '../lib/supabase';

export interface StockingScoreResult {
  score: number;
  breakdown: {
    frequency: number;
    recency: number;
    fccImpact: number;
    cost: number;
  };
  recommendation: string;
}

/**
 * Calculate stocking score for a part (0-10 scale)
 * Based on frequency of use, recency, FCC impact, and cost efficiency
 */
export async function calculateStockingScore(
  partNumber: string
): Promise<StockingScoreResult> {
  try {
    // Get part usage stats
    const { data: part, error: partError } = await supabase
      .from('parts_master')
      .select('*')
      .eq('part_number', partNumber)
      .single();

    if (partError || !part) {
      return {
        score: 0,
        breakdown: { frequency: 0, recency: 0, fccImpact: 0, cost: 0 },
        recommendation: 'No usage data available'
      };
    }

    const today = new Date();
    const firstUsed = part.first_used_date ? new Date(part.first_used_date) : null;
    const lastUsed = part.last_used_date ? new Date(part.last_used_date) : null;

    // Component 1: Frequency Score (0-4 points)
    let frequencyScore = 0;
    if (firstUsed && part.times_used > 0) {
      const daysSinceFirst = Math.max(
        (today.getTime() - firstUsed.getTime()) / (1000 * 60 * 60 * 24),
        1
      );
      const usesPerMonth = (part.times_used / daysSinceFirst) * 30;

      if (usesPerMonth >= 4) frequencyScore = 4; // Weekly+
      else if (usesPerMonth >= 2) frequencyScore = 3; // 2x/month
      else if (usesPerMonth >= 1) frequencyScore = 2; // Monthly
      else if (usesPerMonth >= 0.5) frequencyScore = 1; // Bimonthly
    }

    // Component 2: Recency Score (0-2 points)
    let recencyScore = 0;
    if (lastUsed) {
      const daysSinceLastUse =
        (today.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastUse < 7) recencyScore = 2;
      else if (daysSinceLastUse < 30) recencyScore = 1.5;
      else if (daysSinceLastUse < 90) recencyScore = 1;
    }

    // Component 3: FCC Impact (0-3 points)
    // Check how many callbacks would have been prevented if part was stocked
    const { data: callbackJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('is_callback', true);

    // Count jobs that needed this part
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

    const fccImpact = Math.min(callbackCount / 2, 3);

    // Component 4: Cost Efficiency (0-1 point)
    const costScore = (part.avg_cost || 0) < 50 ? 1 : 0.5;

    // Calculate total
    const totalScore = frequencyScore + recencyScore + fccImpact + costScore;

    // Generate recommendation
    let recommendation: string;
    if (totalScore >= 9) recommendation = 'Critical - Stock immediately';
    else if (totalScore >= 7) recommendation = 'High value - Stock soon';
    else if (totalScore >= 5) recommendation = 'Moderate - Consider stocking';
    else if (totalScore >= 3) recommendation = 'Low priority - Order as needed';
    else recommendation = "Rarely used - Don't stock";

    return {
      score: parseFloat(totalScore.toFixed(2)),
      breakdown: {
        frequency: parseFloat(frequencyScore.toFixed(2)),
        recency: parseFloat(recencyScore.toFixed(2)),
        fccImpact: parseFloat(fccImpact.toFixed(2)),
        cost: costScore
      },
      recommendation
    };
  } catch (error) {
    console.error('Error calculating stocking score:', error);
    return {
      score: 0,
      breakdown: { frequency: 0, recency: 0, fccImpact: 0, cost: 0 },
      recommendation: 'Error calculating score'
    };
  }
}

/**
 * Batch update stocking scores for all parts
 */
export async function updateAllStockingScores(): Promise<number> {
  try {
    const { data: parts, error } = await supabase
      .from('parts_master')
      .select('part_number');

    if (error) throw error;

    let updated = 0;
    for (const part of parts || []) {
      const { score } = await calculateStockingScore(part.part_number);

      await supabase
        .from('parts_master')
        .update({ stocking_score: score })
        .eq('part_number', part.part_number);

      updated++;
    }

    console.log(`Updated stocking scores for ${updated} parts`);
    return updated;
  } catch (error) {
    console.error('Error updating stocking scores:', error);
    throw error;
  }
}
