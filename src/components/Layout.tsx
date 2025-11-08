import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  Home,
  Users,
  Briefcase,
  Package,
  Clock,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Plug
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { TourControl } from './tour/TourControl'
import { OfflineIndicator } from './mobile/OfflineIndicator'
import { InstallPrompt } from './mobile/InstallPrompt'
import { BottomNav } from './mobile/BottomNav'

export function Layout() {
  const location = useLocation()
  const { signOut } = useAuth()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Parts', href: '/parts', icon: Package },
    { name: 'Tour', href: '/tour', icon: Clock },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Integrations', href: '/integrations', icon: Plug },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10 safe-area-top">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                AMD Pro
              </h1>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen pt-16">
        {/* Sidebar - Hidden on mobile */}
        <nav className="hidden md:block w-64 bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="px-3">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md
                        ${isActive(item.href)
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon
                        className={`mr-3 h-5 w-5 ${
                          isActive(item.href) ? 'text-primary-700' : 'text-gray-400'
                        }`}
                      />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto mobile-bottom-spacing">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Tour Control Widget */}
      <TourControl />

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  )
}
