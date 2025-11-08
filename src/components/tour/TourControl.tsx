import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Pause,
  StopCircle,
  Coffee,
  Search,
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
  }, [currentActivity, currentTour, getCurrentActivityDuration, getTourDuration])

  // Load today's tour on mount
  useEffect(() => {
    getTodaysTour().catch(err => console.error('Error loading tour:', err))
    fetchJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm" data-testid="tour-completed">
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
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 max-w-sm z-50" data-testid="tour-control">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">Tour Control</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded"
            data-testid="tour-control-toggle"
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
                  data-testid="start-tour-button"
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
                      <p className="text-2xl font-bold text-blue-900" data-testid="tour-duration">{formatDuration(tourDuration)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      tourStatus === 'Active' ? 'bg-green-100 text-green-800' :
                      tourStatus === 'On Break' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`} data-testid="tour-status">
                      {tourStatus}
                    </div>
                  </div>

                  {/* Current Activity */}
                  {currentActivity && (
                    <div className="p-3 border border-gray-200 rounded-lg" data-testid="current-activity">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(currentActivity.activity_type)}`}>
                          {currentActivity.activity_type}
                        </span>
                        <span className="text-sm font-semibold text-gray-900" data-testid="activity-duration">
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
                      data-testid="end-research-button"
                    >
                      <StopCircle size={18} />
                      End Research
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowResearchModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50 font-medium"
                      data-testid="start-research-button"
                    >
                      <Search size={18} />
                      Start Research
                    </button>
                  )}

                  {tourStatus === 'Active' ? (
                    <button
                      onClick={pauseTour}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      data-testid="pause-tour-button"
                    >
                      <Coffee size={18} />
                      Take Break
                    </button>
                  ) : tourStatus === 'On Break' ? (
                    <button
                      onClick={resumeTour}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      data-testid="resume-tour-button"
                    >
                      <Play size={18} />
                      Resume Tour
                    </button>
                  ) : null}

                  <button
                    onClick={handleEndTour}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    data-testid="end-tour-button"
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
                            {(job.customer as any)?.customer_type === 'Commercial'
                              ? (job.customer as any)?.business_name
                              : `${(job.customer as any)?.first_name} ${(job.customer as any)?.last_name}`}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="research-modal">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Start Research Mode</h3>
              <button
                onClick={() => setShowResearchModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="close-research-modal"
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
                  data-testid="research-job-select"
                >
                  <option value="">Select a job...</option>

                  {todaysJobs.length > 0 && (
                    <optgroup label="Today's Jobs">
                      {todaysJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.job_id} - {(job.customer as any)?.customer_type === 'Commercial'
                            ? (job.customer as any)?.business_name
                            : `${(job.customer as any)?.first_name} ${(job.customer as any)?.last_name}`}
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
                            {job.job_id} - {(job.customer as any)?.customer_type === 'Commercial'
                              ? (job.customer as any)?.business_name
                              : `${(job.customer as any)?.first_name} ${(job.customer as any)?.last_name}`}
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
                data-testid="confirm-research-button"
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
