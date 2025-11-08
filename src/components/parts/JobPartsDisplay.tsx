import { useEffect } from 'react'
import { Trash2, Package } from 'lucide-react'
import { usePartsStore } from '../../stores/partsStore'

interface JobPartsDisplayProps {
  jobId: string
}

export function JobPartsDisplay({ jobId }: JobPartsDisplayProps) {
  const { jobParts, fetchJobParts, removePartFromJob, loading } = usePartsStore()

  useEffect(() => {
    fetchJobParts(jobId)
  }, [jobId])

  const handleRemovePart = async (jobPartId: string) => {
    if (!confirm('Are you sure you want to remove this part from the job?')) return

    try {
      await removePartFromJob(jobPartId)
      await fetchJobParts(jobId)
    } catch (error) {
      console.error('Error removing part:', error)
      alert('Failed to remove part')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const totalPartsCost = jobParts.reduce((sum, jp) => sum + jp.total_cost, 0)
  const totalPartsSell = jobParts.reduce((sum, jp) => sum + jp.sell_price, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Parts on Job</h3>

      {jobParts.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600 text-sm">No parts added yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {jobParts.map((jobPart) => (
              <div
                key={jobPart.id}
                className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 font-mono">
                      {jobPart.part_number}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      jobPart.source === 'Stock'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {jobPart.source}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{jobPart.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Qty: {jobPart.quantity}</span>
                    <span>Cost: {formatCurrency(jobPart.unit_cost)}</span>
                    <span>Markup: {jobPart.markup_percent}%</span>
                  </div>
                  {jobPart.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{jobPart.notes}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(jobPart.sell_price)}
                  </p>
                  <button
                    onClick={() => handleRemovePart(jobPart.id)}
                    disabled={loading}
                    className="mt-2 p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Parts Cost:</span>
              <span className="font-medium">{formatCurrency(totalPartsCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Parts Total:</span>
              <span className="font-bold text-blue-600 text-lg">
                {formatCurrency(totalPartsSell)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
