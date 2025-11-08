import { useState, useEffect } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { usePartsStore, type Part } from '../../stores/partsStore'

interface AddPartToJobProps {
  jobId: string
  onPartAdded?: () => void
}

export function AddPartToJob({ jobId, onPartAdded }: AddPartToJobProps) {
  const { parts, searchParts, addPartToJob, loading } = usePartsStore()
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Part[]>([])
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [source, setSource] = useState<'Stock' | 'Direct Order'>('Stock')
  const [unitCost, setUnitCost] = useState<number>(0)
  const [markupPercent, setMarkupPercent] = useState(20)
  const [notes, setNotes] = useState('')

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      const results = await searchParts(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part)
    setUnitCost(part.avg_cost || 0)
    setMarkupPercent(part.markup_percent)

    if (part.in_stock < quantity) {
      setSource('Direct Order')
    }
  }

  const handleSubmit = async () => {
    if (!selectedPart) return

    try {
      await addPartToJob(jobId, {
        part_number: selectedPart.part_number,
        quantity,
        unit_cost: source === 'Direct Order' ? unitCost : undefined,
        markup_percent: markupPercent,
        source,
        notes
      })

      setShowModal(false)
      setSelectedPart(null)
      setSearchQuery('')
      setQuantity(1)
      setSource('Stock')
      setUnitCost(0)
      setNotes('')

      if (onPartAdded) {
        onPartAdded()
      }
    } catch (error) {
      console.error('Error adding part to job:', error)
      alert('Failed to add part to job')
    }
  }

  const calculateSellPrice = () => {
    const cost = source === 'Stock' && selectedPart?.avg_cost
      ? selectedPart.avg_cost
      : unitCost
    return cost * (1 + markupPercent / 100) * quantity
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        <Plus size={20} />
        Add Part
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add Part to Job</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Part Search */}
              {!selectedPart && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search for Part
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by part number, description, or brand..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                      {searchResults.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => handleSelectPart(part)}
                          className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{part.part_number}</p>
                              <p className="text-sm text-gray-600">{part.description}</p>
                              {part.brand && (
                                <p className="text-xs text-gray-500">{part.brand}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                Stock: {part.in_stock}
                              </p>
                              <p className="text-xs text-gray-600">
                                ${part.avg_cost?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Part Details */}
              {selectedPart && (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{selectedPart.part_number}</p>
                        <p className="text-sm text-gray-600">{selectedPart.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {selectedPart.in_stock} units
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPart(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Source *
                      </label>
                      <select
                        name="source"
                        value={source}
                        onChange={(e) => setSource(e.target.value as any)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Stock" disabled={selectedPart.in_stock < quantity}>
                          From Stock {selectedPart.in_stock < quantity ? '(Insufficient Stock)' : ''}
                        </option>
                        <option value="Direct Order">Direct Order</option>
                      </select>
                      {selectedPart.in_stock < quantity && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Not enough stock ({selectedPart.in_stock} available) - Direct Order recommended
                        </p>
                      )}
                    </div>
                  </div>

                  {source === 'Direct Order' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Cost * (Direct Order)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <input
                          type="number"
                          name="unit_cost"
                          step="0.01"
                          min="0"
                          value={unitCost}
                          onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Markup Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="500"
                        value={markupPercent}
                        onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                        className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-3 text-gray-500">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Any special notes about this part..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Price Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Unit Cost:</span>
                      <span className="font-medium">
                        ${(source === 'Stock' ? selectedPart.avg_cost || 0 : unitCost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Markup:</span>
                      <span className="font-medium">{markupPercent}%</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Customer Price:</span>
                      <span className="font-bold text-blue-600 text-lg">
                        ${calculateSellPrice().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedPart || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Adding...' : 'Add to Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
