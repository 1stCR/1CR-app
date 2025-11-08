import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Invoice {
  id: string
  invoice_id: string
  job_id: string
  customer_id: string
  status: string
  subtotal: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number
  invoice_date: string
  due_date: string
  paid_date: string | null
  customer: {
    customer_id: string
    customer_type: string
    first_name: string | null
    last_name: string | null
    business_name: string | null
  }
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers (
            customer_id,
            customer_type,
            first_name,
            last_name,
            business_name
          )
        `)
        .order('invoice_date', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="text-green-600" size={16} />
      case 'Pending':
        return <Clock className="text-yellow-600" size={16} />
      case 'Overdue':
        return <AlertCircle className="text-red-600" size={16} />
      default:
        return <FileText className="text-gray-600" size={16} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true
    if (filter === 'pending') return invoice.status === 'Pending'
    if (filter === 'paid') return invoice.status === 'Paid'
    if (filter === 'overdue') return invoice.status === 'Overdue'
    return true
  })

  const getCustomerName = (invoice: Invoice) => {
    const customer = invoice.customer as any
    if (customer?.customer_type === 'Commercial') {
      return customer.business_name || 'Unknown Business'
    }
    return `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown Customer'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading invoices...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage customer invoices and payments</p>
        </div>
        <Link
          to="/invoices/new"
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Invoice
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Invoices
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'paid'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'overdue'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overdue
          </button>
        </div>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all'
              ? 'Get started by creating your first invoice'
              : `No ${filter} invoices at the moment`}
          </p>
          {filter === 'all' && (
            <Link to="/invoices/new" className="btn btn-primary inline-flex items-center gap-2">
              <Plus size={20} />
              Create Invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInvoices.map((invoice) => (
            <Link
              key={invoice.id}
              to={`/invoices/${invoice.id}`}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(invoice.status)}
                    <h3 className="font-semibold text-gray-900">{invoice.invoice_id}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Customer</p>
                      <p className="font-medium text-gray-900">{getCustomerName(invoice)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Job</p>
                      <p className="font-medium text-gray-900">{invoice.job_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Invoice Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Due Date</p>
                      <p className="font-medium text-gray-900">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-6 text-right">
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <DollarSign size={16} />
                    <span className="text-sm">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${invoice.total.toFixed(2)}
                  </p>
                  {invoice.balance_due > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      Balance: ${invoice.balance_due.toFixed(2)}
                    </p>
                  )}
                  {invoice.status === 'Paid' && invoice.paid_date && (
                    <p className="text-sm text-green-600 mt-1">
                      Paid: {new Date(invoice.paid_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
