import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Home } from 'lucide-react'
import type { Customer } from '../../stores/customerStore'

interface CustomerFormProps {
  customer?: Customer
  onSubmit: (data: Partial<Customer>) => Promise<any>
}

export function CustomerForm({ customer, onSubmit }: CustomerFormProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    customer_type: customer?.customer_type || 'Residential',
    business_name: customer?.business_name || '',
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    phone_primary: customer?.phone_primary || '',
    phone_secondary: customer?.phone_secondary || '',
    email: customer?.email || '',
    address_street: customer?.address_street || '',
    city: customer?.city || '',
    state: customer?.state || 'WY',
    zip: customer?.zip || '',
    notes: customer?.notes || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await onSubmit(formData)
      navigate('/customers')
    } catch (err: any) {
      setError(err.message || 'Failed to save customer')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Customer Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customer Type
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, customer_type: 'Residential' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 ${
              formData.customer_type === 'Residential'
                ? 'border-primary-600 bg-primary-50 text-primary-600'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Home size={20} />
            Residential
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, customer_type: 'Commercial' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 ${
              formData.customer_type === 'Commercial'
                ? 'border-primary-600 bg-primary-50 text-primary-600'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Building2 size={20} />
            Commercial
          </button>
        </div>
      </div>

      {/* Business Name (for commercial) */}
      {formData.customer_type === 'Commercial' && (
        <div>
          <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            type="text"
            id="business_name"
            className="input mt-1"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            placeholder="ABC Restaurant"
          />
        </div>
      )}

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="first_name"
            className="input mt-1"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="last_name"
            className="input mt-1"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone_primary" className="block text-sm font-medium text-gray-700">
            Primary Phone
          </label>
          <input
            type="tel"
            id="phone_primary"
            className="input mt-1"
            value={formData.phone_primary}
            onChange={(e) => setFormData({ ...formData, phone_primary: e.target.value })}
            placeholder="(307) 555-1234"
          />
        </div>
        <div>
          <label htmlFor="phone_secondary" className="block text-sm font-medium text-gray-700">
            Secondary Phone
          </label>
          <input
            type="tel"
            id="phone_secondary"
            className="input mt-1"
            value={formData.phone_secondary}
            onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
            placeholder="(307) 555-5678"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          className="input mt-1"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="customer@example.com"
        />
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address_street" className="block text-sm font-medium text-gray-700">
          Street Address
        </label>
        <input
          type="text"
          id="address_street"
          className="input mt-1"
          value={formData.address_street}
          onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
          placeholder="123 Main St"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            type="text"
            id="city"
            className="input mt-1"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Buffalo"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State
          </label>
          <select
            id="state"
            className="input mt-1"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          >
            <option value="WY">WY</option>
            <option value="MT">MT</option>
            <option value="SD">SD</option>
            <option value="CO">CO</option>
          </select>
        </div>
        <div>
          <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
            ZIP Code
          </label>
          <input
            type="text"
            id="zip"
            className="input mt-1"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
            placeholder="82834"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          className="input mt-1"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any special instructions or notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  )
}
