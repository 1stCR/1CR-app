import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Building2, Home, Edit, Trash2 } from 'lucide-react'
import { useCustomerStore } from '../../stores/customerStore'

export function CustomerList() {
  const { customers, loading, fetchCustomers, deleteCustomer } = useCustomerStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'Residential' | 'Commercial'>('all')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' ||
      customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone_primary?.includes(searchQuery) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = filterType === 'all' ||
      customer.customer_type === filterType

    return matchesSearch && matchesType
  })

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteCustomer(id)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <Link
          to="/customers/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Customer
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search customers..."
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg ${
                filterType === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setFilterType('Residential')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                filterType === 'Residential'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Home size={16} />
              Residential
            </button>
            <button
              onClick={() => setFilterType('Commercial')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                filterType === 'Commercial'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Building2 size={16} />
              Commercial
            </button>
          </div>
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="card">
          <div className="text-center py-12 text-gray-500">
            Loading customers...
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
            </p>
            {!searchQuery && (
              <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={20} />
                Add Your First Customer
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.customer_type === 'Commercial' && customer.business_name ? (
                            <>
                              {customer.business_name}
                              <span className="text-gray-500 ml-2">
                                ({customer.first_name} {customer.last_name})
                              </span>
                            </>
                          ) : (
                            `${customer.first_name} ${customer.last_name}`
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.customer_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.customer_type === 'Commercial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {customer.customer_type === 'Commercial' ? (
                          <Building2 size={12} />
                        ) : (
                          <Home size={12} />
                        )}
                        {customer.customer_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.phone_primary && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} className="text-gray-400" />
                            {customer.phone_primary}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} className="text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.city && customer.state ? (
                        `${customer.city}, ${customer.state}`
                      ) : (
                        <span className="text-gray-400">No address</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </Link>
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(customer.id, `${customer.first_name} ${customer.last_name}`)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
