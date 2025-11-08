import { TourControl } from '../components/tour/TourControl'
import { TourSummary } from '../components/tour/TourSummary'
import { useTourStore } from '../stores/tourStore'

export function Tour() {
  const { currentTour, tourStatus } = useTourStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Management</h1>
          <p className="text-gray-600 mt-1">Track your daily activities and job time</p>
        </div>
      </div>

      {/* Tour Summary (shown when tour is active or completed) */}
      {tourStatus !== 'Not Started' && currentTour && (
        <TourSummary tour={currentTour} />
      )}

      {/* Instructions when tour not started */}
      {tourStatus === 'Not Started' && (
        <div className="card text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Start Your Day?</h2>
          <p className="text-gray-600 mb-6">
            Use the Tour Control panel in the bottom right to begin tracking your activities.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto text-left">
            <h3 className="font-semibold text-blue-900 mb-3">How Tour Tracking Works:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Start Tour:</strong> Begin tracking your day with the Tour Control panel</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Track Activities:</strong> Log travel, diagnosis, repair, research, and break time</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Job Activities:</strong> Track time for specific jobs from the job detail page</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Research Mode:</strong> Track research time for any job from the Tour Control panel</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>End Tour:</strong> Complete your day and review your activity summary</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tour Control is always visible as a fixed panel */}
      <TourControl />
    </div>
  )
}
