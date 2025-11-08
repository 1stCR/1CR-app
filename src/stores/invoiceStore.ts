import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { LineItem } from '../utils/pricing';

export interface Invoice {
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
