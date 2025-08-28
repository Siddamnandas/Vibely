import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface PushNotificationOptions {
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  timestamp?: number;
}

class PushNotificationService {
  private messaging: Messaging | null = null;
  private isSupported = false;
  private currentToken: string | null = null;
  private permissionStatus: NotificationPermission = 'default';

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Check if push notifications are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this environment');
      return;
    }

    this.isSupported = true;
    this.permissionStatus = Notification.permission;

    // Initialize Firebase if config is available
    if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      try {
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        const app = initializeApp(firebaseConfig);
        this.messaging = getMessaging(app);
        
        // Set up message handling
        this.setupMessageHandling();
      } catch (error) {
        console.error('Failed to initialize Firebase messaging:', error);
      }
    }
  }

  /**
   * Request permission for push notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      
      if (permission === 'granted') {
        console.log('Push notification permission granted');
        await this.getRegistrationToken();
        return true;
      } else {
        console.log('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM registration token
   */
  async getRegistrationToken(): Promise<string | null> {
    if (!this.messaging || this.permissionStatus !== 'granted') {
      return null;
    }

    try {
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      
      this.currentToken = token;
      console.log('FCM Registration Token:', token);
      
      // Send token to server for storage
      await this.sendTokenToServer(token);
      
      return token;
    } catch (error) {
      console.error('Error getting registration token:', error);
      return null;
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(
    payload: NotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<boolean> {
    if (!this.isSupported || this.permissionStatus !== 'granted') {
      console.warn('Cannot show notification: not supported or permission denied');
      return false;
    }

    try {
      // Check if service worker is available for more advanced notifications
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192x192.png',
          image: payload.image,
          badge: payload.badge || '/badge-72x72.png',
          data: payload.data,
          actions: payload.actions,
          requireInteraction: options.requireInteraction,
          silent: options.silent,
          tag: options.tag,
          renotify: options.renotify,
          timestamp: options.timestamp || Date.now(),
        });
      } else {
        // Fallback to basic notification
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192x192.png',
          image: payload.image,
          data: payload.data,
          requireInteraction: options.requireInteraction,
          silent: options.silent,
          tag: options.tag,
          renotify: options.renotify,
          timestamp: options.timestamp || Date.now(),
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  /**
   * Set up foreground message handling
   */
  private setupMessageHandling() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification when app is in foreground
      if (payload.notification) {
        this.showNotification({
          title: payload.notification.title || 'Vibely',
          body: payload.notification.body || '',
          icon: payload.notification.icon,
          image: payload.notification.image,
          data: payload.data,
        });
      }
      
      // Handle custom data
      if (payload.data) {
        this.handleNotificationData(payload.data);
      }
    });
  }

  /**
   * Handle notification click actions
   */
  private handleNotificationData(data: Record<string, any>) {
    // Handle different notification types
    switch (data.type) {
      case 'regen_complete':
        // Navigate to playlist or show regen complete UI
        window.dispatchEvent(new CustomEvent('notification-regen-complete', {
          detail: { playlistId: data.playlistId }
        }));
        break;
      
      case 'new_feature':
        // Show new feature announcement
        window.dispatchEvent(new CustomEvent('notification-new-feature', {
          detail: { feature: data.feature }
        }));
        break;
      
      case 'share_response':
        // Handle share responses
        window.dispatchEvent(new CustomEvent('notification-share-response', {
          detail: { shareId: data.shareId, type: data.responseType }
        }));
        break;
        
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  /**
   * Send registration token to server
   */
  private async sendTokenToServer(token: string) {
    try {
      await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.currentToken) {
      return true;
    }

    try {
      // Inform server about unsubscription
      await fetch('/api/notifications/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: this.currentToken }),
      });
      
      this.currentToken = null;
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }

  /**
   * Check if notifications are supported and granted
   */
  isEnabled(): boolean {
    return this.isSupported && this.permissionStatus === 'granted';
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permissionStatus;
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

// Create singleton instance
export const pushNotificationService = new PushNotificationService();

// Convenience functions for common notification types
export async function notifyRegenComplete(playlistName: string, playlistId: string) {
  return pushNotificationService.showNotification({
    title: 'Cover Generation Complete! ✨',
    body: `New AI covers are ready for \"${playlistName}\"`,
    icon: '/icon-192x192.png',
    data: {
      type: 'regen_complete',
      playlistId,
      action: 'view_playlist'
    },
    actions: [
      {
        action: 'view',
        title: 'View Playlist'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }, {
    requireInteraction: true,
    tag: `regen-${playlistId}`
  });
}

export async function notifyNewFeature(featureName: string, description: string) {
  return pushNotificationService.showNotification({
    title: `New Feature: ${featureName} 🎉`,
    body: description,
    icon: '/icon-192x192.png',
    data: {
      type: 'new_feature',
      feature: featureName
    }
  });
}

export async function notifyShareResponse(trackTitle: string, responseType: 'like' | 'comment' | 'share') {
  const actionText = {
    like: 'liked',
    comment: 'commented on',
    share: 'shared'
  }[responseType];
  
  return pushNotificationService.showNotification({
    title: 'Someone interacted with your track! 🎵',
    body: `Someone ${actionText} \"${trackTitle}\"`,
    icon: '/icon-192x192.png',
    data: {
      type: 'share_response',
      trackTitle,
      responseType
    }
  });
}"