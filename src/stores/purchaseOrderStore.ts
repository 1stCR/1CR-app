import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  part_number: string;
  description: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  job_id?: string;
  job_number?: string;
  qty_received: number;
  qty_remaining: number;
  has_core: boolean;
  core_charge?: number;
  core_returned: boolean;
  core_return_date?: string;
  core_tracking?: string;
  core_credit_amount?: number;
  line_number: number;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id?: string;
  supplier_name: string;
  order_date: string;
  expected_delivery?: string;
  actual_delivery?: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

interface PurchaseOrderStore {
  orders: PurchaseOrder[];
  currentOrder: PurchaseOrder | null;
  loading: boolean;
  error: string | null;

  // Order operations
  fetchOrders: (filters?: { status?: string; supplierId?: string }) => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<PurchaseOrder | null>;
  createOrder: (supplierName: string, supplierId?: string) => Promise<string>;
  updateOrder: (orderId: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  // Line item operations
  addItem: (orderId: string, item: Omit<PurchaseOrderItem, 'id' | 'order_id' | 'line_total' | 'qty_received' | 'qty_remaining' | 'line_number'>) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<PurchaseOrderItem>) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;

  // Status operations
  submitOrder: (orderId: string) => Promise<void>;
  markAsShipped: (orderId: string, trackingNumber: string, carrier: string) => Promise<void>;
  receiveItems: (orderId: string, itemReceipts: { itemId: string; qtyReceived: number }[]) => Promise<void>;

  // Core charge operations
  markCoreReturned: (itemId: string, tracking: string, creditAmount: number) => Promise<void>;

  // Calculate totals
  recalculateOrder: (orderId: string) => Promise<void>;
}

export const usePurchaseOrderStore = create<PurchaseOrderStore>((set, get) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,

  /**
   * Fetch all purchase orders with optional filters
   */
  fetchOrders: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      let query = supabase
        .from('parts_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ orders: data as PurchaseOrder[], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Fetch single order with items
   */
  fetchOrderById: async (orderId: string) => {
    set({ loading: true, error: null });

    try {
      const { data: order, error: orderError } = await supabase
        .from('parts_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('parts_order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('line_number', { ascending: true });

      if (itemsError) throw itemsError;

      const orderWithItems = {
        ...order,
        items: items as PurchaseOrderItem[]
      } as PurchaseOrder;

      set({ currentOrder: orderWithItems, loading: false });
      return orderWithItems;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      return null;
    }
  },

  /**
   * Create new purchase order
   */
  createOrder: async (supplierName: string, supplierId?: string) => {
    set({ loading: true, error: null });

    try {
      // Generate order number
      const { data: existing } = await supabase
        .from('parts_orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].order_number;
        const match = lastId.match(/PO-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const orderNumber = `PO-${String(nextNum).padStart(4, '0')}`;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('parts_orders')
        .insert({
          order_number: orderNumber,
          supplier_id: supplierId || null,
          supplier_name: supplierName,
          order_date: new Date().toISOString().split('T')[0],
          status: 'Draft',
          subtotal: 0,
          shipping_cost: 0,
          tax: 0,
          total: 0,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        orders: [data as PurchaseOrder, ...state.orders],
        currentOrder: data as PurchaseOrder,
        loading: false
      }));

      return data.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Update order
   */
  updateOrder: async (orderId: string, updates: Partial<PurchaseOrder>) => {
    try {
      const { error } = await supabase
        .from('parts_orders')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      set(state => ({
        orders: state.orders.map(o =>
          o.id === orderId ? { ...o, ...updates } : o
        ),
        currentOrder: state.currentOrder?.id === orderId
          ? { ...state.currentOrder, ...updates }
          : state.currentOrder
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Delete order
   */
  deleteOrder: async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('parts_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      set(state => ({
        orders: state.orders.filter(o => o.id !== orderId),
        currentOrder: state.currentOrder?.id === orderId ? null : state.currentOrder
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Add line item to order
   */
  addItem: async (orderId, item) => {
    try {
      const { data, error } = await supabase
        .from('parts_order_items')
        .insert({
          order_id: orderId,
          part_number: item.part_number,
          description: item.description,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          job_id: item.job_id,
          job_number: item.job_number,
          has_core: item.has_core || false,
          core_charge: item.core_charge
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate order totals
      await get().recalculateOrder(orderId);

      // Refresh order with items
      await get().fetchOrderById(orderId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Update line item
   */
  updateItem: async (itemId, updates) => {
    try {
      const { error } = await supabase
        .from('parts_order_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      // Get order ID to recalculate
      const { data: item } = await supabase
        .from('parts_order_items')
        .select('order_id')
        .eq('id', itemId)
        .single();

      if (item) {
        await get().recalculateOrder(item.order_id);
        await get().fetchOrderById(item.order_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Remove line item
   */
  removeItem: async (itemId) => {
    try {
      // Get order ID first
      const { data: item } = await supabase
        .from('parts_order_items')
        .select('order_id')
        .eq('id', itemId)
        .single();

      const { error } = await supabase
        .from('parts_order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      if (item) {
        await get().recalculateOrder(item.order_id);
        await get().fetchOrderById(item.order_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Submit order
   */
  submitOrder: async (orderId) => {
    try {
      await get().updateOrder(orderId, {
        status: 'Submitted'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Mark order as shipped
   */
  markAsShipped: async (orderId, trackingNumber, carrier) => {
    try {
      await get().updateOrder(orderId, {
        status: 'Shipped',
        tracking_number: trackingNumber,
        carrier: carrier
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Receive items
   */
  receiveItems: async (orderId, itemReceipts) => {
    try {
      for (const receipt of itemReceipts) {
        // Get current item
        const { data: item } = await supabase
          .from('parts_order_items')
          .select('*')
          .eq('id', receipt.itemId)
          .single();

        if (item) {
          const newQtyReceived = item.qty_received + receipt.qtyReceived;

          await supabase
            .from('parts_order_items')
            .update({
              qty_received: newQtyReceived
            })
            .eq('id', receipt.itemId);

          // Add to inventory
          await supabase
            .from('parts_transactions')
            .insert({
              part_number: item.part_number,
              type: 'Purchased',
              quantity: receipt.qtyReceived,
              unit_cost: item.unit_cost,
              order_id: orderId,
              date: new Date().toISOString()
            });
        }
      }

      // Check if order fully received
      const { data: items } = await supabase
        .from('parts_order_items')
        .select('quantity, qty_received')
        .eq('order_id', orderId);

      const allReceived = items?.every(i => i.qty_received >= i.quantity) || false;
      const partialReceived = items?.some(i => i.qty_received > 0 && i.qty_received < i.quantity) || false;

      let newStatus = 'Shipped';
      if (allReceived) {
        newStatus = 'Received';
      } else if (partialReceived) {
        newStatus = 'Partially Received';
      }

      await get().updateOrder(orderId, {
        status: newStatus,
        actual_delivery: allReceived ? new Date().toISOString().split('T')[0] : undefined
      });

      await get().fetchOrderById(orderId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Mark core as returned
   */
  markCoreReturned: async (itemId, tracking, creditAmount) => {
    try {
      await get().updateItem(itemId, {
        core_returned: true,
        core_return_date: new Date().toISOString().split('T')[0],
        core_tracking: tracking,
        core_credit_amount: creditAmount
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Recalculate order totals
   */
  recalculateOrder: async (orderId) => {
    try {
      const { data: items } = await supabase
        .from('parts_order_items')
        .select('line_total')
        .eq('order_id', orderId);

      const subtotal = items?.reduce((sum, item) => sum + (item.line_total || 0), 0) || 0;

      // Get current order for shipping/tax
      const { data: order } = await supabase
        .from('parts_orders')
        .select('shipping_cost, tax')
        .eq('id', orderId)
        .single();

      const shippingCost = order?.shipping_cost || 0;
      const tax = order?.tax || 0;
      const total = subtotal + shippingCost + tax;

      await get().updateOrder(orderId, {
        subtotal,
        total
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  }
}));
