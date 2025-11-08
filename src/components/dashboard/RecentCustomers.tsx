import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface RecentCustomer {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  business_name?: string
  customer_type: string
  created_at: string
}

export function RecentCustomers() {
  const [customers, setCustomers] = useState<RecentCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentCustomers()
  }, [])

  const loadRecentCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, customer_id, first_name, last_name, business_name, customer_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data) {
      setCustomers(data)
    }
    setLoading(false)
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Recent Customers</h3>
        <Link to="/customers" className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : customers.length > 0 ? (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {customer.customer_type === 'Commercial' && customer.business_name
                      ? customer.business_name
                      : `${customer.first_name} ${customer.last_name}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {customer.customer_id} • Added {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Users size={16} className="text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No customers yet</p>
          <Link to="/customers/new" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
            Add your first customer
          </Link>
        </div>
      )}
    </div>
  )
}
