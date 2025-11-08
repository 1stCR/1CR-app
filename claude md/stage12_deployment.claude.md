# Stage 12: Final Polish & Deployment

## 🎯 Objective
Production-ready deployment with performance optimization, security hardening, monitoring setup, backup systems, comprehensive documentation, and successful launch of the complete Appliance Business Management System.

## ✅ Prerequisites
- **Stages 1-11 ALL completed**
- Application fully functional in development
- All tests passing
- Database schema finalized
- API integrations working
- Mobile/PWA features operational
- Domain name acquired
- SSL certificate ready
- Production Supabase project created

## 🛠️ What We're Building

### Core Features:
1. **Performance Optimization**
   - Code splitting and lazy loading
   - Image optimization
   - Bundle size reduction
   - Caching strategies
   - Database query optimization
   - CDN setup for assets

2. **Security Hardening**
   - Security audit and penetration testing
   - Environment variable protection
   - Rate limiting implementation
   - CORS configuration
   - XSS and CSRF protection
   - Security headers setup

3. **Production Infrastructure**
   - Environment configuration (dev, staging, prod)
   - CI/CD pipeline setup
   - Automated deployment
   - Database backup automation
   - Disaster recovery plan
   - Monitoring and alerting

4. **Monitoring & Analytics**
   - Error tracking (Sentry)
   - Performance monitoring
   - User analytics
   - Uptime monitoring
   - Log aggregation
   - Alert configuration

5. **Documentation & Training**
   - User documentation
   - Admin documentation
   - API documentation
   - Deployment runbook
   - Training materials
   - Video tutorials

6. **Launch Preparation**
   - Pre-launch checklist
   - Load testing
   - Smoke testing production
   - Rollback procedures
   - Launch monitoring
   - Post-launch support plan

---

## 📁 File Structure Updates

```
appliance-business/
├── .github/
│   └── workflows/
│       ├── deploy-production.yml       # New: Production deployment
│       ├── deploy-staging.yml          # New: Staging deployment
│       └── security-scan.yml           # New: Security checks
├── docs/
│   ├── USER_GUIDE.md                   # New: End user guide
│   ├── ADMIN_GUIDE.md                  # New: Admin guide
│   ├── API_DOCS.md                     # New: API documentation
│   ├── DEPLOYMENT.md                   # New: Deployment guide
│   └── TROUBLESHOOTING.md              # New: Common issues
├── scripts/
│   ├── backup.sh                       # New: Database backup script
│   ├── restore.sh                      # New: Database restore script
│   ├── health-check.sh                 # New: System health check
│   └── performance-test.sh             # New: Load testing script
├── monitoring/
│   ├── sentry.config.ts                # New: Error tracking config
│   ├── analytics.ts                    # New: Analytics setup
│   └── performance.ts                  # New: Performance monitoring
└── vite.config.ts                      # Update: Production optimizations
```

---

## 🔧 Implementation Steps

### Step 1: Performance Optimization

#### 1.1: Update Vite Configuration for Production

**File: `vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    // Visualize bundle size
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
    // Compress assets
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  build: {
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog'],
          'chart-vendor': ['recharts'],
          'date-vendor': ['date-fns'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging
    sourcemap: true,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs
        drop_debugger: true,
      },
    },
  },
  // Asset optimization
  assetsInlineLimit: 4096, // 4kb inline limit
  
  server: {
    port: 3000,
  },
  
  preview: {
    port: 4173,
  },
});
```

**Install dependencies:**
```bash
npm install -D rollup-plugin-visualizer vite-plugin-compression
```

#### 1.2: Implement Code Splitting with React.lazy

**File: `src/App.tsx`**
```typescript
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Eager load critical components
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Jobs = lazy(() => import('./pages/Jobs'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const Parts = lazy(() => import('./pages/Parts'));
const PartDetail = lazy(() => import('./pages/PartDetail'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TourControl = lazy(() => import('./pages/TourControl'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));

function App() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        {user ? (
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 py-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/parts" element={<Parts />} />
                <Route path="/parts/:id" element={<PartDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/tour" element={<TourControl />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
```

#### 1.3: Image Optimization Utility

**File: `src/utils/imageOptimization.ts`**
```typescript
// Image optimization utilities
export const optimizeImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Image optimization failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = reject;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Generate multiple sizes for responsive images
export const generateImageSizes = async (
  file: File
): Promise<{ thumbnail: Blob; medium: Blob; large: Blob }> => {
  const [thumbnail, medium, large] = await Promise.all([
    optimizeImage(file, 200, 200, 0.7),
    optimizeImage(file, 800, 600, 0.8),
    optimizeImage(file, 1920, 1080, 0.85),
  ]);
  
  return { thumbnail, medium, large };
};
```

#### 1.4: Database Query Optimization

**File: `supabase/migrations/20240112_add_indexes.sql`**
```sql
-- Add indexes for frequently queried columns

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(current_status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Parts indexes
CREATE INDEX IF NOT EXISTS idx_parts_master_category ON parts_master(category);
CREATE INDEX IF NOT EXISTS idx_parts_master_in_stock ON parts_master(in_stock) WHERE in_stock > 0;
CREATE INDEX IF NOT EXISTS idx_parts_transactions_part_number ON parts_transactions(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_transactions_job_id ON parts_transactions(job_id);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_primary);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(last_name, first_name);

-- Cross-reference indexes
CREATE INDEX IF NOT EXISTS idx_xref_primary_part ON parts_cross_reference(primary_part);
CREATE INDEX IF NOT EXISTS idx_xref_alt_part ON parts_cross_reference(alt_part_number);

-- Tour log indexes
CREATE INDEX IF NOT EXISTS idx_tour_log_job_id ON tour_log(job_id);
CREATE INDEX IF NOT EXISTS idx_tour_log_date ON tour_log(start_time DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status ON jobs(customer_id, current_status);
CREATE INDEX IF NOT EXISTS idx_parts_number_status ON parts_master(part_number, in_stock);

-- Analyze tables for query planner
ANALYZE jobs;
ANALYZE customers;
ANALYZE parts_master;
ANALYZE parts_transactions;
```

### Step 2: Security Hardening

#### 2.1: Environment Configuration

**File: `.env.production`**
```env
# Production Environment Variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_APP_URL=https://appliancemandan.com
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GOOGLE_MAPS_API_KEY=your-production-maps-key

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_LOGS=false
VITE_ENABLE_SERVICE_WORKER=true
```

**File: `.env.staging`**
```env
# Staging Environment Variables
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_APP_URL=https://staging.appliancemandan.com
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GOOGLE_MAPS_API_KEY=your-staging-maps-key

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_LOGS=true
VITE_ENABLE_SERVICE_WORKER=false
```

#### 2.2: Implement Rate Limiting

**File: `supabase/functions/rate-limit.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const configs: Record<string, RateLimitConfig> = {
  default: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  api: { maxRequests: 1000, windowMs: 60000 }, // 1000 per minute
  auth: { maxRequests: 5, windowMs: 900000 }, // 5 per 15 minutes
};

export async function checkRateLimit(
  identifier: string,
  category: string = 'default'
): Promise<boolean> {
  const config = configs[category] || configs.default;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const windowStart = new Date(Date.now() - config.windowMs);
  
  // Count requests in current window
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('category', category)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  if (count && count >= config.maxRequests) {
    return false;
  }

  // Log this request
  await supabase.from('rate_limit_log').insert({
    identifier,
    category,
    created_at: new Date().toISOString(),
  });

  return true;
}
```

**Database migration for rate limiting:**
```sql
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_rate_limit (identifier, category, created_at)
);

-- Clean up old logs automatically
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/15 * * * *', -- Every 15 minutes
  $$SELECT cleanup_rate_limit_logs()$$
);
```

#### 2.3: Security Headers Configuration

**File: `vercel.json`** (if using Vercel) or **File: `netlify.toml`** (if using Netlify)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(self)"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co"
        }
      ]
    }
  ]
}
```

### Step 3: Monitoring & Error Tracking

#### 3.1: Sentry Integration

**Install Sentry:**
```bash
npm install @sentry/react @sentry/tracing
```

**File: `src/monitoring/sentry.config.ts`**
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Environment
      environment: import.meta.env.MODE,
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION,
      
      // Filter sensitive data
      beforeSend(event, hint) {
        // Remove sensitive data
        if (event.request) {
          delete event.request.cookies;
          
          // Sanitize URLs
          if (event.request.url) {
            event.request.url = event.request.url.replace(
              /([?&])(apikey|token|key)=[^&]*/gi,
              '$1$2=REDACTED'
            );
          }
        }
        
        return event;
      },
      
      // Ignore common non-critical errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'ChunkLoadError',
      ],
    });
  }
}

// Custom error boundary component
export const SentryErrorBoundary = Sentry.withErrorBoundary;
```

**Update main.tsx:**
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry, SentryErrorBoundary } from './monitoring/sentry.config';

// Initialize Sentry
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </SentryErrorBoundary>
  </StrictMode>
);

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          We've been notified and are working on a fix.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
```

#### 3.2: Analytics Setup

**File: `src/monitoring/analytics.ts`**
```typescript
// Simple privacy-focused analytics
interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

class Analytics {
  private enabled: boolean;
  
  constructor() {
    this.enabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
  }
  
  track(event: AnalyticsEvent) {
    if (!this.enabled) return;
    
    // Send to your analytics endpoint
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
      }),
    }).catch(console.error);
  }
  
  pageView(path: string) {
    this.track({
      category: 'PageView',
      action: 'view',
      label: path,
    });
  }
  
  jobCreated(jobId: string) {
    this.track({
      category: 'Job',
      action: 'created',
      label: jobId,
    });
  }
  
  quoteGenerated(amount: number) {
    this.track({
      category: 'Quote',
      action: 'generated',
      value: amount,
    });
  }
  
  invoicePaid(amount: number) {
    this.track({
      category: 'Invoice',
      action: 'paid',
      value: amount,
    });
  }
}

export const analytics = new Analytics();
```

#### 3.3: Performance Monitoring

**File: `src/monitoring/performance.ts`**
```typescript
// Web Vitals monitoring
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  fetch('/api/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
    }),
  }).catch(console.error);
}

export function initPerformanceMonitoring() {
  if (import.meta.env.PROD) {
    onCLS(sendToAnalytics);
    onFID(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }
}
```

**Install web-vitals:**
```bash
npm install web-vitals
```

### Step 4: CI/CD Pipeline

#### 4.1: GitHub Actions - Production Deployment

**File: `.github/workflows/deploy-production.yml`**
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for production
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}
          VITE_APP_VERSION: ${{ github.sha }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      
      - name: Notify Sentry of deployment
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.sha }}

  smoke-test:
    needs: deploy
    runs-on: ubuntu-latest
    
    steps:
      - name: Wait for deployment
        run: sleep 30
      
      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://appliancemandan.com/health)
          if [ $response != "200" ]; then
            echo "Health check failed with status $response"
            exit 1
          fi
      
      - name: Test login page
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://appliancemandan.com/login)
          if [ $response != "200" ]; then
            echo "Login page check failed"
            exit 1
          fi
```

#### 4.2: Staging Deployment

**File: `.github/workflows/deploy-staging.yml`**
```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build for staging
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ''
          alias-domains: staging.appliancemandan.com
```

### Step 5: Backup & Recovery

#### 5.1: Database Backup Script

**File: `scripts/backup.sh`**
```bash
#!/bin/bash

# Automated database backup script
# Run daily via cron: 0 2 * * * /path/to/backup.sh

set -e

# Configuration
BACKUP_DIR="/backups/appliance-db"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Supabase connection details (use environment variables)
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

# Perform backup
echo "Starting backup at $(date)"

pg_dump \
  "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres" \
  --file="$BACKUP_FILE" \
  --format=custom \
  --verbose

# Compress backup
gzip "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}.gz"

# Clean up old backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Old backups cleaned up (older than $RETENTION_DAYS days)"

# Upload to cloud storage (optional)
# aws s3 cp "${BACKUP_FILE}.gz" "s3://your-backup-bucket/appliance-db/"

echo "Backup process completed at $(date)"
```

#### 5.2: Database Restore Script

**File: `scripts/restore.sh`**
```bash
#!/bin/bash

# Database restore script
# Usage: ./restore.sh backup_20240115_020000.sql.gz

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Configuration
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" > "${BACKUP_FILE%.gz}"
  BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Confirm restore
read -p "This will restore the database from $BACKUP_FILE. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled"
  exit 1
fi

# Perform restore
echo "Starting restore at $(date)"

pg_restore \
  --dbname="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres" \
  --clean \
  --if-exists \
  --verbose \
  "$BACKUP_FILE"

echo "Restore completed at $(date)"
```

**Make scripts executable:**
```bash
chmod +x scripts/backup.sh
chmod +x scripts/restore.sh
```

#### 5.3: Setup Automated Backups (cron)

```bash
# Add to crontab (crontab -e)
# Run backup daily at 2 AM
0 2 * * * /path/to/appliance-business/scripts/backup.sh >> /var/log/appliance-backup.log 2>&1

# Health check every 5 minutes
*/5 * * * * /path/to/appliance-business/scripts/health-check.sh >> /var/log/appliance-health.log 2>&1
```

### Step 6: Documentation

#### 6.1: User Guide

**File: `docs/USER_GUIDE.md`**
```markdown
# Appliance Business Management System - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Customers](#managing-customers)
4. [Creating & Managing Jobs](#creating-managing-jobs)
5. [Parts Inventory](#parts-inventory)
6. [Tour Control](#tour-control)
7. [Quotes & Invoicing](#quotes-invoicing)
8. [Analytics](#analytics)
9. [Mobile App](#mobile-app)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the System

1. **Web Browser:** Navigate to https://appliancemandan.com
2. **Mobile App:** Install the app from your home screen prompt
3. **Login:** Use your credentials provided by the administrator

### First-Time Setup

1. Complete your profile information
2. Review system settings
3. Import existing customer data (if applicable)
4. Set up your initial parts inventory

---

## Dashboard Overview

The dashboard provides a quick overview of your business:

- **Today's Jobs:** List of scheduled appointments
- **Active Jobs:** Jobs in progress
- **Pending Quotes:** Quotes awaiting customer approval
- **Low Stock Alerts:** Parts that need reordering
- **Recent Activity:** Latest system updates

**Quick Actions:**
- Create New Job
- Add Customer
- Start Tour
- View Analytics

---

## Managing Customers

### Adding a New Customer

1. Click **"Customers"** in the navigation
2. Click **"+ New Customer"**
3. Fill in the form:
   - First Name, Last Name
   - Phone Number (primary)
   - Email Address
   - Full Address
4. For business customers:
   - Check "Business Customer"
   - Add business name
   - Add multiple contacts
5. Click **"Save Customer"**

### Searching Customers

- Use the search bar to find by name or phone
- System automatically searches as you type
- Click on a customer to view full details

### Customer Details Page

View and edit:
- Contact information
- Job history
- Outstanding invoices
- Notes and preferences

---

## Creating & Managing Jobs

### Quick Job Creation

1. Click **"+ New Job"** from dashboard or jobs page
2. **Step 1: Customer**
   - Search for existing customer
   - Or create new customer inline
3. **Step 2: Appliance**
   - Select appliance type
   - Enter brand and model
   - Describe the issue
4. **Step 3: Schedule**
   - Pick date and time
   - Add any special notes
5. Click **"Create Job"**

### Job Workflow

Jobs progress through stages:
1. **Intake:** Initial information gathered
2. **Diagnosis:** Issue being diagnosed
3. **Parts:** Waiting for parts
4. **Repair:** Repair in progress
5. **Complete:** Job finished

### Managing a Job

From the job detail page:
- Update status
- Add diagnosis notes
- Add parts needed
- Generate quote
- Upload photos
- Track time spent
- Create invoice
- Record payment

### Callbacks

If returning to a previous job:
1. Open the original job
2. Click **"Create Callback"**
3. Select callback reason:
   - Same Issue - Our Fault (no charge)
   - New Issue (new quote)
   - Customer Error (full charge)
4. System adjusts pricing automatically

---

## Parts Inventory

### Adding Parts to Inventory

1. Navigate to **"Parts"**
2. Click **"+ Add Part"**
3. Enter part number
4. System searches for cross-references automatically
5. Set:
   - Quantity
   - Cost per unit
   - Storage location
6. Click **"Add to Inventory"**

### Using Parts on Jobs

1. From job detail page
2. Click **"Add Part"**
3. Enter part number
4. Select:
   - Use from stock
   - Or order for this job
5. System:
   - Deducts from inventory (if using stock)
   - Calculates cost using FIFO
   - Checks for low stock
   - Suggests alternatives if out of stock

### Stock Alerts

System automatically alerts you when:
- Part goes below minimum stock
- Popular part is out of stock
- Parts needed for upcoming jobs

### Reordering Parts

1. Navigate to **"Parts" → "Reorder"**
2. Review suggested parts
3. Select parts to order
4. Choose supplier
5. Create purchase order
6. Track shipment status

---

## Tour Control

### Starting Your Day

1. Click **"Start Tour"**
2. System shows today's scheduled jobs
3. Jobs display in optimized route order
4. Click **"Navigate"** to get directions

### On-Site Workflow

1. Arrive at location
   - Click **"Arrive"** → Timer starts
2. Perform diagnosis
   - Add notes
   - Take photos
   - Add parts needed
3. Complete or order parts
   - Generate quote
   - Get customer approval
4. Leaving site
   - Click **"Leave Site"** → Timer stops
5. Traveling to next job
   - Click **"Navigate to Next"**
   - Travel time tracked automatically

### Research Time

Need to look up info for a different job?
1. Click **"Research Mode"**
2. Select which job you're researching
3. Current job timer keeps running
4. Research time logged separately

### Ending Your Day

1. Click **"End Tour"**
2. System calculates:
   - Total time per job
   - Total miles driven
   - Jobs completed
3. Review and confirm times

---

## Quotes & Invoicing

### Generating a Quote

1. From job detail page
2. Ensure diagnosis and parts are added
3. Click **"Generate Quote"**
4. System calculates:
   - Parts cost with markup
   - Labor time and rate
   - Service call fee
   - Tax
5. Review and adjust if needed
6. Click **"Send to Customer"**

### Quote Options

- Email quote to customer
- Print quote
- Share via SMS
- Export to PDF

### Creating an Invoice

1. After job completion
2. Click **"Create Invoice"**
3. System pulls from approved quote
4. Add any additional charges
5. Select payment method
6. Click **"Generate Invoice"**

### Recording Payment

1. Open invoice
2. Click **"Record Payment"**
3. Enter:
   - Payment amount
   - Payment method (Cash, Card, Check, Venmo)
   - Payment date
4. For partial payments:
   - Enter amount paid
   - Balance remains on invoice
5. Click **"Save Payment"**

### Payment Methods

Supported payment types:
- Cash
- Credit Card
- Check
- Venmo (link generated automatically)
- Account Credit

---

## Analytics

### Dashboard Metrics

Track your business performance:

**Revenue Metrics:**
- Daily/Weekly/Monthly revenue
- Revenue by appliance type
- Average ticket value
- Payment method breakdown

**Job Metrics:**
- First Call Complete rate
- Average job duration
- Jobs by status
- Callback rate

**Parts Metrics:**
- Parts usage frequency
- Stock levels
- Reorder recommendations
- Parts profitability

**Efficiency Metrics:**
- Time breakdown (diagnosis/repair/travel)
- Jobs per day
- Miles driven
- Fuel efficiency

### Custom Reports

Generate reports for:
- Date ranges
- Specific customers
- Appliance types
- Part categories
- Revenue trends

---

## Mobile App

### Installing the App

**iPhone/iPad:**
1. Open Safari, navigate to appliancemandan.com
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

**Android:**
1. Open Chrome, navigate to appliancemandan.com
2. Tap the menu (three dots)
3. Tap "Add to Home Screen"
4. Tap "Add"

### Offline Mode

App works without internet:
- View existing jobs
- Add photos
- Record notes
- Track time
- Data syncs when connection returns

### Mobile Features

**Camera Integration:**
- Take photos directly in app
- Photos attached to jobs automatically
- Compress images for fast upload

**GPS Navigation:**
- One-tap navigation to job sites
- Automatic mileage tracking

**Phone Integration:**
- Tap phone number to call
- SMS customers directly

---

## Troubleshooting

### Common Issues

**Problem: Can't log in**
- Verify email and password
- Check for CAPS LOCK
- Try "Forgot Password"
- Clear browser cache

**Problem: Photos won't upload**
- Check internet connection
- Ensure image size < 10MB
- Try resizing photo
- Check browser permissions

**Problem: Parts not showing in stock**
- Verify part was added to inventory
- Check transaction history
- Ensure part not on hold for other job

**Problem: Quote calculation seems wrong**
- Verify all parts added
- Check labor time entered correctly
- Verify markup percentages in settings
- Check tax rate for customer location

### Getting Help

- Email: support@appliancemandan.com
- Phone: (307) 684-9126
- In-app: Help → Contact Support

---

## Tips & Best Practices

### Job Management
- Add photos to every job
- Keep detailed diagnosis notes
- Update job status promptly
- Close completed jobs same day

### Parts Management
- Count inventory weekly
- Order parts before running out
- Use cross-references to save money
- Keep truck stocked with common parts

### Customer Service
- Send quotes promptly
- Follow up on pending approvals
- Ask for reviews after completion
- Maintain professional communication

### Time Tracking
- Start tour at beginning of day
- Mark accurate arrival/departure times
- Use research mode appropriately
- Review time logs before ending tour

---

*Last Updated: January 2025*
*Version: 1.0*
```

#### 6.2: Admin Guide

**File: `docs/ADMIN_GUIDE.md`**
```markdown
# Admin Guide - Appliance Business Management System

## System Administration

### User Management

**Adding Users:**
1. Navigate to Settings → Users
2. Click "Add User"
3. Enter email and role
4. System sends invitation email

**User Roles:**
- **Admin:** Full system access
- **Technician:** Job management, parts, time tracking
- **Office:** Customer management, invoicing, reports
- **Read-Only:** View-only access

### System Settings

**Business Information:**
- Company name and address
- Contact information
- Tax ID
- Service areas

**Pricing Configuration:**
- Default labor rate
- Service call fee
- Parts markup percentage
- High-end brand labor multiplier
- Tax rates by location

**Parts Settings:**
- Minimum stock calculation method
- Auto-replenishment thresholds
- Stocking score weights
- Default storage locations

**Notification Settings:**
- Low stock alerts
- Quote approval reminders
- Payment due reminders
- Shipment notifications

### Database Maintenance

**Backup Schedule:**
- Automatic daily backups at 2 AM
- Retention: 30 days
- Location: /backups/appliance-db/

**Manual Backup:**
```bash
./scripts/backup.sh
```

**Restore from Backup:**
```bash
./scripts/restore.sh backup_20240115.sql.gz
```

**Database Optimization:**
Run monthly:
```sql
VACUUM ANALYZE;
REINDEX DATABASE postgres;
```

### Performance Monitoring

**Metrics to Watch:**
- Response time (target: < 200ms)
- Error rate (target: < 0.1%)
- Database query time
- Storage usage
- Active users

**Monitoring Tools:**
- Sentry: Error tracking
- Vercel Analytics: Performance
- Supabase Dashboard: Database stats

### Security

**Access Control:**
- Review user permissions quarterly
- Disable inactive accounts
- Enforce strong passwords
- Enable 2FA for admins

**Audit Logs:**
All sensitive actions logged:
- User login/logout
- Data modifications
- Configuration changes
- Failed login attempts

**Data Protection:**
- Customer data encrypted at rest
- SSL/TLS for all connections
- Regular security scans
- GDPR compliance measures

### Troubleshooting

**High Error Rate:**
1. Check Sentry dashboard
2. Review recent deployments
3. Check database performance
4. Verify API integrations

**Slow Performance:**
1. Check database query times
2. Review Vercel analytics
3. Check for large file uploads
4. Verify CDN caching

**Data Issues:**
1. Check database logs
2. Verify data constraints
3. Review recent migrations
4. Restore from backup if needed

---

*Last Updated: January 2025*
```

### Step 7: Pre-Launch Checklist

#### 7.1: Pre-Launch Checklist

**File: `docs/LAUNCH_CHECKLIST.md`**
```markdown
# Production Launch Checklist

## Pre-Launch (1 Week Before)

### Infrastructure
- [ ] Production Supabase project created
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Domain name configured and DNS propagated
- [ ] SSL certificate active
- [ ] CDN configured for assets
- [ ] Backup system tested and verified

### Security
- [ ] Security audit completed
- [ ] Penetration testing done
- [ ] Rate limiting configured
- [ ] Security headers verified
- [ ] CORS settings correct
- [ ] API keys rotated
- [ ] User permissions reviewed

### Performance
- [ ] Load testing completed (target: 100 concurrent users)
- [ ] Database indexes optimized
- [ ] Code splitting verified
- [ ] Image optimization working
- [ ] Bundle size < 500KB initial load
- [ ] Lighthouse score > 90

### Monitoring
- [ ] Sentry configured and tested
- [ ] Error tracking verified
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Alert notifications tested
- [ ] Log aggregation working

### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Cross-browser testing complete (Chrome, Safari, Firefox, Edge)
- [ ] Mobile testing complete (iOS, Android)
- [ ] Accessibility audit passed

### Documentation
- [ ] User guide complete
- [ ] Admin guide complete
- [ ] API documentation complete
- [ ] Deployment runbook ready
- [ ] Troubleshooting guide ready
- [ ] Training materials prepared

### Data
- [ ] Sample data removed from production
- [ ] Production data seeded (if applicable)
- [ ] Data migration tested
- [ ] Backup restoration tested
- [ ] Data integrity verified

## Launch Day

### Final Checks (Morning)
- [ ] Run smoke tests on production
- [ ] Verify all integrations working
- [ ] Check error rates (should be 0)
- [ ] Verify monitoring dashboards
- [ ] Confirm backup ran successfully
- [ ] Test critical user flows

### Go-Live
- [ ] **9 AM:** Final staging deployment
- [ ] **10 AM:** Staging smoke tests
- [ ] **11 AM:** Production deployment
- [ ] **11:30 AM:** Production smoke tests
- [ ] **12 PM:** Monitor for first hour
- [ ] **1 PM:** Lunch break (system monitored)
- [ ] **2 PM:** Check afternoon traffic

### Communication
- [ ] Notify users of launch
- [ ] Send getting started guide
- [ ] Announce on social media (if applicable)
- [ ] Update website with link
- [ ] Send press release (if applicable)

## Post-Launch (First 24 Hours)

### Monitoring
- [ ] Check error rates every hour
- [ ] Monitor performance metrics
- [ ] Review user feedback
- [ ] Check server resources
- [ ] Verify backups running

### Support
- [ ] Respond to user questions
- [ ] Fix critical bugs immediately
- [ ] Document common issues
- [ ] Update FAQ as needed

## Post-Launch (First Week)

### Daily Tasks
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Monitor user adoption
- [ ] Respond to feedback
- [ ] Address bugs and issues

### Week-End Review
- [ ] Analyze usage patterns
- [ ] Review performance data
- [ ] Assess user feedback
- [ ] Plan improvements
- [ ] Update documentation

## Success Metrics

**Week 1 Targets:**
- [ ] Error rate < 0.1%
- [ ] Average response time < 300ms
- [ ] User satisfaction > 4/5
- [ ] Zero critical bugs
- [ ] 90% uptime (target: 99.9%)

**Month 1 Targets:**
- [ ] 50+ active users
- [ ] 500+ jobs created
- [ ] 99.5% uptime
- [ ] User satisfaction > 4.5/5
- [ ] Zero data loss incidents

---

## Emergency Contacts

**Critical Issues:**
- Dan Peterson: (307) 684-9126
- Email: dan@appliancemandan.com

**Service Providers:**
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com
- Sentry Support: support@sentry.io

**Rollback Procedure:**
1. Revert to last known good deployment
2. Notify users of temporary downtime
3. Investigate issue in staging
4. Deploy fix once verified

---

*Last Updated: January 2025*
```

### Step 8: Health Check Endpoint

**File: `supabase/functions/health/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: false,
      auth: false,
      storage: false,
    },
  };

  try {
    // Database check
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { error: dbError } = await supabase
      .from('customers')
      .select('count')
      .limit(1);

    checks.checks.database = !dbError;

    // Auth check
    const { error: authError } = await supabase.auth.getSession();
    checks.checks.auth = !authError;

    // Storage check
    const { data: buckets, error: storageError } = await supabase
      .storage
      .listBuckets();

    checks.checks.storage = !storageError;

    // Overall status
    const allHealthy = Object.values(checks.checks).every((v) => v === true);
    checks.status = allHealthy ? 'healthy' : 'degraded';

    return new Response(JSON.stringify(checks), {
      status: allHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
```

---

## 🧪 Testing

### Testing Checklist

**Performance Tests:**
```bash
# Install k6 for load testing
brew install k6

# Run load test
k6 run scripts/load-test.js

# Target metrics:
# - 100 VUs (virtual users)
# - 95th percentile < 500ms
# - Error rate < 1%
```

**Security Tests:**
```bash
# Run npm audit
npm audit --production

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

**E2E Tests:**
```bash
# Run full test suite
npm run test:e2e

# Run specific test
npm run test:e2e -- --spec="tests/job-workflow.spec.ts"
```

**Manual Testing:**
1. Test all critical user flows
2. Test on multiple devices
3. Test with slow network
4. Test offline functionality
5. Test error scenarios

---

## ✅ Success Criteria

Stage 12 is complete when:

1. **Performance:**
   - ✅ Lighthouse score > 90
   - ✅ Bundle size < 500KB initial
   - ✅ Time to Interactive < 3s
   - ✅ Load test passes (100 concurrent users)

2. **Security:**
   - ✅ Security audit passed
   - ✅ All dependencies up to date
   - ✅ Rate limiting working
   - ✅ Security headers configured

3. **Monitoring:**
   - ✅ Sentry tracking errors
   - ✅ Analytics collecting data
   - ✅ Performance monitoring active
   - ✅ Uptime monitoring configured

4. **Infrastructure:**
   - ✅ Production deployment automated
   - ✅ Database backups running
   - ✅ CDN serving assets
   - ✅ SSL certificate active

5. **Documentation:**
   - ✅ User guide complete
   - ✅ Admin guide complete
   - ✅ API docs complete
   - ✅ Troubleshooting guide ready

6. **Launch:**
   - ✅ Pre-launch checklist complete
   - ✅ All tests passing
   - ✅ Rollback procedure tested
   - ✅ Support plan ready

---

## 🎉 Congratulations!

You've completed all 12 stages! Your **Appliance Business Management System** is now:

- ✅ Fully functional
- ✅ Production-ready
- ✅ Secure and performant
- ✅ Well-documented
- ✅ Ready to launch!

### What's Next?

1. **Launch:** Deploy to production
2. **Monitor:** Watch metrics closely
3. **Support:** Help users get started
4. **Iterate:** Gather feedback and improve
5. **Scale:** Add features based on usage

### Future Enhancements

Consider adding:
- Multi-technician support
- Advanced scheduling algorithms
- Customer portal
- Automated marketing campaigns
- Integration with accounting software
- White-label options for other repair businesses

---

## 📞 Post-Launch Support

**For Implementation Help:**
- Review documentation in `docs/` folder
- Check troubleshooting guide
- Contact support: support@appliancemandan.com

**For Emergency Issues:**
- Check health endpoint: `/health`
- Review Sentry dashboard
- Check server logs
- Execute rollback if needed

---

## 🎯 Final Checklist

Before you consider the project complete:

- [ ] All 12 stages completed
- [ ] All tests passing
- [ ] Documentation reviewed
- [ ] Launch checklist completed
- [ ] Production deployed
- [ ] Users onboarded
- [ ] First week monitoring complete
- [ ] Feedback collected
- [ ] Improvements planned
- [ ] Celebration scheduled! 🎊

---

**🚀 You did it! Your business management system is LIVE!**

*Stage 12 Version: 1.0*  
*Last Updated: January 2025*  
*Total Development Time: ~90-100 hours*  
*Impact: Revolutionary for your business!* 🔧
