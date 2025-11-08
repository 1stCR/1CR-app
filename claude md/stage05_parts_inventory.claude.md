# Stage 5: Parts Inventory Core

## 🎯 Objective
Build comprehensive parts inventory system with FIFO cost tracking, multi-location storage, stock management, and parts usage on jobs.

## ✅ Prerequisites
- Stages 1-4 completed
- Jobs system functional
- Tour tracking working
- Database tables created for parts system

## 🛠️ What We're Building

### Core Features:
1. **Parts Master Catalog**
   - Part number (unique identifier)
   - Description and category
   - Brand information
   - Current stock levels
   - Average cost calculation
   - Markup percentage
   - Sell price calculation
   - Min/max stock levels
   - Usage statistics

2. **FIFO Inventory Tracking**
   - Every inventory movement recorded
   - Cost tracking per transaction
   - Oldest cost used first (FIFO)
   - Running stock balance
   - Transaction history
   - Cost accuracy

3. **Transaction Types**
   - Purchase (add to inventory)
   - Used (job consumption)
   - Direct Order (job-specific, not stocked)
   - Return to Supplier
   - Customer Return
   - Damaged/Lost
   - Transfer (location change)
   - Adjustment (inventory correction)

4. **Storage Locations**
   - Hierarchical location system
   - Vehicle storage (truck bins/drawers)
   - Building storage (home/shop)
   - Location tracking per part
   - Transfer management

5. **Parts on Jobs**
   - Add parts to jobs
   - Track part costs per job
   - Stock vs. Direct Order
   - Quantity management
   - Cost allocation

6. **Stock Management**
   - Current stock calculations
   - Low stock alerts
   - Usage tracking
   - Last used date
   - Times used counter

## 📋 Implementation Steps

### Part 1: Parts Store Setup

Create `src/stores/partsStore.ts`:

```typescript
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface Part {
  id: string
  part_number: string
  description: string
  category?: string
  brand?: string
  avg_cost?: number
  markup_percent: number
  sell_price?: number
  in_stock: number
  min_stock?: number
  min_stock_override?: number
  min_stock_override_reason?: string
  auto_replenish: boolean
  times_used: number
  last_used_date?: string
  first_used_date?: string
  storage_location_id?: string
  location_notes?: string
  created_at: string
  updated_at: string
  
  // Relations
  storage_location?: StorageLocation
}

export interface PartsTransaction {
  id: string
  transaction_date: string
  part_number: string
  qty: number
  type: TransactionType
  unit_cost?: number
  total_cost?: number
  source?: string
  job_id?: string
  order_id?: string
  invoice_number?: string
  from_location_id?: string
  to_location_id?: string
  notes?: string
  created_by: string
  created_at: string
  
  // Relations
  part?: Part
  job?: any
}

export type TransactionType = 
  | 'Purchase'
  | 'Used'
  | 'Direct Order'
  | 'Return to Supplier'
  | 'Customer Return'
  | 'Damaged/Lost'
  | 'Transfer'
  | 'Adjustment'

export interface StorageLocation {
  id: string
  location_id: string
  location_type: 'Vehicle' | 'Building' | 'Container'
  location_name: string
  parent_location_id?: string
  description?: string
  label_number?: string
  active: boolean
  created_at: string
  
  // Relations
  parent_location?: StorageLocation
}

export interface JobPart {
  id: string
  job_id: string
  part_number: string
  description?: string
  quantity: number
  unit_cost: number
  total_cost: number
  markup_percent: number
  sell_price: number
  source: 'Stock' | 'Direct Order'
  transaction_id?: string
  notes?: string
  created_at: string
  
  // Relations
  part?: Part
}

interface PartsStore {
  // State
  parts: Part[]
  transactions: PartsTransaction[]
  locations: StorageLocation[]
  jobParts: JobPart[]
  currentPart: Part | null
  loading: boolean
  error: string | null
  
  // Parts CRUD
  fetchParts: () => Promise<void>
  fetchPartByNumber: (partNumber: string) => Promise<Part | null>
  createPart: (part: Partial<Part>) => Promise<Part>
  updatePart: (id: string, updates: Partial<Part>) => Promise<void>
  deletePart: (id: string) => Promise<void>
  searchParts: (query: string) => Promise<Part[]>
  
  // Transactions
  fetchTransactions: (partNumber?: string) => Promise<void>
  addTransaction: (transaction: Partial<PartsTransaction>) => Promise<PartsTransaction>
  getPartCostForJob: (partNumber: string, quantity: number) => Promise<{ lots: any[], totalCost: number, avgUnitCost: number }>
  
  // Storage Locations
  fetchLocations: () => Promise<void>
  createLocation: (location: Partial<StorageLocation>) => Promise<StorageLocation>
  updateLocation: (id: string, updates: Partial<StorageLocation>) => Promise<void>
  transferPart: (partNumber: string, quantity: number, fromLocationId: string, toLocationId: string, reason?: string) => Promise<void>
  
  // Job Parts
  fetchJobParts: (jobId: string) => Promise<void>
  addPartToJob: (jobId: string, jobPart: Partial<JobPart>) => Promise<JobPart>
  removePartFromJob: (jobPartId: string) => Promise<void>
  updateJobPart: (id: string, updates: Partial<JobPart>) => Promise<void>
  
  // Stock Management
  getStockLevel: (partNumber: string) => Promise<number>
  getLowStockParts: () => Promise<Part[]>
  updatePartUsage: (partNumber: string) => Promise<void>
}

export const usePartsStore = create<PartsStore>((set, get) => ({
  parts: [],
  transactions: [],
  locations: [],
  jobParts: [],
  currentPart: null,
  loading: false,
  error: null,

  fetchParts: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('parts_master')
        .select(`
          *,
          storage_location:storage_locations(*)
        `)
        .order('part_number')

      if (error) throw error
      set({ parts: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchPartByNumber: async (partNumber) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('parts_master')
        .select(`
          *,
          storage_location:storage_locations(*)
        `)
        .eq('part_number', partNumber)
        .single()

      if (error) throw error
      set({ currentPart: data, loading: false })
      return data
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return null
    }
  },

  createPart: async (part) => {
    set({ loading: true, error: null })
    try {
      // Check if part number already exists
      const { data: existing } = await supabase
        .from('parts_master')
        .select('part_number')
        .eq('part_number', part.part_number)
        .single()

      if (existing) {
        throw new Error('Part number already exists')
      }

      const newPart = {
        part_number: part.part_number?.toUpperCase(),
        description: part.description,
        category: part.category,
        brand: part.brand,
        markup_percent: part.markup_percent || 20,
        in_stock: 0,
        auto_replenish: part.auto_replenish ?? false,
        times_used: 0,
        storage_location_id: part.storage_location_id,
        location_notes: part.location_notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('parts_master')
        .insert([newPart])
        .select()
        .single()

      if (error) throw error

      // Refresh parts list
      await get().fetchParts()
      
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updatePart: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('parts_master')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // Refresh parts list
      await get().fetchParts()
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deletePart: async (id) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('parts_master')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh parts list
      await get().fetchParts()
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  searchParts: async (query) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('parts_master')
        .select('*')
        .or(`part_number.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`)
        .order('part_number')
        .limit(50)

      if (error) throw error
      set({ loading: false })
      return data || []
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return []
    }
  },

  fetchTransactions: async (partNumber) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('parts_transactions')
        .select(`
          *,
          part:parts_master(part_number, description),
          job:jobs(job_id, issue_description)
        `)
        .order('transaction_date', { ascending: false })

      if (partNumber) {
        query = query.eq('part_number', partNumber)
      }

      const { data, error } = await query

      if (error) throw error
      set({ transactions: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  addTransaction: async (transaction) => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const newTransaction = {
        transaction_date: new Date().toISOString(),
        part_number: transaction.part_number?.toUpperCase(),
        qty: transaction.qty,
        type: transaction.type,
        unit_cost: transaction.unit_cost,
        total_cost: transaction.qty && transaction.unit_cost 
          ? transaction.qty * transaction.unit_cost 
          : undefined,
        source: transaction.source,
        job_id: transaction.job_id,
        order_id: transaction.order_id,
        invoice_number: transaction.invoice_number,
        from_location_id: transaction.from_location_id,
        to_location_id: transaction.to_location_id,
        notes: transaction.notes,
        created_by: user?.email || 'system',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('parts_transactions')
        .insert([newTransaction])
        .select()
        .single()

      if (error) throw error

      // Update part stock levels and costs
      await get().updatePartAfterTransaction(transaction.part_number!)
      
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updatePartAfterTransaction: async (partNumber: string) => {
    try {
      // Calculate new stock level
      const { data: transactions } = await supabase
        .from('parts_transactions')
        .select('qty')
        .eq('part_number', partNumber)

      const inStock = transactions?.reduce((sum, t) => sum + t.qty, 0) || 0

      // Calculate average cost (from Purchase transactions only)
      const { data: purchases } = await supabase
        .from('parts_transactions')
        .select('unit_cost, qty')
        .eq('part_number', partNumber)
        .eq('type', 'Purchase')
        .not('unit_cost', 'is', null)

      let avgCost = undefined
      if (purchases && purchases.length > 0) {
        const totalCost = purchases.reduce((sum, p) => sum + (p.unit_cost * Math.abs(p.qty)), 0)
        const totalQty = purchases.reduce((sum, p) => sum + Math.abs(p.qty), 0)
        avgCost = totalQty > 0 ? totalCost / totalQty : undefined
      }

      // Calculate sell price
      const { data: part } = await supabase
        .from('parts_master')
        .select('markup_percent')
        .eq('part_number', partNumber)
        .single()

      const sellPrice = avgCost && part?.markup_percent
        ? avgCost * (1 + part.markup_percent / 100)
        : undefined

      // Update part
      await supabase
        .from('parts_master')
        .update({
          in_stock: inStock,
          avg_cost: avgCost,
          sell_price: sellPrice,
          updated_at: new Date().toISOString()
        })
        .eq('part_number', partNumber)

      // Refresh parts list
      await get().fetchParts()
    } catch (error) {
      console.error('Error updating part after transaction:', error)
    }
  },

  getPartCostForJob: async (partNumber, quantity) => {
    try {
      // Get all purchase transactions for this part (oldest first)
      const { data: purchases, error } = await supabase
        .from('parts_transactions')
        .select('*')
        .eq('part_number', partNumber)
        .eq('type', 'Purchase')
        .gt('qty', 0)
        .not('unit_cost', 'is', null)
        .order('transaction_date', { ascending: true })

      if (error) throw error
      if (!purchases || purchases.length === 0) {
        return { lots: [], totalCost: 0, avgUnitCost: 0 }
      }

      // Get all usage to calculate remaining qty per lot
      const { data: usages } = await supabase
        .from('parts_transactions')
        .select('*')
        .eq('part_number', partNumber)
        .lt('qty', 0)
        .order('transaction_date', { ascending: true })

      // Calculate FIFO lots
      const lots: any[] = []
      let remaining = quantity
      let usedSoFar = Math.abs(usages?.reduce((sum, u) => sum + u.qty, 0) || 0)

      for (const purchase of purchases) {
        if (remaining <= 0) break

        const purchaseQty = purchase.qty
        const availableInLot = Math.max(0, purchaseQty - usedSoFar)
        
        if (availableInLot > 0) {
          const useFromLot = Math.min(remaining, availableInLot)
          
          lots.push({
            transaction_id: purchase.id,
            transaction_date: purchase.transaction_date,
            qty: useFromLot,
            unit_cost: purchase.unit_cost,
            subtotal: useFromLot * purchase.unit_cost
          })

          remaining -= useFromLot
        }

        usedSoFar = Math.max(0, usedSoFar - purchaseQty)
      }

      const totalCost = lots.reduce((sum, lot) => sum + lot.subtotal, 0)
      const avgUnitCost = quantity > 0 ? totalCost / quantity : 0

      return { lots, totalCost, avgUnitCost }
    } catch (error) {
      console.error('Error calculating FIFO cost:', error)
      return { lots: [], totalCost: 0, avgUnitCost: 0 }
    }
  },

  fetchLocations: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .eq('active', true)
        .order('location_name')

      if (error) throw error
      set({ locations: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createLocation: async (location) => {
    set({ loading: true, error: null })
    try {
      // Generate location ID
      const { data: lastLocation } = await supabase
        .from('storage_locations')
        .select('location_id')
        .order('location_id', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastLocation?.location_id) {
        const lastNumber = parseInt(lastLocation.location_id.split('-')[1])
        nextNumber = lastNumber + 1
      }
      const locationId = `LOC-${String(nextNumber).padStart(3, '0')}`

      const newLocation = {
        location_id: locationId,
        location_type: location.location_type,
        location_name: location.location_name,
        parent_location_id: location.parent_location_id,
        description: location.description,
        label_number: location.label_number,
        active: true,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('storage_locations')
        .insert([newLocation])
        .select()
        .single()

      if (error) throw error

      await get().fetchLocations()
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateLocation: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('storage_locations')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await get().fetchLocations()
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  transferPart: async (partNumber, quantity, fromLocationId, toLocationId, reason) => {
    set({ loading: true, error: null })
    try {
      // Create transfer transaction
      await get().addTransaction({
        part_number: partNumber,
        qty: 0, // Transfer doesn't change quantity
        type: 'Transfer',
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        notes: reason || 'Part transfer'
      })

      // Update part location
      await supabase
        .from('parts_master')
        .update({
          storage_location_id: toLocationId,
          updated_at: new Date().toISOString()
        })
        .eq('part_number', partNumber)

      await get().fetchParts()
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  fetchJobParts: async (jobId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('job_parts')
        .select(`
          *,
          part:parts_master(*)
        `)
        .eq('job_id', jobId)
        .order('created_at')

      if (error) throw error
      set({ jobParts: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  addPartToJob: async (jobId, jobPart) => {
    set({ loading: true, error: null })
    try {
      let unitCost = jobPart.unit_cost
      let transactionId = undefined

      // If using from stock, calculate FIFO cost
      if (jobPart.source === 'Stock' && jobPart.part_number) {
        const costData = await get().getPartCostForJob(jobPart.part_number, jobPart.quantity!)
        unitCost = costData.avgUnitCost
        
        // Create transaction to reduce stock
        const transaction = await get().addTransaction({
          part_number: jobPart.part_number,
          qty: -(jobPart.quantity!), // Negative to reduce stock
          type: 'Used',
          unit_cost: unitCost,
          job_id: jobId,
          notes: `Used on job ${jobId}`
        })
        
        transactionId = transaction.id
      }

      // Get part info for sell price
      const { data: part } = await supabase
        .from('parts_master')
        .select('markup_percent, description')
        .eq('part_number', jobPart.part_number)
        .single()

      const markupPercent = jobPart.markup_percent || part?.markup_percent || 20
      const sellPrice = unitCost ? unitCost * (1 + markupPercent / 100) : jobPart.sell_price || 0

      const newJobPart = {
        job_id: jobId,
        part_number: jobPart.part_number?.toUpperCase(),
        description: jobPart.description || part?.description,
        quantity: jobPart.quantity,
        unit_cost: unitCost,
        total_cost: (unitCost || 0) * (jobPart.quantity || 0),
        markup_percent: markupPercent,
        sell_price: sellPrice * (jobPart.quantity || 0),
        source: jobPart.source,
        transaction_id: transactionId,
        notes: jobPart.notes,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('job_parts')
        .insert([newJobPart])
        .select()
        .single()

      if (error) throw error

      // Update job total cost
      await get().updateJobTotalCost(jobId)
      
      // Update part usage stats
      if (jobPart.part_number) {
        await get().updatePartUsage(jobPart.part_number)
      }

      await get().fetchJobParts(jobId)
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  removePartFromJob: async (jobPartId) => {
    set({ loading: true, error: null })
    try {
      // Get the job part details first
      const { data: jobPart } = await supabase
        .from('job_parts')
        .select('*')
        .eq('id', jobPartId)
        .single()

      if (jobPart) {
        // If it was from stock, reverse the transaction
        if (jobPart.source === 'Stock' && jobPart.transaction_id) {
          // Create reverse transaction
          await get().addTransaction({
            part_number: jobPart.part_number,
            qty: jobPart.quantity, // Positive to add back to stock
            type: 'Adjustment',
            unit_cost: jobPart.unit_cost,
            notes: `Removed from job ${jobPart.job_id}`
          })
        }

        // Delete the job part
        const { error } = await supabase
          .from('job_parts')
          .delete()
          .eq('id', jobPartId)

        if (error) throw error

        // Update job total cost
        await get().updateJobTotalCost(jobPart.job_id)
      }

      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateJobPart: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('job_parts')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateJobTotalCost: async (jobId: string) => {
    try {
      const { data: jobParts } = await supabase
        .from('job_parts')
        .select('total_cost, sell_price')
        .eq('job_id', jobId)

      const totalPartsCost = jobParts?.reduce((sum, jp) => sum + (jp.total_cost || 0), 0) || 0
      const totalPartsSell = jobParts?.reduce((sum, jp) => sum + (jp.sell_price || 0), 0) || 0

      // Update job (you may need to add these fields to jobs table)
      await supabase
        .from('jobs')
        .update({
          parts_cost: totalPartsCost,
          parts_total: totalPartsSell,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
    } catch (error) {
      console.error('Error updating job total cost:', error)
    }
  },

  getStockLevel: async (partNumber) => {
    try {
      const { data, error } = await supabase
        .from('parts_master')
        .select('in_stock')
        .eq('part_number', partNumber)
        .single()

      if (error) throw error
      return data?.in_stock || 0
    } catch (error) {
      console.error('Error getting stock level:', error)
      return 0
    }
  },

  getLowStockParts: async () => {
    try {
      const { data, error } = await supabase
        .from('parts_master')
        .select('*')
        .or('in_stock.lt.min_stock,in_stock.lt.min_stock_override')
        .order('in_stock', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting low stock parts:', error)
      return []
    }
  },

  updatePartUsage: async (partNumber) => {
    try {
      const { data: part } = await supabase
        .from('parts_master')
        .select('times_used, first_used_date')
        .eq('part_number', partNumber)
        .single()

      const updates: any = {
        times_used: (part?.times_used || 0) + 1,
        last_used_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (!part?.first_used_date) {
        updates.first_used_date = new Date().toISOString()
      }

      await supabase
        .from('parts_master')
        .update(updates)
        .eq('part_number', partNumber)
    } catch (error) {
      console.error('Error updating part usage:', error)
    }
  }
}))
```

### Part 2: Parts List Component

Create `src/components/parts/PartsList.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Package, AlertCircle } from 'lucide-react'
import { usePartsStore } from '../../stores/partsStore'

export function PartsList() {
  const { parts, fetchParts, searchParts, loading } = usePartsStore()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchParts()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchParts(query)
    } else {
      await fetchParts()
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStockStatus = (part: any) => {
    const minStock = part.min_stock_override || part.min_stock || 0
    if (part.in_stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    if (part.in_stock <= minStock) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts Inventory</h1>
          <p className="text-gray-600 mt-1">Manage your parts catalog and stock</p>
        </div>
        <Link
          to="/parts/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus size={20} />
          Add Part
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by part number, description, or brand..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Package className="text-blue-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">Total Parts</p>
              <p className="text-2xl font-bold text-gray-900">{parts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Package className="text-green-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {parts.filter(p => p.in_stock > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-yellow-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {parts.filter(p => {
                  const minStock = p.min_stock_override || p.min_stock || 0
                  return p.in_stock > 0 && p.in_stock <= minStock
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {parts.filter(p => p.in_stock === 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Parts Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading parts...</p>
        </div>
      ) : parts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-4">No parts in inventory yet</p>
          <Link
            to="/parts/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus size={20} />
            Add Your First Part
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sell Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parts.map((part) => {
                  const status = getStockStatus(part)
                  return (
                    <tr key={part.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/parts/${part.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {part.part_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{part.description}</div>
                        {part.category && (
                          <div className="text-xs text-gray-500">{part.category}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {part.brand || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{part.in_stock}</div>
                        {(part.min_stock_override || part.min_stock) && (
                          <div className="text-xs text-gray-500">
                            Min: {part.min_stock_override || part.min_stock}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(part.avg_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(part.sell_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Part 3: Add Part to Job Component

Create `src/components/parts/AddPartToJob.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { usePartsStore, type Part } from '../../stores/partsStore'

interface AddPartToJobProps {
  jobId: string
  onPartAdded?: () => void
}

export function AddPartToJob({ jobId, onPartAdded }: AddPartToJobProps) {
  const { parts, searchParts, addPartToJob, loading } = usePartsStore()
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Part[]>([])
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [source, setSource] = useState<'Stock' | 'Direct Order'>('Stock')
  const [unitCost, setUnitCost] = useState<number>(0)
  const [markupPercent, setMarkupPercent] = useState(20)
  const [notes, setNotes] = useState('')

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      const results = await searchParts(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part)
    setUnitCost(part.avg_cost || 0)
    setMarkupPercent(part.markup_percent)
    
    if (part.in_stock < quantity) {
      setSource('Direct Order')
    }
  }

  const handleSubmit = async () => {
    if (!selectedPart) return

    try {
      await addPartToJob(jobId, {
        part_number: selectedPart.part_number,
        quantity,
        unit_cost: source === 'Direct Order' ? unitCost : undefined,
        markup_percent: markupPercent,
        source,
        notes
      })

      setShowModal(false)
      setSelectedPart(null)
      setSearchQuery('')
      setQuantity(1)
      setSource('Stock')
      setUnitCost(0)
      setNotes('')

      if (onPartAdded) {
        onPartAdded()
      }
    } catch (error) {
      console.error('Error adding part to job:', error)
      alert('Failed to add part to job')
    }
  }

  const calculateSellPrice = () => {
    const cost = source === 'Stock' && selectedPart?.avg_cost
      ? selectedPart.avg_cost
      : unitCost
    return cost * (1 + markupPercent / 100) * quantity
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        <Plus size={20} />
        Add Part
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add Part to Job</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Part Search */}
              {!selectedPart && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search for Part
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by part number, description, or brand..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                      {searchResults.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => handleSelectPart(part)}
                          className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{part.part_number}</p>
                              <p className="text-sm text-gray-600">{part.description}</p>
                              {part.brand && (
                                <p className="text-xs text-gray-500">{part.brand}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                Stock: {part.in_stock}
                              </p>
                              <p className="text-xs text-gray-600">
                                ${part.avg_cost?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Part Details */}
              {selectedPart && (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{selectedPart.part_number}</p>
                        <p className="text-sm text-gray-600">{selectedPart.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {selectedPart.in_stock} units
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPart(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Source *
                      </label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value as any)}
                        disabled={selectedPart.in_stock < quantity}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="Stock">From Stock</option>
                        <option value="Direct Order">Direct Order</option>
                      </select>
                      {selectedPart.in_stock < quantity && (
                        <p className="text-xs text-red-600 mt-1">
                          Not enough stock - will be direct order
                        </p>
                      )}
                    </div>
                  </div>

                  {source === 'Direct Order' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Cost * (Direct Order)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={unitCost}
                          onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Markup Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="500"
                        value={markupPercent}
                        onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                        className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-3 text-gray-500">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Any special notes about this part..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Price Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Unit Cost:</span>
                      <span className="font-medium">
                        ${(source === 'Stock' ? selectedPart.avg_cost || 0 : unitCost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Markup:</span>
                      <span className="font-medium">{markupPercent}%</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Customer Price:</span>
                      <span className="font-bold text-blue-600 text-lg">
                        ${calculateSellPrice().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedPart || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Adding...' : 'Add to Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

### Part 4: Job Parts Display

Create `src/components/parts/JobPartsDisplay.tsx`:

```typescript
import { useEffect } from 'react'
import { Trash2, Package } from 'lucide-react'
import { usePartsStore } from '../../stores/partsStore'

interface JobPartsDisplayProps {
  jobId: string
}

export function JobPartsDisplay({ jobId }: JobPartsDisplayProps) {
  const { jobParts, fetchJobParts, removePartFromJob, loading } = usePartsStore()

  useEffect(() => {
    fetchJobParts(jobId)
  }, [jobId])

  const handleRemovePart = async (jobPartId: string) => {
    if (!confirm('Are you sure you want to remove this part from the job?')) return
    
    try {
      await removePartFromJob(jobPartId)
      await fetchJobParts(jobId)
    } catch (error) {
      console.error('Error removing part:', error)
      alert('Failed to remove part')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const totalPartsCost = jobParts.reduce((sum, jp) => sum + jp.total_cost, 0)
  const totalPartsSell = jobParts.reduce((sum, jp) => sum + jp.sell_price, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Parts on Job</h3>

      {jobParts.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600 text-sm">No parts added yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {jobParts.map((jobPart) => (
              <div
                key={jobPart.id}
                className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 font-mono">
                      {jobPart.part_number}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      jobPart.source === 'Stock'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {jobPart.source}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{jobPart.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Qty: {jobPart.quantity}</span>
                    <span>Cost: {formatCurrency(jobPart.unit_cost)}</span>
                    <span>Markup: {jobPart.markup_percent}%</span>
                  </div>
                  {jobPart.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{jobPart.notes}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(jobPart.sell_price)}
                  </p>
                  <button
                    onClick={() => handleRemovePart(jobPart.id)}
                    disabled={loading}
                    className="mt-2 p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Parts Cost:</span>
              <span className="font-medium">{formatCurrency(totalPartsCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Parts Total:</span>
              <span className="font-bold text-blue-600 text-lg">
                {formatCurrency(totalPartsSell)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

### Part 5: Update Job Detail Page

Update `src/pages/jobs/JobDetail.tsx` to include parts:

```typescript
// Add to imports
import { AddPartToJob } from '../../components/parts/AddPartToJob'
import { JobPartsDisplay } from '../../components/parts/JobPartsDisplay'

// Add a new tab for Parts
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'parts', label: 'Parts' }, // NEW
  { id: 'visits', label: `Visits (${currentJob.visit_count})` },
  { id: 'history', label: 'History' }
]

// Add the parts tab content
{activeTab === 'parts' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">Job Parts</h2>
      <AddPartToJob jobId={id!} onPartAdded={() => fetchJobById(id!)} />
    </div>
    
    <JobPartsDisplay jobId={id!} />
  </div>
)}
```

### Part 6: Database Tables

Ensure these tables exist in Supabase:

```sql
-- Parts Master table
CREATE TABLE IF NOT EXISTS parts_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  brand VARCHAR(100),
  avg_cost DECIMAL(10,2),
  markup_percent DECIMAL(5,2) DEFAULT 20,
  sell_price DECIMAL(10,2),
  in_stock INTEGER DEFAULT 0,
  min_stock INTEGER,
  min_stock_override INTEGER,
  min_stock_override_reason TEXT,
  auto_replenish BOOLEAN DEFAULT false,
  times_used INTEGER DEFAULT 0,
  last_used_date TIMESTAMPTZ,
  first_used_date TIMESTAMPTZ,
  storage_location_id UUID REFERENCES storage_locations(id),
  location_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts Transactions table
CREATE TABLE IF NOT EXISTS parts_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  part_number VARCHAR(50) REFERENCES parts_master(part_number),
  qty INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  source VARCHAR(100),
  job_id UUID REFERENCES jobs(id),
  order_id VARCHAR(50),
  invoice_number VARCHAR(100),
  from_location_id UUID REFERENCES storage_locations(id),
  to_location_id UUID REFERENCES storage_locations(id),
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage Locations table
CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id VARCHAR(20) UNIQUE NOT NULL,
  location_type VARCHAR(20) NOT NULL,
  location_name VARCHAR(100) NOT NULL,
  parent_location_id UUID REFERENCES storage_locations(id),
  description TEXT,
  label_number VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Parts table
CREATE TABLE IF NOT EXISTS job_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  part_number VARCHAR(50) REFERENCES parts_master(part_number),
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  markup_percent DECIMAL(5,2) DEFAULT 20,
  sell_price DECIMAL(10,2) NOT NULL,
  source VARCHAR(20) NOT NULL,
  transaction_id UUID REFERENCES parts_transactions(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add parts cost fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parts_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parts_total DECIMAL(10,2) DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts_master(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts_master(category);
CREATE INDEX IF NOT EXISTS idx_parts_brand ON parts_master(brand);
CREATE INDEX IF NOT EXISTS idx_transactions_part ON parts_transactions(part_number);
CREATE INDEX IF NOT EXISTS idx_transactions_job ON parts_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON parts_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_job_parts_job ON job_parts(job_id);
CREATE INDEX IF NOT EXISTS idx_job_parts_part ON job_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON storage_locations(parent_location_id);
```

### Part 7: Update App Routing

Update `src/App.tsx` to include parts routes:

```typescript
import { PartsList } from './pages/parts/PartsList'
import { PartDetail } from './pages/parts/PartDetail'
import { NewPart } from './pages/parts/NewPart'

// In the routes section:
<Route path="parts">
  <Route index element={<PartsList />} />
  <Route path="new" element={<NewPart />} />
  <Route path=":id" element={<PartDetail />} />
</Route>
```

## ✅ Success Metrics

Stage 5 is complete when:

- [ ] Can create new parts with part numbers
- [ ] Part numbers are unique and uppercase
- [ ] Parts list displays with search
- [ ] Can add parts to inventory (Purchase transaction)
- [ ] FIFO costing calculates correctly
- [ ] Average cost updates after purchases
- [ ] Sell price calculates based on markup
- [ ] Can add parts to jobs from stock
- [ ] Stock levels decrease when parts used
- [ ] Can add parts as Direct Order (doesn't affect stock)
- [ ] Job parts display with totals
- [ ] Can remove parts from jobs
- [ ] Storage locations can be created
- [ ] Hierarchical locations work
- [ ] Can transfer parts between locations
- [ ] Transaction history tracks all movements
- [ ] Low stock parts identified correctly
- [ ] Out of stock parts flagged
- [ ] Part usage statistics update
- [ ] Times used counter increments
- [ ] Last used date updates
- [ ] No console errors

## 🚫 Troubleshooting

**Part number already exists:**
- Check for duplicate entries
- Verify uppercase conversion
- Test unique constraint

**FIFO costs not calculating:**
- Verify Purchase transactions exist
- Check transaction dates are correct
- Test getPartCostForJob function
- Verify qty is positive for purchases

**Stock levels incorrect:**
- Check all transaction types
- Verify negative qty for usage
- Test updatePartAfterTransaction
- Check transaction history

**Parts not adding to jobs:**
- Verify job_parts table exists
- Check foreign key relationships
- Test stock availability
- Verify cost calculations

**Location transfers not working:**
- Check storage_locations table
- Verify parent_location_id relationships
- Test transfer transaction creation
- Check location updates

## 📝 Notes for Next Stage

Stage 6 will build upon this parts foundation to add:
- AI-powered cross-references (Claude API)
- Automatic part compatibility lookup
- Cross-reference groups for unified stock
- Testing procedures for parts
- Model-specific part databases
- Common issues tracking

## 🎯 Summary

You now have:
- Complete parts catalog system
- FIFO cost tracking
- Multi-location storage
- Parts usage on jobs
- Stock vs Direct Order handling
- Transaction history
- Hierarchical storage locations
- Low stock alerts
- Usage statistics
- Cost and sell price calculations

This parts system provides accurate inventory tracking and job costing!

---

## 💡 Tips for Success

1. **Test FIFO thoroughly**: Add multiple purchases at different costs, then use parts and verify correct cost allocation
2. **Verify stock calculations**: Add parts, use parts, check that stock levels are accurate
3. **Test Direct Order**: Add part to job as Direct Order, verify stock doesn't change
4. **Check transaction history**: Every action should create proper transaction record
5. **Test storage locations**: Create hierarchy, transfer parts, verify updates
6. **Verify job totals**: Add/remove parts on jobs, check that job totals update

Stage 5 is critical for accurate job costing - test thoroughly before moving to Stage 6!
