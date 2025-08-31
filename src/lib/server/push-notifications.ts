import admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin SDK
let initialized = false;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  initialized = true;
} catch (error) {
  console.warn("Failed to initialize Firebase Admin:", error);
}

/**
 * Send a push notification to a specific FCM token
 */
export async function sendPushNotification(
  token: string,
  payload: {
    title: string;
    body: string;
    imageUrl?: string;
    data?: Record<string, string>;
  },
): Promise<boolean> {
  if (!initialized) {
    console.warn("Firebase Admin not initialized, skipping push notification");
    return false;
  }

  try {
    const message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
    };

    await getMessaging().send(message);
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

/**
 * Send push notification for regen completion
 */
export async function sendRegenCompleteNotification(
  token: string,
  playlistName: string,
  playlistId: string,
): Promise<boolean> {
  return sendPushNotification(token, {
    title: "Cover Generation Complete! ✨",
    body: `New AI covers are ready for "${playlistName}"`,
    data: {
      type: "regen_complete",
      playlistId,
      action: "view_playlist",
    },
  });
}

/**
 * Send push notification for regen progress
 */
export async function sendRegenProgressNotification(
  token: string,
  playlistName: string,
  playlistId: string,
  completed: number,
  total: number,
): Promise<boolean> {
  const percentage = Math.round((completed / total) * 100);

  return sendPushNotification(token, {
    title: `Generating Covers (${percentage}%) 🎨`,
    body: `${completed}/${total} covers ready for "${playlistName}"`,
    data: {
      type: "regen_progress",
      playlistId,
      completed: completed.toString(),
      total: total.toString(),
      percentage: percentage.toString(),
      action: "view_progress",
    },
  });
}
