import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePartsStore } from '../../stores/partsStore'

export function NewPart() {
  const navigate = useNavigate()
  const { createPart, loading, error } = usePartsStore()

  const [formData, setFormData] = useState({
    part_number: '',
    description: '',
    category: '',
    brand: '',
    markup_percent: '20'
  })

  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.part_number || !formData.description) {
      setFormError('Part number and description are required')
      return
    }

    try {
      await createPart({
        part_number: formData.part_number,
        description: formData.description,
        category: formData.category || undefined,
        brand: formData.brand || undefined,
        markup_percent: parseFloat(formData.markup_percent) || 20
      })

      navigate('/parts')
    } catch (err) {
      setFormError((err as Error).message || 'Failed to create part')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/parts" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft size={20} className="mr-1" />
          Back to Parts
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Part</h1>
        <p className="text-gray-600 mt-1">Create a new part in the inventory</p>
      </div>

      {/* Error Display */}
      {(formError || error) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm">{formError || error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Part Number *
          </label>
          <input
            type="text"
            name="part_number"
            value={formData.part_number}
            onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
            placeholder="e.g., WP2187172"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Will be converted to uppercase</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., Refrigerator Water Inlet Valve"
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Refrigerator Parts"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g., Whirlpool"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Markup Percentage
          </label>
          <div className="relative">
            <input
              type="number"
              name="markup_percent"
              value={formData.markup_percent}
              onChange={(e) => setFormData({ ...formData, markup_percent: e.target.value })}
              min="0"
              max="500"
              step="1"
              className="w-full pr-8 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-3 text-gray-500">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Used to calculate sell price from cost</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-1">Initial Stock</p>
          <p className="text-sm text-blue-600">
            New parts start with 0 stock. Use Purchase transactions to add inventory after creating the part.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            to="/parts"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating...' : 'Create Part'}
          </button>
        </div>
      </form>
    </div>
  )
}
