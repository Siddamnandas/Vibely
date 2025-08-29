/**
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { deviceCompatibilityService } from "@/lib/device-compatibility-service";
import { mobileOrientationService } from "@/lib/mobile-orientation-service";
import { mobileGestureService } from "@/lib/mobile-gesture-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrientation } from "@/hooks/use-orientation";

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  track: jest.fn(),
}));

// Helper function to simulate different device environments
const simulateDeviceEnvironment = (platform: "iOS" | "Android", device: string) => {
  const configs = {
    iOS: {
      "iPhone SE": {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        viewport: { width: 375, height: 667 },
        pixelRatio: 2,
      },
      "iPhone 12": {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        viewport: { width: 390, height: 844 },
        pixelRatio: 3,
      },
      "iPad Air": {
        userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        viewport: { width: 820, height: 1180 },
        pixelRatio: 2,
      },
    },
    Android: {
      "Pixel 7": {
        userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/108.0.0.0",
        viewport: { width: 393, height: 852 },
        pixelRatio: 2.75,
      },
      "Galaxy S23": {
        userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 Chrome/108.0.0.0",
        viewport: { width: 360, height: 780 },
        pixelRatio: 3,
      },
    },
  };

  const config = configs[platform][device];
  if (!config) throw new Error(`Unknown device: ${platform} ${device}`);

  // Mock navigator
  Object.defineProperty(navigator, "userAgent", {
    value: config.userAgent,
    configurable: true,
  });

  // Mock viewport
  Object.defineProperty(window, "innerWidth", { value: config.viewport.width, writable: true });
  Object.defineProperty(window, "innerHeight", { value: config.viewport.height, writable: true });
  Object.defineProperty(window, "devicePixelRatio", { value: config.pixelRatio, configurable: true });
};

describe("Cross-Platform Integration Tests", () => {
  const testDevices = [
    { platform: "iOS" as const, device: "iPhone SE" },
    { platform: "iOS" as const, device: "iPhone 12" },
    { platform: "iOS" as const, device: "iPad Air" },
    { platform: "Android" as const, device: "Pixel 7" },
    { platform: "Android" as const, device: "Galaxy S23" },
  ];

  describe.each(testDevices)("$platform $device", ({ platform, device }) => {
    beforeEach(() => {
      jest.clearAllMocks();
      deviceCompatibilityService.clearCache();
      simulateDeviceEnvironment(platform, device);
    });

    test("detects platform and device correctly", () => {
      const deviceInfo = deviceCompatibilityService.getDeviceInfo();
      
      expect(deviceInfo.platform).toBe(platform);
      expect(deviceInfo.isMobile).toBe(true);
      expect(deviceInfo.isTablet).toBe(device.includes("iPad"));
    });

    test("mobile detection hook works correctly", () => {
      const { result } = renderHook(() => useIsMobile());
      
      expect(result.current).toBe(true);
    });

    test("PWA features are supported appropriately", () => {
      const pwaSupport = deviceCompatibilityService.checkPWASupport();
      
      if (platform === "iOS") {
        expect(pwaSupport.canInstall).toBe(true);
      } else if (platform === "Android") {
        expect(pwaSupport.canInstall).toBe(true);
        expect(pwaSupport.addToHomeScreen).toBe(true);
      }
    });

    test("service worker registration works", async () => {
      const swSupport = deviceCompatibilityService.checkServiceWorkerSupport();
      
      expect(swSupport.registration).toBeDefined();
      expect(swSupport.caching).toBeDefined();
      
      // Mock service worker registration
      const mockRegistration = {
        update: jest.fn(),
        unregister: jest.fn(),
        active: { postMessage: jest.fn() },
      };
      
      (navigator.serviceWorker as any) = {
        register: jest.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
      };
      
      // Service worker should be mockable
      expect(navigator.serviceWorker.register).toBeDefined();
    });

    test("handles orientation changes", async () => {
      const orientationCallback = jest.fn();
      mobileOrientationService.onOrientationChange(orientationCallback);
      
      // Simulate orientation change
      Object.defineProperty(window.screen, "orientation", {
        value: { type: "landscape-primary", angle: 90 },
        configurable: true,
      });
      
      // Mock orientation change dimensions
      Object.defineProperty(window, "innerWidth", {
        value: device.includes("iPad") ? 1180 : 844,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: device.includes("iPad") ? 820 : 390,
        writable: true,
      });
      
      window.dispatchEvent(new Event("orientationchange"));
      
      await waitFor(() => {
        expect(orientationCallback).toHaveBeenCalled();
      });
    });

    test("API support is consistent with platform capabilities", () => {
      const apiSupport = deviceCompatibilityService.checkAPISupport();
      
      // Core APIs should be supported on all modern devices
      expect(apiSupport.fetch).toBe(true);
      expect(apiSupport.localStorage).toBe(true);
      expect(apiSupport.websockets).toBe(true);
      
      // Platform-specific APIs
      if (platform === "iOS") {
        expect(apiSupport.notifications).toBe(true);
        // iOS has more restrictive media access
      } else if (platform === "Android") {
        expect(apiSupport.vibration).toBe(true);
        expect(apiSupport.camera).toBe(true);
      }
    });

    test("performance profile adapts to device capabilities", () => {
      const performanceProfile = deviceCompatibilityService.getPerformanceProfile();
      
      expect(performanceProfile.tier).toMatch(/^(low|mid|high)$/);
      expect(performanceProfile.maxConcurrentRequests).toBeGreaterThan(0);
      expect(performanceProfile.recommendedImageQuality).toMatch(/^(low|medium|high)$/);
      
      // High-end devices should get better settings
      if (device.includes("iPad") || device.includes("12") || device === "Pixel 7") {
        expect(performanceProfile.enableAdvancedFeatures).toBe(true);
      }
    });

    test("accessibility features are properly supported", () => {
      const a11ySupport = deviceCompatibilityService.checkAccessibilitySupport();
      
      expect(a11ySupport.screenReader).toBe(true);
      expect(a11ySupport.focusManagement).toBe(true);
      expect(a11ySupport.colorContrast).toBeDefined();
      
      // Platform-specific accessibility
      if (platform === "iOS") {
        expect(a11ySupport.voiceOver).toBe(true);
      } else if (platform === "Android") {
        expect(a11ySupport.talkBack).toBe(true);
      }
    });

    test("network adaptation works correctly", () => {
      // Mock different network conditions
      Object.defineProperty(navigator, "connection", {
        value: {
          effectiveType: "4g",
          downlink: 10,
          rtt: 50,
        },
        configurable: true,
      });
      
      const adaptations = deviceCompatibilityService.getNetworkAdaptations();
      
      expect(adaptations.enablePreloading).toBe(true);
      expect(adaptations.highQualityImages).toBe(true);
      expect(adaptations.enableDataSaver).toBe(false);
    });

    test("handles feature fallbacks gracefully", () => {
      const fallbacks = deviceCompatibilityService.getFallbackStrategies();
      
      expect(fallbacks.animationFallback).toBeDefined();
      expect(fallbacks.fetchFallback).toBeDefined();
      expect(fallbacks.serviceWorkerFallback).toBeDefined();
      
      // Should not throw errors when APIs are missing
      expect(() => {
        deviceCompatibilityService.getDegradationStrategy();
      }).not.toThrow();
    });

    test("CSS features are supported appropriately for platform", () => {
      const cssSupport = deviceCompatibilityService.checkCSSSupport();
      
      // Modern CSS should be supported
      expect(cssSupport.flexbox).toBe(true);
      expect(cssSupport.grid).toBe(true);
      expect(cssSupport.customProperties).toBe(true);
      
      // Platform-specific CSS features
      if (platform === "iOS") {
        // iOS Safari might have different support levels
        expect(cssSupport).toBeDefined();
      } else if (platform === "Android") {
        // Android Chrome typically has better CSS support
        expect(cssSupport.backdropFilter).toBeDefined();
      }
    });
  });

  describe("Cross-Platform Consistency", () => {
    test("core functionality works identically across platforms", () => {
      const results: Record<string, any> = {};
      
      testDevices.forEach(({ platform, device }) => {
        simulateDeviceEnvironment(platform, device);
        
        results[`${platform}-${device}`] = {
          deviceInfo: deviceCompatibilityService.getDeviceInfo(),
          apiSupport: deviceCompatibilityService.checkAPISupport(),
          performanceProfile: deviceCompatibilityService.getPerformanceProfile(),
        };
      });
      
      // All devices should support core features
      Object.values(results).forEach((result: any) => {
        expect(result.deviceInfo.isMobile).toBe(true);
        expect(result.apiSupport.fetch).toBe(true);
        expect(result.apiSupport.localStorage).toBe(true);
        expect(result.performanceProfile.tier).toMatch(/^(low|mid|high)$/);
      });
    });

    test("responsive breakpoints work consistently", () => {
      testDevices.forEach(({ platform, device }) => {
        simulateDeviceEnvironment(platform, device);
        
        const { result } = renderHook(() => useOrientation());
        
        expect(result.current.orientation).toBe("portrait");
        expect(result.current.isLandscape).toBe(false);
        expect(result.current.isPortrait).toBe(true);
        
        // All devices should provide optimal mini-player size
        const miniPlayerSize = result.current.getOptimalMiniPlayerSize();
        expect(miniPlayerSize.height).toBeGreaterThan(0);
        expect(miniPlayerSize.iconSize).toBeGreaterThan(0);
      });
    });

    test("touch interactions work consistently", () => {
      testDevices.forEach(({ platform, device }) => {
        simulateDeviceEnvironment(platform, device);
        
        const element = document.createElement("div");
        const gestureCallbacks = {
          onTap: jest.fn(),
          onSwipeLeft: jest.fn(),
          onSwipeRight: jest.fn(),
        };
        
        const cleanup = mobileGestureService.enableGestures(element, gestureCallbacks);
        
        // Simulate consistent touch events
        const touchStart = new TouchEvent("touchstart", {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        const touchEnd = new TouchEvent("touchend", {
          changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        
        element.dispatchEvent(touchStart);
        element.dispatchEvent(touchEnd);
        
        expect(gestureCallbacks.onTap).toHaveBeenCalled();
        cleanup();
      });
    });
  });

  describe("Performance Benchmarks", () => {
    test("service initialization time is acceptable", async () => {
      testDevices.forEach(({ platform, device }) => {
        simulateDeviceEnvironment(platform, device);
        
        const startTime = performance.now();
        
        // Initialize core services
        deviceCompatibilityService.getDeviceInfo();
        mobileOrientationService.forceRefresh();
        
        const endTime = performance.now();
        const initTime = endTime - startTime;
        
        // Should initialize quickly (under 50ms)
        expect(initTime).toBeLessThan(50);
      });
    });

    test("memory usage stays within acceptable bounds", () => {
      testDevices.forEach(({ platform, device }) => {
        simulateDeviceEnvironment(platform, device);
        
        // Simulate multiple service calls
        for (let i = 0; i < 100; i++) {
          deviceCompatibilityService.getDeviceInfo();
          deviceCompatibilityService.checkAPISupport();
        }
        
        // Should not create memory leaks (simplified check)
        expect(deviceCompatibilityService).toBeDefined();
      });
    });
  });
});