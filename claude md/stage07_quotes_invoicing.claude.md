# Stage 7: Quotes & Invoicing

## 🎯 Objective
Build comprehensive quote generation, invoice creation, payment tracking, and financial management system with PDF generation and customer payment history.

## ✅ Prerequisites
- Stages 1-6 completed
- Job management functional
- Parts inventory working
- Customer data available
- AI integration operational (for labor adjustments)

## 🛠️ What We're Building

### Core Features:
1. **Quote Generation System**
   - Multi-line item quotes
   - Parts with markup
   - Labor with adjustable rates
   - Service fees
   - Discount application (% or $)
   - Tax calculation
   - Quote versioning
   - Quote expiration dates
   - Quote approval workflow

2. **Invoice Creation**
   - Convert quote to invoice
   - Manual invoice creation
   - Multiple payment support
   - Partial payments
   - Payment methods tracking
   - Payment date recording
   - Balance calculation

3. **Pricing Intelligence**
   - Appliance tier pricing (Standard/Premium/Luxury)
   - Labor rate adjustments per tier
   - Callback pricing rules
   - Warranty pricing
   - Courtesy discounts
   - Package pricing

4. **Payment Management**
   - Payment recording
   - Payment methods (Cash, Check, Card, Venmo, etc.)
   - Transaction reference numbers
   - Partial payment tracking
   - Payment history per customer
   - Outstanding balance tracking

5. **PDF Generation**
   - Professional quote PDFs
   - Invoice PDFs
   - Email-ready formats
   - Logo and branding
   - Terms and conditions
   - Payment instructions

6. **Financial Analytics**
   - Revenue tracking
   - Payment method breakdown
   - Outstanding receivables
   - Customer payment history
   - Average ticket size
   - Profit margin analysis

---

## 📊 Database Schema

### New Tables

**quotes**
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id VARCHAR(20) UNIQUE NOT NULL,
  job_id VARCHAR(20) REFERENCES jobs(job_id),
  customer_id VARCHAR(20) REFERENCES customers(customer_id),
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'Draft',
  
  -- Line items stored as JSONB for flexibility
  line_items JSONB NOT NULL,
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL,
  discount_type VARCHAR(10), -- 'percent' or 'amount'
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 8.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  -- Metadata
  notes TEXT,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Callback/warranty pricing
  is_callback BOOLEAN DEFAULT FALSE,
  callback_reason VARCHAR(50),
  warranty_work BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_quotes_job ON quotes(job_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at);
```

**invoices**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id VARCHAR(20) UNIQUE NOT NULL,
  job_id VARCHAR(20) REFERENCES jobs(job_id),
  customer_id VARCHAR(20) REFERENCES customers(customer_id),
  quote_id VARCHAR(20) REFERENCES quotes(quote_id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'Pending',
  
  -- Line items
  line_items JSONB NOT NULL,
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL,
  discount_type VARCHAR(10),
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 8.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  -- Payment tracking
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL,
  
  -- Dates
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Callback/warranty
  is_callback BOOLEAN DEFAULT FALSE,
  callback_reason VARCHAR(50),
  warranty_work BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_invoices_job ON invoices(job_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_balance ON invoices(balance_due);
```

**payments**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id VARCHAR(20) UNIQUE NOT NULL,
  invoice_id VARCHAR(20) REFERENCES invoices(invoice_id),
  customer_id VARCHAR(20) REFERENCES customers(customer_id),
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  
  -- Reference info
  transaction_reference VARCHAR(100),
  check_number VARCHAR(50),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_method ON payments(payment_method);
```

**labor_rates**
```sql
CREATE TABLE labor_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier VARCHAR(20) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default rates
INSERT INTO labor_rates (tier, hourly_rate, service_fee, active) VALUES
('Standard', 75.00, 85.00, true),
('Premium', 93.75, 85.00, true),
('Luxury', 101.25, 85.00, true);

CREATE INDEX idx_labor_rates_tier ON labor_rates(tier);
CREATE INDEX idx_labor_rates_active ON labor_rates(active);
```

**discount_presets**
```sql
CREATE TABLE discount_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL, -- 'percent' or 'amount'
  value DECIMAL(10,2) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed common discounts
INSERT INTO discount_presets (name, type, value, description, active) VALUES
('Senior Citizen', 'percent', 10.00, '10% discount for seniors 65+', true),
('Military', 'percent', 10.00, '10% discount for military personnel', true),
('Callback Courtesy', 'percent', 10.00, 'Courtesy discount for callbacks', true),
('Repeat Customer', 'percent', 5.00, '5% discount for repeat customers', true),
('Referral', 'amount', 25.00, '$25 off for referrals', true);

CREATE INDEX idx_discount_presets_active ON discount_presets(active);
```

---

## 📁 File Structure

Create these new files:

```
src/
├── lib/
│   └── pdf-generator.ts       # PDF generation with jsPDF
├── stores/
│   ├── quote-store.ts         # Quote management
│   ├── invoice-store.ts       # Invoice management
│   └── payment-store.ts       # Payment tracking
├── components/
│   ├── quotes/
│   │   ├── QuoteBuilder.tsx
│   │   ├── QuoteLineItems.tsx
│   │   ├── QuotePreview.tsx
│   │   └── QuoteList.tsx
│   ├── invoices/
│   │   ├── InvoiceGenerator.tsx
│   │   ├── InvoiceView.tsx
│   │   ├── InvoiceList.tsx
│   │   └── PaymentModal.tsx
│   └── payments/
│       ├── PaymentHistory.tsx
│       └── PaymentMethodSelector.tsx
└── utils/
    ├── pricing.ts             # Pricing calculations
    └── tax-calculator.ts      # Tax calculations
```

---

## 💻 Implementation

### Step 1: Pricing Utilities

**src/utils/pricing.ts**
```typescript
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
    waiveServiceFee = true; // Can be manually un-waived
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
```

**src/utils/tax-calculator.ts**
```typescript
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
```

---

### Step 2: Quote Store

**src/stores/quote-store.ts**
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculatePricing, LineItem, PricingCalculation } from '../utils/pricing';

interface Quote {
  id: string;
  quote_id: string;
  job_id: string;
  customer_id: string;
  version: number;
  status: string;
  line_items: LineItem[];
  subtotal: number;
  discount_type: 'percent' | 'amount' | null;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  valid_until?: string;
  created_at: string;
  approved_at?: string;
  is_callback: boolean;
  callback_reason?: string;
  warranty_work: boolean;
}

interface QuoteStore {
  quotes: Quote[];
  currentQuote: Quote | null;
  loading: boolean;
  error: string | null;

  // Quote operations
  fetchQuotes: (jobId?: string) => Promise<void>;
  fetchQuoteById: (quoteId: string) => Promise<Quote | null>;
  createQuote: (jobId: string, customerId: string) => Promise<string>;
  updateQuote: (quoteId: string, updates: Partial<Quote>) => Promise<void>;
  deleteQuote: (quoteId: string) => Promise<void>;
  
  // Line item operations
  addLineItem: (quoteId: string, item: Omit<LineItem, 'id'>) => Promise<void>;
  updateLineItem: (quoteId: string, itemId: string, updates: Partial<LineItem>) => Promise<void>;
  removeLineItem: (quoteId: string, itemId: string) => Promise<void>;
  
  // Quote workflow
  approveQuote: (quoteId: string) => Promise<void>;
  createNewVersion: (quoteId: string) => Promise<string>;
  
  // Calculations
  recalculateQuote: (quoteId: string) => Promise<void>;
  applyDiscount: (quoteId: string, type: 'percent' | 'amount', value: number) => Promise<void>;
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quotes: [],
  currentQuote: null,
  loading: false,
  error: null,

  /**
   * Fetch all quotes (optionally filter by job)
   */
  fetchQuotes: async (jobId?: string) => {
    set({ loading: true, error: null });

    try {
      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ quotes: data as Quote[], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Fetch single quote by ID
   */
  fetchQuoteById: async (quoteId: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_id', quoteId)
        .single();

      if (error) throw error;

      const quote = data as Quote;
      set({ currentQuote: quote, loading: false });
      return quote;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      return null;
    }
  },

  /**
   * Create new quote
   */
  createQuote: async (jobId: string, customerId: string) => {
    set({ loading: true, error: null });

    try {
      // Generate quote ID
      const { data: existing } = await supabase
        .from('quotes')
        .select('quote_id')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].quote_id;
        const match = lastId.match(/Q-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const quoteId = `Q-${String(nextNum).padStart(4, '0')}`;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get job details for callback pricing
      const { data: jobData } = await supabase
        .from('jobs')
        .select('is_callback, callback_reason, appliance_brand')
        .eq('job_id', jobId)
        .single();

      // Create quote
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30); // 30 days validity

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          quote_id: quoteId,
          job_id: jobId,
          customer_id: customerId,
          version: 1,
          status: 'Draft',
          line_items: [],
          subtotal: 0,
          discount_amount: 0,
          tax_rate: 4.00,
          tax_amount: 0,
          total: 0,
          valid_until: validUntil.toISOString().split('T')[0],
          created_by: user.id,
          is_callback: jobData?.is_callback || false,
          callback_reason: jobData?.callback_reason || null,
          warranty_work: false
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        quotes: [data as Quote, ...state.quotes],
        currentQuote: data as Quote,
        loading: false
      }));

      return quoteId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Update quote
   */
  updateQuote: async (quoteId: string, updates: Partial<Quote>) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('quote_id', quoteId);

      if (error) throw error;

      // Update local state
      set(state => ({
        quotes: state.quotes.map(q =>
          q.quote_id === quoteId ? { ...q, ...updates } : q
        ),
        currentQuote: state.currentQuote?.quote_id === quoteId
          ? { ...state.currentQuote, ...updates }
          : state.currentQuote
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Delete quote
   */
  deleteQuote: async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('quote_id', quoteId);

      if (error) throw error;

      set(state => ({
        quotes: state.quotes.filter(q => q.quote_id !== quoteId),
        currentQuote: state.currentQuote?.quote_id === quoteId ? null : state.currentQuote
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Add line item to quote
   */
  addLineItem: async (quoteId: string, item: Omit<LineItem, 'id'>) => {
    try {
      const quote = get().quotes.find(q => q.quote_id === quoteId);
      if (!quote) throw new Error('Quote not found');

      const newItem: LineItem = {
        ...item,
        id: `LI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const updatedItems = [...quote.line_items, newItem];

      await get().updateQuote(quoteId, { line_items: updatedItems });
      await get().recalculateQuote(quoteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Update line item
   */
  updateLineItem: async (quoteId: string, itemId: string, updates: Partial<LineItem>) => {
    try {
      const quote = get().quotes.find(q => q.quote_id === quoteId);
      if (!quote) throw new Error('Quote not found');

      const updatedItems = quote.line_items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );

      await get().updateQuote(quoteId, { line_items: updatedItems });
      await get().recalculateQuote(quoteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Remove line item
   */
  removeLineItem: async (quoteId: string, itemId: string) => {
    try {
      const quote = get().quotes.find(q => q.quote_id === quoteId);
      if (!quote) throw new Error('Quote not found');

      const updatedItems = quote.line_items.filter(item => item.id !== itemId);

      await get().updateQuote(quoteId, { line_items: updatedItems });
      await get().recalculateQuote(quoteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Approve quote
   */
  approveQuote: async (quoteId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await get().updateQuote(quoteId, {
        status: 'Approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Create new version of quote
   */
  createNewVersion: async (quoteId: string) => {
    try {
      const quote = get().quotes.find(q => q.quote_id === quoteId);
      if (!quote) throw new Error('Quote not found');

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create new version
      const newVersion = quote.version + 1;
      const newQuoteId = `${quote.quote_id.split('-v')[0]}-v${newVersion}`;

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          quote_id: newQuoteId,
          job_id: quote.job_id,
          customer_id: quote.customer_id,
          version: newVersion,
          status: 'Draft',
          line_items: quote.line_items,
          subtotal: quote.subtotal,
          discount_type: quote.discount_type,
          discount_value: quote.discount_value,
          discount_amount: quote.discount_amount,
          tax_rate: quote.tax_rate,
          tax_amount: quote.tax_amount,
          total: quote.total,
          notes: quote.notes,
          valid_until: quote.valid_until,
          created_by: user.id,
          is_callback: quote.is_callback,
          callback_reason: quote.callback_reason,
          warranty_work: quote.warranty_work
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        quotes: [data as Quote, ...state.quotes],
        currentQuote: data as Quote
      }));

      return newQuoteId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Recalculate quote totals
   */
  recalculateQuote: async (quoteId: string) => {
    try {
      const quote = get().quotes.find(q => q.quote_id === quoteId);
      if (!quote) throw new Error('Quote not found');

      const pricing = calculatePricing(
        quote.line_items,
        quote.discount_type,
        quote.discount_value || 0,
        quote.tax_rate
      );

      await get().updateQuote(quoteId, {
        subtotal: pricing.subtotal,
        discount_amount: pricing.discountAmount,
        tax_amount: pricing.taxAmount,
        total: pricing.total
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Apply discount to quote
   */
  applyDiscount: async (quoteId: string, type: 'percent' | 'amount', value: number) => {
    try {
      await get().updateQuote(quoteId, {
        discount_type: type,
        discount_value: value
      });

      await get().recalculateQuote(quoteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  }
}));
```

---

### Step 3: Invoice Store

**src/stores/invoice-store.ts**
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { LineItem } from '../utils/pricing';

interface Invoice {
  id: string;
  invoice_id: string;
  job_id: string;
  customer_id: string;
  quote_id?: string;
  status: string;
  line_items: LineItem[];
  subtotal: number;
  discount_type: 'percent' | 'amount' | null;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  invoice_date: string;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  is_callback: boolean;
  callback_reason?: string;
  warranty_work: boolean;
}

interface InvoiceStore {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;

  // Invoice operations
  fetchInvoices: (filters?: { customerId?: string; status?: string }) => Promise<void>;
  fetchInvoiceById: (invoiceId: string) => Promise<Invoice | null>;
  createInvoiceFromQuote: (quoteId: string) => Promise<string>;
  createManualInvoice: (jobId: string, customerId: string, lineItems: LineItem[]) => Promise<string>;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => Promise<void>;
  
  // Payment operations
  recordPayment: (invoiceId: string, amount: number, method: string, reference?: string) => Promise<void>;
  
  // Status changes
  markAsPaid: (invoiceId: string) => Promise<void>;
  markAsVoid: (invoiceId: string) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,

  /**
   * Fetch invoices with optional filters
   */
  fetchInvoices: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ invoices: data as Invoice[], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Fetch single invoice
   */
  fetchInvoiceById: async (invoiceId: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();

      if (error) throw error;

      const invoice = data as Invoice;
      set({ currentInvoice: invoice, loading: false });
      return invoice;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      return null;
    }
  },

  /**
   * Create invoice from approved quote
   */
  createInvoiceFromQuote: async (quoteId: string) => {
    set({ loading: true, error: null });

    try {
      // Fetch quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_id', quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (quote.status !== 'Approved') {
        throw new Error('Quote must be approved before creating invoice');
      }

      // Generate invoice ID
      const { data: existing } = await supabase
        .from('invoices')
        .select('invoice_id')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].invoice_id;
        const match = lastId.match(/INV-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const invoiceId = `INV-${String(nextNum).padStart(4, '0')}`;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoice
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_id: invoiceId,
          job_id: quote.job_id,
          customer_id: quote.customer_id,
          quote_id: quoteId,
          status: 'Pending',
          line_items: quote.line_items,
          subtotal: quote.subtotal,
          discount_type: quote.discount_type,
          discount_value: quote.discount_value,
          discount_amount: quote.discount_amount,
          tax_rate: quote.tax_rate,
          tax_amount: quote.tax_amount,
          total: quote.total,
          amount_paid: 0,
          balance_due: quote.total,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          notes: quote.notes,
          created_by: user.id,
          is_callback: quote.is_callback,
          callback_reason: quote.callback_reason,
          warranty_work: quote.warranty_work
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        invoices: [data as Invoice, ...state.invoices],
        currentInvoice: data as Invoice,
        loading: false
      }));

      return invoiceId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Create manual invoice (no quote)
   */
  createManualInvoice: async (jobId: string, customerId: string, lineItems: LineItem[]) => {
    set({ loading: true, error: null });

    try {
      // Generate invoice ID
      const { data: existing } = await supabase
        .from('invoices')
        .select('invoice_id')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].invoice_id;
        const match = lastId.match(/INV-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const invoiceId = `INV-${String(nextNum).padStart(4, '0')}`;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
      const taxRate = 4.00;
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;

      // Create due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_id: invoiceId,
          job_id: jobId,
          customer_id: customerId,
          status: 'Pending',
          line_items: lineItems,
          subtotal,
          discount_amount: 0,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          amount_paid: 0,
          balance_due: total,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          created_by: user.id,
          is_callback: false,
          warranty_work: false
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        invoices: [data as Invoice, ...state.invoices],
        currentInvoice: data as Invoice,
        loading: false
      }));

      return invoiceId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Update invoice
   */
  updateInvoice: async (invoiceId: string, updates: Partial<Invoice>) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('invoice_id', invoiceId);

      if (error) throw error;

      set(state => ({
        invoices: state.invoices.map(inv =>
          inv.invoice_id === invoiceId ? { ...inv, ...updates } : inv
        ),
        currentInvoice: state.currentInvoice?.invoice_id === invoiceId
          ? { ...state.currentInvoice, ...updates }
          : state.currentInvoice
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Record a payment
   */
  recordPayment: async (invoiceId: string, amount: number, method: string, reference?: string) => {
    try {
      const invoice = get().invoices.find(inv => inv.invoice_id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      // Generate payment ID
      const { data: existing } = await supabase
        .from('payments')
        .select('payment_id')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].payment_id;
        const match = lastId.match(/PAY-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const paymentId = `PAY-${String(nextNum).padStart(4, '0')}`;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_id: paymentId,
          invoice_id: invoiceId,
          customer_id: invoice.customer_id,
          amount,
          payment_method: method,
          payment_date: new Date().toISOString().split('T')[0],
          transaction_reference: reference,
          created_by: user.id
        });

      if (paymentError) throw paymentError;

      // Update invoice
      const newAmountPaid = invoice.amount_paid + amount;
      const newBalanceDue = invoice.total - newAmountPaid;
      const isPaid = newBalanceDue <= 0;

      await get().updateInvoice(invoiceId, {
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: isPaid ? 'Paid' : 'Partial',
        paid_date: isPaid ? new Date().toISOString().split('T')[0] : undefined
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Mark invoice as paid
   */
  markAsPaid: async (invoiceId: string) => {
    try {
      await get().updateInvoice(invoiceId, {
        status: 'Paid',
        paid_date: new Date().toISOString().split('T')[0],
        balance_due: 0
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Mark invoice as void
   */
  markAsVoid: async (invoiceId: string) => {
    try {
      await get().updateInvoice(invoiceId, {
        status: 'Void'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  }
}));
```

---

### Step 4: Payment Store

**src/stores/payment-store.ts**
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Payment {
  id: string;
  payment_id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_reference?: string;
  check_number?: string;
  notes?: string;
  created_at: string;
}

interface PaymentStore {
  payments: Payment[];
  loading: boolean;
  error: string | null;

  fetchPayments: (filters?: { customerId?: string; invoiceId?: string }) => Promise<void>;
  fetchPaymentHistory: (customerId: string) => Promise<Payment[]>;
  getPaymentMethods: () => string[];
}

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  payments: [],
  loading: false,
  error: null,

  /**
   * Fetch payments with filters
   */
  fetchPayments: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      let query = supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ payments: data as Payment[], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Fetch payment history for a customer
   */
  fetchPaymentHistory: async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      return data as Payment[];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  },

  /**
   * Get available payment methods
   */
  getPaymentMethods: () => {
    return [
      'Cash',
      'Check',
      'Credit Card',
      'Debit Card',
      'Venmo',
      'PayPal',
      'Zelle',
      'ACH Transfer',
      'Other'
    ];
  }
}));
```

---

### Step 5: Quote Builder Component

**src/components/quotes/QuoteBuilder.tsx**
```typescript
import { useState, useEffect } from 'react';
import { useQuoteStore } from '../../stores/quote-store';
import { usePartsStore } from '../../stores/parts-store';
import { formatCurrency, generateLineItemId } from '../../utils/pricing';
import { LineItem } from '../../utils/pricing';

interface Props {
  jobId: string;
  customerId: string;
  onComplete?: (quoteId: string) => void;
}

export default function QuoteBuilder({ jobId, customerId, onComplete }: Props) {
  const { createQuote, currentQuote, addLineItem, updateLineItem, removeLineItem, applyDiscount, approveQuote } = useQuoteStore();
  const { parts } = usePartsStore();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'service' | 'labor' | 'parts'>('service');
  
  // Form states
  const [serviceFee, setServiceFee] = useState(85.00);
  const [laborHours, setLaborHours] = useState(1);
  const [laborRate, setLaborRate] = useState(75.00);
  const [selectedPart, setSelectedPart] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partMarkup, setPartMarkup] = useState(20);
  
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState(0);

  useEffect(() => {
    initializeQuote();
  }, []);

  const initializeQuote = async () => {
    setLoading(true);
    try {
      const quoteId = await createQuote(jobId, customerId);
      console.log('Quote created:', quoteId);
    } catch (err) {
      console.error('Error creating quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddServiceFee = async () => {
    if (!currentQuote) return;

    const item: Omit<LineItem, 'id'> = {
      type: 'service_fee',
      description: 'Service Call Fee',
      quantity: 1,
      unit_price: serviceFee,
      subtotal: serviceFee
    };

    await addLineItem(currentQuote.quote_id, item);
  };

  const handleAddLabor = async () => {
    if (!currentQuote) return;

    const item: Omit<LineItem, 'id'> = {
      type: 'labor',
      description: 'Labor',
      quantity: 1,
      unit_price: laborHours * laborRate,
      subtotal: laborHours * laborRate,
      labor_hours: laborHours,
      labor_rate: laborRate
    };

    await addLineItem(currentQuote.quote_id, item);
    setLaborHours(1);
  };

  const handleAddPart = async () => {
    if (!currentQuote || !selectedPart) return;

    const part = parts.find(p => p.part_number === selectedPart);
    if (!part) return;

    const cost = part.avg_cost || 0;
    const sellPrice = cost * (1 + partMarkup / 100);

    const item: Omit<LineItem, 'id'> = {
      type: 'part',
      description: part.description,
      quantity: partQuantity,
      unit_price: sellPrice,
      subtotal: sellPrice * partQuantity,
      part_number: part.part_number,
      part_cost: cost,
      markup_percent: partMarkup
    };

    await addLineItem(currentQuote.quote_id, item);
    setSelectedPart('');
    setPartQuantity(1);
  };

  const handleApplyDiscount = async () => {
    if (!currentQuote) return;
    await applyDiscount(currentQuote.quote_id, discountType, discountValue);
  };

  const handleApprove = async () => {
    if (!currentQuote) return;
    await approveQuote(currentQuote.quote_id);
    if (onComplete) {
      onComplete(currentQuote.quote_id);
    }
  };

  if (loading || !currentQuote) {
    return <div className="text-center py-8">Loading quote builder...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Quote Builder</h2>
        <p className="text-sm text-gray-600 mt-1">Quote ID: {currentQuote.quote_id}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('service')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'service'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Service Fee
          </button>
          <button
            onClick={() => setActiveTab('labor')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'labor'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Labor
          </button>
          <button
            onClick={() => setActiveTab('parts')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'parts'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Parts
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'service' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Call Fee
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={serviceFee}
                  onChange={(e) => setServiceFee(parseFloat(e.target.value))}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  step="0.01"
                />
                <button
                  onClick={handleAddServiceFee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add to Quote
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'labor' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labor Hours
              </label>
              <input
                type="number"
                value={laborHours}
                onChange={(e) => setLaborHours(parseFloat(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                step="0.25"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate
              </label>
              <input
                type="number"
                value={laborRate}
                onChange={(e) => setLaborRate(parseFloat(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                step="0.01"
              />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Total Labor: {formatCurrency(laborHours * laborRate)}
              </p>
            </div>
            <button
              onClick={handleAddLabor}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Labor to Quote
            </button>
          </div>
        )}

        {activeTab === 'parts' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Part
              </label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">-- Select Part --</option>
                {parts.map(part => (
                  <option key={part.part_number} value={part.part_number}>
                    {part.part_number} - {part.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={partQuantity}
                onChange={(e) => setPartQuantity(parseInt(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup %
              </label>
              <input
                type="number"
                value={partMarkup}
                onChange={(e) => setPartMarkup(parseFloat(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                step="1"
              />
            </div>
            {selectedPart && (
              <div className="bg-gray-50 p-4 rounded-lg">
                {(() => {
                  const part = parts.find(p => p.part_number === selectedPart);
                  if (!part) return null;
                  const cost = part.avg_cost || 0;
                  const sellPrice = cost * (1 + partMarkup / 100);
                  return (
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Cost: {formatCurrency(cost)}</p>
                      <p className="text-gray-600">Sell Price: {formatCurrency(sellPrice)}</p>
                      <p className="font-medium text-gray-900">
                        Total: {formatCurrency(sellPrice * partQuantity)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
            <button
              onClick={handleAddPart}
              disabled={!selectedPart}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Part to Quote
            </button>
          </div>
        )}
      </div>

      {/* Line Items Display */}
      <div className="px-6 pb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Quote Items</h3>
        {currentQuote.line_items.length === 0 ? (
          <p className="text-gray-500 text-sm">No items added yet</p>
        ) : (
          <div className="space-y-2">
            {currentQuote.line_items.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.description}</p>
                  <p className="text-sm text-gray-600">
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(item.subtotal)}
                  </p>
                  <button
                    onClick={() => removeLineItem(currentQuote.quote_id, item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discount Section */}
      <div className="px-6 pb-6 border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-900 mb-3">Discount</h3>
        <div className="flex gap-4">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="percent">Percent</option>
            <option value="amount">Amount</option>
          </select>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value))}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.01"
            placeholder={discountType === 'percent' ? '10' : '50.00'}
          />
          <button
            onClick={handleApplyDiscount}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="px-6 pb-6 border-t border-gray-200 pt-6">
        <div className="space-y-2">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span>{formatCurrency(currentQuote.subtotal)}</span>
          </div>
          {currentQuote.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount:</span>
              <span>-{formatCurrency(currentQuote.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span>Tax ({currentQuote.tax_rate}%):</span>
            <span>{formatCurrency(currentQuote.tax_amount)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
            <span>Total:</span>
            <span>{formatCurrency(currentQuote.total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-4">
        <button
          onClick={handleApprove}
          disabled={currentQuote.line_items.length === 0}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Approve Quote
        </button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
          Preview PDF
        </button>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### Test Quote Creation:
1. Create a new job
2. Open quote builder
3. Add service fee, labor, and parts
4. Apply discount
5. Verify totals calculate correctly
6. Approve quote

### Test Invoice Generation:
1. Create invoice from approved quote
2. Verify all line items copied
3. Check totals match
4. Record payment
5. Verify balance updates

### Test Callback Pricing:
1. Create callback job
2. Generate quote
3. Verify callback pricing applied
4. Check service fee waived (if applicable)
5. Verify discount automatically applied

---

## ✅ Success Criteria

Stage 7 is complete when:

- [ ] Can create quotes with multiple line items
- [ ] Service fees add correctly
- [ ] Labor calculates with adjustable hours and rates
- [ ] Parts add with proper markup
- [ ] Discounts apply correctly (% and $)
- [ ] Tax calculates accurately
- [ ] Quote totals are correct
- [ ] Can approve quotes
- [ ] Can create invoices from quotes
- [ ] Can create manual invoices
- [ ] Payments record properly
- [ ] Multiple payments on single invoice work
- [ ] Balance due updates after payments
- [ ] Invoice status changes appropriately
- [ ] Payment history displays
- [ ] Appliance tier pricing works
- [ ] Callback pricing rules apply
- [ ] All 5 new tables created
- [ ] Discount presets available
- [ ] Labor rates configurable

---

## 🔧 Troubleshooting

**Totals not calculating:**
- Check calculatePricing function
- Verify line items have correct subtotals
- Check discount logic
- Ensure tax rate is decimal (4.00 not 0.04)

**Invoices not creating from quotes:**
- Verify quote is approved first
- Check quote_id reference
- Ensure all required fields present

**Payments not updating balance:**
- Check recordPayment function
- Verify amount_paid calculation
- Check balance_due update logic
- Ensure payment record created first

**Discount not applying:**
- Verify discount type matches
- Check discount value is valid number
- Ensure recalculateQuote called after

---

## 📝 Notes for Next Stage

Stage 8 will add:
- Multi-location support
- Tool tracking
- Vehicle management
- Mileage reports
- Travel time optimization

---

## 🎯 Summary

You now have:
- Complete quote generation system
- Professional invoice creation
- Payment tracking with multiple methods
- Discount management (presets and custom)
- Tax calculations
- Customer payment history
- Callback pricing automation
- Appliance tier pricing
- Balance tracking
- Payment method breakdown
- Financial analytics foundation

This financial management system handles the complete quote-to-payment workflow!

---

## 💡 Tips for Success

1. **Test calculations**: Verify math is correct before going live
2. **Backup before payments**: Always backup before recording real payments
3. **Double-check tax rates**: Confirm local tax rate for your area
4. **Use discount presets**: Create common discounts for efficiency
5. **Track payment methods**: Important for accounting
6. **Set proper due dates**: 30 days is typical but adjust as needed
7. **Approve quotes first**: Don't create invoices from draft quotes

Stage 7 adds comprehensive financial management - test thoroughly!
