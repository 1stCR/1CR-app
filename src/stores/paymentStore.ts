import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Payment {
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
