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
  Plus
} from 'lucide-react'
import { useJobStore, type Job, type JobVisit } from '../../stores/jobStore'
import { JobActivityControls } from '../../components/tour/JobActivityControls'
import { AddPartToJob } from '../../components/parts/AddPartToJob'
import { JobPartsDisplay } from '../../components/parts/JobPartsDisplay'

export function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentJob, fetchJobById, updateJobStatus, addVisit, fetchJobHistory, jobHistory, loading } = useJobStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'parts' | 'visits' | 'history'>('overview')
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
      // Refresh the job data to show updated status
      await fetchJobById(id)
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
      // Refresh the job data to show updated visits
      await fetchJobById(id)
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
            { id: 'parts', label: 'Parts' },
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

          {activeTab === 'parts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Job Parts</h2>
                <AddPartToJob jobId={id!} onPartAdded={() => fetchJobById(id!)} />
              </div>

              <JobPartsDisplay jobId={id!} />
            </div>
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

          {/* Activity Tracking */}
          <JobActivityControls
            jobId={currentJob.id}
            jobTitle={`${currentJob.job_id} - ${currentJob.appliance_type}`}
          />

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
