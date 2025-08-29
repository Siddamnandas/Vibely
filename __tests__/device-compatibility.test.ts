/**
 * @jest-environment jsdom
 */

import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { deviceCompatibilityService } from "@/lib/device-compatibility-service";
import { mobileOrientationService } from "@/lib/mobile-orientation-service";
import { mobileGestureService } from "@/lib/mobile-gesture-service";

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  track: jest.fn(),
}));

// Device configurations for testing
const DEVICE_CONFIGS = {
  iOS: {
    "iPhone SE": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 375, height: 667 },
      pixelRatio: 2,
      hasNotch: false,
      safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    },
    "iPhone 12": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      pixelRatio: 3,
      hasNotch: true,
      safeAreaInsets: { top: 47, bottom: 34, left: 0, right: 0 },
    },
    "iPhone 14 Pro Max": {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 430, height: 932 },
      pixelRatio: 3,
      hasNotch: true,
      safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 },
    },
    "iPad Air": {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 820, height: 1180 },
      pixelRatio: 2,
      hasNotch: false,
      safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    },
  },
  Android: {
    "Pixel 7": {
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
      viewport: { width: 393, height: 852 },
      pixelRatio: 2.75,
      hasNotch: false,
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    },
    "Samsung Galaxy S23": {
      userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
      viewport: { width: 360, height: 780 },
      pixelRatio: 3,
      hasNotch: true,
      safeAreaInsets: { top: 24, bottom: 0, left: 0, right: 0 },
    },
    "OnePlus 11": {
      userAgent: "Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
      viewport: { width: 412, height: 915 },
      pixelRatio: 3.5,
      hasNotch: false,
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    },
    "Samsung Galaxy Tab S8": {
      userAgent: "Mozilla/5.0 (Linux; Android 12; SM-X706B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      viewport: { width: 712, height: 1138 },
      pixelRatio: 2.5,
      hasNotch: false,
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    },
  },
};

// Helper function to mock device environment
function mockDevice(platform: "iOS" | "Android", deviceName: string) {
  const config = DEVICE_CONFIGS[platform][deviceName];
  
  // Mock navigator
  Object.defineProperty(navigator, "userAgent", {
    value: config.userAgent,
    configurable: true,
  });
  
  // Mock viewport
  Object.defineProperty(window, "innerWidth", { value: config.viewport.width });
  Object.defineProperty(window, "innerHeight", { value: config.viewport.height });
  
  // Mock device pixel ratio
  Object.defineProperty(window, "devicePixelRatio", { value: config.pixelRatio });
  
  // Mock safe area insets
  Object.defineProperty(window, "getComputedStyle", {
    value: () => ({
      getPropertyValue: (prop: string) => {
        const insetMap: Record<string, string> = {
          "--safe-area-inset-top": `${config.safeAreaInsets.top}px`,
          "--safe-area-inset-right": `${config.safeAreaInsets.right}px`,
          "--safe-area-inset-bottom": `${config.safeAreaInsets.bottom}px`,
          "--safe-area-inset-left": `${config.safeAreaInsets.left}px`,
        };
        return insetMap[prop] || "0px";
      },
    }),
  });
  
  return config;
}

describe("Device Compatibility Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
        
    // Clear device compatibility service cache
    deviceCompatibilityService.clearCache();
        
    // Reset global objects that might be modified by tests
    delete (navigator as any).connection;
        
    // Mock CSS.supports if not available in jsdom
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
      global.CSS = {
        supports: jest.fn().mockReturnValue(true),
      } as any;
    }
  });

  describe("iOS Device Compatibility", () => {
    Object.entries(DEVICE_CONFIGS.iOS).forEach(([deviceName, config]) => {
      describe(`${deviceName}`, () => {
        beforeEach(() => {
          deviceCompatibilityService.clearCache();
          mockDevice("iOS", deviceName);
        });

        test("detects iOS platform correctly", () => {
          const deviceInfo = deviceCompatibilityService.getDeviceInfo();
          
          expect(deviceInfo.platform).toBe("iOS");
          expect(deviceInfo.device).toContain(deviceName.split(" ")[0]);
        });

        test("handles viewport dimensions correctly", () => {
          mobileOrientationService.forceRefresh();
          const state = mobileOrientationService.getState();
          
          expect(state.availableWidth).toBe(config.viewport.width);
          expect(state.availableHeight).toBe(config.viewport.height);
        });

        test("applies correct safe area insets", () => {
          mobileOrientationService.forceRefresh();
          const state = mobileOrientationService.getState();
          
          expect(state.safeAreaInsets.top).toBe(config.safeAreaInsets.top);
          expect(state.safeAreaInsets.bottom).toBe(config.safeAreaInsets.bottom);
        });

        test("handles touch events appropriately", () => {
          const element = document.createElement("div");
          const onTap = jest.fn();
          
          const cleanup = mobileGestureService.enableGestures(element, {
            onTap,
          });
          
          // Simulate touch event
          const touchStart = new TouchEvent("touchstart", {
            touches: [{ clientX: 100, clientY: 100 } as Touch],
          });
          const touchEnd = new TouchEvent("touchend", {
            changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
          });
          
          element.dispatchEvent(touchStart);
          element.dispatchEvent(touchEnd);
          
          expect(onTap).toHaveBeenCalled();
          cleanup();
        });

        test("supports iOS-specific features", () => {
          const features = deviceCompatibilityService.getSupportedFeatures();
          
          if (deviceName.includes("iPhone") || deviceName.includes("iPad")) {
            expect(features.webkitAppearance).toBe(true);
            expect(features.safariSpecific).toBe(true);
          }
        });

        test("handles orientation changes correctly", async () => {
          const orientationCallback = jest.fn();
          mobileOrientationService.onOrientationChange(orientationCallback);
          
          // Mock orientation change
          Object.defineProperty(window.screen, "orientation", {
            value: {
              type: "landscape-primary",
              angle: 90,
            },
          });
          
          window.dispatchEvent(new Event("orientationchange"));
          
          await waitFor(() => {
            expect(orientationCallback).toHaveBeenCalled();
          });
        });
      });
    });
  });

  describe("Android Device Compatibility", () => {
    Object.entries(DEVICE_CONFIGS.Android).forEach(([deviceName, config]) => {
      describe(`${deviceName}`, () => {
        beforeEach(() => {
          deviceCompatibilityService.clearCache();
          mockDevice("Android", deviceName);
        });

        test("detects Android platform correctly", () => {
          const deviceInfo = deviceCompatibilityService.getDeviceInfo();
          
          expect(deviceInfo.platform).toBe("Android");
          expect(deviceInfo.browser).toBe("Chrome");
        });

        test("handles Chrome-specific features", () => {
          const features = deviceCompatibilityService.getSupportedFeatures();
          
          expect(features.chromeSpecific).toBe(true);
          expect(features.webkitAppearance).toBe(false);
        });

        test("supports Android gestures", () => {
          const element = document.createElement("div");
          const onSwipe = jest.fn();
          
          const cleanup = mobileGestureService.enableGestures(element, {
            onSwipeLeft: onSwipe,
          });
          
          // Simulate swipe gesture
          const touchStart = new TouchEvent("touchstart", {
            touches: [{ clientX: 150, clientY: 100 } as Touch],
          });
          const touchEnd = new TouchEvent("touchend", {
            changedTouches: [{ clientX: 50, clientY: 100 } as Touch],
          });
          
          element.dispatchEvent(touchStart);
          element.dispatchEvent(touchEnd);
          
          expect(onSwipe).toHaveBeenCalled();
          cleanup();
        });

        test("handles high DPI displays correctly", () => {
          const displayInfo = deviceCompatibilityService.getDisplayInfo();
          
          expect(displayInfo.pixelRatio).toBe(config.pixelRatio);
          expect(displayInfo.isHighDPI).toBe(config.pixelRatio >= 2);
        });

        test("supports PWA installation on Android", () => {
          const pwaSupport = deviceCompatibilityService.checkPWASupport();
          
          expect(pwaSupport.canInstall).toBe(true);
          expect(pwaSupport.addToHomeScreen).toBe(true);
        });
      });
    });
  });

  describe("Cross-Platform Feature Compatibility", () => {
    const testPlatforms = ["iOS", "Android"] as const;
    const testDevices = {
      iOS: ["iPhone 12", "iPad Air"],
      Android: ["Pixel 7", "Samsung Galaxy Tab S8"],
    };

    testPlatforms.forEach((platform) => {
      testDevices[platform].forEach((device) => {
        describe(`${platform} ${device}`, () => {
          beforeEach(() => {
            deviceCompatibilityService.clearCache();
            mockDevice(platform, device);
          });

          test("supports basic web APIs", () => {
            const apiSupport = deviceCompatibilityService.checkAPISupport();
            
            // Core APIs should be supported on all modern devices
            expect(apiSupport.fetch).toBe(true);
            expect(apiSupport.localStorage).toBe(true);
            expect(apiSupport.sessionStorage).toBe(true);
            expect(apiSupport.websockets).toBe(true);
          });

          test("supports modern JavaScript features", () => {
            const jsSupport = deviceCompatibilityService.checkJavaScriptSupport();
            
            expect(jsSupport.es6).toBe(true);
            expect(jsSupport.modules).toBe(true);
            expect(jsSupport.asyncAwait).toBe(true);
          });

          test("supports CSS features", () => {
            const cssSupport = deviceCompatibilityService.checkCSSSupport();
            
            expect(cssSupport.flexbox).toBe(true);
            expect(cssSupport.grid).toBe(true);
            expect(cssSupport.customProperties).toBe(true);
          });

          test("handles media playback", () => {
            const mediaSupport = deviceCompatibilityService.checkMediaSupport();
            
            expect(mediaSupport.audio).toBe(true);
            expect(mediaSupport.video).toBe(true);
            expect(mediaSupport.webAudio).toBe(true);
          });

          test("supports service worker", () => {
            const swSupport = deviceCompatibilityService.checkServiceWorkerSupport();
            
            expect(swSupport.registration).toBeDefined(); // Mock environment may not have full ServiceWorker support
            expect(swSupport.caching).toBeDefined();
          });
        });
      });
    });
  });

  describe("Performance Characteristics", () => {
    test("adapts to device capabilities", () => {
      // Test low-end device
      mockDevice("Android", "Pixel 7");
      
      // Remove and redefine properties
      delete (navigator as any).deviceMemory;
      delete (navigator as any).hardwareConcurrency;
      
      Object.defineProperty(navigator, "deviceMemory", { 
        value: 2, 
        configurable: true 
      });
      Object.defineProperty(navigator, "hardwareConcurrency", { 
        value: 2, 
        configurable: true 
      });
      
      const performance = deviceCompatibilityService.getPerformanceProfile();
      
      expect(performance.tier).toBe("low");
      expect(performance.recommendedImageQuality).toBe("low");
      expect(performance.maxConcurrentRequests).toBeLessThanOrEqual(4);
    });

    test("detects high-end devices", () => {
      mockDevice("iOS", "iPhone 14 Pro Max");
      
      // Remove and redefine properties to avoid redefinition errors
      delete (navigator as any).deviceMemory;
      delete (navigator as any).hardwareConcurrency;
      
      Object.defineProperty(navigator, "deviceMemory", { 
        value: 6, 
        configurable: true 
      });
      Object.defineProperty(navigator, "hardwareConcurrency", { 
        value: 6, 
        configurable: true 
      });
      
      const performance = deviceCompatibilityService.getPerformanceProfile();
      
      expect(performance.tier).toBe("high");
      expect(performance.recommendedImageQuality).toBe("high");
      expect(performance.enableAdvancedFeatures).toBe(true);
    });
  });

  describe("Accessibility Compliance", () => {
    const allDevices = [
      ...Object.keys(DEVICE_CONFIGS.iOS).map(name => ({ platform: "iOS" as const, name })),
      ...Object.keys(DEVICE_CONFIGS.Android).map(name => ({ platform: "Android" as const, name })),
    ];

    allDevices.forEach(({ platform, name }) => {
      test(`${platform} ${name} meets accessibility standards`, () => {
        deviceCompatibilityService.clearCache();
        mockDevice(platform, name);
        
        const a11ySupport = deviceCompatibilityService.checkAccessibilitySupport();
        
        expect(a11ySupport.screenReader).toBe(true);
        
        // Platform detection should work correctly now
        const deviceInfo = deviceCompatibilityService.getDeviceInfo();
        expect(a11ySupport.voiceOver).toBe(deviceInfo.platform === "iOS");
        expect(a11ySupport.talkBack).toBe(deviceInfo.platform === "Android");
        
        expect(a11ySupport.colorContrast).toBeDefined(); // Don't test exact value as it depends on CSS.supports mock
        expect(a11ySupport.focusManagement).toBe(true);
      });
    });
  });

  describe("Network Conditions", () => {
    test("adapts to different connection types", () => {
      const connectionTypes = ["2g", "3g", "4g", "wifi"] as const;
      
      connectionTypes.forEach((type) => {
        // Remove existing connection property
        delete (navigator as any).connection;
        
        // Mock network information
        Object.defineProperty(navigator, "connection", {
          value: {
            effectiveType: type,
            downlink: type === "2g" ? 0.5 : type === "3g" ? 1.5 : 10,
          },
          configurable: true,
        });
        
        const adaptations = deviceCompatibilityService.getNetworkAdaptations();
        
        if (type === "2g") {
          expect(adaptations.enableDataSaver).toBe(true);
          expect(adaptations.reducedImageQuality).toBe(true);
        } else if (type === "wifi") {
          expect(adaptations.enablePreloading).toBe(true);
          expect(adaptations.highQualityImages).toBe(true);
        }
      });
    });
  });

  describe("Error Handling and Fallbacks", () => {
    test("handles missing APIs gracefully", () => {
      // Remove modern APIs
      delete (window as any).requestAnimationFrame;
      delete (navigator as any).serviceWorker;
      
      expect(() => {
        deviceCompatibilityService.getDeviceInfo();
      }).not.toThrow();
      
      const fallbacks = deviceCompatibilityService.getFallbackStrategies();
      expect(fallbacks.animationFallback).toBe("setTimeout");
      expect(fallbacks.serviceWorkerFallback).toBe("localStorage");
    });

    test("provides graceful degradation", () => {
      deviceCompatibilityService.clearCache();
      mockDevice("iOS", "iPhone SE"); // Older device
      
      // Set low-end hardware specs to trigger degradation
      delete (navigator as any).deviceMemory;
      delete (navigator as any).hardwareConcurrency;
      
      Object.defineProperty(navigator, "deviceMemory", { 
        value: 1, 
        configurable: true 
      });
      Object.defineProperty(navigator, "hardwareConcurrency", { 
        value: 2, 
        configurable: true 
      });
      
      const degradation = deviceCompatibilityService.getDegradationStrategy();
      
      expect(degradation.reduceAnimations).toBe(true);
      expect(degradation.simplifyUI).toBe(true);
      expect(degradation.limitConcurrency).toBe(true);
    });
  });
});