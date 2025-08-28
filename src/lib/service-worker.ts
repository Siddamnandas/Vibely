/**
 * Service Worker Registration for Vibely App
 * Handles SW registration, updates, and client-side integration
 */

import React from 'react';

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isUpdateAvailable = false;
  private callbacks: ServiceWorkerConfig = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupMessageListener();
    }
  }

  async register(config: ServiceWorkerConfig = {}): Promise<boolean> {
    this.callbacks = config;

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return false;
    }

    if (process.env.NODE_ENV === 'development') {
      // Unregister service worker in development
      await this.unregister();
      return false;
    }

    try {
      console.log('🔧 Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.registration = registration;

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New update available
              this.isUpdateAvailable = true;
              this.callbacks.onUpdate?.(registration);
              this.showUpdateNotification();
            } else {
              // First install
              this.callbacks.onSuccess?.(registration);
              this.callbacks.onOfflineReady?.();
            }
          }
        });
      });

      // Check for existing updates
      if (registration.waiting) {
        this.isUpdateAvailable = true;
        this.callbacks.onUpdate?.(registration);
      }

      console.log('✅ Service Worker registered successfully');
      return true;

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  async unregister(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterPromises = registrations.map(registration => 
        registration.unregister()
      );
      
      await Promise.all(unregisterPromises);
      console.log('🗑️ Service Worker unregistered');
      return true;
    } catch (error) {
      console.error('Failed to unregister service worker:', error);
      return false;
    }
  }

  async updateServiceWorker(): Promise<boolean> {
    if (!this.registration) {
      console.warn('No service worker registration found');
      return false;
    }

    try {
      await this.registration.update();
      
      if (this.registration.waiting) {
        // Tell the waiting service worker to skip waiting
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to update service worker:', error);
      return false;
    }
  }

  forceUpdate(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  private setupMessageListener(): void {
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { data } = event;
      
      switch (data.type) {
        case 'NOTIFICATION_CLICK':
          this.handleNotificationClick(data.action, data.data);
          break;
        case 'CACHE_UPDATED':
          console.log('📦 Cache updated:', data.cacheName);
          break;
        case 'OFFLINE_FALLBACK':
          console.log('📱 Serving offline fallback for:', data.url);
          break;
      }
    });

    // Listen for controller changes (SW updates)
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      window.location.reload();
    });
  }

  private handleNotificationClick(action: string, data: any): void {
    switch (action) {
      case 'open-app':
        // Handle opening the app from notification
        break;
      case 'view-story':
        // Handle viewing a specific story
        if (data.storyId) {
          window.location.href = `/stories/${data.storyId}`;
        }
        break;
      default:
        console.log('Unknown notification action:', action);
    }
  }

  private showUpdateNotification(): void {
    // Show a subtle notification about app update
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full';
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="flex-1">
          <p class="font-medium">App Update Available</p>
          <p class="text-sm opacity-90">Tap to reload and get the latest features</p>
        </div>
        <button class="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition-colors" onclick="this.parentElement.parentElement.remove()">
          Later
        </button>
        <button class="bg-white text-primary-foreground px-3 py-1 rounded text-sm font-medium hover:bg-white/90 transition-colors" onclick="vibelyServiceWorker.forceUpdate()">
          Update
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 10000);
  }

  // Cache management methods
  async getCacheStatus(): Promise<{
    staticSize: number;
    dynamicSize: number;
    imageSize: number;
    totalSize: number;
  }> {
    if (!('caches' in window)) {
      return { staticSize: 0, dynamicSize: 0, imageSize: 0, totalSize: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      const sizes = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const responses = await cache.keys();
          let size = 0;

          for (const response of responses) {
            try {
              const res = await cache.match(response);
              if (res) {
                const blob = await res.blob();
                size += blob.size;
              }
            } catch (error) {
              // Ignore errors for individual cache entries
            }
          }

          return { name, size };
        })
      );

      const staticSize = sizes.find(s => s.name.includes('static'))?.size || 0;
      const dynamicSize = sizes.find(s => s.name.includes('dynamic'))?.size || 0;
      const imageSize = sizes.find(s => s.name.includes('image'))?.size || 0;
      const totalSize = sizes.reduce((sum, s) => sum + s.size, 0);

      return { staticSize, dynamicSize, imageSize, totalSize };
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return { staticSize: 0, dynamicSize: 0, imageSize: 0, totalSize: 0 };
    }
  }

  async clearCache(): Promise<boolean> {
    if (!('caches' in window)) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('vibely-'))
          .map(name => caches.delete(name))
      );
      
      console.log('🗑️ All caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }

  // Offline detection
  getNetworkStatus(): 'online' | 'offline' | 'slow' {
    if (!navigator.onLine) return 'offline';

    // Check connection quality
    const connection = (navigator as any).connection;
    if (connection) {
      const { effectiveType, downlink } = connection;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
        return 'slow';
      }
    }

    return 'online';
  }

  // Background sync
  async requestBackgroundSync(tag: string): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    // Check if background sync is supported
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      return false;
    }

    try {
      // Type assertion for sync property
      const registration = this.registration as any;
      await registration.sync.register(tag);
      console.log(`🔄 Background sync requested: ${tag}`);
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }
}

// Global instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register on app load
export function initServiceWorker(config?: ServiceWorkerConfig): Promise<boolean> {
  return serviceWorkerManager.register({
    onSuccess: (registration) => {
      console.log('✅ Vibely is ready to work offline');
      config?.onSuccess?.(registration);
    },
    onUpdate: (registration) => {
      console.log('🔄 New app version available');
      config?.onUpdate?.(registration);
    },
    onOfflineReady: () => {
      console.log('📱 Vibely is ready for offline use');
      config?.onOfflineReady?.();
    }
  });
}

// React hook for service worker integration
export function useServiceWorker() {
  const [isOffline, setIsOffline] = React.useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = React.useState(false);
  const [cacheSize, setCacheSize] = React.useState(0);

  React.useEffect(() => {
    // Initialize service worker
    initServiceWorker({
      onUpdate: () => setIsUpdateAvailable(true),
    });

    // Monitor network status
    const updateNetworkStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    // Get cache size
    serviceWorkerManager.getCacheStatus().then(status => {
      setCacheSize(status.totalSize);
    });

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  return {
    isOffline,
    isUpdateAvailable,
    cacheSize,
    updateApp: () => serviceWorkerManager.forceUpdate(),
    clearCache: () => serviceWorkerManager.clearCache(),
    networkStatus: serviceWorkerManager.getNetworkStatus()
  };
}

// Make service worker globally available
if (typeof window !== 'undefined') {
  (window as any).vibelyServiceWorker = serviceWorkerManager;
}