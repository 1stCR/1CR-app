import { useEffect } from 'react'
import { Clock, Navigation, Stethoscope, Wrench, Search, Coffee } from 'lucide-react'
import { useTourStore, type Tour } from '../../stores/tourStore'

interface TourSummaryProps {
  tour?: Tour
  tourId?: string
}

export function TourSummary({ tour: propTour, tourId }: TourSummaryProps) {
  const { activities, fetchTourActivities, currentTour } = useTourStore()
  const tour = propTour || currentTour

  useEffect(() => {
    if (tourId) {
      fetchTourActivities(tourId)
    } else if (tour) {
      fetchTourActivities(tour.id)
    }
  }, [tourId, tour])

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
          {tour.total_mileage && tour.total_mileage > 0 && (
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
