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
