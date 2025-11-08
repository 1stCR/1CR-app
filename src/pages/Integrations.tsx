import { CalendarSync } from '../components/integrations/CalendarSync';
import { Mail, MessageSquare, CreditCard, Package, Truck } from 'lucide-react';

export default function Integrations() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-2">
          Connect external services to automate workflows and enhance customer experience
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Calendar */}
        <CalendarSync />

        {/* SMS Notifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-green-600" size={24} />
            <h3 className="text-lg font-semibold">SMS Notifications</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Send automated SMS notifications for job confirmations, arrivals, quotes, and more via Twilio.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              Configure Twilio credentials in environment variables to enable SMS.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Required:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>TWILIO_ACCOUNT_SID</li>
              <li>TWILIO_AUTH_TOKEN</li>
              <li>TWILIO_PHONE_NUMBER</li>
            </ul>
          </div>
        </div>

        {/* Email Automation */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold">Email Automation</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Automatically send professional emails for quotes, invoices, receipts, and review requests via Resend.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              Configure Resend API key in environment variables to enable email.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Required:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>RESEND_API_KEY</li>
              <li>Verified domain in Resend</li>
            </ul>
          </div>
        </div>

        {/* Payment Processing */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="text-purple-600" size={24} />
            <h3 className="text-lg font-semibold">Payment Processing</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Accept online payments, create payment links, and process refunds securely via Stripe.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              Configure Stripe keys in environment variables to enable payments.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Required:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>STRIPE_SECRET_KEY</li>
              <li>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
              <li>STRIPE_WEBHOOK_SECRET</li>
            </ul>
          </div>
        </div>

        {/* Parts Suppliers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-orange-600" size={24} />
            <h3 className="text-lg font-semibold">Parts Suppliers</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Check real-time pricing, stock availability, and place automated orders with parts suppliers.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              Contact your parts supplier for API access and credentials.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Supported Suppliers:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>SupplyHouse (SUPPLYHOUSE_API_KEY)</li>
              <li>Parts Town (PARTSTOWN_API_KEY)</li>
              <li>AppliancePartsPros (APP_API_KEY)</li>
            </ul>
          </div>
        </div>

        {/* Shipping Tracking */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="text-teal-600" size={24} />
            <h3 className="text-lg font-semibold">Shipping Tracking</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Automatically track shipments from UPS, FedEx, and USPS. Receive delivery notifications and exceptions.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              Auto-detection enabled for most tracking numbers. API integration optional.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Optional API Keys:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>UPS_API_KEY (for detailed tracking)</li>
              <li>FEDEX_API_KEY (for detailed tracking)</li>
              <li>USPS_API_KEY (for detailed tracking)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-3">
          Getting Started with Integrations
        </h3>
        <ol className="space-y-2 text-sm text-indigo-800">
          <li><strong>1.</strong> Sign up for accounts with the services you want to use</li>
          <li><strong>2.</strong> Obtain API keys and credentials from each service</li>
          <li><strong>3.</strong> Add the credentials to your <code className="bg-white px-2 py-1 rounded">.env</code> file</li>
          <li><strong>4.</strong> Restart your application to load the new environment variables</li>
          <li><strong>5.</strong> Test each integration using the provided test endpoints</li>
        </ol>
      </div>
    </div>
  );
}
