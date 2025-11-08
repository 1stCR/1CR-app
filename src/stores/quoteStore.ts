import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculatePricing, LineItem, PricingCalculation } from '../utils/pricing';

export interface Quote {
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
  approved_by?: string;
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
