import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface Customer {
  id: string
  customer_id: string
  customer_type: 'Residential' | 'Commercial'
  business_name?: string
  first_name: string
  last_name: string
  phone_primary?: string
  phone_secondary?: string
  email?: string
  address_street?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  contact_id: string
  customer_id: string
  contact_name: string
  phone?: string
  email?: string
  role?: string
  is_primary: boolean
  active: boolean
  notes?: string
  created_at: string
}

interface CustomerStore {
  customers: Customer[]
  contacts: Contact[]
  loading: boolean
  error: string | null

  // Actions
  fetchCustomers: () => Promise<void>
  fetchCustomerById: (id: string) => Promise<Customer | null>
  createCustomer: (customer: Partial<Customer>) => Promise<Customer>
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  searchCustomers: (query: string) => Promise<Customer[]>

  // Contact management
  fetchContactsForCustomer: (customerId: string) => Promise<void>
  createContact: (contact: Partial<Contact>) => Promise<Contact>
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
}

export const useCustomerStore = create<CustomerStore>((set) => ({
  customers: [],
  contacts: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ customers: data || [], loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchCustomerById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching customer:', error)
      return null
    }
  },

  createCustomer: async (customerData: Partial<Customer>) => {
    set({ loading: true, error: null })
    try {
      // Generate customer ID
      const { data: lastCustomer } = await supabase
        .from('customers')
        .select('customer_id')
        .order('customer_id', { ascending: false })
        .limit(1)
        .single()

      const lastId = lastCustomer?.customer_id || 'C-0000'
      const nextNumber = parseInt(lastId.split('-')[1]) + 1
      const newCustomerId = `C-${nextNumber.toString().padStart(4, '0')}`

      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customerData, customer_id: newCustomerId }])
        .select()
        .single()

      if (error) throw error

      set(state => ({
        customers: [data, ...state.customers],
        loading: false
      }))

      return data
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateCustomer: async (id: string, updates: Partial<Customer>) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      set(state => ({
        customers: state.customers.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  deleteCustomer: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => ({
        customers: state.customers.filter(c => c.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  searchCustomers: async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,business_name.ilike.%${query}%,phone_primary.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching customers:', error)
      return []
    }
  },

  fetchContactsForCustomer: async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false })

      if (error) throw error
      set({ contacts: data || [] })
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  },

  createContact: async (contactData: Partial<Contact>) => {
    try {
      // Generate contact ID
      const { data: lastContact } = await supabase
        .from('contacts')
        .select('contact_id')
        .order('contact_id', { ascending: false })
        .limit(1)
        .single()

      const lastId = lastContact?.contact_id || 'CONT-0000'
      const nextNumber = parseInt(lastId.split('-')[1]) + 1
      const newContactId = `CONT-${nextNumber.toString().padStart(4, '0')}`

      const { data, error } = await supabase
        .from('contacts')
        .insert([{ ...contactData, contact_id: newContactId }])
        .select()
        .single()

      if (error) throw error

      set(state => ({
        contacts: [...state.contacts, data]
      }))

      return data
    } catch (error: any) {
      throw error
    }
  },

  updateContact: async (id: string, updates: Partial<Contact>) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      set(state => ({
        contacts: state.contacts.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      }))
    } catch (error: any) {
      throw error
    }
  },

  deleteContact: async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => ({
        contacts: state.contacts.filter(c => c.id !== id)
      }))
    } catch (error: any) {
      throw error
    }
  }
}))
