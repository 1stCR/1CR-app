# Stage 10: Mobile Optimization & PWA

## 🎯 Objective
Transform the application into a Progressive Web App (PWA) with offline capabilities, mobile-optimized UI, native app feel, push notifications, camera integration, and install prompts for field technician use.

## ✅ Prerequisites
- Stages 1-9 completed
- All core features functional in browser
- HTTPS enabled (required for PWA)
- Service worker support in target browsers
- Push notification service account (Firebase recommended)

## 🛠️ What We're Building

### Core Features:
1. **Progressive Web App Setup**
   - Service worker for caching
   - App manifest configuration
   - Install prompts and flow
   - Offline fallback pages
   - App shell architecture

2. **Mobile-Optimized UI**
   - Touch-friendly controls (44px+ targets)
   - Responsive layouts for all screens
   - Bottom navigation for thumb reach
   - Swipe gestures for common actions
   - Pull-to-refresh functionality
   - Mobile keyboard optimization

3. **Offline Capability**
   - Cache critical resources
   - Offline data viewing
   - Queue actions for sync
   - Background sync API
   - Conflict resolution
   - Offline indicators

4. **Native Device Integration**
   - Camera access for photos
   - GPS for navigation
   - Phone dialer integration
   - Share API for quotes/invoices
   - Clipboard API for copying
   - Vibration API for feedback

5. **Push Notifications**
   - Job reminders
   - Parts delivery alerts
   - Customer responses
   - Low stock warnings
   - Schedule changes
   - Payment confirmations

6. **Performance Optimization**
   - Code splitting and lazy loading
   - Image optimization and WebP
   - Bundle size reduction
   - Faster first paint
   - Improved TTI (Time to Interactive)

7. **Mobile-Specific Features**
   - Quick actions from home screen
   - Voice input for notes
   - Barcode scanner for parts
   - Signature capture
   - PDF generation on device
   - Native app feel

---

## 📱 PWA Configuration

### 1. Web App Manifest

**File: `/public/manifest.json`**

```json
{
  "name": "Appliance Man Dan Business System",
  "short_name": "AMD Pro",
  "description": "Field service management for appliance repair professionals",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/maskable-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Today's Jobs",
      "short_name": "Jobs",
      "description": "View today's scheduled jobs",
      "url": "/tour",
      "icons": [
        {
          "src": "/icons/shortcut-jobs.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "New Job",
      "short_name": "New",
      "description": "Create a new job",
      "url": "/jobs/new",
      "icons": [
        {
          "src": "/icons/shortcut-new.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "Parts Search",
      "short_name": "Parts",
      "description": "Search parts inventory",
      "url": "/parts",
      "icons": [
        {
          "src": "/icons/shortcut-parts.png",
          "sizes": "96x96"
        }
      ]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/job-list.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/tour-control.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "categories": ["business", "productivity", "utilities"],
  "iarc_rating_id": "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7"
}
```

### 2. Service Worker Implementation

**File: `/public/service-worker.js`**

```javascript
const CACHE_NAME = 'amd-pro-v1';
const OFFLINE_URL = '/offline.html';

// Critical resources to cache immediately
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/styles/main.css',
  '/scripts/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other schemes
  if (!event.request.url.startsWith('http')) return;
  
  // API requests - network first, cache fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Static resources - cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          });
          return cachedResponse;
        }
        
        // Not in cache - fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed - show offline page for navigation
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            // For other resources, return empty response
            return new Response('', { status: 404 });
          });
      })
  );
});

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-jobs') {
    event.waitUntil(syncPendingJobs());
  }
  
  if (event.tag === 'sync-time-entries') {
    event.waitUntil(syncPendingTimeEntries());
  }
  
  if (event.tag === 'sync-photos') {
    event.waitUntil(syncPendingPhotos());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'AMD Pro';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Helper functions for background sync
async function syncPendingJobs() {
  const db = await openIndexedDB();
  const pendingJobs = await getPendingJobs(db);
  
  for (const job of pendingJobs) {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data)
      });
      
      if (response.ok) {
        await removePendingJob(db, job.id);
        console.log('[SW] Synced job:', job.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync job:', job.id, error);
    }
  }
}

async function syncPendingTimeEntries() {
  // Similar implementation for time entries
}

async function syncPendingPhotos() {
  // Similar implementation for photos
}
```

### 3. Service Worker Registration

**File: `/lib/pwa.ts`**

```typescript
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          '/service-worker.js',
          { scope: '/' }
        );
        
        console.log('SW registered:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                showUpdateNotification();
              }
            });
          }
        });
        
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    });
  }
}

function showUpdateNotification() {
  if (confirm('A new version is available! Reload to update?')) {
    window.location.reload();
  }
}
```

---

## 📱 Mobile UI Optimizations

### 1. Touch-Friendly Components

**File: `/components/mobile/TouchButton.tsx`**

```typescript
import React from 'react';

interface TouchButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
}

export function TouchButton({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  fullWidth = false 
}: TouchButtonProps) {
  const baseClasses = 'min-h-[44px] px-6 py-3 rounded-lg font-semibold text-base transition-all active:scale-95';
  
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const widthClasses = fullWidth ? 'w-full' : '';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${widthClasses}`}
    >
      {children}
    </button>
  );
}
```

### 2. Bottom Navigation

**File: `/components/mobile/BottomNav.tsx`**

```typescript
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Calendar, Package, BarChart3, Menu } from 'lucide-react';

export function BottomNav() {
  const router = useRouter();
  
  const isActive = (path: string) => router.pathname === path;
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Tour', path: '/tour' },
    { icon: Package, label: 'Parts', path: '/parts' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Menu, label: 'More', path: '/menu' }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            href={path}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              isActive(path) ? 'text-indigo-600' : 'text-gray-600'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

### 3. Swipe Actions

**File: `/components/mobile/SwipeableJobCard.tsx`**

```typescript
import React, { useRef, useState } from 'react';
import { Phone, MapPin, Clock } from 'lucide-react';

interface Job {
  id: string;
  customer_name: string;
  appliance_type: string;
  issue_description: string;
  scheduled_time: string;
  address: string;
  phone: string;
}

export function SwipeableJobCard({ job }: { job: Job }) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const x = e.touches[0].clientX;
    const diff = x - startX;
    // Limit swipe to -200px (left) or 200px (right)
    setCurrentX(Math.max(-200, Math.min(200, diff)));
  };
  
  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    // If swiped far enough, trigger action
    if (currentX < -100) {
      // Swiped left - show call action
      handleCall();
    } else if (currentX > 100) {
      // Swiped right - show navigate action
      handleNavigate();
    }
    
    // Reset position
    setCurrentX(0);
  };
  
  const handleCall = () => {
    window.location.href = `tel:${job.phone}`;
  };
  
  const handleNavigate = () => {
    window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`;
  };
  
  return (
    <div className="relative overflow-hidden mb-3">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-green-500 flex items-center justify-start pl-6">
          <MapPin className="text-white" size={24} />
        </div>
        <div className="flex-1 bg-blue-500 flex items-center justify-end pr-6">
          <Phone className="text-white" size={24} />
        </div>
      </div>
      
      {/* Card content */}
      <div
        className="relative bg-white rounded-lg shadow p-4 touch-pan-y"
        style={{
          transform: `translateX(${currentX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{job.customer_name}</h3>
          <span className="text-sm text-gray-500 flex items-center">
            <Clock size={16} className="mr-1" />
            {new Date(job.scheduled_time).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        <p className="text-gray-700 mb-1">{job.appliance_type}</p>
        <p className="text-gray-600 text-sm mb-2">{job.issue_description}</p>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCall}
            className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg flex items-center justify-center"
          >
            <Phone size={18} className="mr-2" />
            Call
          </button>
          <button
            onClick={handleNavigate}
            className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg flex items-center justify-center"
          >
            <MapPin size={18} className="mr-2" />
            Navigate
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4. Pull to Refresh

**File: `/components/mobile/PullToRefresh.tsx`**

```typescript
import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const maxPull = 80;
  const threshold = 60;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull from top of page
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0) {
      // Apply resistance to pull
      const pull = Math.min(distance * 0.5, maxPull);
      setPullDistance(pull);
    }
  };
  
  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setStartY(0);
      }
    } else {
      setPullDistance(0);
      setStartY(0);
    }
  };
  
  const rotation = (pullDistance / maxPull) * 360;
  
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center items-center transition-all"
        style={{
          height: pullDistance,
          opacity: pullDistance / threshold
        }}
      >
        <RefreshCw
          size={24}
          className={`text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: `rotate(${rotation}deg)`
          }}
        />
      </div>
      
      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

---

## 📷 Device Integration

### 1. Camera Integration

**File: `/components/mobile/CameraCapture.tsx`**

```typescript
import React, { useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  maxSize?: number; // in MB
}

export function CameraCapture({ onCapture, maxSize = 5 }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    setError(null);
    onCapture(file);
  };
  
  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <button
        onClick={openCamera}
        className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 px-4 rounded-lg min-h-[44px]"
      >
        <Camera size={20} />
        Take Photo
      </button>
      
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
```

### 2. GPS Navigation

**File: `/utils/navigation.ts`**

```typescript
export function navigateToAddress(address: string) {
  // iOS - use Apple Maps
  if (/(iPhone|iPad|iPod)/.test(navigator.userAgent)) {
    window.location.href = `maps://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
  } 
  // Android and others - use Google Maps
  else {
    window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
}

export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}

export async function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): Promise<number> {
  // Haversine formula
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

### 3. Phone Dialer Integration

**File: `/components/mobile/PhoneButton.tsx`**

```typescript
import React from 'react';
import { Phone } from 'lucide-react';

interface PhoneButtonProps {
  phoneNumber: string;
  label?: string;
}

export function PhoneButton({ phoneNumber, label = 'Call' }: PhoneButtonProps) {
  const handleCall = () => {
    // Vibrate on tap (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Format phone number for tel: link
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    window.location.href = `tel:${cleanNumber}`;
  };
  
  return (
    <button
      onClick={handleCall}
      className="flex items-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg min-h-[44px]"
    >
      <Phone size={20} />
      {label}
    </button>
  );
}
```

---

## 🔔 Push Notifications

### 1. Setup Push Notifications (Firebase)

**File: `/lib/push-notifications.ts`**

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      console.log('FCM Token:', token);
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
}

export function onMessageListener() {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
}

export async function saveNotificationToken(userId: string, token: string) {
  try {
    await fetch('/api/notifications/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token })
    });
  } catch (error) {
    console.error('Error saving notification token:', error);
  }
}
```

### 2. Notification API Endpoint

**File: `/pages/api/notifications/register.ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { userId, token } = req.body;
  
  if (!userId || !token) {
    return res.status(400).json({ error: 'Missing userId or token' });
  }
  
  const supabase = createClient(req, res);
  
  try {
    // Store or update FCM token
    const { error } = await supabase
      .from('notification_tokens')
      .upsert({
        user_id: userId,
        token: token,
        device_type: getDeviceType(req),
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error registering notification token:', error);
    res.status(500).json({ error: 'Failed to register token' });
  }
}

function getDeviceType(req: NextApiRequest): string {
  const userAgent = req.headers['user-agent'] || '';
  
  if (/(iPhone|iPad|iPod)/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'web';
}
```

### 3. Send Push Notification (Server-Side)

**File: `/lib/send-notification.ts`**

```typescript
import admin from 'firebase-admin';

// Initialize Firebase Admin (do this once at app startup)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
}

export async function sendPushNotification(
  token: string,
  payload: NotificationPayload
) {
  try {
    const message = {
      token: token,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: payload.data || {},
      webpush: {
        fcmOptions: {
          link: payload.url || '/'
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Example: Send notification to all user's devices
export async function notifyUser(
  userId: string,
  payload: NotificationPayload
) {
  const supabase = createClient();
  
  // Get all tokens for user
  const { data: tokens } = await supabase
    .from('notification_tokens')
    .select('token')
    .eq('user_id', userId);
  
  if (!tokens || tokens.length === 0) {
    console.log('No tokens found for user:', userId);
    return;
  }
  
  // Send to all devices
  const promises = tokens.map(({ token }) => 
    sendPushNotification(token, payload)
  );
  
  await Promise.all(promises);
}

// Predefined notification templates
export const NotificationTemplates = {
  jobReminder: (customerName: string, time: string) => ({
    title: 'Upcoming Job',
    body: `Job with ${customerName} scheduled at ${time}`,
    url: '/tour'
  }),
  
  partsDelivered: (trackingNumber: string) => ({
    title: 'Parts Delivered',
    body: `Your parts shipment (${trackingNumber}) has been delivered`,
    url: '/parts'
  }),
  
  lowStock: (partNumber: string) => ({
    title: 'Low Stock Alert',
    body: `Part ${partNumber} is running low. Reorder recommended.`,
    url: '/parts'
  }),
  
  paymentReceived: (amount: number, customerName: string) => ({
    title: 'Payment Received',
    body: `Received $${amount.toFixed(2)} from ${customerName}`,
    url: '/invoices'
  })
};
```

---

## 💾 Offline Functionality

### 1. IndexedDB Setup

**File: `/lib/offline-db.ts`**

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  jobs: {
    key: string;
    value: {
      id: string;
      data: any;
      synced: boolean;
      created_at: string;
    };
  };
  time_entries: {
    key: string;
    value: {
      id: string;
      data: any;
      synced: boolean;
      created_at: string;
    };
  };
  photos: {
    key: string;
    value: {
      id: string;
      file: Blob;
      job_id: string;
      synced: boolean;
      created_at: string;
    };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

export async function initOfflineDB() {
  if (db) return db;
  
  db = await openDB<OfflineDB>('amd-offline', 1, {
    upgrade(db) {
      // Jobs store
      if (!db.objectStoreNames.contains('jobs')) {
        db.createObjectStore('jobs', { keyPath: 'id' });
      }
      
      // Time entries store
      if (!db.objectStoreNames.contains('time_entries')) {
        db.createObjectStore('time_entries', { keyPath: 'id' });
      }
      
      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    }
  });
  
  return db;
}

export async function saveOfflineJob(job: any) {
  const database = await initOfflineDB();
  
  await database.put('jobs', {
    id: `offline-${Date.now()}`,
    data: job,
    synced: false,
    created_at: new Date().toISOString()
  });
}

export async function getOfflineJobs() {
  const database = await initOfflineDB();
  return database.getAll('jobs');
}

export async function syncOfflineData() {
  const database = await initOfflineDB();
  
  // Get all unsynced items
  const jobs = await database.getAll('jobs');
  const unsyncedJobs = jobs.filter(j => !j.synced);
  
  for (const job of unsyncedJobs) {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data)
      });
      
      if (response.ok) {
        // Mark as synced
        await database.put('jobs', { ...job, synced: true });
      }
    } catch (error) {
      console.error('Failed to sync job:', job.id, error);
    }
  }
  
  // Similar for time entries and photos
}

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online - syncing data...');
    syncOfflineData();
  });
}
```

### 2. Offline Indicator

**File: `/components/mobile/OfflineIndicator.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial state
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!showBanner) return null;
  
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-white ${
        isOnline ? 'bg-green-600' : 'bg-orange-600'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi size={18} />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOff size={18} />
            <span>You're offline. Changes will sync when connected.</span>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 🎨 Mobile-Specific Styles

### 1. Safe Area Insets (for notch/home indicator)

**File: `/styles/mobile.css`**

```css
/* Safe area support for iOS notch */
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);
  --safe-area-inset-right: env(safe-area-inset-right);
}

.safe-area-top {
  padding-top: var(--safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: var(--safe-area-inset-bottom);
}

.safe-area-left {
  padding-left: var(--safe-area-inset-left);
}

.safe-area-right {
  padding-right: var(--safe-area-inset-right);
}

/* Viewport height that accounts for mobile browser chrome */
.min-h-screen-mobile {
  min-height: 100vh;
  min-height: -webkit-fill-available;
}

/* Disable pull-to-refresh on iOS */
body {
  overscroll-behavior-y: contain;
}

/* Better tap highlighting */
* {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

/* Prevent zoom on input focus */
@media screen and (max-width: 768px) {
  input[type="text"],
  input[type="number"],
  input[type="email"],
  input[type="tel"],
  select,
  textarea {
    font-size: 16px; /* Prevents zoom */
  }
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* Hide scrollbars but keep functionality */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
```

---

## 📲 Install Prompt

### Install Prompt Component

**File: `/components/mobile/InstallPrompt.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }
    
    // Check if dismissed recently
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return; // Don't show again for 7 days
      }
    }
    
    // Listen for install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('Install prompt outcome:', outcome);
    setShowPrompt(false);
    setDeferredPrompt(null);
    
    if (outcome === 'dismissed') {
      localStorage.setItem('install-prompt-dismissed', new Date().toISOString());
    }
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', new Date().toISOString());
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X size={20} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Download size={24} className="text-indigo-600" />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Install AMD Pro
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Add to your home screen for quick access and offline use
          </p>
          
          <button
            onClick={handleInstall}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Procedures

### Test PWA Installation
1. Open site in Chrome/Edge/Safari
2. Look for install icon in address bar
3. Click to install
4. Verify app opens in standalone mode
5. Check app icon on home screen
6. Verify proper theme colors

### Test Offline Functionality
1. Load app while online
2. Turn off wifi/mobile data
3. Navigate through cached pages
4. Create a job (saves to IndexedDB)
5. Add time entry
6. Upload photo
7. Turn wifi back on
8. Verify automatic sync

### Test Push Notifications
1. Allow notification permission
2. Trigger test notification from backend
3. Verify notification appears
4. Click notification
5. Verify correct page opens
6. Test on both iOS and Android

### Test Mobile Features
1. Camera capture works
2. Phone dialer launches
3. GPS navigation opens Maps
4. Pull-to-refresh works
5. Swipe gestures respond
6. Touch targets are 44px+
7. Bottom nav is accessible
8. Safe areas respected on iOS

---

## ✅ Success Criteria

### Stage 10 is complete when:
- ✅ PWA installable on iOS and Android
- ✅ Offline mode functional for viewing data
- ✅ Service worker caches resources correctly
- ✅ Push notifications work on all devices
- ✅ Camera integration captures photos
- ✅ GPS navigation launches correctly
- ✅ Phone dialer works from job cards
- ✅ Pull-to-refresh refreshes data
- ✅ Swipe gestures work smoothly
- ✅ Bottom navigation accessible with thumb
- ✅ All touch targets minimum 44px
- ✅ Safe areas respected on notched devices
- ✅ Background sync queues offline actions
- ✅ Install prompt appears appropriately
- ✅ App feels native, not web-based

### Key Performance Targets:
- First contentful paint: <1.5 seconds
- Time to interactive: <3 seconds
- Lighthouse PWA score: 90+
- Lighthouse Performance score: 90+
- Offline page loads instantly
- Cache hit rate: >80%

---

## 🚀 What's Next?

After Stage 10, you'll have a fully mobile-optimized PWA! Stage 11 will add:
- **External Integrations**
- Google Calendar sync
- SMS notifications (Twilio)
- Email automation (SendGrid)
- Parts supplier APIs
- Shipping tracking APIs
- Payment processing (Stripe)

---

## 📚 Resources

- PWA Documentation: https://web.dev/progressive-web-apps/
- Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Web App Manifest: https://web.dev/add-manifest/
- Push Notifications: https://firebase.google.com/docs/cloud-messaging
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

**Stage 10 transforms your web app into a native-feeling mobile experience that technicians can install and use offline in the field! 📱**
