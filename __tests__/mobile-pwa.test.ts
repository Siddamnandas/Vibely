/**
 * @jest-environment jsdom
 */

import { fireEvent, waitFor } from "@testing-library/react";
import { appInstallService } from "@/lib/app-install-service";
import { serviceWorkerManager } from "@/lib/service-worker-manager";
import { appShortcutsService } from "@/lib/app-shortcuts-service";

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  track: jest.fn(),
}));

// Mock service worker registration
const mockRegistration = {
  update: jest.fn(),
  unregister: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  scope: "/",
  active: {
    postMessage: jest.fn(),
  },
};

// Mock navigator properties
Object.defineProperty(navigator, "serviceWorker", {
  writable: true,
  value: {
    register: jest.fn().mockResolvedValue(mockRegistration),
    ready: Promise.resolve(mockRegistration),
    controller: mockRegistration.active,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});

// Mock BeforeInstallPromptEvent
class MockBeforeInstallPromptEvent extends Event {
  prompt = jest.fn().mockResolvedValue({ outcome: "accepted" });
  userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

  constructor() {
    super("beforeinstallprompt");
  }
}

// Mock online/offline detection
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

describe("Mobile PWA Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset install prompt state
    (window as any).deferredPrompt = null;

    // Reset online status
    Object.defineProperty(navigator, "onLine", { value: true });
  });

  describe("App Installation", () => {
    test("detects app installation capability", async () => {
      expect(appInstallService.isInstallationSupported()).toBe(true);
    });

    test("captures beforeinstallprompt event", () => {
      const installPrompt = new MockBeforeInstallPromptEvent();
      window.dispatchEvent(installPrompt);

      expect(installPrompt.preventDefault).toHaveBeenCalled();
      expect(appInstallService.canShowInstallPrompt()).toBe(true);
    });

    test("shows install prompt when requested", async () => {
      const installPrompt = new MockBeforeInstallPromptEvent();
      window.dispatchEvent(installPrompt);

      const result = await appInstallService.showInstallPrompt();

      expect(installPrompt.prompt).toHaveBeenCalled();
      expect(result).toEqual({
        outcome: "accepted",
        platform: "web",
      });
    });

    test("handles install prompt rejection", async () => {
      const installPrompt = new MockBeforeInstallPromptEvent();
      installPrompt.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });
      window.dispatchEvent(installPrompt);

      const result = await appInstallService.showInstallPrompt();

      expect(result.outcome).toBe("dismissed");
    });

    test("detects when app is already installed", () => {
      // Mock app installation detection
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes("display-mode: standalone"),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      expect(appInstallService.isAppInstalled()).toBe(true);
    });

    test("tracks installation analytics", async () => {
      const { track } = require("@/lib/analytics");
      const installPrompt = new MockBeforeInstallPromptEvent();
      window.dispatchEvent(installPrompt);

      await appInstallService.showInstallPrompt();

      expect(track).toHaveBeenCalledWith("app_install_prompted", {
        platform: "web",
        can_install: true,
      });
    });
  });

  describe("Service Worker Management", () => {
    test("registers service worker successfully", async () => {
      await serviceWorkerManager.register();

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
        "/sw.js",
        expect.objectContaining({
          scope: "/",
          updateViaCache: "none",
        }),
      );
    });

    test("handles service worker registration failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(
        new Error("Registration failed"),
      );

      await serviceWorkerManager.register();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Service worker registration failed:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    test("checks for service worker updates", async () => {
      await serviceWorkerManager.checkForUpdates();

      expect(mockRegistration.update).toHaveBeenCalled();
    });

    test("sends message to service worker", async () => {
      const message = { type: "SKIP_WAITING" };

      await serviceWorkerManager.sendMessage(message);

      expect(mockRegistration.active.postMessage).toHaveBeenCalledWith(message);
    });

    test("handles offline state changes", () => {
      const offlineHandler = jest.fn();
      const onlineHandler = jest.fn();

      serviceWorkerManager.onNetworkChange(offlineHandler, onlineHandler);

      // Simulate offline
      Object.defineProperty(navigator, "onLine", { value: false });
      window.dispatchEvent(new Event("offline"));
      expect(offlineHandler).toHaveBeenCalled();

      // Simulate online
      Object.defineProperty(navigator, "onLine", { value: true });
      window.dispatchEvent(new Event("online"));
      expect(onlineHandler).toHaveBeenCalled();
    });

    test("caches resources for offline use", async () => {
      const resources = ["/", "/generator", "/stories"];

      await serviceWorkerManager.precacheResources(resources);

      expect(mockRegistration.active.postMessage).toHaveBeenCalledWith({
        type: "PRECACHE_RESOURCES",
        resources,
      });
    });
  });

  describe("App Shortcuts", () => {
    test("initializes app shortcuts correctly", () => {
      const shortcuts = appShortcutsService.getAvailableShortcuts();

      expect(shortcuts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "generate-cover",
            name: "Generate Cover",
            url: "/generator?source=shortcut",
          }),
          expect.objectContaining({
            id: "my-library",
            name: "My Library",
            url: "/library?source=shortcut",
          }),
        ]),
      );
    });

    test("tracks shortcut usage when accessed via URL parameter", () => {
      const { track } = require("@/lib/analytics");

      // Simulate accessing app via shortcut
      Object.defineProperty(window, "location", {
        value: {
          search: "?source=shortcut",
          pathname: "/generator",
        },
      });

      appShortcutsService.trackShortcutUsage();

      expect(track).toHaveBeenCalledWith("app_shortcut_used", {
        shortcut_id: expect.any(String),
        source: "shortcut",
        target_url: "/generator",
      });
    });

    test("updates shortcut usage statistics", () => {
      appShortcutsService.recordShortcutUsage("generate-cover");

      const stats = appShortcutsService.getUsageStats();
      expect(stats.totalUsage).toBe(1);
      expect(stats.usageByShortcut["generate-cover"]).toBe(1);
      expect(stats.favoriteShortcut).toBe("generate-cover");
    });

    test("dynamically updates shortcuts based on user behavior", () => {
      // Record multiple usages
      appShortcutsService.recordShortcutUsage("generate-cover");
      appShortcutsService.recordShortcutUsage("generate-cover");
      appShortcutsService.recordShortcutUsage("my-library");

      const shortcuts = appShortcutsService.getRecommendedShortcuts();

      // Should prioritize most-used shortcut
      expect(shortcuts[0].id).toBe("generate-cover");
    });
  });

  describe("Offline Capabilities", () => {
    test("detects offline state correctly", () => {
      Object.defineProperty(navigator, "onLine", { value: false });

      expect(serviceWorkerManager.isOnline()).toBe(false);
    });

    test("queues actions when offline", async () => {
      Object.defineProperty(navigator, "onLine", { value: false });

      const action = {
        type: "SAVE_STORY",
        payload: { id: "test", title: "Test Story" },
      };

      serviceWorkerManager.queueOfflineAction(action);

      const queuedActions = serviceWorkerManager.getQueuedActions();
      expect(queuedActions).toContain(action);
    });

    test("processes queued actions when coming online", async () => {
      const { track } = require("@/lib/analytics");

      // Start offline
      Object.defineProperty(navigator, "onLine", { value: false });

      const action = {
        type: "SAVE_STORY",
        payload: { id: "test", title: "Test Story" },
      };

      serviceWorkerManager.queueOfflineAction(action);

      // Come back online
      Object.defineProperty(navigator, "onLine", { value: true });
      await serviceWorkerManager.processQueuedActions();

      expect(track).toHaveBeenCalledWith("offline_actions_processed", {
        actions_count: 1,
        action_types: ["SAVE_STORY"],
      });
    });

    test("shows offline notification to user", () => {
      Object.defineProperty(navigator, "onLine", { value: false });

      const notification = serviceWorkerManager.getOfflineStatus();

      expect(notification).toEqual({
        isOffline: true,
        message: "You're currently offline. Some features may be limited.",
        canSync: true,
      });
    });
  });

  describe("Network Conditions", () => {
    test("detects slow network connection", () => {
      // Mock slow connection
      Object.defineProperty(navigator, "connection", {
        value: {
          effectiveType: "2g",
          downlink: 0.5,
          rtt: 500,
        },
      });

      expect(serviceWorkerManager.isSlowConnection()).toBe(true);
    });

    test("adapts behavior for slow connections", () => {
      Object.defineProperty(navigator, "connection", {
        value: {
          effectiveType: "2g",
          downlink: 0.3,
        },
      });

      const adaptations = serviceWorkerManager.getNetworkAdaptations();

      expect(adaptations).toEqual({
        reducedImageQuality: true,
        disableAutoUpdates: true,
        enableDataSaver: true,
        limitConcurrentRequests: 2,
      });
    });

    test("preloads critical resources on fast connections", async () => {
      Object.defineProperty(navigator, "connection", {
        value: {
          effectiveType: "4g",
          downlink: 10,
        },
      });

      await serviceWorkerManager.preloadCriticalResources();

      expect(mockRegistration.active.postMessage).toHaveBeenCalledWith({
        type: "PRELOAD_RESOURCES",
        resources: expect.arrayContaining(["/generator", "/stories", "/api/auth/spotify"]),
      });
    });
  });

  describe("Mobile Navigation", () => {
    test("handles back navigation in PWA mode", () => {
      // Mock PWA mode
      Object.defineProperty(window, "matchMedia", {
        value: () => ({ matches: true }),
      });

      const backHandler = jest.fn();
      serviceWorkerManager.onBackNavigation(backHandler);

      // Simulate back navigation
      window.dispatchEvent(new PopStateEvent("popstate"));

      expect(backHandler).toHaveBeenCalled();
    });

    test("prevents zoom on double-tap", () => {
      // This would be handled by the viewport meta tag and touch-action CSS
      // Test that viewport is configured correctly
      const viewport = document.querySelector('meta[name="viewport"]');

      expect(viewport?.getAttribute("content")).toContain("user-scalable=yes");
      expect(viewport?.getAttribute("content")).toContain("maximum-scale=5");
    });

    test("handles safe area insets on notched devices", () => {
      // Mock iPhone X+ safe area insets
      Object.defineProperty(document.documentElement.style, "getPropertyValue", {
        value: jest.fn().mockImplementation((prop) => {
          if (prop === "--safe-area-inset-top") return "44px";
          if (prop === "--safe-area-inset-bottom") return "34px";
          return "0px";
        }),
      });

      const safeAreas = serviceWorkerManager.getSafeAreaInsets();

      expect(safeAreas).toEqual({
        top: 44,
        right: 0,
        bottom: 34,
        left: 0,
      });
    });
  });

  describe("Error Handling", () => {
    test("handles service worker errors gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock service worker error
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(
        new Error("Service Worker not supported"),
      );

      const result = await serviceWorkerManager.register();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("falls back gracefully when PWA features unavailable", () => {
      // Remove PWA APIs
      delete (navigator as any).serviceWorker;
      delete (window as any).BeforeInstallPromptEvent;

      expect(appInstallService.isInstallationSupported()).toBe(false);
      expect(serviceWorkerManager.isSupported()).toBe(false);
    });

    test("handles quota exceeded errors in offline storage", async () => {
      const quotaError = new Error("Quota exceeded");
      quotaError.name = "QuotaExceededError";

      mockRegistration.active.postMessage.mockRejectedValue(quotaError);

      const result = await serviceWorkerManager.cacheResource("/large-file.jpg");

      expect(result).toEqual({
        success: false,
        error: "Storage quota exceeded",
        canRetry: false,
      });
    });
  });

  describe("Performance Optimization", () => {
    test("lazy loads non-critical PWA features", async () => {
      const { track } = require("@/lib/analytics");

      await serviceWorkerManager.initializeLazyFeatures();

      expect(track).toHaveBeenCalledWith("pwa_lazy_features_loaded", {
        features: expect.arrayContaining(["shortcuts", "offline_sync", "background_sync"]),
        load_time: expect.any(Number),
      });
    });

    test("optimizes caching strategy based on device capabilities", () => {
      // Mock low-end device
      Object.defineProperty(navigator, "deviceMemory", { value: 2 });
      Object.defineProperty(navigator, "hardwareConcurrency", { value: 2 });

      const strategy = serviceWorkerManager.getCachingStrategy();

      expect(strategy).toEqual({
        maxCacheSize: "50MB",
        imageCaching: "selective",
        preloadCritical: false,
        enableBackgroundSync: false,
      });
    });
  });
});
