/**
 * iPhone SE Test Environment Setup
 * Configures the test environment to simulate iPhone SE specific behaviors
 */

// iPhone SE specific configuration
const IPHONE_SE_CONFIG = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  viewport: { width: 375, height: 667 },
  pixelRatio: 2,
  safeAreaInsets: { top: 20, right: 0, bottom: 0, left: 0 },
  hasNotch: false,
  deviceMemory: 3, // iPhone SE has limited memory
  hardwareConcurrency: 2, // Dual-core A15
};

// Mock device-specific properties
Object.defineProperty(navigator, "userAgent", {
  value: IPHONE_SE_CONFIG.userAgent,
  configurable: true,
});

Object.defineProperty(navigator, "platform", {
  value: "iPhone",
  configurable: true,
});

Object.defineProperty(navigator, "deviceMemory", {
  value: IPHONE_SE_CONFIG.deviceMemory,
  configurable: true,
});

Object.defineProperty(navigator, "hardwareConcurrency", {
  value: IPHONE_SE_CONFIG.hardwareConcurrency,
  configurable: true,
});

// Mock viewport
Object.defineProperty(window, "innerWidth", {
  value: IPHONE_SE_CONFIG.viewport.width,
  writable: true,
});

Object.defineProperty(window, "innerHeight", {
  value: IPHONE_SE_CONFIG.viewport.height,
  writable: true,
});

Object.defineProperty(window, "devicePixelRatio", {
  value: IPHONE_SE_CONFIG.pixelRatio,
  configurable: true,
});

// Mock screen object
Object.defineProperty(window, "screen", {
  value: {
    width: IPHONE_SE_CONFIG.viewport.width * IPHONE_SE_CONFIG.pixelRatio,
    height: IPHONE_SE_CONFIG.viewport.height * IPHONE_SE_CONFIG.pixelRatio,
    availWidth: IPHONE_SE_CONFIG.viewport.width,
    availHeight: IPHONE_SE_CONFIG.viewport.height,
    orientation: {
      type: "portrait-primary",
      angle: 0,
    },
  },
  configurable: true,
});

// Mock safe area insets (iPhone SE has minimal safe areas)
Object.defineProperty(window, "getComputedStyle", {
  value: (element: Element) => ({
    ...window.getComputedStyle(element),
    getPropertyValue: (property: string) => {
      const safeAreaMap: Record<string, string> = {
        "--safe-area-inset-top": `${IPHONE_SE_CONFIG.safeAreaInsets.top}px`,
        "--safe-area-inset-right": `${IPHONE_SE_CONFIG.safeAreaInsets.right}px`,
        "--safe-area-inset-bottom": `${IPHONE_SE_CONFIG.safeAreaInsets.bottom}px`,
        "--safe-area-inset-left": `${IPHONE_SE_CONFIG.safeAreaInsets.left}px`,
      };
      return safeAreaMap[property] || "";
    },
  }),
  configurable: true,
});

// Mock iOS-specific APIs
Object.defineProperty(window, "DeviceMotionEvent", {
  value: class MockDeviceMotionEvent extends Event {
    acceleration = { x: 0, y: 0, z: 0 };
    accelerationIncludingGravity = { x: 0, y: -9.8, z: 0 };
    rotationRate = { alpha: 0, beta: 0, gamma: 0 };
    interval = 16;
  },
  configurable: true,
});

// Mock touch events
Object.defineProperty(window, "TouchEvent", {
  value: class MockTouchEvent extends Event {
    touches: Touch[] = [];
    targetTouches: Touch[] = [];
    changedTouches: Touch[] = [];
  },
  configurable: true,
});

// Mock iOS Safari specific behaviors
Object.defineProperty(window, "safari", {
  value: {
    pushNotification: {
      permission: jest.fn().mockReturnValue("default"),
      requestPermission: jest.fn().mockResolvedValue("granted"),
    },
  },
  configurable: true,
});

// Mock webkit prefixed APIs
Object.defineProperty(window, "webkitRequestAnimationFrame", {
  value: window.requestAnimationFrame || jest.fn((callback) => setTimeout(callback, 16)),
  configurable: true,
});

// Mock CSS.supports for iOS specific features
const originalCSSSupports = CSS.supports;
CSS.supports = jest.fn((property: string, value?: string) => {
  // iPhone SE specific CSS support
  const iosSpecificSupport: Record<string, boolean> = {
    "-webkit-appearance": true,
    "-webkit-overflow-scrolling": true,
    "-webkit-tap-highlight-color": true,
    "backdrop-filter": false, // iPhone SE doesn't support backdrop-filter well
    "aspect-ratio": false, // Limited support on older iOS
  };
  
  if (value === undefined && property in iosSpecificSupport) {
    return iosSpecificSupport[property];
  }
  
  if (typeof originalCSSSupports === "function") {
    return originalCSSSupports(property, value);
  }
  
  return false;
});

// Mock media queries for iPhone SE
Object.defineProperty(window, "matchMedia", {
  value: jest.fn((query: string) => {
    const matches = (() => {
      switch (query) {
        case "(max-width: 375px)":
          return true;
        case "(orientation: portrait)":
          return true;
        case "(orientation: landscape)":
          return false;
        case "(prefers-reduced-motion: reduce)":
          return false;
        case "(prefers-color-scheme: dark)":
          return false;
        case "(display-mode: standalone)":
          return false; // Not installed as PWA by default
        case "(hover: none) and (pointer: coarse)":
          return true; // Touch device
        default:
          return false;
      }
    })();
    
    return {
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  }),
  configurable: true,
});

// Mock network information (limited on iOS)
Object.defineProperty(navigator, "connection", {
  value: {
    effectiveType: "4g",
    downlink: 5, // Moderate speed for iPhone SE
    rtt: 100,
    saveData: false,
  },
  configurable: true,
});

// Mock vibration (available on iPhone SE)
Object.defineProperty(navigator, "vibrate", {
  value: jest.fn((pattern: number | number[]) => true),
  configurable: true,
});

// Mock battery API (not available on iOS)
delete (navigator as any).battery;
delete (navigator as any).getBattery;

console.log("iPhone SE test environment configured");

export { IPHONE_SE_CONFIG };