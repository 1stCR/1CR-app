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
  filterJobsByStage: (stage: Job['job_stage']) => Promise<void>
  filterJobsByStatus: (status: string) => Promise<void>
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
    console.log('jobStore.createJob: Called with job data:', job)
    set({ loading: true, error: null })
    try {
      // Get the last job to generate next ID
      console.log('jobStore.createJob: Fetching last job for ID generation')
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
      console.log('jobStore.createJob: Generated job ID:', jobId)

      // Clean up empty strings - convert to null for database
      const cleanedJob = Object.entries(job).reduce((acc, [key, value]) => {
        // Convert empty strings to null, except for explicitly string fields
        if (value === '') {
          acc[key] = null
        } else {
          acc[key] = value
        }
        return acc
      }, {} as any)

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
        ...cleanedJob,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('jobStore.createJob: Inserting job into database')
      const { data, error } = await supabase
        .from('jobs')
        .insert([newJob])
        .select()
        .single()

      if (error) {
        console.error('jobStore.createJob: Database error:', error)
        throw error
      }

      console.log('jobStore.createJob: Job inserted successfully:', data)
      set({ loading: false })

      // Log the creation in job history (in background - after loading is false and job is returned)
      setTimeout(() => {
        get().addJobHistory({
          job_id: data.id,
          field_changed: 'created',
          new_value: jobId,
          notes: 'Job created'
        }).catch(console.error)

        // Refresh jobs list
        get().fetchJobs().catch(console.error)
      }, 0)

      console.log('jobStore.createJob: Returning job data with id:', data.id)
      return data
    } catch (error) {
      console.error('jobStore.createJob: Error caught:', error)
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
