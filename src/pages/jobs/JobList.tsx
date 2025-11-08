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
