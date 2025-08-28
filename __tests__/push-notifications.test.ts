/**
 * @jest-environment jsdom
 */

import { pushNotificationService, notifyRegenComplete } from "@/lib/push-notifications";

// Mock Firebase messaging
const mockGetMessaging = jest.fn();
const mockGetToken = jest.fn();
const mockOnMessage = jest.fn();
const mockDeleteToken = jest.fn();

const mockMessaging = {
  getToken: mockGetToken,
  onMessage: mockOnMessage,
  deleteToken: mockDeleteToken,
};

// Mock service worker registration
const mockServiceWorkerRegistration = {
  showNotification: jest.fn().mockResolvedValue(undefined),
  getNotifications: jest.fn().mockResolvedValue([]),
  pushManager: {
    subscribe: jest.fn(),
    getSubscription: jest.fn(),
  },
};

// Mock Firebase app
jest.mock("firebase/messaging", () => ({
  getMessaging: mockGetMessaging,
  getToken: mockGetToken,
  onMessage: mockOnMessage,
  deleteToken: mockDeleteToken,
  isSupported: jest.fn().mockResolvedValue(true),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn().mockReturnValue({}),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe("Push Notifications Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetMessaging.mockReturnValue(mockMessaging);

    // Mock service worker
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: jest.fn().mockResolvedValue(mockServiceWorkerRegistration),
        ready: Promise.resolve(mockServiceWorkerRegistration),
        getRegistration: jest.fn().mockResolvedValue(mockServiceWorkerRegistration),
      },
      writable: true,
      configurable: true,
    });

    // Mock Notification API
    global.Notification = {
      permission: "default",
      requestPermission: jest.fn().mockResolvedValue("granted"),
    } as any;

    Object.defineProperty(window, "Notification", {
      value: global.Notification,
      writable: true,
      configurable: true,
    });
  });

  it("should initialize Firebase messaging correctly", async () => {
    mockGetToken.mockResolvedValue("test-fcm-token");

    const success = await pushNotificationService.initialize();

    expect(success).toBe(true);
    expect(mockGetMessaging).toHaveBeenCalled();
  });

  it("should request notification permission", async () => {
    mockGetToken.mockResolvedValue("test-fcm-token");

    const granted = await pushNotificationService.requestPermission();

    expect(granted).toBe(true);
    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  it("should register FCM token with server", async () => {
    mockGetToken.mockResolvedValue("test-fcm-token");

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await pushNotificationService.initialize();
    const token = await pushNotificationService.getToken();

    expect(token).toBe("test-fcm-token");
    expect(fetch).toHaveBeenCalledWith("/api/notifications/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "test-fcm-token" }),
    });
  });

  it("should show local notification", async () => {
    mockGetToken.mockResolvedValue("test-token");
    await pushNotificationService.initialize();

    const success = await pushNotificationService.showNotification({
      title: "Test Notification",
      body: "This is a test",
      icon: "/icon-192x192.png",
      data: { type: "test" },
    });

    expect(success).toBe(true);
    expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
      "Test Notification",
      {
        body: "This is a test",
        icon: "/icon-192x192.png",
        data: { type: "test" },
        badge: "/icon-192x192.png",
        requireInteraction: false,
        silent: false,
      },
    );
  });

  it("should handle foreground messages", async () => {
    mockGetToken.mockResolvedValue("test-token");
    let messageHandler: ((payload: any) => void) | null = null;

    mockOnMessage.mockImplementation((messaging, handler) => {
      messageHandler = handler;
    });

    await pushNotificationService.initialize();

    // Simulate receiving a foreground message
    const testMessage = {
      notification: {
        title: "New Cover Ready!",
        body: "Your AI cover is complete",
        icon: "/icon-192x192.png",
      },
      data: {
        type: "cover_ready",
        trackId: "track-123",
      },
    };

    if (messageHandler) {
      messageHandler(testMessage);
    }

    expect(mockOnMessage).toHaveBeenCalled();
  });

  it("should send regen complete notification", async () => {
    mockGetToken.mockResolvedValue("test-token");
    await pushNotificationService.initialize();

    const success = await notifyRegenComplete("My Playlist", "playlist-123");

    expect(success).toBe(true);
    expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
      "Cover Generation Complete! ✨",
      expect.objectContaining({
        body: 'New AI covers are ready for "My Playlist"',
        data: {
          type: "regen_complete",
          playlistId: "playlist-123",
          action: "view_playlist",
        },
      }),
    );
  });

  it("should unsubscribe from notifications", async () => {
    mockGetToken.mockResolvedValue("test-token");
    mockDeleteToken.mockResolvedValue(true);

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await pushNotificationService.initialize();
    const success = await pushNotificationService.unsubscribe();

    expect(success).toBe(true);
    expect(mockDeleteToken).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/api/notifications/unregister", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "test-token" }),
    });
  });

  it("should handle notification permission denied", async () => {
    global.Notification.requestPermission = jest.fn().mockResolvedValue("denied");

    const granted = await pushNotificationService.requestPermission();

    expect(granted).toBe(false);
    expect(pushNotificationService.getPermissionStatus()).toBe("denied");
  });

  it("should handle FCM token retrieval failure", async () => {
    mockGetToken.mockRejectedValue(new Error("Token retrieval failed"));

    const success = await pushNotificationService.initialize();

    expect(success).toBe(false);
  });

  it("should check if notifications are enabled", async () => {
    mockGetToken.mockResolvedValue("test-token");
    global.Notification.permission = "granted";

    await pushNotificationService.initialize();

    expect(pushNotificationService.isEnabled()).toBe(true);
  });

  it("should handle service worker registration failure", async () => {
    // Mock service worker registration failure
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: jest.fn().mockRejectedValue(new Error("SW registration failed")),
        ready: Promise.reject(new Error("SW not ready")),
        getRegistration: jest.fn().mockResolvedValue(null),
      },
      writable: true,
      configurable: true,
    });

    const success = await pushNotificationService.initialize();

    expect(success).toBe(false);
  });

  it("should validate notification data", () => {
    const validNotification = {
      title: "Test",
      body: "Test body",
      icon: "/icon.png",
    };

    const isValid = pushNotificationService.validateNotificationData(validNotification);
    expect(isValid).toBe(true);

    const invalidNotification = {
      body: "Missing title",
    };

    const isInvalid = pushNotificationService.validateNotificationData(invalidNotification as any);
    expect(isInvalid).toBe(false);
  });
});
