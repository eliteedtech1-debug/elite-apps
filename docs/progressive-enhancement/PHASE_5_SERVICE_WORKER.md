# Phase 5: Service Worker & Offline Support (Day 5 - 3 hours)

## Goal: Cache assets for faster loads and offline access

---

## 5.1 Install Workbox

```bash
npm install -D workbox-webpack-plugin
npm install workbox-window
```

---

## 5.2 Create Service Worker

**File:** `elscholar-ui/public/sw.js`

```javascript
const CACHE_NAME = 'elite-scholar-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});
```

---

## 5.3 Register Service Worker

**File:** `elscholar-ui/src/serviceWorkerRegistration.ts`

```typescript
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('SW registered:', registration);
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
```

---

## 5.4 Enable Service Worker

**File:** `elscholar-ui/src/main.tsx`

```typescript
import { register as registerServiceWorker } from './serviceWorkerRegistration';

// After ReactDOM.render
registerServiceWorker();
```

---

## 5.5 Add Offline Indicator

**File:** `elscholar-ui/src/components/OfflineIndicator.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Alert } from 'antd';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <Alert
      message="You are offline"
      description="Some features may not be available"
      type="warning"
      banner
      closable
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
    />
  );
};

export default OfflineIndicator;
```

Add to App.tsx:
```typescript
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  return (
    <>
      <OfflineIndicator />
      {/* rest of app */}
    </>
  );
}
```

---

## 5.6 Add Web App Manifest

**File:** `elscholar-ui/public/manifest.json`

```json
{
  "name": "Elite Scholar",
  "short_name": "Elite Scholar",
  "description": "School Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "/logo192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Link in index.html:
```html
<link rel="manifest" href="/manifest.json">
```

---

## ✅ Phase 5 Checklist

- [ ] Created service worker
- [ ] Registered service worker
- [ ] Added offline indicator
- [ ] Created web app manifest
- [ ] Tested offline mode (DevTools → Network → Offline)
- [ ] Verified cached assets load when offline

**Time:** 3 hours
**Impact:** 2x faster repeat visits, works offline

---

**Next:** Phase 6 - Performance Monitoring
