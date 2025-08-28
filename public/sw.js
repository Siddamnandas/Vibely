/**
 * Service Worker for Vibely App
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = "vibely-v1.0.0";
const STATIC_CACHE = "vibely-static-v1.0.0";
const DYNAMIC_CACHE = "vibely-dynamic-v1.0.0";
const IMAGE_CACHE = "vibely-images-v1.0.0";

// Resources to cache immediately
const STATIC_ASSETS = [
  "/",
  "/generator",
  "/library",
  "/stories",
  "/profile",
  "/manifest.json",
  "/offline",
  // Add your built assets here when generated
  "/_next/static/css/",
  "/_next/static/js/",
  "/_next/static/media/",
];

// API endpoints to cache
const CACHEABLE_APIS = ["/api/spotify/tracks", "/api/user/profile", "/api/user/settings"];

// Network-first resources (always try network first)
const NETWORK_FIRST = ["/api/payments/", "/api/auth/", "/api/analytics/"];

// Cache-first resources (serve from cache if available)
const CACHE_FIRST = ["/api/spotify/tracks", "/_next/static/", "/images/", "/icons/"];

self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...");

  event.waitUntil(
    (async () => {
      try {
        // Cache static assets
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(
          STATIC_ASSETS.filter(
            (url) => !url.includes("_next"), // Skip Next.js assets during install as they may not exist yet
          ),
        );

        console.log("✅ Static assets cached");

        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error("❌ Service Worker install failed:", error);
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activating...");

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(
          (name) =>
            name !== STATIC_CACHE &&
            name !== DYNAMIC_CACHE &&
            name !== IMAGE_CACHE &&
            name.startsWith("vibely-"),
        );

        await Promise.all(
          oldCaches.map((cacheName) => {
            console.log("🗑️ Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }),
        );

        // Take control of all clients
        await self.clients.claim();

        console.log("✅ Service Worker activated");
      } catch (error) {
        console.error("❌ Service Worker activation failed:", error);
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith("http")) return;

  // Skip cross-origin requests that aren't APIs
  if (url.origin !== self.location.origin && !isCacheableAPI(request)) {
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // Handle different resource types
    if (isImageRequest(request)) {
      return await handleImageRequest(request);
    } else if (isAPIRequest(request)) {
      return await handleAPIRequest(request);
    } else if (isStaticAsset(request)) {
      return await handleStaticAsset(request);
    } else if (isNavigationRequest(request)) {
      return await handleNavigationRequest(request);
    }

    // Default: network first with cache fallback
    return await networkFirstWithFallback(request, DYNAMIC_CACHE);
  } catch (error) {
    console.error("Fetch handler error:", error);
    return await handleOfflineResponse(request);
  }
}

// Image caching strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    // Serve from cache and update in background
    updateImageCache(request, cache);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful image responses
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return placeholder image for offline
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#1a1a1a"/><text x="100" y="100" text-anchor="middle" fill="#666" font-family="Arial">Image unavailable</text></svg>',
      { headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}

// API caching strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Network-first for critical APIs
  if (NETWORK_FIRST.some((pattern) => pathname.startsWith(pattern))) {
    return await networkFirst(request);
  }

  // Cache-first for static data
  if (CACHE_FIRST.some((pattern) => pathname.startsWith(pattern))) {
    return await cacheFirst(request, DYNAMIC_CACHE);
  }

  // Stale-while-revalidate for user data
  if (CACHEABLE_APIS.some((pattern) => pathname.startsWith(pattern))) {
    return await staleWhileRevalidate(request, DYNAMIC_CACHE);
  }

  // Default: network only for uncacheable APIs
  return await fetch(request);
}

// Static asset caching
async function handleStaticAsset(request) {
  return await cacheFirst(request, STATIC_CACHE);
}

// Navigation request handling
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const response = await fetch(request);

    // Cache successful navigation responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Serve cached page or offline page
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Serve offline page for navigation requests
    const offlinePage = await cache.match("/offline");
    if (offlinePage) {
      return offlinePage;
    }

    // Fallback offline response
    return new Response(
      "<!DOCTYPE html><html><head><title>Offline - Vibely</title></head><body><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>",
      { headers: { "Content-Type": "text/html" } },
    );
  }
}

// Caching strategies
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    return cached || Promise.reject(error);
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start fetch in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.warn("Background fetch failed:", error);
    });

  // Return cached version immediately if available
  if (cached) {
    return cached;
  }

  // If not cached, wait for fetch
  return await fetchPromise;
}

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    return await handleOfflineResponse(request);
  }
}

// Background image cache update
async function updateImageCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    // Ignore background update errors
  }
}

// Utility functions
function isImageRequest(request) {
  return (
    request.destination === "image" ||
    /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(new URL(request.url).pathname)
  );
}

function isAPIRequest(request) {
  return new URL(request.url).pathname.startsWith("/api/");
}

function isStaticAsset(request) {
  const pathname = new URL(request.url).pathname;
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/static/") ||
    /\.(js|css|woff|woff2|ttf|eot)$/i.test(pathname)
  );
}

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"))
  );
}

function isCacheableAPI(request) {
  const pathname = new URL(request.url).pathname;
  return CACHEABLE_APIS.some((pattern) => pathname.startsWith(pattern));
}

async function handleOfflineResponse(request) {
  if (isNavigationRequest(request)) {
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline - Vibely</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:2rem;font-family:system-ui;background:#0E0F12;color:white;text-align:center}h1{color:#9FFFA2}</style></head><body><h1>You\'re Offline</h1><p>Vibely needs an internet connection to work properly.</p><p>Please check your connection and try again.</p><button onclick="window.location.reload()">Retry</button></body></html>',
      {
        headers: { "Content-Type": "text/html" },
        status: 503,
        statusText: "Service Unavailable",
      },
    );
  }

  return new Response(
    JSON.stringify({
      error: "Network unavailable",
      message: "Please check your internet connection",
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 503,
    },
  );
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("🔄 Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle background sync tasks
  // e.g., upload pending analytics, retry failed API calls
  console.log("📤 Performing background sync...");
}

// Push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body || "New update available",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: data.tag || "vibely-notification",
      data: data.data || {},
      actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(data.title || "Vibely", options));
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { action, data } = event;
  const url = data?.url || "/";

  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      // Check if app is already open
      const client = clients.find((c) => c.url.includes(self.location.origin));

      if (client) {
        client.focus();
        client.postMessage({ type: "NOTIFICATION_CLICK", action, data });
      } else {
        self.clients.openWindow(url);
      }
    }),
  );
});

console.log("🎵 Vibely Service Worker loaded");
