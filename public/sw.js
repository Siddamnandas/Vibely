/**
 * Service Worker for Vibely App
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = "vibely-v1.1.0";
const STATIC_CACHE = "vibely-static-v1.1.0";
const DYNAMIC_CACHE = "vibely-dynamic-v1.1.0";
const IMAGE_CACHE = "vibely-images-v1.1.0";
const PLAYLIST_CACHE = "vibely-playlists-v1.1.0";
const AUDIO_CACHE = "vibely-audio-v1.1.0";
const USER_DATA_CACHE = "vibely-userdata-v1.1.0";

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
const CACHEABLE_APIS = [
  "/api/spotify/tracks",
  "/api/user/profile",
  "/api/user/settings",
  "/api/playlists",
  "/api/music/playlists",
  "/api/covers",
];

// Playlist-specific APIs for aggressive caching
const PLAYLIST_APIS = [
  "/api/playlists/",
  "/api/music/playlists/",
  "/api/spotify/playlists/",
  "/api/covers/",
];

// User data APIs for stale-while-revalidate
const USER_DATA_APIS = ["/api/user/", "/api/subscription/", "/api/purchases/"];

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
            name !== PLAYLIST_CACHE &&
            name !== AUDIO_CACHE &&
            name !== USER_DATA_CACHE &&
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
    } else if (isAudioRequest(request)) {
      return await handleAudioRequest(request);
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

  // Playlist-specific caching
  if (PLAYLIST_APIS.some((pattern) => pathname.startsWith(pattern))) {
    return await handlePlaylistAPI(request);
  }

  // User data with stale-while-revalidate
  if (USER_DATA_APIS.some((pattern) => pathname.startsWith(pattern))) {
    return await staleWhileRevalidate(request, USER_DATA_CACHE);
  }

  // Cache-first for static data
  if (CACHE_FIRST.some((pattern) => pathname.startsWith(pattern))) {
    return await cacheFirst(request, DYNAMIC_CACHE);
  }

  // Stale-while-revalidate for other cacheable APIs
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

// Playlist-specific API handler with intelligent caching
async function handlePlaylistAPI(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Only cache GET requests
  if (method !== "GET") {
    try {
      const response = await fetch(request);

      // If it's a mutation (POST, PUT, DELETE), invalidate related cache
      if (response.ok && (method === "POST" || method === "PUT" || method === "DELETE")) {
        await invalidatePlaylistCache(pathname);
      }

      return response;
    } catch (error) {
      return await handleOfflineResponse(request);
    }
  }

  const cache = await caches.open(PLAYLIST_CACHE);
  const cached = await cache.match(request);

  // For playlist list requests, use stale-while-revalidate
  if (pathname === "/api/playlists" || pathname === "/api/music/playlists") {
    return await staleWhileRevalidate(request, PLAYLIST_CACHE);
  }

  // For individual playlist requests, use cache-first with background update
  if (pathname.includes("/playlists/") && !pathname.includes("/tracks")) {
    return await cacheFirstWithBackgroundUpdate(request, PLAYLIST_CACHE);
  }

  // For playlist tracks, use network-first (more likely to change)
  if (pathname.includes("/tracks")) {
    return await networkFirstWithPlaylistFallback(request, PLAYLIST_CACHE);
  }

  // For cover/artwork requests, use cache-first
  if (pathname.includes("/covers/")) {
    return await cacheFirst(request, PLAYLIST_CACHE);
  }

  // Default: stale-while-revalidate for other playlist APIs
  return await staleWhileRevalidate(request, PLAYLIST_CACHE);
}

// Cache-first with background update
async function cacheFirstWithBackgroundUpdate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start background update
  const backgroundUpdate = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        // Add cache timestamp
        const responseWithTimestamp = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...response.headers,
            "sw-cached-at": new Date().toISOString(),
          },
        });
        await cache.put(request, responseWithTimestamp.clone());
      }
      return response;
    })
    .catch((error) => {
      console.warn("Background update failed:", error);
    });

  // Return cached version immediately if available
  if (cached) {
    // Check if cache is stale (older than 5 minutes for playlists)
    const cachedAt = cached.headers.get("sw-cached-at");
    if (cachedAt) {
      const cacheAge = Date.now() - new Date(cachedAt).getTime();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (cacheAge < maxAge) {
        // Cache is fresh, don't wait for background update
        return cached;
      }
    }

    // Cache is stale but still return it immediately
    return cached;
  }

  // No cache available, wait for network
  return await backgroundUpdate;
}

// Network-first with playlist cache fallback
async function networkFirstWithPlaylistFallback(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);

      // Add timestamp to response
      const responseWithTimestamp = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          "sw-cached-at": new Date().toISOString(),
        },
      });

      await cache.put(request, responseWithTimestamp.clone());
    }

    return response;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      // Add offline indicator to cached response
      const offlineResponse = new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: {
          ...cached.headers,
          "sw-offline": "true",
        },
      });
      return offlineResponse;
    }

    return await handleOfflineResponse(request);
  }
}

// Invalidate playlist cache for mutations
async function invalidatePlaylistCache(pathname) {
  const cache = await caches.open(PLAYLIST_CACHE);
  const keys = await cache.keys();

  // Extract playlist ID from pathname if possible
  const playlistIdMatch = pathname.match(/\/playlists\/([^/]+)/);
  const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

  // Invalidate related cache entries
  const keysToDelete = keys.filter((request) => {
    const url = new URL(request.url);
    const urlPath = url.pathname;

    // Invalidate playlist list caches
    if (urlPath === "/api/playlists" || urlPath === "/api/music/playlists") {
      return true;
    }

    // Invalidate specific playlist cache if we have the ID
    if (playlistId && urlPath.includes(`/playlists/${playlistId}`)) {
      return true;
    }

    return false;
  });

  // Delete invalidated cache entries
  await Promise.all(keysToDelete.map((key) => cache.delete(key)));

  console.log(`🗑️ Invalidated ${keysToDelete.length} playlist cache entries`);
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

function isAudioRequest(request) {
  return (
    request.destination === "audio" ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(new URL(request.url).pathname) ||
    new URL(request.url).pathname.startsWith("/api/audio/") ||
    request.headers.get("content-type")?.includes("audio")
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
  console.log("🔄 Background sync triggered:", event.tag);

  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === "playlist-sync") {
    event.waitUntil(syncPlaylistData());
  } else if (event.tag === "analytics-sync") {
    event.waitUntil(syncAnalyticsData());
  }
});

async function doBackgroundSync() {
  console.log("📤 Performing background sync...");

  try {
    // Sync pending operations
    await Promise.all([
      syncPlaylistData(),
      syncAnalyticsData(),
      syncUserPreferences(),
      preloadCriticalData(),
    ]);

    console.log("✅ Background sync completed");
  } catch (error) {
    console.error("❌ Background sync failed:", error);
  }
}

// Sync playlist data in background
async function syncPlaylistData() {
  try {
    // Get user's playlists and preload essential data
    const playlistsResponse = await fetch("/api/playlists?preload=true");

    if (playlistsResponse.ok) {
      const cache = await caches.open(PLAYLIST_CACHE);
      await cache.put("/api/playlists", playlistsResponse.clone());

      // Preload individual playlists metadata
      const playlists = await playlistsResponse.json();
      const preloadPromises = playlists.slice(0, 5).map(async (playlist) => {
        try {
          const playlistResponse = await fetch(`/api/playlists/${playlist.id}`);
          if (playlistResponse.ok) {
            await cache.put(`/api/playlists/${playlist.id}`, playlistResponse.clone());
          }
        } catch (error) {
          console.warn(`Failed to preload playlist ${playlist.id}:`, error);
        }
      });

      await Promise.allSettled(preloadPromises);
      console.log("🎵 Playlist data synced");
    }
  } catch (error) {
    console.warn("Playlist sync failed:", error);
  }
}

// Sync analytics data
async function syncAnalyticsData() {
  try {
    // Send any pending analytics events
    const pendingEvents = await getStoredAnalyticsEvents();

    if (pendingEvents.length > 0) {
      await fetch("/api/analytics/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: pendingEvents }),
      });

      // Clear sent events
      await clearStoredAnalyticsEvents();
      console.log(`📊 Synced ${pendingEvents.length} analytics events`);
    }
  } catch (error) {
    console.warn("Analytics sync failed:", error);
  }
}

// Sync user preferences
async function syncUserPreferences() {
  try {
    const prefsResponse = await fetch("/api/user/preferences");
    if (prefsResponse.ok) {
      const cache = await caches.open(USER_DATA_CACHE);
      await cache.put("/api/user/preferences", prefsResponse.clone());
    }
  } catch (error) {
    console.warn("User preferences sync failed:", error);
  }
}

// Preload critical data
async function preloadCriticalData() {
  try {
    const criticalRequests = [
      "/api/user/profile",
      "/api/user/subscription",
      "/api/playlists?limit=10",
    ];

    const responses = await Promise.allSettled(criticalRequests.map((url) => fetch(url)));

    // Cache successful responses
    const cache = await caches.open(USER_DATA_CACHE);
    for (let i = 0; i < responses.length; i++) {
      const result = responses[i];
      if (result.status === "fulfilled" && result.value.ok) {
        await cache.put(criticalRequests[i], result.value.clone());
      }
    }

    console.log("🚀 Critical data preloaded");
  } catch (error) {
    console.warn("Critical data preload failed:", error);
  }
}

// Message handling for audio caching
self.addEventListener("message", async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "CACHE_PLAYLIST_AUDIO":
      await handleCachePlaylistAudio(data);
      break;
    case "CACHE_TRACK_AUDIO":
      await handleCacheTrackAudio(data);
      break;
    case "CLEAR_AUDIO_CACHE":
      await handleClearAudioCache(data);
      break;
    case "GET_CACHE_STATUS":
      await handleGetCacheStatus(event.ports[0]);
      break;
  }
});

// Handle playlist audio caching
async function handleCachePlaylistAudio(data) {
  const { playlistId, tracks } = data;
  console.log(`🎵 Caching audio for playlist ${playlistId}: ${tracks.length} tracks`);

  const cache = await caches.open(AUDIO_CACHE);
  let successCount = 0;

  for (const track of tracks) {
    try {
      if (track.audioUrl) {
        const response = await fetch(track.audioUrl);
        if (response.ok) {
          await cache.put(track.audioUrl, response.clone());
          successCount++;

          // Notify the main thread
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "AUDIO_CACHED",
                data: { trackId: track.id, trackTitle: track.title },
              });
            });
          });
        }
      }
    } catch (error) {
      console.error(`Failed to cache audio for ${track.title}:`, error);

      // Notify failure
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "AUDIO_CACHE_FAILED",
            data: { trackId: track.id, error: error.message },
          });
        });
      });
    }
  }

  console.log(`✅ Successfully cached ${successCount}/${tracks.length} audio tracks`);
}

// Handle individual track audio caching
async function handleCacheTrackAudio(data) {
  const { track } = data;

  try {
    if (track.audioUrl) {
      const cache = await caches.open(AUDIO_CACHE);
      const response = await fetch(track.audioUrl);

      if (response.ok) {
        await cache.put(track.audioUrl, response.clone());

        // Notify success
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "AUDIO_CACHED",
              data: { trackId: track.id, trackTitle: track.title },
            });
          });
        });
      }
    }
  } catch (error) {
    console.error(`Failed to cache audio for ${track.title}:`, error);

    // Notify failure
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "AUDIO_CACHE_FAILED",
          data: { trackId: track.id, error: error.message },
        });
      });
    });
  }
}

// Handle audio cache clearing
async function handleClearAudioCache(data) {
  try {
    const cache = await caches.open(AUDIO_CACHE);

    if (data.trackId) {
      // Clear specific track
      const keys = await cache.keys();
      const trackKeys = keys.filter((key) => key.url.includes(data.trackId));
      await Promise.all(trackKeys.map((key) => cache.delete(key)));
    } else if (data.playlistId) {
      // Clear playlist audio
      const keys = await cache.keys();
      // This would need playlist context, so for now just clear all
      await Promise.all(keys.map((key) => cache.delete(key)));
    } else {
      // Clear all audio cache
      const keys = await cache.keys();
      await Promise.all(keys.map((key) => cache.delete(key)));
    }

    console.log("🧹 Audio cache cleared");
  } catch (error) {
    console.error("Failed to clear audio cache:", error);
  }
}

// Handle cache status requests
async function handleGetCacheStatus(port) {
  try {
    const audioCache = await caches.open(AUDIO_CACHE);
    const audioKeys = await audioCache.keys();

    const playlistCache = await caches.open(PLAYLIST_CACHE);
    const playlistKeys = await playlistCache.keys();

    const status = {
      audioTracksCount: audioKeys.length,
      playlistsCount: playlistKeys.length,
      cacheNames: [AUDIO_CACHE, PLAYLIST_CACHE, USER_DATA_CACHE],
    };

    port.postMessage({ type: "CACHE_STATUS", data: status });
  } catch (error) {
    port.postMessage({ type: "CACHE_STATUS_ERROR", error: error.message });
  }
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

// Analytics storage helpers
async function getStoredAnalyticsEvents() {
  try {
    const db = await openAnalyticsDB();
    const transaction = db.transaction(["events"], "readonly");
    const store = transaction.objectStore("events");
    const events = await store.getAll();
    return events || [];
  } catch (error) {
    console.warn("Failed to get stored analytics events:", error);
    return [];
  }
}

async function clearStoredAnalyticsEvents() {
  try {
    const db = await openAnalyticsDB();
    const transaction = db.transaction(["events"], "readwrite");
    const store = transaction.objectStore("events");
    await store.clear();
  } catch (error) {
    console.warn("Failed to clear analytics events:", error);
  }
}

async function openAnalyticsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("vibely-analytics", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("events")) {
        const store = db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp");
      }
    };
  });
}

// Audio caching for offline playback
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);

  // Return cached audio immediately if available
  if (cached) {
    console.log("🎵 Serving cached audio:", request.url);
    return cached;
  }

  try {
    const response = await fetch(request);

    // Only cache successful audio responses
    if (response.ok && response.headers.get("content-type")?.includes("audio")) {
      // Check cache size limits before caching large audio files
      const contentLength = response.headers.get("content-length");
      const fileSize = contentLength ? parseInt(contentLength) : 0;

      // Only cache audio files smaller than 10MB
      if (fileSize < 10 * 1024 * 1024) {
        cache.put(request, response.clone());
        console.log("💾 Cached audio file:", request.url);
      }
    }

    return response;
  } catch (error) {
    console.error("Audio request failed:", error);

    // Return offline audio placeholder
    return new Response(
      JSON.stringify({
        error: "Audio unavailable offline",
        message: "This audio track is not available offline",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Cache management utilities
async function cleanupCaches() {
  try {
    // Clean up old audio cache entries (keep only recent ones)
    const audioCache = await caches.open(AUDIO_CACHE);
    const audioKeys = await audioCache.keys();

    if (audioKeys.length > 50) {
      // Keep max 50 audio files
      // Sort by URL and remove oldest entries
      const keysToDelete = audioKeys.slice(50);
      await Promise.all(keysToDelete.map((key) => audioCache.delete(key)));
      console.log(`🧽 Cleaned up ${keysToDelete.length} old audio cache entries`);
    }

    // Clean up old playlist cache entries
    const playlistCache = await caches.open(PLAYLIST_CACHE);
    const playlistKeys = await playlistCache.keys();

    // Remove entries older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const oldPlaylistKeys = [];

    for (const key of playlistKeys) {
      const response = await playlistCache.match(key);
      const cachedAt = response?.headers.get("sw-cached-at");

      if (cachedAt && new Date(cachedAt).getTime() < oneHourAgo) {
        oldPlaylistKeys.push(key);
      }
    }

    if (oldPlaylistKeys.length > 0) {
      await Promise.all(oldPlaylistKeys.map((key) => playlistCache.delete(key)));
      console.log(`🧽 Cleaned up ${oldPlaylistKeys.length} old playlist cache entries`);
    }
  } catch (error) {
    console.error("Cache cleanup failed:", error);
  }
}

// Periodic cache cleanup
setInterval(cleanupCaches, 30 * 60 * 1000); // Every 30 minutes

console.log("🎵 Vibely Service Worker loaded with enhanced playlist caching");
