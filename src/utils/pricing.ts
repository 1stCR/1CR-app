/**
 * Pricing utilities for quotes and invoices
 */

export interface LineItem {
  id: string;
  type: 'service_fee' | 'labor' | 'part';
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  part_number?: string;
  part_cost?: number;
  markup_percent?: number;
  labor_hours?: number;
  labor_rate?: number;
}

export interface PricingCalculation {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  laborTotal: number;
  partsTotal: number;
  serviceFeeTotal: number;
}

/**
 * Calculate totals from line items
 */
export function calculatePricing(
  lineItems: LineItem[],
  discountType: 'percent' | 'amount' | null,
  discountValue: number,
  taxRate: number
): PricingCalculation {
  // Calculate subtotals by category
  const serviceFeeTotal = lineItems
    .filter(item => item.type === 'service_fee')
    .reduce((sum, item) => sum + item.subtotal, 0);

  const laborTotal = lineItems
    .filter(item => item.type === 'labor')
    .reduce((sum, item) => sum + item.subtotal, 0);

  const partsTotal = lineItems
    .filter(item => item.type === 'part')
    .reduce((sum, item) => sum + item.subtotal, 0);

  const subtotal = serviceFeeTotal + laborTotal + partsTotal;

  // Calculate discount
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (subtotal * discountValue) / 100;
  } else if (discountType === 'amount') {
    discountAmount = discountValue;
  }

  // Ensure discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  // Calculate taxable amount
  const taxableAmount = subtotal - discountAmount;

  // Calculate tax
  const taxAmount = (taxableAmount * taxRate) / 100;

  // Calculate total
  const total = taxableAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
    laborTotal,
    partsTotal,
    serviceFeeTotal
  };
}

/**
 * Determine appliance tier and labor rate
 */
export function getApplianceTier(brand: string): {
  tier: 'Standard' | 'Premium' | 'Luxury';
  multiplier: number;
} {
  const brandUpper = brand.toUpperCase();

  const LUXURY_BRANDS = [
    'SUB-ZERO', 'WOLF', 'MIELE', 'THERMADOR', 'VIKING',
    'GAGGENAU', 'LIEBHERR', 'BERTAZZONI', 'SMEG'
  ];

  const PREMIUM_BRANDS = [
    'KITCHENAID', 'BOSCH', 'SAMSUNG', 'LG',
    'ELECTROLUX', 'FISHER & PAYKEL', 'JENN-AIR'
  ];

  if (LUXURY_BRANDS.some(b => brandUpper.includes(b))) {
    return { tier: 'Luxury', multiplier: 1.35 };
  }

  if (PREMIUM_BRANDS.some(b => brandUpper.includes(b))) {
    return { tier: 'Premium', multiplier: 1.25 };
  }

  return { tier: 'Standard', multiplier: 1.0 };
}

/**
 * Calculate labor rate based on appliance tier
 */
export function getLaborRate(baseRate: number, applianceTier: string): number {
  switch (applianceTier) {
    case 'Luxury':
      return baseRate * 1.35;
    case 'Premium':
      return baseRate * 1.25;
    default:
      return baseRate;
  }
}

/**
 * Apply callback pricing rules
 */
export function applyCallbackPricing(
  lineItems: LineItem[],
  callbackReason: string,
  previousPaymentAmount: number
): {
  adjustedItems: LineItem[];
  creditAmount: number;
  discountPercent: number;
  waiveServiceFee: boolean;
} {
  let adjustedItems = [...lineItems];
  let creditAmount = 0;
  let discountPercent = 0;
  let waiveServiceFee = false;

  if (callbackReason === 'Same Issue - Our Fault') {
    // Full warranty - no charges
    creditAmount = previousPaymentAmount;
    waiveServiceFee = true;
    discountPercent = 100;

    adjustedItems = adjustedItems.map(item => ({
      ...item,
      unit_price: 0,
      subtotal: 0
    }));

    return { adjustedItems, creditAmount, discountPercent, waiveServiceFee };
  }

  if (callbackReason === 'New Issue') {
    // Courtesy discount
    waiveServiceFee = true;
    discountPercent = 10;

    // Remove service fee items
    adjustedItems = adjustedItems.filter(item => item.type !== 'service_fee');

    return { adjustedItems, creditAmount, discountPercent, waiveServiceFee };
  }

  // Customer Error or Wear & Tear - full charges
  return { adjustedItems, creditAmount, discountPercent, waiveServiceFee };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Generate line item ID
 */
export function generateLineItemId(): string {
  return `LI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
