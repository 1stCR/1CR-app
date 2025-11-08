const CACHE_NAME = 'amd-pro-v1';
const OFFLINE_URL = '/offline.html';

// Critical resources to cache immediately
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json'
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

  // Supabase API requests - network first, cache fallback
  if (event.request.url.includes('supabase.co')) {
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
          }).catch(() => {
            // Ignore network errors in background update
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
    badge: '/icons/icon-72x72.png',
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
  try {
    const db = await openIndexedDB();
    const pendingJobs = await getPendingJobs(db);

    for (const job of pendingJobs) {
      try {
        // Note: This is a placeholder - actual sync logic would go here
        console.log('[SW] Would sync job:', job.id);
      } catch (error) {
        console.error('[SW] Failed to sync job:', job.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

async function syncPendingTimeEntries() {
  console.log('[SW] Syncing pending time entries...');
}

async function syncPendingPhotos() {
  console.log('[SW] Syncing pending photos...');
}

async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('amd-offline', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingJobs(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['jobs'], 'readonly');
    const store = transaction.objectStore('jobs');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(j => !j.synced));
    request.onerror = () => reject(request.error);
  });
}
