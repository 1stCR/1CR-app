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
  updatePartAfterTransaction: (partNumber: string) => Promise<void>

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
  updateJobTotalCost: (jobId: string) => Promise<void>

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
        .eq('part_number', part.part_number?.toUpperCase())
        .maybeSingle()

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
      set({ parts: data || [], loading: false })
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
        console.log('[addPartToJob] Calculating FIFO cost...')
        const costData = await get().getPartCostForJob(jobPart.part_number, jobPart.quantity!)
        unitCost = costData.avgUnitCost
        console.log('[addPartToJob] FIFO cost calculated:', unitCost)

        // Create transaction to reduce stock
        console.log('[addPartToJob] Creating transaction...')
        const transaction = await get().addTransaction({
          part_number: jobPart.part_number,
          qty: -(jobPart.quantity!), // Negative to reduce stock
          type: 'Used',
          unit_cost: unitCost,
          job_id: jobId,
          notes: `Used on job ${jobId}`
        })

        transactionId = transaction.id
        console.log('[addPartToJob] Transaction created:', transactionId)
      }

      // Get part info for sell price
      console.log('[addPartToJob] Fetching part info...')
      const { data: part, error: partError } = await supabase
        .from('parts_master')
        .select('markup_percent, description')
        .eq('part_number', jobPart.part_number)
        .maybeSingle()

      if (partError) {
        console.error('[addPartToJob] Part fetch error:', partError)
        throw partError
      }

      // Use part data if available, otherwise use defaults
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

      console.log('[addPartToJob] Inserting job_parts record:', newJobPart)
      const { data, error } = await supabase
        .from('job_parts')
        .insert([newJobPart])
        .select()
        .single()

      console.log('[addPartToJob] Insert result:', { data, error })

      if (error) {
        console.error('[addPartToJob] Insert error:', error)
        throw error
      }

      if (!data) {
        console.error('[addPartToJob] No data returned from insert!')
        throw new Error('No data returned from insert')
      }

      console.log('[addPartToJob] Insert successful!', data)

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

      // Update job
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
      // Get all parts and filter client-side for low stock
      const { data, error } = await supabase
        .from('parts_master')
        .select('*')
        .order('in_stock', { ascending: true })

      if (error) throw error

      // Filter parts where stock is below min_stock or min_stock_override
      const lowStockParts = (data || []).filter(part => {
        const threshold = part.min_stock_override || part.min_stock
        return threshold !== null && threshold !== undefined && part.in_stock < threshold
      })

      return lowStockParts
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
