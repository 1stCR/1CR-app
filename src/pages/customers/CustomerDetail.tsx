import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Building2,
  Home, Plus, User
} from 'lucide-react'
import { useCustomerStore, type Customer } from '../../stores/customerStore'

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    fetchCustomerById,
    deleteCustomer,
    contacts,
    fetchContactsForCustomer,
    createContact,
    deleteContact
  } = useCustomerStore()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({
    contact_name: '',
    phone: '',
    email: '',
    role: '',
    is_primary: false
  })

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
      await fetchContactsForCustomer(data.id)
    } else {
      navigate('/customers')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!customer) return

    if (confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) {
      await deleteCustomer(customer.id)
      navigate('/customers')
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return

    await createContact({
      ...newContact,
      customer_id: customer.id,
      active: true
    })

    setNewContact({
      contact_name: '',
      phone: '',
      email: '',
      role: '',
      is_primary: false
    })
    setShowAddContact(false)
  }

  const handleDeleteContact = async (contactId: string, name: string) => {
    if (confirm(`Remove contact ${name}?`)) {
      await deleteContact(contactId)
    }
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/customers"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.customer_type === 'Commercial' && customer.business_name
                  ? customer.business_name
                  : `${customer.first_name} ${customer.last_name}`}
              </h1>
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
            </div>
            <p className="text-gray-600">Customer ID: {customer.customer_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/customers/${customer.id}/edit`}
            className="btn-primary flex items-center gap-2"
          >
            <Edit size={16} />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Customer Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
          <div className="space-y-3">
            {customer.phone_primary && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Primary Phone</p>
                  <a href={`tel:${customer.phone_primary}`} className="text-primary-600 hover:underline">
                    {customer.phone_primary}
                  </a>
                </div>
              </div>
            )}
            {customer.phone_secondary && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Secondary Phone</p>
                  <a href={`tel:${customer.phone_secondary}`} className="text-primary-600 hover:underline">
                    {customer.phone_secondary}
                  </a>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a href={`mailto:${customer.email}`} className="text-primary-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Address</h3>
          {customer.address_street ? (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-gray-400 mt-1" />
              <div>
                <p>{customer.address_street}</p>
                <p>{customer.city}, {customer.state} {customer.zip}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No address on file</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Customer Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Jobs</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Jobs</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Member Since</span>
              <span className="font-semibold">
                {new Date(customer.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Contacts (for commercial customers) */}
      {customer.customer_type === 'Commercial' && (
        <div className="mt-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Additional Contacts</h3>
              <button
                onClick={() => setShowAddContact(!showAddContact)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>

            {showAddContact && (
              <form onSubmit={handleAddContact} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Contact Name"
                      className="input"
                      value={newContact.contact_name}
                      onChange={(e) => setNewContact({ ...newContact, contact_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Role"
                      className="input"
                      value={newContact.role}
                      onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone"
                      className="input"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      className="input"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="submit" className="btn-primary">
                    Save Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddContact(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-gray-400" />
                      <div>
                        <p className="font-medium">{contact.contact_name}</p>
                        <p className="text-sm text-gray-600">
                          {contact.role && `${contact.role} • `}
                          {contact.phone && `${contact.phone} • `}
                          {contact.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.contact_name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No additional contacts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {customer.notes && (
        <div className="mt-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        </div>
      )}

      {/* Job History (placeholder for Stage 3) */}
      <div className="mt-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Job History</h3>
          <p className="text-gray-500 text-center py-8">
            Job history will appear here after Stage 3
          </p>
        </div>
      </div>
    </div>
  )
}
