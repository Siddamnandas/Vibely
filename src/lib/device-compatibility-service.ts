/**
 * Device Compatibility Service
 * Handles device detection, feature support, and platform-specific optimizations
 */

interface DeviceInfo {
  platform: "iOS" | "Android" | "Desktop" | "Unknown";
  device: string;
  browser: string;
  version: string;
  isTablet: boolean;
  isMobile: boolean;
}

interface DisplayInfo {
  width: number;
  height: number;
  pixelRatio: number;
  isHighDPI: boolean;
  orientation: "portrait" | "landscape";
}

interface APISupport {
  fetch: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  websockets: boolean;
  webRTC: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  vibration: boolean;
}

interface PerformanceProfile {
  tier: "low" | "mid" | "high";
  deviceMemory?: number;
  hardwareConcurrency?: number;
  recommendedImageQuality: "low" | "medium" | "high";
  maxConcurrentRequests: number;
  enableAdvancedFeatures: boolean;
  enableAnimations: boolean;
}

interface NetworkAdaptations {
  enableDataSaver: boolean;
  reducedImageQuality: boolean;
  enablePreloading: boolean;
  highQualityImages: boolean;
  limitConcurrentRequests: number;
}

interface AccessibilitySupport {
  screenReader: boolean;
  voiceOver: boolean;
  talkBack: boolean;
  colorContrast: boolean;
  focusManagement: boolean;
  reducedMotion: boolean;
}

class DeviceCompatibilityService {
  private deviceInfo: DeviceInfo | null = null;
  private featureCache: Map<string, boolean> = new Map();

  /**
   * Clear cached device info (useful for testing)
   */
  clearCache() {
    this.deviceInfo = null;
    this.featureCache.clear();
  }

  /**
   * Get comprehensive device information
   */
  getDeviceInfo(): DeviceInfo {
    if (this.deviceInfo) return this.deviceInfo;

    const userAgent = navigator.userAgent;
    
    // Platform detection
    let platform: DeviceInfo["platform"] = "Unknown";
    let device = "Unknown Device";
    let browser = "Unknown Browser";
    let version = "Unknown";

    // iOS Detection
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      platform = "iOS";
      
      if (/iPhone/.test(userAgent)) {
        device = this.detectiPhoneModel(userAgent);
      } else if (/iPad/.test(userAgent)) {
        device = this.detectiPadModel(userAgent);
      } else {
        device = "iPod";
      }
      
      browser = "Safari";
      const versionMatch = userAgent.match(/OS (\d+)_(\d+)/);
      if (versionMatch) {
        version = `${versionMatch[1]}.${versionMatch[2]}`;
      }
    }
    // Android Detection
    else if (/Android/.test(userAgent)) {
      platform = "Android";
      
      // Detect Android device
      const deviceMatch = userAgent.match(/Android.*?;\s*([^)]+)\)/);
      if (deviceMatch) {
        device = deviceMatch[1].trim();
      }
      
      // Detect browser
      if (/Chrome/.test(userAgent)) {
        browser = "Chrome";
        const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        if (chromeMatch) version = chromeMatch[1];
      } else if (/Firefox/.test(userAgent)) {
        browser = "Firefox";
      }
    }
    // Desktop Detection
    else if (/Windows|Mac|Linux/.test(userAgent)) {
      platform = "Desktop";
      
      if (/Chrome/.test(userAgent)) browser = "Chrome";
      else if (/Firefox/.test(userAgent)) browser = "Firefox";
      else if (/Safari/.test(userAgent)) browser = "Safari";
      else if (/Edge/.test(userAgent)) browser = "Edge";
    }

    const isTablet = this.detectTablet(userAgent);
    const isMobile = platform === "iOS" || platform === "Android";

    this.deviceInfo = {
      platform,
      device,
      browser,
      version,
      isTablet,
      isMobile,
    };

    return this.deviceInfo;
  }

  /**
   * Get display information
   */
  getDisplayInfo(): DisplayInfo {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      isHighDPI: (window.devicePixelRatio || 1) >= 2,
      orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait",
    };
  }

  /**
   * Check API support across platforms
   */
  checkAPISupport(): APISupport {
    return {
      fetch: this.checkFeature("fetch", () => "fetch" in window),
      localStorage: this.checkFeature("localStorage", () => {
        try {
          localStorage.setItem("test", "test");
          localStorage.removeItem("test");
          return true;
        } catch {
          return false;
        }
      }),
      sessionStorage: this.checkFeature("sessionStorage", () => "sessionStorage" in window),
      websockets: this.checkFeature("websockets", () => "WebSocket" in window),
      webRTC: this.checkFeature("webRTC", () => "RTCPeerConnection" in window),
      geolocation: this.checkFeature("geolocation", () => "geolocation" in navigator),
      camera: this.checkFeature("camera", () => "mediaDevices" in navigator),
      microphone: this.checkFeature("microphone", () => "mediaDevices" in navigator),
      notifications: this.checkFeature("notifications", () => "Notification" in window),
      vibration: this.checkFeature("vibration", () => "vibrate" in navigator),
    };
  }

  /**
   * Check JavaScript feature support
   */
  checkJavaScriptSupport() {
    return {
      es6: this.checkFeature("es6", () => {
        try {
          eval("const arrow = () => {}; class Test {}");
          return true;
        } catch {
          return false;
        }
      }),
      modules: this.checkFeature("modules", () => {
        try {
          return "noModule" in document.createElement("script");
        } catch {
          return false;
        }
      }),
      asyncAwait: this.checkFeature("asyncAwait", () => {
        try {
          eval("(async () => {})");
          return true;
        } catch {
          return false;
        }
      }),
      webAssembly: this.checkFeature("webAssembly", () => "WebAssembly" in window),
    };
  }

  /**
   * Check CSS feature support
   */
  checkCSSSupport() {
    const cssSupports = (property: string, value?: string) => {
      try {
        if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
          return false;
        }
        return value ? CSS.supports(property, value) : CSS.supports(property);
      } catch {
        return false;
      }
    };
    
    return {
      flexbox: this.checkFeature("flexbox", () => cssSupports("display", "flex")),
      grid: this.checkFeature("grid", () => cssSupports("display", "grid")),
      customProperties: this.checkFeature("customProperties", () => cssSupports("--custom", "value")),
      backdropFilter: this.checkFeature("backdropFilter", () => cssSupports("backdrop-filter", "blur(1px)")),
      aspectRatio: this.checkFeature("aspectRatio", () => cssSupports("aspect-ratio", "1")),
    };
  }

  /**
   * Check media playback support
   */
  checkMediaSupport() {
    return {
      audio: this.checkFeature("audio", () => "Audio" in window),
      video: this.checkFeature("video", () => "HTMLVideoElement" in window),
      webAudio: this.checkFeature("webAudio", () => {
        try {
          return "AudioContext" in window || "webkitAudioContext" in window;
        } catch {
          return false;
        }
      }),
      mediaSession: this.checkFeature("mediaSession", () => {
        try {
          return "mediaSession" in navigator;
        } catch {
          return false;
        }
      }),
    };
  }

  /**
   * Check service worker support
   */
  checkServiceWorkerSupport() {
    return {
      registration: this.checkFeature("swRegistration", () => "serviceWorker" in navigator && navigator.serviceWorker !== null),
      caching: this.checkFeature("swCaching", () => "caches" in window),
      backgroundSync: this.checkFeature("backgroundSync", () => {
        try {
          return "sync" in (window as any).ServiceWorkerRegistration?.prototype || false;
        } catch {
          return false;
        }
      }),
      pushMessaging: this.checkFeature("pushMessaging", () => "PushManager" in window),
    };
  }

  /**
   * Check PWA support
   */
  checkPWASupport() {
    const deviceInfo = this.getDeviceInfo();
    
    return {
      canInstall: deviceInfo.platform === "Android" || 
                  (deviceInfo.platform === "iOS" && deviceInfo.browser === "Safari"),
      addToHomeScreen: deviceInfo.isMobile,
      fullscreen: "standalone" in window.navigator || "fullscreen" in document,
      appBadge: "setAppBadge" in navigator,
    };
  }

  /**
   * Get platform-specific features
   */
  getSupportedFeatures() {
    const deviceInfo = this.getDeviceInfo();
    
    return {
      webkitAppearance: deviceInfo.platform === "iOS",
      safariSpecific: deviceInfo.platform === "iOS" && deviceInfo.browser === "Safari",
      chromeSpecific: deviceInfo.browser === "Chrome",
      androidSpecific: deviceInfo.platform === "Android",
      hapticFeedback: deviceInfo.isMobile && "vibrate" in navigator,
      faceID: deviceInfo.platform === "iOS" && "credentials" in navigator,
      fingerprint: deviceInfo.platform === "Android" && "credentials" in navigator,
    };
  }

  /**
   * Get performance profile based on device capabilities
   */
  getPerformanceProfile(): PerformanceProfile {
    const deviceInfo = this.getDeviceInfo();
    const displayInfo = this.getDisplayInfo();
    
    // Get hardware information (if available)
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    // Determine performance tier based on hardware specs first
    let tier: PerformanceProfile["tier"] = "mid";
    
    // Hardware-based detection
    if (deviceMemory >= 6 && hardwareConcurrency >= 6) {
      tier = "high";
    } else if (deviceMemory <= 2 && hardwareConcurrency <= 2) {
      tier = "low";
    } else if (deviceMemory <= 2 || hardwareConcurrency <= 2) {
      tier = "low";
    }
    
    // Platform and device specific adjustments
    if (deviceInfo.platform === "iOS") {
      if (deviceInfo.device.includes("Pro") || deviceInfo.device.includes("iPad")) {
        tier = "high";
      } else if (deviceInfo.device.includes("SE")) {
        // iPhone SE is typically lower performance
        tier = "low";
      } else if (!deviceInfo.device.includes("SE")) {
        // Most modern iPhones are at least mid-tier
        tier = tier === "low" ? "mid" : tier;
      }
    }
    
    // Android flagships - only upgrade if not already marked as low by hardware
    if (deviceInfo.platform === "Android" && tier !== "low") {
      if (deviceInfo.device.includes("Pixel") && !deviceInfo.device.includes("a")) {
        tier = "high";
      } else if (deviceInfo.device.includes("Galaxy S") || deviceInfo.device.includes("OnePlus")) {
        tier = "high";
      }
    }
    
    return {
      tier,
      deviceMemory,
      hardwareConcurrency,
      recommendedImageQuality: tier === "high" ? "high" : tier === "mid" ? "medium" : "low",
      maxConcurrentRequests: tier === "high" ? 8 : tier === "mid" ? 4 : 2,
      enableAdvancedFeatures: tier === "high",
      enableAnimations: tier !== "low",
    };
  }

  /**
   * Get network-based adaptations
   */
  getNetworkAdaptations(): NetworkAdaptations {
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || "4g";
    const downlink = connection?.downlink || 10;
    
    const isSlowConnection = effectiveType === "2g" || effectiveType === "slow-2g" || downlink < 1;
    const isFastConnection = (effectiveType === "4g" && downlink > 5) || effectiveType === "wifi";
    
    return {
      enableDataSaver: isSlowConnection,
      reducedImageQuality: isSlowConnection,
      enablePreloading: isFastConnection,
      highQualityImages: isFastConnection,
      limitConcurrentRequests: isSlowConnection ? 2 : 6,
    };
  }

  /**
   * Check accessibility support
   */
  checkAccessibilitySupport(): AccessibilitySupport {
    const deviceInfo = this.getDeviceInfo();
    
    const cssSupports = (property: string, value?: string) => {
      try {
        if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
          return false;
        }
        return value ? CSS.supports(property, value) : CSS.supports(property);
      } catch {
        return false;
      }
    };
    
    return {
      screenReader: true, // Assume basic screen reader support
      voiceOver: deviceInfo.platform === "iOS",
      talkBack: deviceInfo.platform === "Android",
      colorContrast: cssSupports("forced-colors", "active"),
      focusManagement: "focus" in HTMLElement.prototype,
      reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false,
    };
  }

  /**
   * Get fallback strategies for unsupported features
   */
  getFallbackStrategies() {
    return {
      animationFallback: "requestAnimationFrame" in window ? "raf" : "setTimeout",
      serviceWorkerFallback: "serviceWorker" in navigator ? "sw" : "localStorage",
      fetchFallback: "fetch" in window ? "fetch" : "xhr",
      promiseFallback: "Promise" in window ? "native" : "polyfill",
    };
  }

  /**
   * Get graceful degradation strategy for older devices
   */
  getDegradationStrategy() {
    const performanceProfile = this.getPerformanceProfile();
    const accessibilitySupport = this.checkAccessibilitySupport();
    
    return {
      reduceAnimations: performanceProfile.tier === "low" || accessibilitySupport.reducedMotion,
      simplifyUI: performanceProfile.tier === "low",
      limitConcurrency: performanceProfile.maxConcurrentRequests <= 2,
      disableNonEssentialFeatures: performanceProfile.tier === "low",
      useWebpFallback: !this.checkFeature("webp", () => {
        try {
          const canvas = document.createElement("canvas");
          return canvas.toDataURL("image/webp").indexOf("webp") > -1;
        } catch {
          return false;
        }
      }),
    };
  }

  /**
   * Private helper methods
   */
  private detectiPhoneModel(userAgent: string): string {
    // This is a simplified version - in production you'd have a more comprehensive mapping
    if (userAgent.includes("iPhone14")) return "iPhone 14";
    if (userAgent.includes("iPhone13")) return "iPhone 13";
    if (userAgent.includes("iPhone12")) return "iPhone 12";
    if (userAgent.includes("iPhoneSE")) return "iPhone SE";
    return "iPhone";
  }

  private detectiPadModel(userAgent: string): string {
    if (userAgent.includes("iPad")) {
      // Simplified detection
      return "iPad";
    }
    return "iPad";
  }

  private detectTablet(userAgent: string): boolean {
    return /iPad|Android.*Tablet|PlayBook|Silk/.test(userAgent) ||
           (window.innerWidth >= 768 && /Android/.test(userAgent));
  }

  private checkFeature(key: string, testFunction: () => boolean): boolean {
    if (this.featureCache.has(key)) {
      return this.featureCache.get(key)!;
    }
    
    try {
      const result = testFunction();
      this.featureCache.set(key, result);
      return result;
    } catch {
      this.featureCache.set(key, false);
      return false;
    }
  }
}

export const deviceCompatibilityService = new DeviceCompatibilityService();