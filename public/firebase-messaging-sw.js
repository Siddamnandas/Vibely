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
      return `${baseUrl}/playlist/${data.playlistId}`;

    case "new_feature":
      return `${baseUrl}/features/${data.feature}`;

    case "share_response":
      return `${baseUrl}/track/${data.trackId}`;

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
