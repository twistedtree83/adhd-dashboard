// ============================================================================
// Service Worker - Push Notifications for ADHD Dashboard
// ============================================================================

const CACHE_NAME = 'adhd-dashboard-v1';
const STATIC_ASSETS = [
  '/',
  '/auth',
  '/tasks',
  '/capture',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('[SW] Cache failed:', err);
    })
  );

  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let notificationData = {
    title: 'ADHD Assistant',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'default',
    requireInteraction: false,
    data: {},
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload,
      };
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }

  // ADHD-friendly notification options
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    silent: false,
    vibrate: [200, 100, 200], // Gentle vibration pattern
    data: notificationData.data,
    actions: getNotificationActions(notificationData.data?.type),
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Get appropriate actions based on notification type
function getNotificationActions(type) {
  switch (type) {
    case 'task_reminder':
      return [
        { action: 'complete', title: '✓ Complete' },
        { action: 'snooze', title: '↻ Snooze' },
      ];
    case 'streak_at_risk':
      return [
        { action: 'view_tasks', title: '🔥 View Tasks' },
      ];
    case 'location_reminder':
      return [
        { action: 'view_tasks', title: '📍 See Tasks' },
      ];
    case 'achievement_unlocked':
    case 'level_up':
      return [
        { action: 'view_profile', title: '🏆 View Profile' },
      ];
    default:
      return [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        const hadClient = clientList.some((client) => {
          if (client.url && 'focus' in client) {
            client.focus();
            
            // Post message to client
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              action,
              data,
            });
            
            return true;
          }
          return false;
        });

        // If app is not open, open it
        if (!hadClient) {
          const url = getNotificationUrl(data, action);
          self.clients.openWindow(url);
        }
      })
  );
});

// Get URL to open based on notification data
function getNotificationUrl(data, action) {
  const baseUrl = self.location.origin;

  if (data.task_id) {
    if (action === 'complete') {
      return `${baseUrl}/tasks?complete=${data.task_id}`;
    }
    return `${baseUrl}/tasks?id=${data.task_id}`;
  }

  if (data.location_id) {
    return `${baseUrl}/tasks?location=${data.location_id}`;
  }

  if (data.achievement_id || data.level) {
    return `${baseUrl}/profile`;
  }

  return baseUrl;
}

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
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
        // Return cached version if available
        return caches.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }
          // Return offline page if no cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          throw new Error('Network error and no cache available');
        });
      })
  );
});

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sync event - background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Sync any pending notifications when back online
  console.log('[SW] Syncing notifications...');
}

// Periodic sync for daily summary (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-summary') {
    event.waitUntil(showDailySummary());
  }
});

async function showDailySummary() {
  // This would be triggered daily to show a summary notification
  // Requires user permission and browser support
}
