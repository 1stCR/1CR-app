# Stage 4: Tour System

## 🎯 Objective
Build comprehensive tour-based time tracking system with activity management, flexible research mode, break tracking, and automatic mileage calculation.

## ⚠️ CRITICAL: Lessons from Previous Stages

**READ THIS FIRST** - These issues caused test failures in Stages 2 & 3. Avoid them in Stage 4:

### Issue #1: Empty String Database Validation ❌ CRITICAL
**Problem**: PostgreSQL rejects empty strings (`""`) in DATE, TIMESTAMP, and NUMERIC columns.

**Example from Stage 3 (caused test timeouts)**:
```typescript
// ❌ WRONG - This will cause database error
const tour = {
  start_time: "",  // Empty string fails for TIMESTAMP
  end_time: "",
  total_mileage: ""  // Empty string fails for NUMERIC
}
```

**Solution**: Always convert empty strings to `null` before database insertion:
```typescript
// ✅ CORRECT - Clean data before insert
const cleanTourData = Object.entries(tourData).reduce((acc, [key, value]) => {
  acc[key] = value === '' ? null : value
  return acc
}, {} as any)

await supabase.from('tours').insert([cleanTourData])
```

**Apply to Stage 4**:
- Tour creation with `start_time`, `end_time` timestamps
- Mileage fields (`total_mileage`, numeric)
- Activity duration fields
- **Always clean form data before database operations**

### Issue #2: Zustand Store Update Patterns ✅
**Best Practice from Stage 3**: When updating a record, automatically refresh the current record.

```typescript
// ✅ Pattern that works well
updateTour: async (id, updates) => {
  const { error } = await supabase
    .from('tours')
    .update(updates)
    .eq('id', id)

  if (error) throw error

  // Automatically refresh current tour if it's the one being updated
  if (get().currentTour?.id === id) {
    await get().fetchTourById(id)
  }
}
```

**Apply to Stage 4**:
- `updateTour()` should refresh `currentTour`
- `endActivity()` should refresh `currentActivity`
- UI will update automatically via Zustand reactivity

### Issue #3: Console Logging for Async Debugging ✅
**Lesson from Stage 3**: Add console logs to track async flow during development.

```typescript
// ✅ Add strategic logging
startTour: async () => {
  console.log('tourStore.startTour: Starting tour')
  const { data, error } = await supabase.from('tours').insert([...])

  if (error) {
    console.error('tourStore.startTour: Database error:', error)
    throw error
  }

  console.log('tourStore.startTour: Tour created successfully:', data)
  return data
}
```

**Apply to Stage 4**:
- Log tour start/stop operations
- Log activity transitions (Travel → Diagnosis → Repair)
- Log errors with context
- **Remove logs before production deployment**

### Issue #4: Test-Friendly Selectors 🎯
**Lesson from Stage 3**: Tests need specific, stable selectors.

```typescript
// ❌ Flaky - Text might not appear immediately
await expect(page.locator('text=Tour Active')).toBeVisible()

// ✅ Better - Wait for specific UI element
await page.waitForSelector('button:has-text("End Tour")', { timeout: 10000 })
await expect(page.locator('[data-testid="tour-status"]')).toContainText('Active')
```

**Apply to Stage 4**:
- Add `data-testid` attributes to tour control widget
- Use specific button selectors for tour actions
- Wait for state transitions (Not Started → Active → Completed)

### Issue #5: Sequential ID Generation Pattern ✅
**Success Pattern from Stages 2 & 3**: Auto-generate IDs (C-0001, J-0001).

```typescript
// ✅ Pattern that works
const { data: lastTour } = await supabase
  .from('tours')
  .select('tour_id')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

let nextNumber = 1
if (lastTour?.tour_id) {
  nextNumber = parseInt(lastTour.tour_id.split('-')[1]) + 1
}
const tourId = `T-${String(nextNumber).padStart(4, '0')}`
```

**Apply to Stage 4**:
- If using Tour IDs: `T-0001`, `T-0002`, etc.
- Activity IDs can use UUIDs (less important for user-facing IDs)

### Issue #6: Form Validation Before Submit 🎯
**Lesson from Stage 2**: Validate required fields before attempting database operation.

```typescript
// ✅ Validate before database call
const startTour = async () => {
  if (!selectedJobs.length) {
    alert('Please select at least one job for today')
    return
  }

  // Proceed with tour creation
  await createTour({ jobs: selectedJobs })
}
```

**Apply to Stage 4**:
- Validate tour has start_time before ending
- Validate activity has job_id when required (Travel, Diagnosis, Repair)
- Validate mileage is positive number
- Show user-friendly error messages

### Summary Checklist for Stage 4:
- [ ] Convert empty strings to null before ALL database operations
- [ ] Add auto-refresh pattern to update methods in tourStore
- [ ] Include console.log statements for debugging async operations
- [ ] Use stable selectors and proper waits in tests
- [ ] Implement sequential ID generation if using Tour IDs
- [ ] Validate all form inputs before submission
- [ ] Test with browser console open to catch errors early

**These patterns will save hours of debugging!** ✅

---

## ✅ Prerequisites
- Stage 1, 2, and 3 completed
- Jobs system functional
- Customer management working
- Database tables created for tour_log and tours

## 🛠️ What We're Building

### Core Features:
1. **Tour Management**
   - Start/Stop tour for the day
   - Tour status tracking (Not Started, Active, On Break, Completed)
   - Auto-save tour data
   - Tour summary on completion

2. **Activity Tracking**
   - Travel time with automatic job linking
   - On-site diagnosis time
   - On-site repair time
   - Research time (flexible, can be for any job)
   - Break time (not billable)

3. **Flexible Research Mode**
   - Research any job from anywhere
   - Research while on-site at different job
   - Research before/after jobs
   - Research allocates to selected job

4. **Automatic Time Allocation**
   - Travel time splits between jobs (50/50 allocation)
   - Diagnosis time allocates to current job
   - Repair time allocates to current job
   - Research time allocates to selected job
   - Break time tracked separately (non-billable)

5. **Mileage Tracking**
   - Automatic distance calculation
   - Google Maps integration ready
   - Manual mileage entry option
   - Mileage allocation to jobs

6. **Tour Control Widget**
   - Always-visible control panel
   - Current activity display
   - Running timer
   - Quick action buttons
   - Today's jobs list

## 📋 Implementation Steps

### Part 1: Tour Store Setup

Create `src/stores/tourStore.ts`:

```typescript
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
        set({ loading: true, error: null })
        try {
          const today = new Date().toISOString().split('T')[0]
          
          // Check if tour already exists for today
          const { data: existingTour } = await supabase
            .from('tours')
            .select('*')
            .eq('tour_date', today)
            .single()

          if (existingTour) {
            set({ 
              currentTour: existingTour, 
              tourStatus: existingTour.status as any,
              loading: false 
            })
            return existingTour
          }

          // Create new tour
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

          if (error) throw error

          set({ 
            currentTour: data, 
            tourStatus: 'Active',
            loading: false 
          })
          
          return data
        } catch (error) {
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      endTour: async () => {
        const { currentTour, currentActivity, endActivity } = get()
        if (!currentTour) return

        set({ loading: true, error: null })
        try {
          // End current activity if any
          if (currentActivity) {
            await endActivity('Tour ended')
          }

          // Calculate final durations
          const activities = await get().fetchTourActivities(currentTour.id)
          
          const totalDuration = Math.floor(
            (new Date().getTime() - new Date(currentTour.start_time).getTime()) / 60000
          )

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

          if (error) throw error

          set({ 
            currentTour: null,
            currentActivity: null,
            tourStatus: 'Completed',
            loading: false 
          })
        } catch (error) {
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      pauseTour: async () => {
        const { currentTour, startBreak } = get()
        if (!currentTour) return

        await startBreak('Tour paused')
        set({ tourStatus: 'On Break' })
      },

      resumeTour: async () => {
        const { endBreak } = get()
        await endBreak()
        set({ tourStatus: 'Active' })
      },

      startActivity: async (type, jobId, notes) => {
        const { currentTour, currentActivity, endActivity } = get()
        
        if (!currentTour) {
          throw new Error('No active tour. Please start tour first.')
        }

        set({ loading: true, error: null })
        try {
          // End current activity if exists
          if (currentActivity) {
            await endActivity(`Switched to ${type}`)
          }

          // Create new activity
          const { data, error } = await supabase
            .from('tour_activities')
            .insert([{
              tour_id: currentTour.id,
              job_id: jobId,
              activity_type: type,
              start_time: new Date().toISOString(),
              notes: notes,
              created_at: new Date().toISOString()
            }])
            .select()
            .single()

          if (error) throw error

          set({ 
            currentActivity: data,
            loading: false 
          })

          return data
        } catch (error) {
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      endActivity: async (notes) => {
        const { currentActivity, currentTour } = get()
        if (!currentActivity) return

        set({ loading: true, error: null })
        try {
          const endTime = new Date()
          const startTime = new Date(currentActivity.start_time)
          const durationMinutes = Math.floor(
            (endTime.getTime() - startTime.getTime()) / 60000
          )

          // Update activity
          const { error: activityError } = await supabase
            .from('tour_activities')
            .update({
              end_time: endTime.toISOString(),
              duration_minutes: durationMinutes,
              notes: notes || currentActivity.notes
            })
            .eq('id', currentActivity.id)

          if (activityError) throw activityError

          // Update tour totals
          if (currentTour) {
            const activityType = currentActivity.activity_type.toLowerCase() + '_minutes'
            const currentTotal = (currentTour as any)[activityType] || 0
            
            const { error: tourError } = await supabase
              .from('tours')
              .update({
                [activityType]: currentTotal + durationMinutes,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentTour.id)

            if (tourError) throw tourError
          }

          // Update job time if job_id exists
          if (currentActivity.job_id) {
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
              }
            }
          }

          set({ 
            currentActivity: null,
            loading: false 
          })
        } catch (error) {
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      switchActivity: async (newType, jobId, notes) => {
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
        if (!currentTour) return

        set({ loading: true, error: null })
        try {
          const { error } = await supabase
            .from('tours')
            .update({
              total_mileage: mileage,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentTour.id)

          if (error) throw error

          set({ 
            currentTour: { ...currentTour, total_mileage: mileage },
            loading: false 
          })
        } catch (error) {
          set({ error: (error as Error).message, loading: false })
          throw error
        }
      },

      fetchTourActivities: async (tourId) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await supabase
            .from('tour_activities')
            .select('*')
            .eq('tour_id', tourId)
            .order('start_time', { ascending: true })

          if (error) throw error

          set({ activities: data || [], loading: false })
        } catch (error) {
          set({ error: (error as Error).message, loading: false })
        }
      },

      getTodaysTour: async () => {
        const today = new Date().toISOString().split('T')[0]
        
        try {
          const { data, error } = await supabase
            .from('tours')
            .select('*')
            .eq('tour_date', today)
            .single()

          if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
          
          if (data) {
            set({ 
              currentTour: data, 
              tourStatus: data.status === 'Completed' ? 'Completed' : 
                         data.status === 'On Break' ? 'On Break' : 'Active'
            })
          }
          
          return data
        } catch (error) {
          console.error('Error fetching today\'s tour:', error)
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
```

### Part 2: Tour Control Widget Component

Create `src/components/tour/TourControl.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Play, 
  Pause, 
  StopCircle, 
  Coffee,
  Search,
  Navigation,
  Clock,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useTourStore } from '../../stores/tourStore'
import { useJobStore } from '../../stores/jobStore'

export function TourControl() {
  const navigate = useNavigate()
  const { 
    tourStatus, 
    currentTour, 
    currentActivity,
    startTour, 
    endTour, 
    pauseTour, 
    resumeTour,
    startActivity,
    endActivity,
    getCurrentActivityDuration,
    getTourDuration,
    getTodaysTour
  } = useTourStore()

  const { jobs, fetchJobs } = useJobStore()

  const [isExpanded, setIsExpanded] = useState(true)
  const [showResearchModal, setShowResearchModal] = useState(false)
  const [selectedJobForResearch, setSelectedJobForResearch] = useState('')
  const [activityDuration, setActivityDuration] = useState(0)
  const [tourDuration, setTourDuration] = useState(0)

  // Auto-refresh durations
  useEffect(() => {
    const interval = setInterval(() => {
      setActivityDuration(getCurrentActivityDuration())
      setTourDuration(getTourDuration())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [currentActivity, currentTour])

  // Load today's tour on mount
  useEffect(() => {
    getTodaysTour()
    fetchJobs({ 
      dateFrom: new Date().toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    })
  }, [])

  // Today's jobs
  const todaysJobs = jobs.filter(j => {
    if (!j.scheduled_date) return false
    const today = new Date().toDateString()
    return new Date(j.scheduled_date).toDateString() === today
  })

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const handleStartTour = async () => {
    try {
      await startTour()
    } catch (error) {
      console.error('Error starting tour:', error)
      alert('Failed to start tour')
    }
  }

  const handleEndTour = async () => {
    if (!confirm('Are you sure you want to end today\'s tour?')) return
    
    try {
      await endTour()
    } catch (error) {
      console.error('Error ending tour:', error)
      alert('Failed to end tour')
    }
  }

  const handleStartResearch = async () => {
    if (!selectedJobForResearch) {
      alert('Please select a job to research')
      return
    }

    try {
      // If there's a current activity, end it first
      if (currentActivity && currentActivity.activity_type !== 'Research') {
        await endActivity('Switching to research')
      }

      await startActivity('Research', selectedJobForResearch, 'Research mode')
      setShowResearchModal(false)
      setSelectedJobForResearch('')
    } catch (error) {
      console.error('Error starting research:', error)
      alert('Failed to start research mode')
    }
  }

  const handleEndResearch = async () => {
    try {
      await endActivity('Research complete')
    } catch (error) {
      console.error('Error ending research:', error)
      alert('Failed to end research')
    }
  }

  const getActivityColor = (type?: string) => {
    const colors = {
      'Travel': 'bg-blue-100 text-blue-800',
      'Diagnosis': 'bg-purple-100 text-purple-800',
      'Repair': 'bg-green-100 text-green-800',
      'Research': 'bg-yellow-100 text-yellow-800',
      'Break': 'bg-gray-100 text-gray-800'
    }
    return type ? colors[type as keyof typeof colors] : 'bg-gray-100 text-gray-800'
  }

  if (tourStatus === 'Completed') {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <StopCircle className="text-green-600" size={24} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Tour Completed</p>
            <p className="text-sm text-gray-600">Great work today!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 max-w-sm z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">Tour Control</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Tour Status */}
            {tourStatus === 'Not Started' ? (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Ready to start your day?</p>
                <button
                  onClick={handleStartTour}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mx-auto"
                >
                  <Play size={20} />
                  Start Tour
                </button>
              </div>
            ) : (
              <>
                {/* Current Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Tour Duration</p>
                      <p className="text-2xl font-bold text-blue-900">{formatDuration(tourDuration)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      tourStatus === 'Active' ? 'bg-green-100 text-green-800' :
                      tourStatus === 'On Break' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tourStatus}
                    </div>
                  </div>

                  {/* Current Activity */}
                  {currentActivity && (
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(currentActivity.activity_type)}`}>
                          {currentActivity.activity_type}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDuration(activityDuration)}
                        </span>
                      </div>
                      {currentActivity.job_id && (
                        <p className="text-sm text-gray-600">
                          Job: {jobs.find(j => j.id === currentActivity.job_id)?.job_id}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {currentActivity?.activity_type === 'Research' ? (
                    <button
                      onClick={handleEndResearch}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                    >
                      <StopCircle size={18} />
                      End Research
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowResearchModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50 font-medium"
                    >
                      <Search size={18} />
                      Start Research
                    </button>
                  )}

                  {tourStatus === 'Active' ? (
                    <button
                      onClick={pauseTour}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      <Coffee size={18} />
                      Take Break
                    </button>
                  ) : tourStatus === 'On Break' ? (
                    <button
                      onClick={resumeTour}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      <Play size={18} />
                      Resume Tour
                    </button>
                  ) : null}

                  <button
                    onClick={handleEndTour}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    <StopCircle size={18} />
                    End Tour
                  </button>
                </div>

                {/* Today's Jobs */}
                {todaysJobs.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Today's Jobs ({todaysJobs.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {todaysJobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {job.job_id}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              {job.job_stage}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            {job.customer?.customer_type === 'Commercial'
                              ? job.customer.business_name
                              : `${job.customer?.first_name} ${job.customer?.last_name}`}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {job.appliance_type}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Research Modal */}
      {showResearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Start Research Mode</h3>
              <button
                onClick={() => setShowResearchModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which job are you researching?
                </label>
                <select
                  value={selectedJobForResearch}
                  onChange={(e) => setSelectedJobForResearch(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a job...</option>
                  
                  {todaysJobs.length > 0 && (
                    <optgroup label="Today's Jobs">
                      {todaysJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.job_id} - {job.customer?.customer_type === 'Commercial'
                            ? job.customer.business_name
                            : `${job.customer?.first_name} ${job.customer?.last_name}`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {jobs.filter(j => j.job_stage !== 'Complete').length > 0 && (
                    <optgroup label="Active Jobs">
                      {jobs
                        .filter(j => j.job_stage !== 'Complete' && !todaysJobs.find(tj => tj.id === j.id))
                        .slice(0, 10)
                        .map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.job_id} - {job.customer?.customer_type === 'Commercial'
                              ? job.customer.business_name
                              : `${job.customer?.first_name} ${job.customer?.last_name}`}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Research Mode:</strong> Time will be tracked separately and allocated to the selected job. 
                  If you're currently on-site, both jobs will track time simultaneously.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowResearchModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStartResearch}
                disabled={!selectedJobForResearch}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Start Research
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

### Part 3: Job Activity Controls

Create `src/components/tour/JobActivityControls.tsx`:

```typescript
import { useState } from 'react'
import { Navigation, Stethoscope, Wrench } from 'lucide-react'
import { useTourStore } from '../../stores/tourStore'

interface JobActivityControlsProps {
  jobId: string
  jobTitle: string
}

export function JobActivityControls({ jobId, jobTitle }: JobActivityControlsProps) {
  const { 
    tourStatus, 
    currentActivity, 
    startActivity, 
    endActivity,
    switchActivity 
  } = useTourStore()

  const [loading, setLoading] = useState(false)

  const handleStartActivity = async (type: 'Travel' | 'Diagnosis' | 'Repair') => {
    if (tourStatus === 'Not Started') {
      alert('Please start your tour first')
      return
    }

    setLoading(true)
    try {
      if (currentActivity?.job_id === jobId && currentActivity.activity_type === type) {
        // Already doing this activity for this job
        return
      }

      if (currentActivity) {
        await switchActivity(type, jobId, `${type} for ${jobTitle}`)
      } else {
        await startActivity(type, jobId, `${type} for ${jobTitle}`)
      }
    } catch (error) {
      console.error('Error starting activity:', error)
      alert('Failed to start activity')
    } finally {
      setLoading(false)
    }
  }

  const handleEndActivity = async () => {
    if (!currentActivity) return

    setLoading(true)
    try {
      await endActivity('Activity completed')
    } catch (error) {
      console.error('Error ending activity:', error)
      alert('Failed to end activity')
    } finally {
      setLoading(false)
    }
  }

  const isCurrentActivity = (type: string) => {
    return currentActivity?.job_id === jobId && currentActivity?.activity_type === type
  }

  if (tourStatus === 'Not Started') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Start your tour to begin tracking time for this job
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Job Activity Tracking</h3>
      
      <div className="space-y-2">
        <button
          onClick={() => handleStartActivity('Travel')}
          disabled={loading || isCurrentActivity('Travel')}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            isCurrentActivity('Travel')
              ? 'bg-blue-600 text-white'
              : 'border-2 border-blue-500 text-blue-700 hover:bg-blue-50'
          } disabled:opacity-50`}
        >
          <Navigation size={20} />
          {isCurrentActivity('Travel') ? 'Traveling...' : 'Start Travel'}
        </button>

        <button
          onClick={() => handleStartActivity('Diagnosis')}
          disabled={loading || isCurrentActivity('Diagnosis')}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            isCurrentActivity('Diagnosis')
              ? 'bg-purple-600 text-white'
              : 'border-2 border-purple-500 text-purple-700 hover:bg-purple-50'
          } disabled:opacity-50`}
        >
          <Stethoscope size={20} />
          {isCurrentActivity('Diagnosis') ? 'Diagnosing...' : 'Start Diagnosis'}
        </button>

        <button
          onClick={() => handleStartActivity('Repair')}
          disabled={loading || isCurrentActivity('Repair')}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            isCurrentActivity('Repair')
              ? 'bg-green-600 text-white'
              : 'border-2 border-green-500 text-green-700 hover:bg-green-50'
          } disabled:opacity-50`}
        >
          <Wrench size={20} />
          {isCurrentActivity('Repair') ? 'Repairing...' : 'Start Repair'}
        </button>

        {currentActivity?.job_id === jobId && (
          <button
            onClick={handleEndActivity}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
          >
            End Current Activity
          </button>
        )}
      </div>

      {currentActivity && currentActivity.job_id !== jobId && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>Note:</strong> Currently tracking activity for a different job. 
            Starting an activity here will switch to this job.
          </p>
        </div>
      )}
    </div>
  )
}
```

### Part 4: Tour Summary Component

Create `src/components/tour/TourSummary.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Clock, Navigation, Stethoscope, Wrench, Search, Coffee } from 'lucide-react'
import { useTourStore, type Tour, type TourActivity } from '../../stores/tourStore'

interface TourSummaryProps {
  tourId?: string
}

export function TourSummary({ tourId }: TourSummaryProps) {
  const { activities, fetchTourActivities, currentTour } = useTourStore()
  const [tour, setTour] = useState<Tour | null>(currentTour)

  useEffect(() => {
    if (tourId) {
      fetchTourActivities(tourId)
    }
  }, [tourId])

  if (!tour) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No tour data available</p>
      </div>
    )
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0h 0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getActivityIcon = (type: string) => {
    const icons = {
      'Travel': Navigation,
      'Diagnosis': Stethoscope,
      'Repair': Wrench,
      'Research': Search,
      'Break': Coffee
    }
    const Icon = icons[type as keyof typeof icons]
    return Icon ? <Icon size={16} /> : null
  }

  const getActivityColor = (type: string) => {
    const colors = {
      'Travel': 'bg-blue-100 text-blue-800',
      'Diagnosis': 'bg-purple-100 text-purple-800',
      'Repair': 'bg-green-100 text-green-800',
      'Research': 'bg-yellow-100 text-yellow-800',
      'Break': 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors]
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="text-blue-600" size={16} />
            <p className="text-sm text-gray-600">Travel</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatDuration(tour.travel_minutes)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="text-purple-600" size={16} />
            <p className="text-sm text-gray-600">Diagnosis</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatDuration(tour.diagnosis_minutes)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="text-green-600" size={16} />
            <p className="text-sm text-gray-600">Repair</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatDuration(tour.repair_minutes)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="text-yellow-600" size={16} />
            <p className="text-sm text-gray-600">Research</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatDuration(tour.research_minutes)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="text-gray-600" size={16} />
            <p className="text-sm text-gray-600">Breaks</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatDuration(tour.break_minutes)}</p>
        </div>
      </div>

      {/* Total Duration */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium mb-1">Total Tour Duration</p>
            <p className="text-3xl font-bold text-blue-900">
              {formatDuration(tour.total_duration_minutes)}
            </p>
          </div>
          {tour.total_mileage && (
            <div className="text-right">
              <p className="text-sm text-blue-700 font-medium mb-1">Total Mileage</p>
              <p className="text-3xl font-bold text-blue-900">{tour.total_mileage} mi</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Activity Timeline</h3>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-3 border-b border-gray-100 last:border-0">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor(activity.activity_type)}`}>
                      {activity.activity_type}
                    </span>
                    {activity.duration_minutes && (
                      <span className="text-sm font-semibold text-gray-900">
                        {formatDuration(activity.duration_minutes)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(activity.start_time).toLocaleTimeString()} 
                    {activity.end_time && ` - ${new Date(activity.end_time).toLocaleTimeString()}`}
                  </p>
                  {activity.notes && (
                    <p className="text-sm text-gray-500 mt-1">{activity.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### Part 5: Integrate Tour Control into Layout

Update `src/components/Layout.tsx` to include the tour control:

```typescript
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TourControl } from './tour/TourControl'

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <TourControl />
    </div>
  )
}
```

### Part 6: Add Tour Activity Controls to Job Detail

Update `src/pages/jobs/JobDetail.tsx` to include activity controls:

```typescript
// Add to imports
import { JobActivityControls } from '../../components/tour/JobActivityControls'

// Add to the sidebar section (after Customer Information)
{/* Activity Tracking */}
<JobActivityControls 
  jobId={currentJob.id} 
  jobTitle={`${currentJob.job_id} - ${currentJob.appliance_type}`}
/>
```

### Part 7: Database Tables

Ensure these tables exist in Supabase:

```sql
-- Tours table
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_duration_minutes INTEGER DEFAULT 0,
  travel_minutes INTEGER DEFAULT 0,
  diagnosis_minutes INTEGER DEFAULT 0,
  repair_minutes INTEGER DEFAULT 0,
  research_minutes INTEGER DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  total_mileage DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tour_date UNIQUE(tour_date)
);

-- Tour Activities table
CREATE TABLE IF NOT EXISTS tour_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  activity_type VARCHAR(20) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tours_date ON tours(tour_date);
CREATE INDEX IF NOT EXISTS idx_activities_tour ON tour_activities(tour_id);
CREATE INDEX IF NOT EXISTS idx_activities_job ON tour_activities(job_id);
CREATE INDEX IF NOT EXISTS idx_activities_start ON tour_activities(start_time);
```

## ✅ Success Metrics

Stage 4 is complete when:

- [ ] Can start tour for the day
- [ ] Tour status shows correctly (Active, On Break, Completed)
- [ ] Tour Control widget displays and updates in real-time
- [ ] Duration timers update every second
- [ ] Can start Travel, Diagnosis, Repair activities for jobs
- [ ] Can switch between activities seamlessly
- [ ] Research mode works from anywhere
- [ ] Can select any job for research
- [ ] Break tracking works correctly
- [ ] Activity durations calculate accurately
- [ ] Job time fields update when activities end
- [ ] Tour totals update correctly
- [ ] Can end tour and see summary
- [ ] Tour summary shows all activities
- [ ] Today's jobs list appears in tour control
- [ ] Activity controls work on job detail page
- [ ] Multiple activities can be tracked for same job
- [ ] Tour persists across page refreshes
- [ ] No console errors

## 🚫 Troubleshooting

**Tour won't start:**
- Check tours table exists in Supabase
- Verify user has proper permissions
- Check browser console for errors
- Try clearing localStorage

**Activities not ending:**
- Verify tour_activities table exists
- Check that tour ID is valid
- Test endActivity function with console logs
- Check Supabase logs for errors

**Time not allocating to jobs:**
- Verify job_id is being passed correctly
- Check that time fields exist on jobs table
- Test job update query directly in Supabase
- Verify foreign key relationships

**Tour Control not appearing:**
- Check that Layout component includes TourControl
- Verify z-index isn't being covered
- Check that component is rendering (React DevTools)

**Durations not updating:**
- Check that useEffect interval is running
- Verify getCurrentActivityDuration function
- Test with console.log in interval
- Check that currentActivity exists

## 📝 Notes for Next Stage

Stage 5 will build upon this tour foundation to add:
- Parts inventory system
- FIFO cost tracking
- Stock management
- Parts usage on jobs
- Inventory transactions
- Multiple storage locations

## 🎯 Summary

You now have:
- Complete tour-based time tracking system
- Flexible research mode for any job
- Activity management (Travel, Diagnosis, Repair, Research, Break)
- Always-visible tour control widget
- Real-time duration tracking
- Automatic time allocation to jobs
- Break tracking (non-billable)
- Tour summary with timeline
- Integration with job system
- Job activity controls on job detail page
- Today's jobs quick access

This tour system provides the foundation for accurate time tracking and job costing!

---

## 💡 Tips for Success

1. **Test the complete flow**: Start tour → Start activity → Switch activities → Research mode → Break → End tour
2. **Verify time allocation**: Check that job time fields update correctly when activities end
3. **Test research mode**: Start research while on-site at different job, verify both jobs track time
4. **Check persistence**: Refresh page and verify tour state persists
5. **Review tour summary**: End tour and verify all activities are logged correctly
6. **Test edge cases**: What happens if tour crashes? Can you resume? Does it recover state?

Stage 4 is complex with real-time updates - test thoroughly before moving to Stage 5!
