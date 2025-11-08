import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CustomerForm } from '../../components/customers/CustomerForm'
import { useCustomerStore, type Customer } from '../../stores/customerStore'

export function EditCustomer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchCustomerById, updateCustomer } = useCustomerStore()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomer()
  }, [id])

  const loadCustomer = async () => {
    if (!id) {
      navigate('/customers')
      return
    }

    const data = await fetchCustomerById(id)
    if (data) {
      setCustomer(data)
    } else {
      navigate('/customers')
    }
    setLoading(false)
  }

  const handleUpdate = async (data: Partial<Customer>) => {
    if (!id) return
    await updateCustomer(id, data)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading customer...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
        <p className="text-gray-600">Update customer information</p>
      </div>

      <div className="card max-w-3xl">
        <CustomerForm customer={customer} onSubmit={handleUpdate} />
      </div>
    </div>
  )
}
