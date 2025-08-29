import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { initializeApp } from "firebase/app";

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
  timestamp?: number;
}

class PushNotificationService {
  private messaging: Messaging | null = null;
  private isSupported = false;
  private currentToken: string | null = null;
  private permissionStatus: NotificationPermission = "default";

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Check if push notifications are supported
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      console.warn("Push notifications are not supported in this environment");
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
        console.error("Failed to initialize Firebase messaging:", error);
      }
    }
  }

  /**
   * Request permission for push notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn("Push notifications not supported");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;

      if (permission === "granted") {
        console.log("Push notification permission granted");
        await this.getRegistrationToken();
        return true;
      } else {
        console.log("Push notification permission denied");
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Get FCM registration token
   */
  async getRegistrationToken(): Promise<string | null> {
    if (!this.messaging || this.permissionStatus !== "granted") {
      return null;
    }

    try {
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      this.currentToken = token;
      console.log("FCM Registration Token:", token);

      // Send token to server for storage
      await this.sendTokenToServer(token);

      return token;
    } catch (error) {
      console.error("Error getting registration token:", error);
      return null;
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(
    payload: NotificationPayload,
    options: PushNotificationOptions = {},
  ): Promise<boolean> {
    if (!this.isSupported || this.permissionStatus !== "granted") {
      console.warn("Cannot show notification: not supported or permission denied");
      return false;
    }

    try {
      // Check if service worker is available for more advanced notifications
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || "/icon-192x192.png",
          data: payload.data,
          requireInteraction: options.requireInteraction,
          silent: options.silent,
          tag: options.tag,
        });
      } else {
        // Use the new Notification API
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || "/icon-192x192.png",
          data: payload.data,
          requireInteraction: options.requireInteraction,
          silent: options.silent,
          tag: options.tag,
        });
      }

      return true;
    } catch (error) {
      console.error("Error showing notification:", error);
      return false;
    }
  }

  /**
   * Set up foreground message handling
   */
  private setupMessageHandling() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log("Foreground message received:", payload);

      // Show notification when app is in foreground
      if (payload.notification) {
        this.showNotification({
          title: payload.notification.title || "Vibely",
          body: payload.notification.body || "",
          icon: payload.notification.icon,
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
      case "regen_complete":
        // Navigate to playlist or show regen complete UI
        window.dispatchEvent(
          new CustomEvent("notification-regen-complete", {
            detail: { playlistId: data.playlistId },
          }),
        );
        break;

      case "regen_started":
        // Show progress indicator or navigate to playlist
        window.dispatchEvent(
          new CustomEvent("notification-regen-started", {
            detail: { playlistId: data.playlistId, totalTracks: data.totalTracks },
          }),
        );
        break;

      case "regen_progress":
        // Update progress indicators
        window.dispatchEvent(
          new CustomEvent("notification-regen-progress", {
            detail: {
              playlistId: data.playlistId,
              completed: data.completed,
              total: data.total,
              percentage: data.percentage,
            },
          }),
        );
        break;

      case "regen_paused":
        // Handle pause action or show resume option
        window.dispatchEvent(
          new CustomEvent("notification-regen-paused", {
            detail: {
              playlistId: data.playlistId,
              completed: data.completed,
              total: data.total,
            },
          }),
        );
        break;

      case "regen_resumed":
        // Handle resume notification
        window.dispatchEvent(
          new CustomEvent("notification-regen-resumed", {
            detail: { playlistId: data.playlistId },
          }),
        );
        break;

      case "regen_canceled":
        // Handle cancellation notification
        window.dispatchEvent(
          new CustomEvent("notification-regen-canceled", {
            detail: {
              playlistId: data.playlistId,
              completed: data.completed,
              total: data.total,
            },
          }),
        );
        break;

      case "new_feature":
        // Show new feature announcement
        window.dispatchEvent(
          new CustomEvent("notification-new-feature", {
            detail: { feature: data.feature },
          }),
        );
        break;

      case "share_response":
        // Handle share responses
        window.dispatchEvent(
          new CustomEvent("notification-share-response", {
            detail: { shareId: data.shareId, type: data.responseType },
          }),
        );
        break;

      default:
        console.log("Unknown notification type:", data.type);
    }
  }

  /**
   * Send registration token to server
   */
  private async sendTokenToServer(token: string) {
    try {
      await fetch("/api/notifications/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error("Error sending token to server:", error);
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
      await fetch("/api/notifications/unregister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: this.currentToken }),
      });

      this.currentToken = null;
      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      return false;
    }
  }

  /**
   * Check if notifications are supported and granted
   */
  isEnabled(): boolean {
    return this.isSupported && this.permissionStatus === "granted";
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
  return pushNotificationService.showNotification(
    {
      title: "Cover Generation Complete! ✨",
      body: `New AI covers are ready for \"${playlistName}\"`,
      icon: "/icon-192x192.png",
      data: {
        type: "regen_complete",
        playlistId,
        action: "view_playlist",
      },
      actions: [
        {
          action: "view",
          title: "View Playlist",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    },
    {
      requireInteraction: true,
      tag: `regen-${playlistId}`,
    },
  );
}

// New regeneration progress notification functions
export async function notifyRegenStarted(
  playlistName: string,
  playlistId: string,
  totalTracks: number,
) {
  return pushNotificationService.showNotification(
    {
      title: "Generating Album Covers 🎨",
      body: `Started generating ${totalTracks} covers for \"${playlistName}\"`,
      icon: "/icon-192x192.png",
      data: {
        type: "regen_started",
        playlistId,
        totalTracks,
        action: "view_progress",
      },
    },
    {
      silent: true,
      tag: `regen-progress-${playlistId}`,
    },
  );
}

export async function notifyRegenProgress(
  playlistName: string,
  playlistId: string,
  completed: number,
  total: number,
  milestone?: boolean,
) {
  const percentage = Math.round((completed / total) * 100);

  // Only send notifications for milestone percentages or when specifically requested
  if (!milestone && ![25, 50, 75].includes(percentage)) {
    return false;
  }

  return pushNotificationService.showNotification(
    {
      title: `Generating Covers (${percentage}%) 🎨`,
      body: `${completed}/${total} covers ready for \"${playlistName}\"`,
      icon: "/icon-192x192.png",
      data: {
        type: "regen_progress",
        playlistId,
        completed,
        total,
        percentage,
        action: "view_progress",
      },
      actions: [
        {
          action: "view",
          title: "View Progress",
        },
        {
          action: "pause",
          title: "Pause",
        },
      ],
    },
    {
      tag: `regen-progress-${playlistId}`,
    },
  );
}

export async function notifyRegenPaused(
  playlistName: string,
  playlistId: string,
  completed: number,
  total: number,
) {
  return pushNotificationService.showNotification(
    {
      title: "Generation Paused ⏸️",
      body: `${completed}/${total} covers completed for \"${playlistName}\"`,
      icon: "/icon-192x192.png",
      data: {
        type: "regen_paused",
        playlistId,
        completed,
        total,
        action: "resume",
      },
      actions: [
        {
          action: "resume",
          title: "Resume",
        },
        {
          action: "view",
          title: "View Playlist",
        },
      ],
    },
    {
      requireInteraction: true,
      tag: `regen-paused-${playlistId}`,
    },
  );
}

export async function notifyRegenResumed(playlistName: string, playlistId: string) {
  return pushNotificationService.showNotification(
    {
      title: "Generation Resumed 🎨",
      body: `Continuing cover generation for \"${playlistName}\"`,
      icon: "/icon-192x192.png",
      data: {
        type: "regen_resumed",
        playlistId,
        action: "view_progress",
      },
    },
    {
      silent: true,
      tag: `regen-progress-${playlistId}`,
    },
  );
}

export async function notifyRegenCanceled(
  playlistName: string,
  playlistId: string,
  completed: number,
  total: number,
) {
  return pushNotificationService.showNotification(
    {
      title: "Generation Canceled 🚫",
      body: `${completed}/${total} covers were completed for \"${playlistName}\"`,
      icon: "/icon-192x192.png",
      data: {
        type: "regen_canceled",
        playlistId,
        completed,
        total,
        action: "view_playlist",
      },
    },
    {
      tag: `regen-canceled-${playlistId}`,
    },
  );
}

// Playlist update notification functions
export async function notifyPlaylistCreated(
  playlistName: string,
  playlistId: string,
  trackCount: number,
) {
  return pushNotificationService.showNotification(
    {
      title: "New Playlist Created 🎵",
      body: `"${playlistName}" created with ${trackCount} songs`,
      icon: "/icon-192x192.png",
      data: {
        type: "playlist_created",
        playlistId,
        trackCount,
        action: "view_playlist",
      },
      actions: [
        {
          action: "view",
          title: "View Playlist",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    },
    {
      tag: `playlist-created-${playlistId}`,
    },
  );
}

export async function notifyPlaylistUpdated(
  playlistName: string,
  playlistId: string,
  changeType: string,
  changeCount: number,
) {
  const getUpdateMessage = (type: string, count: number) => {
    switch (type) {
      case "songs_added":
        return `${count} song${count !== 1 ? "s" : ""} added to "${playlistName}"`;
      case "songs_removed":
        return `${count} song${count !== 1 ? "s" : ""} removed from "${playlistName}"`;
      case "songs_reordered":
        return `Songs reordered in "${playlistName}"`;
      case "metadata_updated":
        return `"${playlistName}" details updated`;
      default:
        return `"${playlistName}" updated`;
    }
  };

  return pushNotificationService.showNotification(
    {
      title: "Playlist Updated 📝",
      body: getUpdateMessage(changeType, changeCount),
      icon: "/icon-192x192.png",
      data: {
        type: "playlist_updated",
        playlistId,
        changeType,
        changeCount,
        action: "view_playlist",
      },
      actions: [
        {
          action: "view",
          title: "View Changes",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    },
    {
      tag: `playlist-updated-${playlistId}`,
    },
  );
}

export async function notifyPlaylistShared(
  playlistName: string,
  playlistId: string,
  sharedBy: string,
) {
  return pushNotificationService.showNotification(
    {
      title: "Playlist Shared 🤝",
      body: `${sharedBy} shared "${playlistName}" with you`,
      icon: "/icon-192x192.png",
      data: {
        type: "playlist_shared",
        playlistId,
        sharedBy,
        action: "view_playlist",
      },
      actions: [
        {
          action: "view",
          title: "View Playlist",
        },
        {
          action: "add",
          title: "Add to Library",
        },
      ],
    },
    {
      requireInteraction: true,
      tag: `playlist-shared-${playlistId}`,
    },
  );
}

export async function notifyPlaylistDeleted(playlistName: string, playlistId: string) {
  return pushNotificationService.showNotification(
    {
      title: "Playlist Deleted 🗑️",
      body: `"${playlistName}" has been deleted`,
      icon: "/icon-192x192.png",
      data: {
        type: "playlist_deleted",
        playlistId,
        playlistName,
        action: "view_library",
      },
      actions: [
        {
          action: "undo",
          title: "Undo Delete",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    },
    {
      requireInteraction: true,
      tag: `playlist-deleted-${playlistId}`,
    },
  );
}

export async function notifyNewMusicAdded(
  artistName: string,
  songTitle: string,
  playlistName?: string,
) {
  const body = playlistName
    ? `New song "${songTitle}" by ${artistName} added to "${playlistName}"`
    : `New song "${songTitle}" by ${artistName} available`;

  return pushNotificationService.showNotification(
    {
      title: "New Music Added 🎶",
      body,
      icon: "/icon-192x192.png",
      data: {
        type: "new_music",
        artistName,
        songTitle,
        playlistName,
        action: playlistName ? "view_playlist" : "view_library",
      },
      actions: [
        {
          action: "play",
          title: "Play Now",
        },
        {
          action: "view",
          title: playlistName ? "View Playlist" : "View Library",
        },
      ],
    },
    {
      tag: `new-music-${Date.now()}`,
    },
  );
}

export async function notifyNewFeature(featureName: string, description: string) {
  return pushNotificationService.showNotification({
    title: `New Feature: ${featureName} 🎉`,
    body: description,
    icon: "/icon-192x192.png",
    data: {
      type: "new_feature",
      feature: featureName,
    },
  });
}

export async function notifyShareResponse(
  trackTitle: string,
  responseType: "like" | "comment" | "share",
) {
  const actionText = {
    like: "liked",
    comment: "commented on",
    share: "shared",
  }[responseType];

  return pushNotificationService.showNotification({
    title: "Someone interacted with your track! 🎵",
    body: `Someone ${actionText} \"${trackTitle}\"`,
    icon: "/icon-192x192.png",
    data: {
      type: "share_response",
      trackTitle,
      responseType,
    },
  });
}
