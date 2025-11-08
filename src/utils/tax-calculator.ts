/**
 * Tax calculation utilities
 */

export interface TaxBreakdown {
  subtotal: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Calculate tax for Wyoming (state tax only)
 */
export function calculateWyomingTax(
  subtotal: number,
  discountAmount: number = 0
): TaxBreakdown {
  // Wyoming has no state sales tax (0%)
  // However, counties and municipalities can impose up to 4% local tax
  // Buffalo, Wyoming (Johnson County) typically has ~4% local option tax

  const taxRate = 4.00; // 4% local tax
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  return {
    subtotal,
    taxableAmount,
    taxRate,
    taxAmount,
    total
  };
}

/**
 * Get tax rate for location (future expansion)
 */
export function getTaxRate(state: string, county?: string, city?: string): number {
  // For now, return Wyoming rate
  // Future: expand for other locations
  if (state.toLowerCase() === 'wyoming' || state.toLowerCase() === 'wy') {
    return 4.00;
  }

  return 0;
}
