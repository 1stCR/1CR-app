# Stage 1: Foundation & Auth

## 🎯 Objective
Set up the complete foundation for your standalone field service management app with authentication and database schema.

## ✅ Prerequisites
- Computer with internet connection
- 2-3 hours of uninterrupted time
- Basic familiarity with terminal/command line

## 🛠️ What We're Building
- React + TypeScript + Vite project
- Supabase backend (database + auth)
- All 25 database tables
- Authentication system
- Basic layout and navigation
- Dashboard skeleton

## 📋 Implementation Steps

### Part 1: Development Environment Setup

#### 1.1 Install Required Software

**Node.js Installation:**
```bash
# Windows: Download from https://nodejs.org (LTS version)
# Mac: brew install node
# Verify installation:
node --version  # Should show v20.x.x or higher
npm --version   # Should show v10.x.x or higher
```

**VS Code Installation:**
- Download from: https://code.visualstudio.com
- Install these extensions:
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - Prettier - Code formatter
  - TypeScript Vue Plugin (Volar)

**Git Installation:**
```bash
# Windows: Download from https://git-scm.com
# Mac: brew install git
# Verify:
git --version
```

### Part 2: Project Initialization

#### 2.1 Create React Project

```bash
# Create project with Vite
npm create vite@latest appliance-manager -- --template react-ts

# Navigate to project
cd appliance-manager

# Install dependencies
npm install

# Install additional packages
npm install @supabase/supabase-js@2 zustand@4 react-router-dom@6 lucide-react@0 date-fns@3
npm install -D tailwindcss@3 postcss@8 autoprefixer@10 @types/react-router-dom@5
```

#### 2.2 Configure Tailwind CSS

```bash
# Initialize Tailwind
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
```

Replace `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
  
  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500;
  }
}
```

### Part 3: Supabase Setup

#### 3.1 Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New project"
5. Fill in:
   - Organization: Your business name
   - Project name: appliance-manager
   - Database password: (save this securely!)
   - Region: Choose nearest to you
6. Click "Create new project" (takes ~2 minutes)

#### 3.2 Database Schema

Once project is ready, go to SQL Editor and run this complete schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id VARCHAR(10) UNIQUE NOT NULL,
  customer_type VARCHAR(20) DEFAULT 'Residential',
  business_name VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_primary VARCHAR(20),
  phone_secondary VARCHAR(20),
  email VARCHAR(255),
  address_street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2) DEFAULT 'WY',
  zip VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CONTACTS table (for business customers)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id VARCHAR(10) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  role VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. JOBS table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id VARCHAR(10) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  
  -- Basic Info
  appliance_type VARCHAR(50),
  brand VARCHAR(100),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),
  issue_description TEXT,
  
  -- Status Fields
  job_stage VARCHAR(50) DEFAULT 'Intake',
  current_status VARCHAR(50) DEFAULT 'New',
  parts_status VARCHAR(50),
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time_window VARCHAR(50),
  
  -- Visit Tracking
  is_callback BOOLEAN DEFAULT false,
  callback_reason VARCHAR(100),
  original_job_id VARCHAR(10),
  callback_count INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 1,
  
  -- Financial
  quote_total DECIMAL(10,2),
  invoice_total DECIMAL(10,2),
  amount_paid DECIMAL(10,2),
  payment_status VARCHAR(50),
  payment_method VARCHAR(50),
  payment_date DATE,
  
  -- Time Tracking (populated by Tour system)
  travel_time_minutes INTEGER,
  diagnosis_time_minutes INTEGER,
  research_time_minutes INTEGER,
  repair_time_minutes INTEGER,
  total_time_minutes INTEGER,
  mileage DECIMAL(5,1),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 4. JOB_VISITS table
CREATE TABLE job_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL,
  visit_date DATE,
  visit_type VARCHAR(50),
  visit_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TOUR_LOG table
CREATE TABLE tour_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_date DATE DEFAULT CURRENT_DATE,
  event_type VARCHAR(50) NOT NULL,
  event_time TIMESTAMP DEFAULT NOW(),
  job_id VARCHAR(10),
  activity_type VARCHAR(50),
  location_address TEXT,
  mileage DECIMAL(5,1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. TOUR_SUMMARY table
CREATE TABLE tour_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_date DATE UNIQUE NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  total_minutes INTEGER,
  travel_minutes INTEGER,
  work_minutes INTEGER,
  break_minutes INTEGER,
  total_mileage DECIMAL(6,1),
  jobs_completed INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. PARTS_MASTER table
CREATE TABLE parts_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  brand VARCHAR(100),
  avg_cost DECIMAL(10,2),
  markup_percent DECIMAL(5,2) DEFAULT 20,
  sell_price DECIMAL(10,2),
  in_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  min_stock_override INTEGER,
  auto_replenish BOOLEAN DEFAULT false,
  times_used INTEGER DEFAULT 0,
  last_used_date DATE,
  stocking_score DECIMAL(3,1),
  xref_group_id UUID,
  storage_location_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. PARTS_TRANSACTIONS table
CREATE TABLE parts_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(20) UNIQUE NOT NULL,
  transaction_date TIMESTAMP DEFAULT NOW(),
  part_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  source VARCHAR(100),
  job_id VARCHAR(10),
  shipment_id VARCHAR(20),
  order_id VARCHAR(20),
  has_core BOOLEAN DEFAULT false,
  core_charge_amount DECIMAL(10,2),
  core_return_status VARCHAR(50),
  notes TEXT,
  created_by VARCHAR(100)
);

-- 9. PARTS_ORDERS table
CREATE TABLE parts_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id VARCHAR(20) UNIQUE NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  supplier_id UUID,
  order_status VARCHAR(50) DEFAULT 'Draft',
  total_cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  tracking_number VARCHAR(100),
  expected_delivery DATE,
  actual_delivery DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. PARTS_ORDER_ITEMS table
CREATE TABLE parts_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES parts_orders(id) ON DELETE CASCADE,
  part_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  job_id VARCHAR(10),
  notes TEXT
);

-- 11. PARTS_CROSS_REFERENCE table
CREATE TABLE parts_cross_reference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xref_id VARCHAR(20) UNIQUE NOT NULL,
  primary_part VARCHAR(100) NOT NULL,
  alt_part_number VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  compatibility_level VARCHAR(50),
  key_specs TEXT,
  installation_differences TEXT,
  ai_source VARCHAR(50),
  verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  verified_date DATE,
  times_used INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. PARTS_XREF_GROUPS table
CREATE TABLE parts_xref_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id VARCHAR(20) UNIQUE NOT NULL,
  part_numbers TEXT[], -- Array of part numbers
  description TEXT,
  total_uses INTEGER DEFAULT 0,
  combined_stock INTEGER DEFAULT 0,
  auto_replenish BOOLEAN DEFAULT false,
  min_stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. PARTS_AI_DATA table
CREATE TABLE parts_ai_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  ai_response_full JSONB,
  key_specs JSONB,
  testing_guide TEXT,
  common_failures TEXT[],
  date_generated TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- 14. SHIPMENTS table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id VARCHAR(20) UNIQUE NOT NULL,
  order_date DATE,
  supplier VARCHAR(100),
  order_status VARCHAR(50),
  tracking_number VARCHAR(100),
  tracking_url TEXT,
  carrier VARCHAR(50),
  expected_delivery DATE,
  actual_delivery DATE,
  total_cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  parts_count INTEGER,
  jobs_affected INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. MODEL_DATABASE table
CREATE TABLE model_database (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compilation_id VARCHAR(20) UNIQUE NOT NULL,
  brand VARCHAR(100),
  model_number VARCHAR(100),
  model_family VARCHAR(100),
  aliases TEXT[],
  appliance_type VARCHAR(50),
  verified BOOLEAN DEFAULT false,
  last_verified_date DATE,
  times_used INTEGER DEFAULT 0,
  last_used DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 16. MODEL_COMPILATION_ITEMS table
CREATE TABLE model_compilation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) UNIQUE NOT NULL,
  compilation_id UUID REFERENCES model_database(id) ON DELETE CASCADE,
  item_type VARCHAR(50),
  resource_url TEXT,
  title VARCHAR(255),
  description TEXT,
  tags TEXT[],
  scope VARCHAR(50),
  part_number VARCHAR(100),
  source VARCHAR(50),
  ai_generated BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  useful_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 17. COMMON_ISSUES table
CREATE TABLE common_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id VARCHAR(20) UNIQUE NOT NULL,
  model_number VARCHAR(100),
  issue_description TEXT,
  frequency VARCHAR(20),
  frequency_count INTEGER DEFAULT 0,
  typical_parts TEXT[],
  diagnostic_steps TEXT,
  resolution_notes TEXT,
  success_rate DECIMAL(5,2),
  source VARCHAR(50),
  source_details TEXT,
  last_occurrence DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 18. LABOR_ADJUSTMENTS table
CREATE TABLE labor_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjustment_id VARCHAR(20) UNIQUE NOT NULL,
  part_number VARCHAR(100),
  part_description TEXT,
  repair_type VARCHAR(50),
  additional_hours DECIMAL(3,1),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  warning_keywords TEXT[],
  auto_apply BOOLEAN DEFAULT false,
  notes TEXT,
  times_applied INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 19. SPECIALTY_TOOLS table
CREATE TABLE specialty_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id VARCHAR(20) UNIQUE NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  description TEXT,
  part_numbers TEXT[],
  models TEXT[],
  category VARCHAR(50),
  always_carry BOOLEAN DEFAULT false,
  location VARCHAR(100),
  times_needed INTEGER DEFAULT 0,
  last_used DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 20. STORAGE_LOCATIONS table
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id VARCHAR(20) UNIQUE NOT NULL,
  location_type VARCHAR(50),
  location_name VARCHAR(255) NOT NULL,
  parent_location_id UUID REFERENCES storage_locations(id),
  description TEXT,
  label_number VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 21. SUPPLIERS table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id VARCHAR(20) UNIQUE NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  api_enabled BOOLEAN DEFAULT false,
  api_key TEXT,
  order_cutoff_time TIME,
  ships_same_day BOOLEAN DEFAULT false,
  default_shipping_cost DECIMAL(10,2),
  default_lead_time_days INTEGER,
  priority INTEGER,
  account_number VARCHAR(100),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  website_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 22. JOB_HISTORY table
CREATE TABLE job_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  change_date TIMESTAMP DEFAULT NOW(),
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(100),
  notes TEXT
);

-- 23. CALLBACKS table
CREATE TABLE callbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_job_id UUID REFERENCES jobs(id),
  callback_job_id UUID REFERENCES jobs(id),
  callback_reason VARCHAR(100),
  callback_date DATE,
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 24. TAGS table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_name VARCHAR(50) UNIQUE NOT NULL,
  tag_category VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 25. SETTINGS table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50),
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_job_stage ON jobs(job_stage);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX idx_parts_transactions_part_number ON parts_transactions(part_number);
CREATE INDEX idx_parts_transactions_job_id ON parts_transactions(job_id);
CREATE INDEX idx_tour_log_tour_date ON tour_log(tour_date);
CREATE INDEX idx_tour_log_job_id ON tour_log(job_id);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('business_name', 'Appliance Repair Co', 'text', 'Business name for invoices'),
('labor_rate', '75', 'number', 'Default labor rate per hour'),
('service_fee', '85', 'number', 'Default service call fee'),
('tax_rate', '6', 'number', 'Default tax rate percentage'),
('parts_markup', '20', 'number', 'Default parts markup percentage');
```

#### 3.3 Get Supabase Credentials

1. In Supabase dashboard, click "Settings" (gear icon)
2. Click "API" in sidebar
3. Copy:
   - Project URL (starts with https://)
   - anon public key (long string)

### Part 4: React Application Setup

#### 4.1 Configure Supabase Client

Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (we'll generate these properly later)
export type Customer = {
  id: string
  customer_id: string
  customer_type: string
  business_name?: string
  first_name: string
  last_name: string
  phone_primary?: string
  email?: string
  address_street?: string
  city?: string
  state?: string
  zip?: string
  created_at: string
}

export type Job = {
  id: string
  job_id: string
  customer_id: string
  appliance_type?: string
  brand?: string
  model_number?: string
  issue_description?: string
  job_stage: string
  current_status: string
  scheduled_date?: string
  created_at: string
}
```

#### 4.2 Create Auth Context

Create `src/contexts/AuthContext.tsx`:
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

#### 4.3 Create Layout Components

Create `src/components/Layout.tsx`:
```typescript
import React from 'react'
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
  LogOut
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

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
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Appliance Manager
              </h1>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen pt-16">
        {/* Sidebar */}
        <nav className="w-64 bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
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
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
```

#### 4.4 Create Auth Pages

Create `src/pages/Login.tsx`:
```typescript
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError('')
      setLoading(true)
      await signIn(email, password)
      navigate('/')
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Appliance Manager
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Create `src/pages/Signup.tsx`:
```typescript
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match')
    }
    
    try {
      setError('')
      setLoading(true)
      await signUp(email, password)
      navigate('/')
    } catch (error: any) {
      setError(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              sign in to existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

#### 4.5 Create Dashboard Page

Create `src/pages/Dashboard.tsx`:
```typescript
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Briefcase, Package, DollarSign } from 'lucide-react'

export function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeJobs: 0,
    partsInStock: 0,
    monthlyRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      // Get total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
      
      // Get active jobs
      const { count: jobCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .neq('job_stage', 'Complete')
      
      // Get parts in stock
      const { data: partsData } = await supabase
        .from('parts_master')
        .select('in_stock')
      
      const totalParts = partsData?.reduce((sum, part) => sum + (part.in_stock || 0), 0) || 0
      
      // Get this month's revenue
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data: revenueData } = await supabase
        .from('jobs')
        .select('amount_paid')
        .gte('payment_date', startOfMonth.toISOString())
      
      const monthlyRevenue = revenueData?.reduce((sum, job) => sum + (job.amount_paid || 0), 0) || 0

      setStats({
        totalCustomers: customerCount || 0,
        activeJobs: jobCount || 0,
        partsInStock: totalParts,
        monthlyRevenue: monthlyRevenue
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  const statCards = [
    { title: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'bg-blue-500' },
    { title: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'bg-green-500' },
    { title: 'Parts in Stock', value: stats.partsInStock, icon: Package, color: 'bg-purple-500' },
    { title: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-yellow-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your appliance management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="card">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Placeholder for more dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Jobs</h2>
          <p className="text-gray-500">Jobs list will appear here</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          <p className="text-gray-500">Parts alerts will appear here</p>
        </div>
      </div>
    </div>
  )
}
```

#### 4.6 Set Up Routing

Replace `src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'

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
const CustomersPage = () => <div className="card">Customers page coming in Stage 2</div>
const JobsPage = () => <div className="card">Jobs page coming in Stage 3</div>
const PartsPage = () => <div className="card">Parts page coming in Stage 5</div>
const TourPage = () => <div className="card">Tour page coming in Stage 4</div>
const InvoicesPage = () => <div className="card">Invoices page coming in Stage 7</div>
const AnalyticsPage = () => <div className="card">Analytics page coming in Stage 9</div>
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
            <Route path="customers" element={<CustomersPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="parts" element={<PartsPage />} />
            <Route path="tour" element={<TourPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
```

Replace `src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Part 5: Testing

#### 5.1 Start Development Server

```bash
npm run dev
```

Visit http://localhost:5174

#### 5.2 Test Authentication

1. Click "create a new account"
2. Enter email and password
3. Click Sign up
4. You should be redirected to dashboard
5. Try signing out and signing back in

#### 5.3 Verify Database

1. Go to Supabase dashboard
2. Click "Table Editor"
3. You should see all 25 tables
4. Click on `customers` table
5. Try adding a test customer manually

## ✅ Success Metrics

Stage 1 is complete when:

- [ ] Development environment set up (Node.js, VS Code, Git)
- [ ] React project created with TypeScript
- [ ] Tailwind CSS working (you see styled components)
- [ ] Supabase project created
- [ ] All 25 database tables created
- [ ] Authentication working (can sign up, sign in, sign out)
- [ ] Dashboard loads and shows stats
- [ ] Navigation sidebar works
- [ ] No console errors

## 🚫 Troubleshooting

### Common Issues:

**Tailwind not working:**
- Make sure `postcss.config.js` exists
- Restart dev server after config changes
- Hard refresh browser (Ctrl+Shift+R)

**Supabase connection error:**
- Double-check URL and anon key in `src/lib/supabase.ts`
- Make sure you're using the anon/public key, not the service key

**Authentication not working:**
- Check Supabase dashboard > Authentication > Users
- Verify email settings in Supabase (may need to disable email confirmation for testing)

**TypeScript errors:**
- Can temporarily ignore with `// @ts-ignore` above problematic line
- Will be fixed as we add proper types in later stages

## 📝 Notes for Next Stage

Stage 2 will build upon this foundation to add:
- Complete customer management
- Customer search and filtering
- Business customers with multiple contacts
- Customer detail pages
- Form validation

## 🎯 Summary

You now have:
- A working React + TypeScript application
- Complete database schema ready for all features
- Authentication system
- Basic navigation and layout
- Dashboard with real database connections

This foundation supports everything we'll build in the next 11 stages!
