# Stage 3: Job Management Core

## 🎯 Objective
Build comprehensive job management system with creation wizard, status tracking, multi-visit support, callback workflows, and job history management.

## ✅ Prerequisites
- Stage 1 completed (Foundation & Auth working)
- Stage 2 completed (Customer management functional)
- Database tables created for jobs, job_history, callbacks
- Authentication system operational
- Customer data available for selection

## 🛠️ What We're Building

### Core Features:
1. **3-Step Job Creation Wizard**
   - Customer selection with search
   - Appliance information entry
   - Issue description and scheduling

2. **Job Management System**
   - Job ID auto-generation (J-0001, J-0002, etc.)
   - Job list with filtering and search
   - Job detail page with full information

3. **Status Workflow System**
   - Job stages: Intake → Diagnosis → Parts → Repair → Complete
   - Current status tracking per stage
   - Parts status tracking
   - Status history logging

4. **Multi-Visit Tracking**
   - Visit counter (1-5+)
   - Visit type tracking (Diagnosis, Repair, Callback, Follow-up)
   - Visit status per visit
   - Scheduling for future visits

5. **Callback System**
   - Callback flag with reason tracking
   - Link to original job
   - Callback count tracking
   - Special pricing logic handling

6. **Job Outcome Tracking**
   - First Call Complete
   - Two Visit Complete
   - Multi-Visit (various reasons)
   - Callback scenarios

## 📋 Implementation Steps

### Part 1: Job Store Setup

Create `src/stores/jobStore.ts`:

```typescript
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Customer } from './customerStore'

export interface Job {
  id: string
  job_id: string
  customer_id: string
  
  // Appliance Information
  appliance_type: string
  brand?: string
  model_number?: string
  serial_number?: string
  issue_description: string
  
  // Workflow Status
  job_stage: 'Intake' | 'Diagnosis' | 'Parts' | 'Repair' | 'Complete'
  current_status: string
  parts_status?: 'Not Needed' | 'Pending Approval' | 'Ordered' | 'Shipped' | 'Delivered' | 'Ready'
  job_outcome?: string
  
  // Scheduling
  scheduled_date?: string
  scheduled_time_window?: string
  priority: 'Normal' | 'High' | 'Urgent'
  
  // Visit Tracking
  is_callback: boolean
  callback_reason?: 'Same Issue - Our Fault' | 'New Issue' | 'Customer Error' | 'Wear & Tear'
  original_job_id?: string
  related_job_ids?: string
  callback_count: number
  visit_count: number
  visit_1_date?: string
  visit_1_type?: string
  visit_1_status?: string
  visit_2_date?: string
  visit_2_type?: string
  visit_2_status?: string
  visit_3_date?: string
  visit_3_type?: string
  visit_3_status?: string
  visit_4_date?: string
  visit_4_type?: string
  visit_4_status?: string
  visit_5_date?: string
  visit_5_type?: string
  visit_5_status?: string
  
  // Multi-Job Support
  primary_job: boolean
  added_on_site: boolean
  combined_invoice: boolean
  
  // Photos
  photos_folder_url?: string
  photo_count: number
  has_site_photos: boolean
  has_diagnosis_photos: boolean
  has_repair_photos: boolean
  
  // Financial (tracking only at this stage)
  quote_total?: number
  invoice_total?: number
  amount_paid?: number
  payment_status?: 'Unpaid' | 'Partial' | 'Paid' | 'Credited'
  payment_method?: string
  payment_date?: string
  
  // Time Tracking (will be populated by Tour in Stage 4)
  travel_time_minutes?: number
  diagnosis_time_minutes?: number
  research_time_minutes?: number
  repair_time_minutes?: number
  total_time_minutes?: number
  mileage?: number
  
  // Contacts
  primary_contact_id?: string
  primary_contact_name?: string
  primary_contact_phone?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  completed_at?: string
  
  // Relations (populated by joins)
  customer?: Customer
}

export interface JobHistory {
  id: string
  job_id: string
  changed_by: string
  field_changed: string
  old_value?: string
  new_value?: string
  notes?: string
  created_at: string
}

export interface JobVisit {
  visit_number: number
  date?: string
  type?: 'Diagnosis' | 'Repair' | 'Callback' | 'Follow-up'
  status?: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-Show'
}

interface JobStore {
  jobs: Job[]
  currentJob: Job | null
  jobHistory: JobHistory[]
  loading: boolean
  error: string | null
  
  // Job CRUD
  fetchJobs: (filters?: JobFilters) => Promise<void>
  fetchJobById: (id: string) => Promise<Job | null>
  createJob: (job: Partial<Job>) => Promise<Job>
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>
  deleteJob: (id: string) => Promise<void>
  
  // Job workflow
  updateJobStage: (id: string, newStage: Job['job_stage'], status: string, notes?: string) => Promise<void>
  updateJobStatus: (id: string, status: string, notes?: string) => Promise<void>
  updatePartsStatus: (id: string, partsStatus: Job['parts_status'], notes?: string) => Promise<void>
  
  // Visit management
  addVisit: (jobId: string, visit: JobVisit) => Promise<void>
  updateVisit: (jobId: string, visitNumber: number, updates: Partial<JobVisit>) => Promise<void>
  
  // Callback handling
  createCallbackJob: (originalJobId: string, reason: Job['callback_reason'], newIssue?: string) => Promise<Job>
  
  // Job history
  fetchJobHistory: (jobId: string) => Promise<void>
  addJobHistory: (history: Partial<JobHistory>) => Promise<void>
  
  // Search and filter
  searchJobs: (query: string) => Promise<Job[]>
  filterJobsByStage: (stage: Job['job_stage']) => Promise<Job[]>
  filterJobsByStatus: (status: string) => Promise<Job[]>
}

export interface JobFilters {
  stage?: Job['job_stage']
  status?: string
  priority?: Job['priority']
  dateFrom?: string
  dateTo?: string
  customerId?: string
  isCallback?: boolean
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  currentJob: null,
  jobHistory: [],
  loading: false,
  error: null,

  fetchJobs: async (filters) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })
      
      if (filters?.stage) {
        query = query.eq('job_stage', filters.stage)
      }
      if (filters?.status) {
        query = query.eq('current_status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }
      if (filters?.isCallback !== undefined) {
        query = query.eq('is_callback', filters.isCallback)
      }
      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo)
      }

      const { data, error } = await query

      if (error) throw error
      set({ jobs: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchJobById: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      set({ currentJob: data, loading: false })
      return data
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return null
    }
  },

  createJob: async (job) => {
    set({ loading: true, error: null })
    try {
      // Get the last job to generate next ID
      const { data: lastJob } = await supabase
        .from('jobs')
        .select('job_id')
        .order('job_id', { ascending: false })
        .limit(1)
        .single()

      // Generate next job ID (J-0001, J-0002, etc.)
      let nextNumber = 1
      if (lastJob?.job_id) {
        const lastNumber = parseInt(lastJob.job_id.split('-')[1])
        nextNumber = lastNumber + 1
      }
      const jobId = `J-${String(nextNumber).padStart(4, '0')}`

      // Set defaults
      const newJob = {
        job_id: jobId,
        job_stage: 'Intake' as const,
        current_status: 'New',
        is_callback: false,
        callback_count: 0,
        visit_count: 1,
        visit_1_type: 'Diagnosis',
        visit_1_status: 'Scheduled',
        primary_job: true,
        added_on_site: false,
        combined_invoice: false,
        photo_count: 0,
        has_site_photos: false,
        has_diagnosis_photos: false,
        has_repair_photos: false,
        priority: 'Normal' as const,
        ...job,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([newJob])
        .select()
        .single()

      if (error) throw error

      // Log the creation in job history
      await get().addJobHistory({
        job_id: data.id,
        field_changed: 'created',
        new_value: jobId,
        notes: 'Job created'
      })

      // Refresh jobs list
      await get().fetchJobs()
      
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateJob: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // Refresh current job if it's the one being updated
      if (get().currentJob?.id === id) {
        await get().fetchJobById(id)
      }
      
      // Refresh jobs list
      await get().fetchJobs()
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteJob: async (id) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh jobs list
      await get().fetchJobs()
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateJobStage: async (id, newStage, status, notes) => {
    try {
      const job = await get().fetchJobById(id)
      if (!job) throw new Error('Job not found')

      // Update the job stage and status
      await get().updateJob(id, {
        job_stage: newStage,
        current_status: status
      })

      // Log the change in history
      await get().addJobHistory({
        job_id: id,
        field_changed: 'job_stage',
        old_value: job.job_stage,
        new_value: newStage,
        notes: notes || `Stage changed to ${newStage}, status: ${status}`
      })
    } catch (error) {
      throw error
    }
  },

  updateJobStatus: async (id, status, notes) => {
    try {
      const job = await get().fetchJobById(id)
      if (!job) throw new Error('Job not found')

      await get().updateJob(id, { current_status: status })

      await get().addJobHistory({
        job_id: id,
        field_changed: 'current_status',
        old_value: job.current_status,
        new_value: status,
        notes: notes || `Status changed to ${status}`
      })
    } catch (error) {
      throw error
    }
  },

  updatePartsStatus: async (id, partsStatus, notes) => {
    try {
      const job = await get().fetchJobById(id)
      if (!job) throw new Error('Job not found')

      await get().updateJob(id, { parts_status: partsStatus })

      await get().addJobHistory({
        job_id: id,
        field_changed: 'parts_status',
        old_value: job.parts_status || 'none',
        new_value: partsStatus || 'none',
        notes: notes || `Parts status changed to ${partsStatus}`
      })
    } catch (error) {
      throw error
    }
  },

  addVisit: async (jobId, visit) => {
    try {
      const job = await get().fetchJobById(jobId)
      if (!job) throw new Error('Job not found')

      const visitCount = job.visit_count + 1
      const visitKey = `visit_${visitCount}`

      await get().updateJob(jobId, {
        visit_count: visitCount,
        [`${visitKey}_date`]: visit.date,
        [`${visitKey}_type`]: visit.type,
        [`${visitKey}_status`]: visit.status || 'Scheduled'
      })

      await get().addJobHistory({
        job_id: jobId,
        field_changed: 'visit_added',
        new_value: `Visit #${visitCount} - ${visit.type}`,
        notes: `Added visit #${visitCount}`
      })
    } catch (error) {
      throw error
    }
  },

  updateVisit: async (jobId, visitNumber, updates) => {
    try {
      const visitKey = `visit_${visitNumber}`
      const updateFields: any = {}

      if (updates.date !== undefined) {
        updateFields[`${visitKey}_date`] = updates.date
      }
      if (updates.type !== undefined) {
        updateFields[`${visitKey}_type`] = updates.type
      }
      if (updates.status !== undefined) {
        updateFields[`${visitKey}_status`] = updates.status
      }

      await get().updateJob(jobId, updateFields)

      await get().addJobHistory({
        job_id: jobId,
        field_changed: `visit_${visitNumber}_updated`,
        new_value: JSON.stringify(updates),
        notes: `Updated visit #${visitNumber}`
      })
    } catch (error) {
      throw error
    }
  },

  createCallbackJob: async (originalJobId, reason, newIssue) => {
    try {
      const originalJob = await get().fetchJobById(originalJobId)
      if (!originalJob) throw new Error('Original job not found')

      // Create new job with callback info
      const callbackJob = await get().createJob({
        customer_id: originalJob.customer_id,
        appliance_type: originalJob.appliance_type,
        brand: originalJob.brand,
        model_number: originalJob.model_number,
        serial_number: originalJob.serial_number,
        issue_description: newIssue || `Callback: ${reason} - ${originalJob.issue_description}`,
        is_callback: true,
        callback_reason: reason,
        original_job_id: originalJobId,
        callback_count: (originalJob.callback_count || 0) + 1,
        primary_contact_id: originalJob.primary_contact_id,
        primary_contact_name: originalJob.primary_contact_name,
        primary_contact_phone: originalJob.primary_contact_phone
      })

      // Update original job to track the callback
      const relatedIds = originalJob.related_job_ids
        ? `${originalJob.related_job_ids},${callbackJob.job_id}`
        : callbackJob.job_id

      await get().updateJob(originalJobId, {
        related_job_ids: relatedIds,
        callback_count: (originalJob.callback_count || 0) + 1
      })

      await get().addJobHistory({
        job_id: originalJobId,
        field_changed: 'callback_created',
        new_value: callbackJob.job_id,
        notes: `Callback job created: ${reason}`
      })

      return callbackJob
    } catch (error) {
      throw error
    }
  },

  fetchJobHistory: async (jobId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('job_history')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ jobHistory: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  addJobHistory: async (history) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('job_history')
        .insert([{
          ...history,
          changed_by: user?.email || 'system',
          created_at: new Date().toISOString()
        }])

      if (error) throw error
    } catch (error) {
      console.error('Error adding job history:', error)
    }
  },

  searchJobs: async (query) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .or(`job_id.ilike.%${query}%,issue_description.ilike.%${query}%,model_number.ilike.%${query}%,brand.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ jobs: data || [], loading: false })
      return data || []
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return []
    }
  },

  filterJobsByStage: async (stage) => {
    return await get().fetchJobs({ stage })
  },

  filterJobsByStatus: async (status) => {
    return await get().fetchJobs({ status })
  }
}))
```

### Part 2: Job Creation Wizard Component

Create `src/components/jobs/JobWizard.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Search, X } from 'lucide-react'
import { useJobStore, type Job } from '../../stores/jobStore'
import { useCustomerStore, type Customer } from '../../stores/customerStore'

interface JobWizardProps {
  onClose?: () => void
  preselectedCustomerId?: string
}

export function JobWizard({ onClose, preselectedCustomerId }: JobWizardProps) {
  const navigate = useNavigate()
  const { createJob, loading } = useJobStore()
  const { customers, searchCustomers } = useCustomerStore()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<Job>>({
    customer_id: preselectedCustomerId || '',
    appliance_type: '',
    brand: '',
    model_number: '',
    serial_number: '',
    issue_description: '',
    scheduled_date: '',
    scheduled_time_window: '',
    priority: 'Normal'
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)

  // Appliance type options
  const applianceTypes = [
    'Refrigerator',
    'Freezer',
    'Washer',
    'Dryer',
    'Dishwasher',
    'Range/Stove',
    'Oven',
    'Microwave',
    'Ice Maker',
    'Garbage Disposal',
    'Other'
  ]

  // Common brands
  const brands = [
    'Whirlpool',
    'GE',
    'Frigidaire',
    'Samsung',
    'LG',
    'KitchenAid',
    'Maytag',
    'Bosch',
    'Electrolux',
    'Kenmore',
    'Other'
  ]

  // Time windows
  const timeWindows = [
    '8:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    'Flexible'
  ]

  // Customer search handler
  const handleCustomerSearch = async (query: string) => {
    setCustomerSearch(query)
    if (query.length >= 2) {
      const results = await searchCustomers(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  // Select customer
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({ ...formData, customer_id: customer.id })
    setShowCustomerSearch(false)
    setCustomerSearch('')
  }

  // Form validation
  const canProceed = () => {
    if (step === 1) {
      return formData.customer_id !== ''
    }
    if (step === 2) {
      return formData.appliance_type !== '' && formData.issue_description !== ''
    }
    if (step === 3) {
      return true // Optional scheduling
    }
    return false
  }

  // Submit handler
  const handleSubmit = async () => {
    try {
      const newJob = await createJob(formData)
      
      if (onClose) {
        onClose()
      } else {
        navigate(`/jobs/${newJob.id}`)
      }
    } catch (error) {
      console.error('Error creating job:', error)
      alert('Failed to create job. Please try again.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Job</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, label: 'Customer' },
          { num: 2, label: 'Appliance & Issue' },
          { num: 3, label: 'Schedule' }
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s.num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s.num}
              </div>
              <span
                className={`text-sm mt-2 ${
                  step >= s.num ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < 2 && (
              <div
                className={`h-1 flex-1 mx-4 ${
                  step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-96">
        {/* Step 1: Customer Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Customer *
              </label>
              
              {selectedCustomer ? (
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">
                        {selectedCustomer.customer_type === 'Commercial' 
                          ? selectedCustomer.business_name 
                          : `${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
                      </p>
                      {selectedCustomer.customer_type === 'Commercial' && (
                        <p className="text-sm text-gray-600">
                          Contact: {selectedCustomer.first_name} {selectedCustomer.last_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedCustomer.phone_primary}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedCustomer.address_street}, {selectedCustomer.city}, {selectedCustomer.state}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setFormData({ ...formData, customer_id: '' })
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by name, phone, or address..."
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => setShowCustomerSearch(true)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Search Results */}
                  {showCustomerSearch && searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                      {searchResults.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-semibold">
                            {customer.customer_type === 'Commercial'
                              ? customer.business_name
                              : `${customer.first_name} ${customer.last_name}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {customer.phone_primary}
                          </p>
                          <p className="text-sm text-gray-500">
                            {customer.address_street}, {customer.city}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recent Customers */}
                  {!showCustomerSearch && customers.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Recent Customers
                      </p>
                      <div className="space-y-2">
                        {customers.slice(0, 5).map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <p className="font-medium">
                              {customer.customer_type === 'Commercial'
                                ? customer.business_name
                                : `${customer.first_name} ${customer.last_name}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {customer.phone_primary}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => navigate('/customers/new')}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add New Customer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Appliance & Issue */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appliance Type *
              </label>
              <select
                value={formData.appliance_type}
                onChange={(e) => setFormData({ ...formData, appliance_type: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select appliance type...</option>
                {applianceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select brand...</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Number
                </label>
                <input
                  type="text"
                  value={formData.model_number}
                  onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                  placeholder="e.g., WED5000DW"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number (optional)
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Serial number"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description *
              </label>
              <textarea
                value={formData.issue_description}
                onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                placeholder="Describe the problem..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Job['priority'] })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Date (optional)
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Window (optional)
              </label>
              <select
                value={formData.scheduled_time_window}
                onChange={(e) => setFormData({ ...formData, scheduled_time_window: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select time window...</option>
                {timeWindows.map((window) => (
                  <option key={window} value={window}>
                    {window}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Job Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {selectedCustomer?.customer_type === 'Commercial'
                      ? selectedCustomer.business_name
                      : `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Appliance:</span>
                  <span className="font-medium">{formData.appliance_type}</span>
                </div>
                {formData.brand && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="font-medium">{formData.brand}</span>
                  </div>
                )}
                {formData.model_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{formData.model_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className={`font-medium ${
                    formData.priority === 'Urgent' ? 'text-red-600' :
                    formData.priority === 'High' ? 'text-orange-600' :
                    'text-gray-900'
                  }`}>
                    {formData.priority}
                  </span>
                </div>
                {formData.scheduled_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(formData.scheduled_date).toLocaleDateString()}
                      {formData.scheduled_time_window && ` (${formData.scheduled_time_window})`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            if (step === 1) {
              if (onClose) onClose()
              else navigate('/jobs')
            } else {
              setStep(step - 1)
            }
          }}
          className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          <ChevronLeft size={20} />
          {step === 1 ? 'Cancel' : 'Previous'}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Next
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        )}
      </div>
    </div>
  )
}
```

### Part 3: Job List Page

Create `src/pages/jobs/JobList.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Calendar, AlertCircle } from 'lucide-react'
import { useJobStore, type Job } from '../../stores/jobStore'

export function JobList() {
  const navigate = useNavigate()
  const { jobs, fetchJobs, searchJobs, loading } = useJobStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState<Job['job_stage'] | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Job['priority'] | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadJobs()
  }, [filterStage, filterPriority])

  const loadJobs = () => {
    const filters: any = {}
    if (filterStage !== 'all') filters.stage = filterStage
    if (filterPriority !== 'all') filters.priority = filterPriority
    fetchJobs(filters)
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchJobs(query)
    } else {
      loadJobs()
    }
  }

  const getStageColor = (stage: Job['job_stage']) => {
    const colors = {
      'Intake': 'bg-gray-100 text-gray-800',
      'Diagnosis': 'bg-blue-100 text-blue-800',
      'Parts': 'bg-yellow-100 text-yellow-800',
      'Repair': 'bg-purple-100 text-purple-800',
      'Complete': 'bg-green-100 text-green-800'
    }
    return colors[stage] || colors.Intake
  }

  const getPriorityColor = (priority: Job['priority']) => {
    const colors = {
      'Normal': 'text-gray-600',
      'High': 'text-orange-600',
      'Urgent': 'text-red-600'
    }
    return colors[priority] || colors.Normal
  }

  const formatDate = (date?: string) => {
    if (!date) return 'Not scheduled'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your service jobs</p>
        </div>
        <button
          onClick={() => navigate('/jobs/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus size={20} />
          New Job
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search jobs by ID, customer, model..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter size={20} />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Stage
              </label>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Stages</option>
                <option value="Intake">Intake</option>
                <option value="Diagnosis">Diagnosis</option>
                <option value="Parts">Parts</option>
                <option value="Repair">Repair</option>
                <option value="Complete">Complete</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stage Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { stage: 'Intake', label: 'Intake', color: 'border-gray-300' },
          { stage: 'Diagnosis', label: 'Diagnosis', color: 'border-blue-300' },
          { stage: 'Parts', label: 'Parts', color: 'border-yellow-300' },
          { stage: 'Repair', label: 'Repair', color: 'border-purple-300' },
          { stage: 'Complete', label: 'Complete', color: 'border-green-300' }
        ].map(({ stage, label, color }) => {
          const count = jobs.filter((j) => j.job_stage === stage).length
          return (
            <button
              key={stage}
              onClick={() => setFilterStage(filterStage === stage ? 'all' : stage as any)}
              className={`p-4 bg-white rounded-lg border-2 ${
                filterStage === stage ? color : 'border-gray-200'
              } hover:shadow-md transition-shadow`}
            >
              <div className="text-3xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600 mt-1">{label}</div>
            </button>
          )
        })}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'No jobs found matching your search' : 'No jobs yet'}
          </p>
          <button
            onClick={() => navigate('/jobs/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Your First Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold text-gray-900">
                      {job.job_id}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(job.job_stage)}`}>
                      {job.job_stage}
                    </span>
                    {job.is_callback && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Callback
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-medium text-gray-900">
                        {job.customer?.customer_type === 'Commercial'
                          ? job.customer.business_name
                          : `${job.customer?.first_name} ${job.customer?.last_name}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Appliance</p>
                      <p className="font-medium text-gray-900">
                        {job.appliance_type}
                        {job.brand && ` - ${job.brand}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Issue</p>
                      <p className="font-medium text-gray-900 truncate">
                        {job.issue_description}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Scheduled</p>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {formatDate(job.scheduled_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                    <span className={`text-sm font-medium ${getPriorityColor(job.priority)}`}>
                      {job.priority} Priority
                    </span>
                    <span className="text-sm text-gray-600">
                      Status: {job.current_status}
                    </span>
                    {job.visit_count > 1 && (
                      <span className="text-sm text-gray-600">
                        Visit {job.visit_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Part 4: Job Detail Page

Create `src/pages/jobs/JobDetail.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  MapPin, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react'
import { useJobStore, type Job, type JobVisit } from '../../stores/jobStore'

export function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentJob, fetchJobById, updateJobStage, updateJobStatus, addVisit, fetchJobHistory, jobHistory, loading } = useJobStore()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'history'>('overview')
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [showAddVisit, setShowAddVisit] = useState(false)
  const [newVisit, setNewVisit] = useState<Partial<JobVisit>>({
    type: 'Follow-up',
    status: 'Scheduled'
  })

  useEffect(() => {
    if (id) {
      fetchJobById(id)
      fetchJobHistory(id)
    }
  }, [id])

  if (loading || !currentJob) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleUpdateStatus = async () => {
    if (!newStatus || !id) return
    
    try {
      await updateJobStatus(id, newStatus, statusNotes)
      setShowStatusUpdate(false)
      setNewStatus('')
      setStatusNotes('')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const handleAddVisit = async () => {
    if (!id || !newVisit.date) return
    
    try {
      await addVisit(id, newVisit as JobVisit)
      setShowAddVisit(false)
      setNewVisit({ type: 'Follow-up', status: 'Scheduled' })
    } catch (error) {
      console.error('Error adding visit:', error)
      alert('Failed to add visit')
    }
  }

  const getStageColor = (stage: Job['job_stage']) => {
    const colors = {
      'Intake': 'bg-gray-100 text-gray-800',
      'Diagnosis': 'bg-blue-100 text-blue-800',
      'Parts': 'bg-yellow-100 text-yellow-800',
      'Repair': 'bg-purple-100 text-purple-800',
      'Complete': 'bg-green-100 text-green-800'
    }
    return colors[stage]
  }

  const visits: JobVisit[] = []
  for (let i = 1; i <= currentJob.visit_count; i++) {
    const visit: JobVisit = {
      visit_number: i,
      date: (currentJob as any)[`visit_${i}_date`],
      type: (currentJob as any)[`visit_${i}_type`],
      status: (currentJob as any)[`visit_${i}_status`]
    }
    visits.push(visit)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/jobs')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentJob.job_id}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(currentJob.job_stage)}`}>
              {currentJob.job_stage}
            </span>
            {currentJob.is_callback && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Callback
              </span>
            )}
          </div>
          <p className="text-gray-600">{currentJob.current_status}</p>
        </div>
        <button
          onClick={() => navigate(`/jobs/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Edit size={20} />
          Edit
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'visits', label: `Visits (${currentJob.visit_count})` },
            { id: 'history', label: 'History' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Appliance Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Appliance Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium text-gray-900">{currentJob.appliance_type}</p>
                  </div>
                  {currentJob.brand && (
                    <div>
                      <p className="text-sm text-gray-600">Brand</p>
                      <p className="font-medium text-gray-900">{currentJob.brand}</p>
                    </div>
                  )}
                  {currentJob.model_number && (
                    <div>
                      <p className="text-sm text-gray-600">Model Number</p>
                      <p className="font-medium text-gray-900 font-mono">{currentJob.model_number}</p>
                    </div>
                  )}
                  {currentJob.serial_number && (
                    <div>
                      <p className="text-sm text-gray-600">Serial Number</p>
                      <p className="font-medium text-gray-900 font-mono">{currentJob.serial_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Issue Description */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Issue Description
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{currentJob.issue_description}</p>
              </div>

              {/* Callback Information */}
              {currentJob.is_callback && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-red-900 mb-2">
                        Callback Job
                      </h2>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-red-700">Reason</p>
                          <p className="font-medium text-red-900">{currentJob.callback_reason}</p>
                        </div>
                        {currentJob.original_job_id && (
                          <div>
                            <p className="text-sm text-red-700">Original Job</p>
                            <button
                              onClick={() => navigate(`/jobs/${currentJob.original_job_id}`)}
                              className="font-medium text-red-900 hover:underline"
                            >
                              {currentJob.original_job_id}
                            </button>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-red-700">Callback Count</p>
                          <p className="font-medium text-red-900">{currentJob.callback_count}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Status</h2>
                  <button
                    onClick={() => setShowStatusUpdate(!showStatusUpdate)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Update Status
                  </button>
                </div>

                {showStatusUpdate && (
                  <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Status
                      </label>
                      <input
                        type="text"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        placeholder="e.g., Diagnosis Complete"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (optional)
                      </label>
                      <textarea
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        rows={3}
                        placeholder="Add any notes about this status change..."
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateStatus}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => {
                          setShowStatusUpdate(false)
                          setNewStatus('')
                          setStatusNotes('')
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Current Status</span>
                    <span className="font-semibold text-gray-900">{currentJob.current_status}</span>
                  </div>
                  {currentJob.parts_status && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Parts Status</span>
                      <span className="font-semibold text-gray-900">{currentJob.parts_status}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'visits' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Visit History</h2>
                <button
                  onClick={() => setShowAddVisit(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} />
                  Add Visit
                </button>
              </div>

              {/* Add Visit Form */}
              {showAddVisit && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                  <h3 className="font-semibold text-gray-900">Schedule New Visit</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Visit Type
                      </label>
                      <select
                        value={newVisit.type}
                        onChange={(e) => setNewVisit({ ...newVisit, type: e.target.value as any })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Diagnosis">Diagnosis</option>
                        <option value="Repair">Repair</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Callback">Callback</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={newVisit.date}
                        onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddVisit}
                      disabled={!newVisit.date}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add Visit
                    </button>
                    <button
                      onClick={() => {
                        setShowAddVisit(false)
                        setNewVisit({ type: 'Follow-up', status: 'Scheduled' })
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Visit List */}
              <div className="space-y-4">
                {visits.map((visit) => (
                  <div
                    key={visit.visit_number}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            Visit #{visit.visit_number}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {visit.type}
                          </span>
                          {visit.status && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              visit.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              visit.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              visit.status === 'No-Show' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {visit.status}
                            </span>
                          )}
                        </div>
                        {visit.date && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={16} />
                            {new Date(visit.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Job History</h2>
              
              {jobHistory.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No history recorded yet</p>
              ) : (
                <div className="space-y-4">
                  {jobHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock size={20} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-gray-900">
                            {entry.field_changed.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <span className="text-sm text-gray-500">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        {entry.old_value && entry.new_value && (
                          <p className="text-sm text-gray-600">
                            Changed from <span className="font-medium">{entry.old_value}</span> to{' '}
                            <span className="font-medium">{entry.new_value}</span>
                          </p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">by {entry.changed_by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Customer</h3>
            {currentJob.customer && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">
                    {currentJob.customer.customer_type === 'Commercial'
                      ? currentJob.customer.business_name
                      : `${currentJob.customer.first_name} ${currentJob.customer.last_name}`}
                  </p>
                </div>
                {currentJob.customer.phone_primary && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <a
                      href={`tel:${currentJob.customer.phone_primary}`}
                      className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Phone size={16} />
                      {currentJob.customer.phone_primary}
                    </a>
                  </div>
                )}
                {currentJob.customer.address_street && (
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${currentJob.customer.address_street}, ${currentJob.customer.city}, ${currentJob.customer.state} ${currentJob.customer.zip}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 font-medium text-blue-600 hover:text-blue-800"
                    >
                      <MapPin size={16} className="mt-1 flex-shrink-0" />
                      <span>
                        {currentJob.customer.address_street}<br />
                        {currentJob.customer.city}, {currentJob.customer.state} {currentJob.customer.zip}
                      </span>
                    </a>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/customers/${currentJob.customer_id}`)}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  View Customer Details
                </button>
              </div>
            )}
          </div>

          {/* Scheduling Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Schedule</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Priority</p>
                <p className={`font-medium ${
                  currentJob.priority === 'Urgent' ? 'text-red-600' :
                  currentJob.priority === 'High' ? 'text-orange-600' :
                  'text-gray-900'
                }`}>
                  {currentJob.priority}
                </p>
              </div>
              {currentJob.scheduled_date ? (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(currentJob.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {currentJob.scheduled_time_window && (
                    <div>
                      <p className="text-sm text-gray-600">Time Window</p>
                      <p className="font-medium text-gray-900">{currentJob.scheduled_time_window}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 text-sm">Not scheduled yet</p>
              )}
            </div>
          </div>

          {/* Job Metadata */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Job Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(currentJob.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(currentJob.updated_at).toLocaleString()}
                </p>
              </div>
              {currentJob.completed_at && (
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-sm text-gray-900">
                    {new Date(currentJob.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Part 5: Update App Routing

Update `src/App.tsx` to include job routes:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import { Layout } from './components/Layout'
import { Login } from './pages/auth/Login'
import { Dashboard } from './pages/Dashboard'
import { CustomerList } from './pages/customers/CustomerList'
import { CustomerDetail } from './pages/customers/CustomerDetail'
import { NewCustomer } from './pages/customers/NewCustomer'
import { JobList } from './pages/jobs/JobList'
import { JobDetail } from './pages/jobs/JobDetail'
import { NewJob } from './pages/jobs/NewJob'

function App() {
  const { user, setUser } = useAuthStore()

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!user) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          
          <Route path="customers">
            <Route index element={<CustomerList />} />
            <Route path="new" element={<NewCustomer />} />
            <Route path=":id" element={<CustomerDetail />} />
          </Route>
          
          <Route path="jobs">
            <Route index element={<JobList />} />
            <Route path="new" element={<NewJob />} />
            <Route path=":id" element={<JobDetail />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

Create `src/pages/jobs/NewJob.tsx`:

```typescript
import { JobWizard } from '../../components/jobs/JobWizard'

export function NewJob() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <JobWizard />
    </div>
  )
}
```

### Part 6: Update Dashboard to Show Job Stats

Update `src/pages/Dashboard.tsx` to include job statistics:

```typescript
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, Calendar, TrendingUp } from 'lucide-react'
import { useCustomerStore } from '../stores/customerStore'
import { useJobStore } from '../stores/jobStore'

export function Dashboard() {
  const { customers, fetchCustomers } = useCustomerStore()
  const { jobs, fetchJobs } = useJobStore()

  useEffect(() => {
    fetchCustomers()
    fetchJobs()
  }, [])

  const stats = [
    {
      name: 'Total Customers',
      value: customers.length,
      icon: Users,
      color: 'blue',
      link: '/customers'
    },
    {
      name: 'Active Jobs',
      value: jobs.filter(j => j.job_stage !== 'Complete').length,
      icon: Briefcase,
      color: 'green',
      link: '/jobs'
    },
    {
      name: 'Scheduled Today',
      value: jobs.filter(j => {
        if (!j.scheduled_date) return false
        const today = new Date().toDateString()
        return new Date(j.scheduled_date).toDateString() === today
      }).length,
      icon: Calendar,
      color: 'purple',
      link: '/jobs'
    },
    {
      name: 'Completed This Month',
      value: jobs.filter(j => {
        if (!j.completed_at) return false
        const now = new Date()
        const completed = new Date(j.completed_at)
        return completed.getMonth() === now.getMonth() &&
               completed.getFullYear() === now.getFullYear()
      }).length,
      icon: TrendingUp,
      color: 'orange',
      link: '/jobs'
    }
  ]

  const recentJobs = jobs
    .filter(j => j.job_stage !== 'Complete')
    .slice(0, 5)

  const todaysJobs = jobs.filter(j => {
    if (!j.scheduled_date) return false
    const today = new Date().toDateString()
    return new Date(j.scheduled_date).toDateString() === today
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 bg-${stat.color}-100 rounded-full`}>
                <stat.icon className={`text-${stat.color}-600`} size={24} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Jobs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Today's Schedule ({todaysJobs.length})
          </h2>
          {todaysJobs.length === 0 ? (
            <p className="text-gray-600">No jobs scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todaysJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{job.job_id}</span>
                    <span className="text-sm text-gray-600">{job.scheduled_time_window}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {job.customer?.customer_type === 'Commercial'
                      ? job.customer.business_name
                      : `${job.customer?.first_name} ${job.customer?.last_name}`}
                  </p>
                  <p className="text-sm text-gray-600 truncate">{job.appliance_type} - {job.issue_description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Jobs
          </h2>
          {recentJobs.length === 0 ? (
            <p className="text-gray-600">No active jobs</p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{job.job_id}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {job.job_stage}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {job.customer?.customer_type === 'Commercial'
                      ? job.customer.business_name
                      : `${job.customer?.first_name} ${job.customer?.last_name}`}
                  </p>
                  <p className="text-sm text-gray-600 truncate">{job.appliance_type} - {job.issue_description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

## ✅ Success Metrics

Stage 3 is complete when:

- [ ] Job creation wizard works (3-step process)
- [ ] Job ID auto-generates correctly (J-0001, J-0002, etc.)
- [ ] Can select existing customer from search
- [ ] Job list displays all jobs with proper filtering
- [ ] Job detail page shows all information
- [ ] Can update job stage and status
- [ ] Job history tracks all changes
- [ ] Can add multiple visits to a job
- [ ] Visit tracking updates correctly
- [ ] Callback jobs can be created from existing jobs
- [ ] Callback jobs link to original job
- [ ] Dashboard shows job statistics
- [ ] Today's jobs display on dashboard
- [ ] Recent jobs widget works
- [ ] All forms validate properly
- [ ] No console errors

## 🚫 Troubleshooting

**Job ID not generating:**
- Check the query for last job in createJob function
- Verify job_id column has proper constraints
- Test with console.log to see last job data

**Customer not showing in job list:**
- Verify the join is working in fetchJobs
- Check that customer relationship is defined in Supabase
- Test the query directly in Supabase SQL editor

**Job history not showing:**
- Verify job_history table exists
- Check foreign key relationship
- Ensure addJobHistory is being called

**Visit tracking not working:**
- Verify visit column names match (visit_1_date, visit_1_type, etc.)
- Check that visit_count is incrementing
- Test updateJob function with visit fields

**Callback creation fails:**
- Verify all callback fields exist in jobs table
- Check that original job ID is valid
- Test the callback creation flow with console logs

## 📝 Notes for Next Stage

Stage 4 will build upon this job foundation to add:
- Tour-based time tracking system
- Activity management (Travel, Diagnosis, Repair)
- Break tracking
- Mileage calculation
- Time allocation to jobs
- Research mode for multi-job time tracking

## 🎯 Summary

You now have:
- Complete job creation wizard with 3-step process
- Job listing with advanced filtering
- Job detail page with tabs (Overview, Visits, History)
- Status workflow management
- Multi-visit tracking system
- Callback job creation and linking
- Job history logging for all changes
- Integration with customer management
- Dashboard widgets for job statistics
- Auto-generated Job IDs

This job management system is the operational core of your field service business!

---

## 💡 Tips for Success

1. **Test the complete flow**: Create a job from customer selection through to completion
2. **Verify job history**: Make sure all status changes are being logged
3. **Test callbacks**: Create a callback from an existing job and verify the link
4. **Check visit tracking**: Add multiple visits and verify they display correctly
5. **Review dashboard**: Ensure job statistics are calculating properly

Stage 3 is one of the most complex stages - take your time to test thoroughly before moving to Stage 4!
