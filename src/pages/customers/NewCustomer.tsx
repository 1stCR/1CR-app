import { CustomerForm } from '../../components/customers/CustomerForm'
import { useCustomerStore } from '../../stores/customerStore'

export function NewCustomer() {
  const { createCustomer } = useCustomerStore()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
        <p className="text-gray-600">Create a new customer record</p>
      </div>

      <div className="card max-w-3xl">
        <CustomerForm onSubmit={createCustomer} />
      </div>
    </div>
  )
}
