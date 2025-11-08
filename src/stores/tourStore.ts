import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export interface TourActivity {
  id: string
  tour_id: string
  job_id?: string
  activity_type: 'Travel' | 'Diagnosis' | 'Repair' | 'Research' | 'Break'
  start_time: string
  end_time?: string
  duration_minutes?: number
  notes?: string
  created_at: string
}

export interface Tour {
  id: string
  tour_date: string
  start_time: string
  end_time?: string
  total_duration_minutes?: number
  travel_minutes?: number
  diagnosis_minutes?: number
  repair_minutes?: number
  research_minutes?: number
  break_minutes?: number
  total_mileage?: number
  status: 'Active' | 'On Break' | 'Completed'
  created_at: string
  updated_at: string
}

interface TourStore {
  // Current tour state
  currentTour: Tour | null
  currentActivity: TourActivity | null
  tourStatus: 'Not Started' | 'Active' | 'On Break' | 'Completed'

  // Activities
  activities: TourActivity[]

  // Loading state
  loading: boolean
  error: string | null

  // Tour actions
  startTour: () => Promise<Tour>
  endTour: () => Promise<void>
  pauseTour: () => Promise<void>
  resumeTour: () => Promise<void>

  // Activity actions
  startActivity: (type: TourActivity['activity_type'], jobId?: string, notes?: string) => Promise<TourActivity>
  endActivity: (notes?: string) => Promise<void>
  switchActivity: (newType: TourActivity['activity_type'], jobId?: string, notes?: string) => Promise<void>

  // Research mode
  startResearch: (jobId: string, notes?: string) => Promise<TourActivity>
  endResearch: (notes?: string) => Promise<void>

  // Break management
  startBreak: (notes?: string) => Promise<TourActivity>
  endBreak: () => Promise<void>

  // Mileage
  updateMileage: (mileage: number) => Promise<void>

  // Data fetching
  fetchTourActivities: (tourId: string) => Promise<void>
  getTodaysTour: () => Promise<Tour | null>

  // Utility
  getCurrentActivityDuration: () => number
  getTourDuration: () => number
}

export const useTourStore = create<TourStore>()(
  persist(
    (set, get) => ({
      currentTour: null,
      currentActivity: null,
      tourStatus: 'Not Started',
      activities: [],
      loading: false,
      error: null,

      startTour: async () => {
        console.log('tourStore.startTour: Starting tour')
        set({ loading: true, error: null })
        try {
          const today = new Date().toISOString().split('T')[0]

          // Check if tour already exists for today
          console.log('tourStore.startTour: Checking for existing tour on', today)
          const { data: existingTour, error: fetchError } = await supabase
            .from('tours')
            .select('*')
            .eq('tour_date', today)
            .single()

          if (existingTour) {
            console.log('tourStore.startTour: Found existing tour:', existingTour.id)
            set({
              currentTour: existingTour,
              tourStatus: existingTour.status === 'Completed' ? 'Completed' :
                         existingTour.status === 'On Break' ? 'On Break' : 'Active',
              loading: false
            })
            return existingTour
          }

          // Create new tour
          console.log('tourStore.startTour: Creating new tour')
          const { data, error } = await supabase
            .from('tours')
            .insert([{
              tour_date: today,
              start_time: new Date().toISOString(),
              status: 'Active',
              total_duration_minutes: 0,
              travel_minutes: 0,
              diagnosis_minutes: 0,
              repair_minutes: 0,
              research_minutes: 0,
              break_minutes: 0,
              total_mileage: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single()

          if (error) {
            console.error('tourStore.startTour: Database error:', error)
            throw error
          }

          console.log('tourStore.startTour: Tour created successfully:', data.id)
          set({
            currentTour: data,
            tourStatus: 'Active',
            loading: false
          })

          return data
        } catch (error) {
          console.error('tourStore.startTour: Error:', error)
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      endTour: async () => {
        const { currentTour, currentActivity, endActivity } = get()
        if (!currentTour) {
          console.warn('tourStore.endTour: No active tour')
          return
        }

        console.log('tourStore.endTour: Ending tour', currentTour.id)
        set({ loading: true, error: null })
        try {
          // End current activity if any
          if (currentActivity) {
            console.log('tourStore.endTour: Ending current activity first')
            await endActivity('Tour ended')
          }

          // Fetch activities to calculate durations
          await get().fetchTourActivities(currentTour.id)

          const totalDuration = Math.floor(
            (new Date().getTime() - new Date(currentTour.start_time).getTime()) / 60000
          )

          console.log('tourStore.endTour: Total duration:', totalDuration, 'minutes')

          // Update tour
          const { error } = await supabase
            .from('tours')
            .update({
              end_time: new Date().toISOString(),
              total_duration_minutes: totalDuration,
              status: 'Completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', currentTour.id)

          if (error) {
            console.error('tourStore.endTour: Database error:', error)
            throw error
          }

          console.log('tourStore.endTour: Tour ended successfully')
          set({
            currentTour: null,
            currentActivity: null,
            tourStatus: 'Completed',
            loading: false
          })
        } catch (error) {
          console.error('tourStore.endTour: Error:', error)
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      pauseTour: async () => {
        const { currentTour, startBreak } = get()
        if (!currentTour) return

        console.log('tourStore.pauseTour: Pausing tour')
        await startBreak('Tour paused')

        // Update tour status
        const { error } = await supabase
          .from('tours')
          .update({
            status: 'On Break',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTour.id)

        if (error) {
          console.error('tourStore.pauseTour: Error updating tour status:', error)
        }

        set({ tourStatus: 'On Break' })
      },

      resumeTour: async () => {
        const { currentTour, endBreak } = get()
        if (!currentTour) return

        console.log('tourStore.resumeTour: Resuming tour')
        await endBreak()

        // Update tour status
        const { error } = await supabase
          .from('tours')
          .update({
            status: 'Active',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTour.id)

        if (error) {
          console.error('tourStore.resumeTour: Error updating tour status:', error)
        }

        set({ tourStatus: 'Active' })
      },

      startActivity: async (type, jobId, notes) => {
        const { currentTour, currentActivity, endActivity } = get()

        if (!currentTour) {
          throw new Error('No active tour. Please start tour first.')
        }

        console.log(`tourStore.startActivity: Starting ${type} activity`, { jobId, notes })
        set({ loading: true, error: null })
        try {
          // End current activity if exists
          if (currentActivity) {
            console.log('tourStore.startActivity: Ending previous activity first')
            await endActivity(`Switched to ${type}`)
          }

          // Create new activity
          const { data, error } = await supabase
            .from('tour_activities')
            .insert([{
              tour_id: currentTour.id,
              job_id: jobId || null,  // Ensure null instead of undefined
              activity_type: type,
              start_time: new Date().toISOString(),
              notes: notes || null,
              created_at: new Date().toISOString()
            }])
            .select()
            .single()

          if (error) {
            console.error('tourStore.startActivity: Database error:', error)
            throw error
          }

          console.log('tourStore.startActivity: Activity started successfully:', data.id)
          set({
            currentActivity: data,
            loading: false
          })

          return data
        } catch (error) {
          console.error('tourStore.startActivity: Error:', error)
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      endActivity: async (notes) => {
        const { currentActivity, currentTour } = get()
        if (!currentActivity) {
          console.warn('tourStore.endActivity: No active activity')
          return
        }

        console.log('tourStore.endActivity: Ending activity', currentActivity.id)
        set({ loading: true, error: null })
        try {
          const endTime = new Date()
          const startTime = new Date(currentActivity.start_time)
          const durationMinutes = Math.floor(
            (endTime.getTime() - startTime.getTime()) / 60000
          )

          console.log('tourStore.endActivity: Duration:', durationMinutes, 'minutes')

          // Update activity
          const { error: activityError } = await supabase
            .from('tour_activities')
            .update({
              end_time: endTime.toISOString(),
              duration_minutes: durationMinutes,
              notes: notes || currentActivity.notes || null
            })
            .eq('id', currentActivity.id)

          if (activityError) {
            console.error('tourStore.endActivity: Error updating activity:', activityError)
            throw activityError
          }

          // Update tour totals
          if (currentTour) {
            const activityType = currentActivity.activity_type.toLowerCase() + '_minutes'
            const currentTotal = (currentTour as any)[activityType] || 0

            console.log(`tourStore.endActivity: Updating tour ${activityType}:`, currentTotal + durationMinutes)

            const { error: tourError } = await supabase
              .from('tours')
              .update({
                [activityType]: currentTotal + durationMinutes,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentTour.id)

            if (tourError) {
              console.error('tourStore.endActivity: Error updating tour:', tourError)
              throw tourError
            }
          }

          // Update job time if job_id exists (except for Break)
          if (currentActivity.job_id && currentActivity.activity_type !== 'Break') {
            console.log('tourStore.endActivity: Updating job time for job:', currentActivity.job_id)

            const { data: job } = await supabase
              .from('jobs')
              .select('travel_time_minutes, diagnosis_time_minutes, repair_time_minutes, research_time_minutes')
              .eq('id', currentActivity.job_id)
              .single()

            if (job) {
              const timeField =
                currentActivity.activity_type === 'Travel' ? 'travel_time_minutes' :
                currentActivity.activity_type === 'Diagnosis' ? 'diagnosis_time_minutes' :
                currentActivity.activity_type === 'Repair' ? 'repair_time_minutes' :
                currentActivity.activity_type === 'Research' ? 'research_time_minutes' :
                null

              if (timeField) {
                const currentJobTime = (job as any)[timeField] || 0

                await supabase
                  .from('jobs')
                  .update({
                    [timeField]: currentJobTime + durationMinutes,
                    total_time_minutes: (job.travel_time_minutes || 0) +
                                       (job.diagnosis_time_minutes || 0) +
                                       (job.repair_time_minutes || 0) +
                                       (job.research_time_minutes || 0) +
                                       durationMinutes,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', currentActivity.job_id)

                console.log(`tourStore.endActivity: Job ${timeField} updated`)
              }
            }
          }

          console.log('tourStore.endActivity: Activity ended successfully')
          set({
            currentActivity: null,
            loading: false
          })
        } catch (error) {
          console.error('tourStore.endActivity: Error:', error)
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      switchActivity: async (newType, jobId, notes) => {
        console.log('tourStore.switchActivity: Switching to', newType)
        const { endActivity, startActivity } = get()
        await endActivity(`Switching to ${newType}`)
        return await startActivity(newType, jobId, notes)
      },

      startResearch: async (jobId, notes) => {
        return await get().startActivity('Research', jobId, notes || 'Research mode')
      },

      endResearch: async (notes) => {
        await get().endActivity(notes || 'Research ended')
      },

      startBreak: async (notes) => {
        return await get().startActivity('Break', undefined, notes || 'Break time')
      },

      endBreak: async () => {
        await get().endActivity('Break ended')
      },

      updateMileage: async (mileage) => {
        const { currentTour } = get()
        if (!currentTour) {
          console.warn('tourStore.updateMileage: No active tour')
          return
        }

        console.log('tourStore.updateMileage: Updating mileage to', mileage)
        set({ loading: true, error: null })
        try {
          const { error } = await supabase
            .from('tours')
            .update({
              total_mileage: mileage,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentTour.id)

          if (error) {
            console.error('tourStore.updateMileage: Database error:', error)
            throw error
          }

          console.log('tourStore.updateMileage: Mileage updated successfully')
          set({
            currentTour: { ...currentTour, total_mileage: mileage },
            loading: false
          })
        } catch (error) {
          console.error('tourStore.updateMileage: Error:', error)
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      fetchTourActivities: async (tourId) => {
        console.log('tourStore.fetchTourActivities: Fetching activities for tour', tourId)
        set({ loading: true, error: null })
        try {
          const { data, error } = await supabase
            .from('tour_activities')
            .select('*')
            .eq('tour_id', tourId)
            .order('start_time', { ascending: true })

          if (error) {
            console.error('tourStore.fetchTourActivities: Database error:', error)
            throw error
          }

          console.log('tourStore.fetchTourActivities: Found', data?.length || 0, 'activities')
          set({ activities: data || [], loading: false })
        } catch (error) {
          console.error('tourStore.fetchTourActivities: Error:', error)
          set({ error: (error as Error).message, loading: false })
        }
      },

      getTodaysTour: async () => {
        const today = new Date().toISOString().split('T')[0]

        console.log('tourStore.getTodaysTour: Fetching tour for', today)
        try {
          const { data, error } = await supabase
            .from('tours')
            .select('*')
            .eq('tour_date', today)
            .single()

          if (error && error.code !== 'PGRST116') {
            console.error('tourStore.getTodaysTour: Database error:', error)
            throw error
          }

          if (data) {
            console.log('tourStore.getTodaysTour: Found tour:', data.id, 'Status:', data.status)
            set({
              currentTour: data,
              tourStatus: data.status === 'Completed' ? 'Completed' :
                         data.status === 'On Break' ? 'On Break' : 'Active'
            })
          } else {
            console.log('tourStore.getTodaysTour: No tour found for today - resetting state')
            // Clear state when no tour exists (prevents stale localStorage data)
            set({
              currentTour: null,
              currentActivity: null,
              tourStatus: 'Not Started'
            })
          }

          return data
        } catch (error) {
          console.error('tourStore.getTodaysTour: Error:', error)
          return null
        }
      },

      getCurrentActivityDuration: () => {
        const { currentActivity } = get()
        if (!currentActivity) return 0

        const now = new Date()
        const start = new Date(currentActivity.start_time)
        return Math.floor((now.getTime() - start.getTime()) / 60000)
      },

      getTourDuration: () => {
        const { currentTour } = get()
        if (!currentTour) return 0

        const now = new Date()
        const start = new Date(currentTour.start_time)
        return Math.floor((now.getTime() - start.getTime()) / 60000)
      }
    }),
    {
      name: 'tour-storage',
      partialize: (state) => ({
        currentTour: state.currentTour,
        currentActivity: state.currentActivity,
        tourStatus: state.tourStatus
      })
    }
  )
)
