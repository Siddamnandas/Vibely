/**
 * Pixel 7 Test Environment Setup
 * Configures the test environment to simulate Pixel 7 Android specific behaviors
 */

// Pixel 7 specific configuration
const PIXEL_7_CONFIG = {
  userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
  viewport: { width: 393, height: 852 },
  pixelRatio: 2.75,
  safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  hasNotch: false,
  deviceMemory: 8, // Pixel 7 has 8GB RAM
  hardwareConcurrency: 8, // Tensor G2 has 8 cores
};

// Mock device-specific properties
Object.defineProperty(navigator, "userAgent", {
  value: PIXEL_7_CONFIG.userAgent,
  configurable: true,
});

Object.defineProperty(navigator, "platform", {
  value: "Linux armv8l",
  configurable: true,
});

Object.defineProperty(navigator, "deviceMemory", {
  value: PIXEL_7_CONFIG.deviceMemory,
  configurable: true,
});

Object.defineProperty(navigator, "hardwareConcurrency", {
  value: PIXEL_7_CONFIG.hardwareConcurrency,
  configurable: true,
});

// Mock viewport
Object.defineProperty(window, "innerWidth", {
  value: PIXEL_7_CONFIG.viewport.width,
  writable: true,
});

Object.defineProperty(window, "innerHeight", {
  value: PIXEL_7_CONFIG.viewport.height,
  writable: true,
});

Object.defineProperty(window, "devicePixelRatio", {
  value: PIXEL_7_CONFIG.pixelRatio,
  configurable: true,
});

// Mock screen object
Object.defineProperty(window, "screen", {
  value: {
    width: Math.round(PIXEL_7_CONFIG.viewport.width * PIXEL_7_CONFIG.pixelRatio),
    height: Math.round(PIXEL_7_CONFIG.viewport.height * PIXEL_7_CONFIG.pixelRatio),
    availWidth: PIXEL_7_CONFIG.viewport.width,
    availHeight: PIXEL_7_CONFIG.viewport.height,
    orientation: {
      type: "portrait-primary",
      angle: 0,
      lock: jest.fn(),
      unlock: jest.fn(),
    },
  },
  configurable: true,
});

// Mock safe area insets (Pixel 7 has no notch)
Object.defineProperty(window, "getComputedStyle", {
  value: (element: Element) => ({
    ...window.getComputedStyle(element),
    getPropertyValue: (property: string) => {
      const safeAreaMap: Record<string, string> = {
        "--safe-area-inset-top": `${PIXEL_7_CONFIG.safeAreaInsets.top}px`,
        "--safe-area-inset-right": `${PIXEL_7_CONFIG.safeAreaInsets.right}px`,
        "--safe-area-inset-bottom": `${PIXEL_7_CONFIG.safeAreaInsets.bottom}px`,
        "--safe-area-inset-left": `${PIXEL_7_CONFIG.safeAreaInsets.left}px`,
      };
      return safeAreaMap[property] || "";
    },
  }),
  configurable: true,
});

// Mock Android-specific APIs
Object.defineProperty(window, "DeviceMotionEvent", {
  value: class MockDeviceMotionEvent extends Event {
    acceleration = { x: 0, y: 0, z: 0 };
    accelerationIncludingGravity = { x: 0, y: -9.8, z: 0 };
    rotationRate = { alpha: 0, beta: 0, gamma: 0 };
    interval = 16;
  },
  configurable: true,
});

// Mock Chrome-specific APIs
Object.defineProperty(window, "chrome", {
  value: {
    runtime: {
      onConnect: {
        addListener: jest.fn(),
      },
    },
  },
  configurable: true,
});

// Mock Android WebView interface (if applicable)
Object.defineProperty(window, "AndroidInterface", {
  value: {
    showToast: jest.fn(),
    vibrate: jest.fn(),
    openNativeApp: jest.fn(),
  },
  configurable: true,
});

// Mock CSS.supports for Android Chrome specific features
const originalCSSSupports = CSS.supports;
CSS.supports = jest.fn((property: string, value?: string) => {
  // Pixel 7 Chrome specific CSS support
  const androidSpecificSupport: Record<string, boolean> = {
    "backdrop-filter": true, // Modern Android Chrome supports this
    "aspect-ratio": true, // Good support
    "container-queries": true, // Modern Chrome feature
    "-webkit-appearance": false, // Not supported on Android Chrome
    "scroll-snap-type": true,
    "overscroll-behavior": true,
  };
  
  if (value === undefined && property in androidSpecificSupport) {
    return androidSpecificSupport[property];
  }
  
  if (typeof originalCSSSupports === "function") {
    return originalCSSSupports(property, value);
  }
  
  return true; // Default to supported for modern Chrome
});

// Mock media queries for Pixel 7
Object.defineProperty(window, "matchMedia", {
  value: jest.fn((query: string) => {
    const matches = (() => {
      switch (query) {
        case "(max-width: 393px)":
          return true;
        case "(orientation: portrait)":
          return true;
        case "(orientation: landscape)":
          return false;
        case "(prefers-reduced-motion: reduce)":
          return false;
        case "(prefers-color-scheme: dark)":
          return true; // Android often defaults to dark mode
        case "(display-mode: standalone)":
          return false; // Not installed as PWA by default
        case "(hover: none) and (pointer: coarse)":
          return true; // Touch device
        case "(prefers-contrast: high)":
          return false;
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

// Mock network information (good support on Android)
Object.defineProperty(navigator, "connection", {
  value: {
    effectiveType: "4g",
    downlink: 10, // Fast connection for Pixel 7
    rtt: 50,
    saveData: false,
    type: "cellular",
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  configurable: true,
});

// Mock vibration (well supported on Android)
Object.defineProperty(navigator, "vibrate", {
  value: jest.fn((pattern: number | number[]) => true),
  configurable: true,
});

// Mock battery API (available on Android)
Object.defineProperty(navigator, "getBattery", {
  value: jest.fn().mockResolvedValue({
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 7200, // 2 hours
    level: 0.8, // 80%
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }),
  configurable: true,
});

// Mock wake lock API (modern Android feature)
Object.defineProperty(navigator, "wakeLock", {
  value: {
    request: jest.fn().mockResolvedValue({
      type: "screen",
      released: false,
      release: jest.fn(),
    }),
  },
  configurable: true,
});

// Mock share API (good Android support)
Object.defineProperty(navigator, "share", {
  value: jest.fn().mockResolvedValue(undefined),
  configurable: true,
});

Object.defineProperty(navigator, "canShare", {
  value: jest.fn().mockReturnValue(true),
  configurable: true,
});

// Mock file system access API (Progressive Web App feature)
Object.defineProperty(window, "showOpenFilePicker", {
  value: jest.fn().mockResolvedValue([]),
  configurable: true,
});

// Mock clipboard API (modern browser feature)
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(""),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([]),
  },
  configurable: true,
});

// Mock permissions API (good Android support)
Object.defineProperty(navigator, "permissions", {
  value: {
    query: jest.fn().mockResolvedValue({
      state: "granted",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  },
  configurable: true,
});

// Mock geolocation (requires permission on Android)
Object.defineProperty(navigator, "geolocation", {
  value: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 37.4419,
          longitude: -122.1419,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  configurable: true,
});

// Mock media devices (camera/microphone access)
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(new MediaStream()),
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: "camera1",
        kind: "videoinput",
        label: "Pixel 7 Camera",
        groupId: "group1",
      },
      {
        deviceId: "mic1", 
        kind: "audioinput",
        label: "Pixel 7 Microphone",
        groupId: "group1",
      },
    ]),
    getSupportedConstraints: jest.fn().mockReturnValue({
      width: true,
      height: true,
      facingMode: true,
    }),
  },
  configurable: true,
});

console.log("Pixel 7 Android test environment configured");

export { PIXEL_7_CONFIG };