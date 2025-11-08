# Stage 2: Customer Management

## 🎯 Objective
Build complete customer management system with business accounts, multiple contacts, and search functionality.

## ✅ Prerequisites
- Stage 1 completed (Foundation & Auth)
- Authentication working
- Database tables created
- Basic navigation in place

## 🛠️ What We're Building
- Customer list page with search/filter
- Add/Edit customer forms
- Customer detail page
- Business customer contact management
- Customer ID auto-generation (C-0001, C-0002, etc.)
- Recent customers widget for dashboard

## 📋 Implementation Steps

### Part 1: State Management Setup

#### 1.1 Create Customer Store (Zustand)

Create `src/stores/customerStore.ts`:
```typescript
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

export const useCustomerStore = create<CustomerStore>((set, get) => ({
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
```

### Part 2: Customer List Page

#### 2.1 Create Customer List Component

Create `src/pages/customers/CustomerList.tsx`:
```typescript
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Building2, Home, Edit, Trash2 } from 'lucide-react'
import { useCustomerStore } from '../../stores/customerStore'

export function CustomerList() {
  const { customers, loading, fetchCustomers, deleteCustomer } = useCustomerStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'residential' | 'commercial'>('all')
  
  useEffect(() => {
    fetchCustomers()
  }, [])
  
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone_primary?.includes(searchQuery) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === 'all' || 
      (filterType === 'residential' && customer.customer_type === 'Residential') ||
      (filterType === 'commercial' && customer.customer_type === 'Commercial')
    
    return matchesSearch && matchesType
  })
  
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteCustomer(id)
    }
  }
  
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <Link
          to="/customers/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Customer
        </Link>
      </div>
      
      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search customers..."
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg ${
                filterType === 'all' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setFilterType('residential')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                filterType === 'residential' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Home size={16} />
              Residential
            </button>
            <button
              onClick={() => setFilterType('commercial')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                filterType === 'commercial' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Building2 size={16} />
              Commercial
            </button>
          </div>
        </div>
      </div>
      
      {/* Customer List */}
      {loading ? (
        <div className="card">
          <div className="text-center py-12 text-gray-500">
            Loading customers...
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
            </p>
            {!searchQuery && (
              <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={20} />
                Add Your First Customer
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.customer_type === 'Commercial' && customer.business_name ? (
                            <>
                              {customer.business_name}
                              <span className="text-gray-500 ml-2">
                                ({customer.first_name} {customer.last_name})
                              </span>
                            </>
                          ) : (
                            `${customer.first_name} ${customer.last_name}`
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.customer_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.customer_type === 'Commercial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {customer.customer_type === 'Commercial' ? (
                          <Building2 size={12} />
                        ) : (
                          <Home size={12} />
                        )}
                        {customer.customer_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.phone_primary && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} className="text-gray-400" />
                            {customer.phone_primary}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} className="text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.city && customer.state ? (
                        `${customer.city}, ${customer.state}`
                      ) : (
                        <span className="text-gray-400">No address</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </Link>
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(customer.id, `${customer.first_name} ${customer.last_name}`)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Part 3: Customer Form Component

#### 3.1 Create Reusable Customer Form

Create `src/components/customers/CustomerForm.tsx`:
```typescript
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Home } from 'lucide-react'
import { Customer } from '../../stores/customerStore'

interface CustomerFormProps {
  customer?: Customer
  onSubmit: (data: Partial<Customer>) => Promise<void>
}

export function CustomerForm({ customer, onSubmit }: CustomerFormProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    customer_type: customer?.customer_type || 'Residential',
    business_name: customer?.business_name || '',
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    phone_primary: customer?.phone_primary || '',
    phone_secondary: customer?.phone_secondary || '',
    email: customer?.email || '',
    address_street: customer?.address_street || '',
    city: customer?.city || '',
    state: customer?.state || 'WY',
    zip: customer?.zip || '',
    notes: customer?.notes || ''
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await onSubmit(formData)
      navigate('/customers')
    } catch (err: any) {
      setError(err.message || 'Failed to save customer')
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* Customer Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customer Type
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, customer_type: 'Residential' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 ${
              formData.customer_type === 'Residential'
                ? 'border-primary-600 bg-primary-50 text-primary-600'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Home size={20} />
            Residential
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, customer_type: 'Commercial' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 ${
              formData.customer_type === 'Commercial'
                ? 'border-primary-600 bg-primary-50 text-primary-600'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Building2 size={20} />
            Commercial
          </button>
        </div>
      </div>
      
      {/* Business Name (for commercial) */}
      {formData.customer_type === 'Commercial' && (
        <div>
          <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            type="text"
            id="business_name"
            className="input mt-1"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            placeholder="ABC Restaurant"
          />
        </div>
      )}
      
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="first_name"
            className="input mt-1"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="last_name"
            className="input mt-1"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>
      
      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone_primary" className="block text-sm font-medium text-gray-700">
            Primary Phone
          </label>
          <input
            type="tel"
            id="phone_primary"
            className="input mt-1"
            value={formData.phone_primary}
            onChange={(e) => setFormData({ ...formData, phone_primary: e.target.value })}
            placeholder="(307) 555-1234"
          />
        </div>
        <div>
          <label htmlFor="phone_secondary" className="block text-sm font-medium text-gray-700">
            Secondary Phone
          </label>
          <input
            type="tel"
            id="phone_secondary"
            className="input mt-1"
            value={formData.phone_secondary}
            onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
            placeholder="(307) 555-5678"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          className="input mt-1"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="customer@example.com"
        />
      </div>
      
      {/* Address */}
      <div>
        <label htmlFor="address_street" className="block text-sm font-medium text-gray-700">
          Street Address
        </label>
        <input
          type="text"
          id="address_street"
          className="input mt-1"
          value={formData.address_street}
          onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
          placeholder="123 Main St"
        />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            type="text"
            id="city"
            className="input mt-1"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Buffalo"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State
          </label>
          <select
            id="state"
            className="input mt-1"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          >
            <option value="WY">WY</option>
            <option value="MT">MT</option>
            <option value="SD">SD</option>
            <option value="CO">CO</option>
          </select>
        </div>
        <div>
          <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
            ZIP Code
          </label>
          <input
            type="text"
            id="zip"
            className="input mt-1"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
            placeholder="82834"
          />
        </div>
      </div>
      
      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          className="input mt-1"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any special instructions or notes..."
        />
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  )
}
```

### Part 4: Add/Edit Customer Pages

#### 4.1 Create New Customer Page

Create `src/pages/customers/NewCustomer.tsx`:
```typescript
import React from 'react'
import { CustomerForm } from '../../components/customers/CustomerForm'
import { useCustomerStore } from '../../stores/customerStore'

export function NewCustomer() {
  const { createCustomer } = useCustomerStore()
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
        <p className="text-gray-600">Create a new customer record</p>
      </div>
      
      <div className="card max-w-3xl">
        <CustomerForm onSubmit={createCustomer} />
      </div>
    </div>
  )
}
```

#### 4.2 Create Edit Customer Page

Create `src/pages/customers/EditCustomer.tsx`:
```typescript
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CustomerForm } from '../../components/customers/CustomerForm'
import { useCustomerStore, Customer } from '../../stores/customerStore'

export function EditCustomer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchCustomerById, updateCustomer } = useCustomerStore()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadCustomer()
  }, [id])
  
  const loadCustomer = async () => {
    if (!id) {
      navigate('/customers')
      return
    }
    
    const data = await fetchCustomerById(id)
    if (data) {
      setCustomer(data)
    } else {
      navigate('/customers')
    }
    setLoading(false)
  }
  
  const handleUpdate = async (data: Partial<Customer>) => {
    if (!id) return
    await updateCustomer(id, data)
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading customer...</div>
      </div>
    )
  }
  
  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
      </div>
    )
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
        <p className="text-gray-600">Update customer information</p>
      </div>
      
      <div className="card max-w-3xl">
        <CustomerForm customer={customer} onSubmit={handleUpdate} />
      </div>
    </div>
  )
}
```

### Part 5: Customer Detail Page

Create `src/pages/customers/CustomerDetail.tsx`:
```typescript
import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Building2, 
  Home, Plus, User, Briefcase 
} from 'lucide-react'
import { useCustomerStore, Customer, Contact } from '../../stores/customerStore'

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { 
    fetchCustomerById, 
    deleteCustomer,
    contacts,
    fetchContactsForCustomer,
    createContact,
    updateContact,
    deleteContact
  } = useCustomerStore()
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({
    contact_name: '',
    phone: '',
    email: '',
    role: '',
    is_primary: false
  })
  
  useEffect(() => {
    loadCustomer()
  }, [id])
  
  const loadCustomer = async () => {
    if (!id) {
      navigate('/customers')
      return
    }
    
    const data = await fetchCustomerById(id)
    if (data) {
      setCustomer(data)
      await fetchContactsForCustomer(data.id)
    } else {
      navigate('/customers')
    }
    setLoading(false)
  }
  
  const handleDelete = async () => {
    if (!customer) return
    
    if (confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) {
      await deleteCustomer(customer.id)
      navigate('/customers')
    }
  }
  
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    
    await createContact({
      ...newContact,
      customer_id: customer.id
    })
    
    setNewContact({
      contact_name: '',
      phone: '',
      email: '',
      role: '',
      is_primary: false
    })
    setShowAddContact(false)
  }
  
  const handleDeleteContact = async (contactId: string, name: string) => {
    if (confirm(`Remove contact ${name}?`)) {
      await deleteContact(contactId)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading customer...</div>
      </div>
    )
  }
  
  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
      </div>
    )
  }
  
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/customers"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.customer_type === 'Commercial' && customer.business_name
                  ? customer.business_name
                  : `${customer.first_name} ${customer.last_name}`}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                customer.customer_type === 'Commercial'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {customer.customer_type === 'Commercial' ? (
                  <Building2 size={12} />
                ) : (
                  <Home size={12} />
                )}
                {customer.customer_type}
              </span>
            </div>
            <p className="text-gray-600">Customer ID: {customer.customer_id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            to={`/customers/${customer.id}/edit`}
            className="btn-primary flex items-center gap-2"
          >
            <Edit size={16} />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
      
      {/* Customer Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
          <div className="space-y-3">
            {customer.phone_primary && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Primary Phone</p>
                  <a href={`tel:${customer.phone_primary}`} className="text-primary-600 hover:underline">
                    {customer.phone_primary}
                  </a>
                </div>
              </div>
            )}
            {customer.phone_secondary && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Secondary Phone</p>
                  <a href={`tel:${customer.phone_secondary}`} className="text-primary-600 hover:underline">
                    {customer.phone_secondary}
                  </a>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a href={`mailto:${customer.email}`} className="text-primary-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Address */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Address</h3>
          {customer.address_street ? (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-gray-400 mt-1" />
              <div>
                <p>{customer.address_street}</p>
                <p>{customer.city}, {customer.state} {customer.zip}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No address on file</p>
          )}
        </div>
        
        {/* Quick Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Customer Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Jobs</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Jobs</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Member Since</span>
              <span className="font-semibold">
                {new Date(customer.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Contacts (for commercial customers) */}
      {customer.customer_type === 'Commercial' && (
        <div className="mt-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Additional Contacts</h3>
              <button
                onClick={() => setShowAddContact(!showAddContact)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>
            
            {showAddContact && (
              <form onSubmit={handleAddContact} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Contact Name"
                      className="input"
                      value={newContact.contact_name}
                      onChange={(e) => setNewContact({ ...newContact, contact_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Role"
                      className="input"
                      value={newContact.role}
                      onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone"
                      className="input"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      className="input"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="submit" className="btn-primary">
                    Save Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddContact(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            
            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-gray-400" />
                      <div>
                        <p className="font-medium">{contact.contact_name}</p>
                        <p className="text-sm text-gray-600">
                          {contact.role && `${contact.role} • `}
                          {contact.phone && `${contact.phone} • `}
                          {contact.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.contact_name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No additional contacts
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Notes */}
      {customer.notes && (
        <div className="mt-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        </div>
      )}
      
      {/* Job History (placeholder for Stage 3) */}
      <div className="mt-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Job History</h3>
          <p className="text-gray-500 text-center py-8">
            Job history will appear here after Stage 3
          </p>
        </div>
      </div>
    </div>
  )
}
```

### Part 6: Update App Routing

Replace the customers route section in `src/App.tsx`:
```typescript
import { CustomerList } from './pages/customers/CustomerList'
import { NewCustomer } from './pages/customers/NewCustomer'
import { EditCustomer } from './pages/customers/EditCustomer'
import { CustomerDetail } from './pages/customers/CustomerDetail'

// In the routes section, replace the customers placeholder with:
<Route path="customers">
  <Route index element={<CustomerList />} />
  <Route path="new" element={<NewCustomer />} />
  <Route path=":id" element={<CustomerDetail />} />
  <Route path=":id/edit" element={<EditCustomer />} />
</Route>
```

### Part 7: Dashboard Widget

Create `src/components/dashboard/RecentCustomers.tsx`:
```typescript
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface RecentCustomer {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  business_name?: string
  customer_type: string
  created_at: string
}

export function RecentCustomers() {
  const [customers, setCustomers] = useState<RecentCustomer[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadRecentCustomers()
  }, [])
  
  const loadRecentCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, customer_id, first_name, last_name, business_name, customer_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!error && data) {
      setCustomers(data)
    }
    setLoading(false)
  }
  
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Recent Customers</h3>
        <Link to="/customers" className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      
      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : customers.length > 0 ? (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {customer.customer_type === 'Commercial' && customer.business_name
                      ? customer.business_name
                      : `${customer.first_name} ${customer.last_name}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {customer.customer_id} • Added {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Users size={16} className="text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No customers yet</p>
          <Link to="/customers/new" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
            Add your first customer
          </Link>
        </div>
      )}
    </div>
  )
}
```

Update Dashboard to include the widget in `src/pages/Dashboard.tsx`:
```typescript
import { RecentCustomers } from '../components/dashboard/RecentCustomers'

// In the grid section, replace one placeholder with:
<RecentCustomers />
```

## ✅ Success Metrics

Stage 2 is complete when:

- [ ] Customer list page loads and displays customers
- [ ] Can search/filter customers
- [ ] Can add new customer with auto-generated ID (C-0001, etc.)
- [ ] Can edit existing customer
- [ ] Can delete customer (with confirmation)
- [ ] Customer detail page shows all information
- [ ] Commercial customers can have multiple contacts
- [ ] Recent customers widget shows on dashboard
- [ ] No console errors
- [ ] All forms validate properly

## 🚫 Troubleshooting

**Customer ID not generating:**
- Check if query for last customer is working
- Verify customer_id column has unique constraint

**Contacts not showing:**
- Verify foreign key relationship in database
- Check customer_id is being passed correctly

**Search not working:**
- Check ILIKE syntax in Supabase query
- Verify column names match database

## 📝 Notes for Next Stage

Stage 3 will add:
- Complete job management
- Job creation flow with customer selection
- Job status tracking
- Visit management
- Callback system

## 🎯 Summary

You now have:
- Complete customer management system
- Business vs Residential customer types
- Contact management for commercial accounts
- Search and filtering
- Auto-generated customer IDs
- Full CRUD operations

This customer foundation will be used by all future stages!
