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
    <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="job-activity-controls">
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
          data-testid="travel-button"
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
          data-testid="diagnosis-button"
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
          data-testid="repair-button"
        >
          <Wrench size={20} />
          {isCurrentActivity('Repair') ? 'Repairing...' : 'Start Repair'}
        </button>

        {currentActivity?.job_id === jobId && (
          <button
            onClick={handleEndActivity}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
            data-testid="end-activity-button"
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
