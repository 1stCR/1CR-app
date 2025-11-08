import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'

// Customer pages
import { CustomerList } from './pages/customers/CustomerList'
import { NewCustomer } from './pages/customers/NewCustomer'
import { EditCustomer } from './pages/customers/EditCustomer'
import { CustomerDetail } from './pages/customers/CustomerDetail'

// Job pages
import { JobList } from './pages/jobs/JobList'
import { NewJob } from './pages/jobs/NewJob'
import { JobDetail } from './pages/jobs/JobDetail'

// Parts pages
import { PartsList } from './pages/parts/PartsList'
import { NewPart } from './pages/parts/NewPart'

// Tour page
import { Tour } from './pages/Tour'

// Invoice pages
import { InvoiceList } from './pages/invoices/InvoiceList'

// Analytics pages
import ExecutiveDashboard from './components/analytics/ExecutiveDashboard'
import FCCAnalytics from './components/analytics/FCCAnalytics'
import PartsROI from './components/analytics/PartsROI'

// Integrations page
import Integrations from './pages/Integrations'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

// Placeholder pages (we'll build these in later stages)
const SettingsPage = () => <div className="card">Settings page</div>

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="customers">
              <Route index element={<CustomerList />} />
              <Route path="new" element={<NewCustomer />} />
              <Route path=":id" element={<CustomerDetail />} />
              <Route path=":id/edit" element={<EditCustomer />} />
            </Route>
            <Route path="jobs">
              <Route index element={<JobList />} />
              <Route path="new" element={<NewJob />} />
              <Route path=":id" element={<JobDetail />} />
            </Route>
            <Route path="parts">
              <Route index element={<PartsList />} />
              <Route path="new" element={<NewPart />} />
            </Route>
            <Route path="tour" element={<Tour />} />
            <Route path="invoices">
              <Route index element={<InvoiceList />} />
            </Route>
            <Route path="analytics">
              <Route index element={<ExecutiveDashboard />} />
              <Route path="fcc" element={<FCCAnalytics />} />
              <Route path="parts-roi" element={<PartsROI />} />
            </Route>
            <Route path="integrations" element={<Integrations />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App