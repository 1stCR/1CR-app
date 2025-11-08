import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Search, X } from 'lucide-react'
import { useJobStore, type Job } from '../../stores/jobStore'
import { useCustomerStore, type Customer } from '../../stores/customerStore'

interface JobWizardProps {
  onClose?: () => void
  preselectedCustomerId?: string
}

export function JobWizard({ onClose, preselectedCustomerId }: JobWizardProps) {
  const navigate = useNavigate()
  const { createJob, loading } = useJobStore()
  const { customers, searchCustomers } = useCustomerStore()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<Job>>({
    customer_id: preselectedCustomerId || '',
    appliance_type: '',
    brand: '',
    model_number: '',
    serial_number: '',
    issue_description: '',
    scheduled_date: '',
    scheduled_time_window: '',
    priority: 'Normal'
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)

  // Appliance type options
  const applianceTypes = [
    'Refrigerator',
    'Freezer',
    'Washer',
    'Dryer',
    'Dishwasher',
    'Range/Stove',
    'Oven',
    'Microwave',
    'Ice Maker',
    'Garbage Disposal',
    'Other'
  ]

  // Common brands
  const brands = [
    'Whirlpool',
    'GE',
    'Frigidaire',
    'Samsung',
    'LG',
    'KitchenAid',
    'Maytag',
    'Bosch',
    'Electrolux',
    'Kenmore',
    'Other'
  ]

  // Time windows
  const timeWindows = [
    '8:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    'Flexible'
  ]

  // Customer search handler
  const handleCustomerSearch = async (query: string) => {
    setCustomerSearch(query)
    if (query.length >= 2) {
      const results = await searchCustomers(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  // Select customer
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({ ...formData, customer_id: customer.id })
    setShowCustomerSearch(false)
    setCustomerSearch('')
  }

  // Form validation
  const canProceed = () => {
    if (step === 1) {
      return formData.customer_id !== ''
    }
    if (step === 2) {
      return formData.appliance_type !== '' && formData.issue_description !== ''
    }
    if (step === 3) {
      return true // Optional scheduling
    }
    return false
  }

  // Submit handler
  const handleSubmit = async () => {
    try {
      console.log('JobWizard: Starting job creation with formData:', formData)
      const newJob = await createJob(formData)
      console.log('JobWizard: Job created successfully:', newJob)

      if (onClose) {
        console.log('JobWizard: Closing modal')
        onClose()
      } else {
        console.log('JobWizard: Navigating to job detail:', `/jobs/${newJob.id}`)
        navigate(`/jobs/${newJob.id}`)
      }
    } catch (error) {
      console.error('JobWizard: Error creating job:', error)
      alert('Failed to create job. Please try again.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Job</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, label: 'Customer' },
          { num: 2, label: 'Appliance & Issue' },
          { num: 3, label: 'Schedule' }
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s.num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s.num}
              </div>
              <span
                className={`text-sm mt-2 ${
                  step >= s.num ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < 2 && (
              <div
                className={`h-1 flex-1 mx-4 ${
                  step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-96">
        {/* Step 1: Customer Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Customer *
              </label>

              {selectedCustomer ? (
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">
                        {selectedCustomer.customer_type === 'Commercial'
                          ? selectedCustomer.business_name
                          : `${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
                      </p>
                      {selectedCustomer.customer_type === 'Commercial' && (
                        <p className="text-sm text-gray-600">
                          Contact: {selectedCustomer.first_name} {selectedCustomer.last_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedCustomer.phone_primary}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedCustomer.address_street}, {selectedCustomer.city}, {selectedCustomer.state}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setFormData({ ...formData, customer_id: '' })
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by name, phone, or address..."
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => setShowCustomerSearch(true)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Search Results */}
                  {showCustomerSearch && searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                      {searchResults.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-semibold">
                            {customer.customer_type === 'Commercial'
                              ? customer.business_name
                              : `${customer.first_name} ${customer.last_name}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {customer.phone_primary}
                          </p>
                          <p className="text-sm text-gray-500">
                            {customer.address_street}, {customer.city}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recent Customers */}
                  {!showCustomerSearch && customers.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Recent Customers
                      </p>
                      <div className="space-y-2">
                        {customers.slice(0, 5).map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <p className="font-medium">
                              {customer.customer_type === 'Commercial'
                                ? customer.business_name
                                : `${customer.first_name} ${customer.last_name}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {customer.phone_primary}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => navigate('/customers/new')}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add New Customer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Appliance & Issue */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appliance Type *
              </label>
              <select
                value={formData.appliance_type}
                onChange={(e) => setFormData({ ...formData, appliance_type: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select appliance type...</option>
                {applianceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select brand...</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Number
                </label>
                <input
                  type="text"
                  value={formData.model_number}
                  onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                  placeholder="e.g., WED5000DW"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number (optional)
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Serial number"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description *
              </label>
              <textarea
                value={formData.issue_description}
                onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                placeholder="Describe the problem..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Job['priority'] })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Date (optional)
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Window (optional)
              </label>
              <select
                value={formData.scheduled_time_window}
                onChange={(e) => setFormData({ ...formData, scheduled_time_window: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select time window...</option>
                {timeWindows.map((window) => (
                  <option key={window} value={window}>
                    {window}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Job Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {selectedCustomer?.customer_type === 'Commercial'
                      ? selectedCustomer.business_name
                      : `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Appliance:</span>
                  <span className="font-medium">{formData.appliance_type}</span>
                </div>
                {formData.brand && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="font-medium">{formData.brand}</span>
                  </div>
                )}
                {formData.model_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{formData.model_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className={`font-medium ${
                    formData.priority === 'Urgent' ? 'text-red-600' :
                    formData.priority === 'High' ? 'text-orange-600' :
                    'text-gray-900'
                  }`}>
                    {formData.priority}
                  </span>
                </div>
                {formData.scheduled_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(formData.scheduled_date).toLocaleDateString()}
                      {formData.scheduled_time_window && ` (${formData.scheduled_time_window})`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            if (step === 1) {
              if (onClose) onClose()
              else navigate('/jobs')
            } else {
              setStep(step - 1)
            }
          }}
          className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          <ChevronLeft size={20} />
          {step === 1 ? 'Cancel' : 'Previous'}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Next
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        )}
      </div>
    </div>
  )
}
