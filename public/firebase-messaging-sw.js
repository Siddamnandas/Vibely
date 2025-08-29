// Firebase messaging service worker
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Initialize Firebase
firebase.initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const notificationTitle = payload.notification?.title || "Vibely";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: payload.notification?.icon || "/icon-192x192.png",
    image: payload.notification?.image,
    badge: "/badge-72x72.png",
    data: payload.data,
    actions: getNotificationActions(payload.data?.type),
    requireInteraction: true,
    tag: payload.data?.tag || "vibely-notification",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  // Handle different actions
  if (action === "view" || !action) {
    // Default action or 'view' action
    const urlToOpen = getUrlForNotification(data);

    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
    );
  } else if (action === "dismiss") {
    // Just close the notification (already handled above)
    return;
  } else if (action === "undo") {
    // Handle undo delete action
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        if (clientList.length > 0) {
          // Send message to the app to handle undo
          clientList[0].postMessage({
            type: "undo_playlist_delete",
            playlistId: data.playlistId,
            playlistName: data.playlistName,
          });
          return clientList[0].focus();
        }
        return clients.openWindow(`${self.location.origin}/library`);
      })
    );
  } else if (action === "add") {
    // Handle add to library action
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        if (clientList.length > 0) {
          // Send message to the app to handle add to library
          clientList[0].postMessage({
            type: "add_playlist_to_library",
            playlistId: data.playlistId,
            sharedBy: data.sharedBy,
          });
          return clientList[0].focus();
        }
        return clients.openWindow(getUrlForNotification(data));
      })
    );
  } else if (action === "play") {
    // Handle play now action
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        if (clientList.length > 0) {
          // Send message to the app to handle play
          clientList[0].postMessage({
            type: "play_new_music",
            artistName: data.artistName,
            songTitle: data.songTitle,
            playlistName: data.playlistName,
          });
          return clientList[0].focus();
        }
        return clients.openWindow(getUrlForNotification(data));
      })
    );
  } else if (action === "pause" || action === "resume") {
    // Handle pause/resume actions for regeneration
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        if (clientList.length > 0) {
          // Send message to the app to handle pause/resume
          clientList[0].postMessage({
            type: action === "pause" ? "pause_regeneration" : "resume_regeneration",
            playlistId: data.playlistId,
          });
          return clientList[0].focus();
        }
        return clients.openWindow(getUrlForNotification(data));
      })
    );
  }
});

// Helper function to get notification actions based on type
function getNotificationActions(type) {
  switch (type) {
    case "regen_complete":
      return [
        {
          action: "view",
          title: "View Playlist",
          icon: "/icons/view.png",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "regen_started":
      return [
        {
          action: "view",
          title: "View Progress",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "regen_progress":
      return [
        {
          action: "view",
          title: "View Progress",
        },
        {
          action: "pause",
          title: "Pause",
        },
      ];

    case "regen_paused":
      return [
        {
          action: "resume",
          title: "Resume",
        },
        {
          action: "view",
          title: "View Playlist",
        },
      ];

    case "regen_resumed":
      return [
        {
          action: "view",
          title: "View Progress",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "regen_canceled":
      return [
        {
          action: "view",
          title: "View Playlist",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "new_feature":
      return [
        {
          action: "view",
          title: "Learn More",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "share_response":
      return [
        {
          action: "view",
          title: "View Track",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "playlist_created":
      return [
        {
          action: "view",
          title: "View Playlist",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "playlist_updated":
      return [
        {
          action: "view",
          title: "View Changes",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "playlist_shared":
      return [
        {
          action: "view",
          title: "View Playlist",
        },
        {
          action: "add",
          title: "Add to Library",
        },
      ];

    case "playlist_deleted":
      return [
        {
          action: "undo",
          title: "Undo Delete",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];

    case "new_music":
      return [
        {
          action: "play",
          title: "Play Now",
        },
        {
          action: "view",
          title: "View",
        },
      ];

    default:
      return [
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ];
  }
}

// Helper function to get URL based on notification data
function getUrlForNotification(data) {
  const baseUrl = self.location.origin;

  switch (data?.type) {
    case "regen_complete":
    case "regen_started":
    case "regen_progress":
    case "regen_paused":
    case "regen_resumed":
    case "regen_canceled":
      return `${baseUrl}/playlist/${data.playlistId}`;

    case "new_feature":
      return `${baseUrl}/features/${data.feature}`;

    case "share_response":
      return `${baseUrl}/track/${data.trackId}`;

    case "playlist_created":
    case "playlist_updated":
    case "playlist_shared":
    case "playlist_deleted":
      return `${baseUrl}/playlist/${data.playlistId}`;

    case "new_music":
      if (data.playlistName) {
        return `${baseUrl}/playlist/${data.playlistId || 'library'}`;
      }
      return `${baseUrl}/library`;

    default:
      return baseUrl;
  }
}

// Handle push subscription changes
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("Push subscription changed:", event);

  event.waitUntil(
    // Re-subscribe the user
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      })
      .then((subscription) => {
        // Send new subscription to server
        return fetch("/api/notifications/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: subscription.endpoint,
          }),
        });
      }),
  );
});
