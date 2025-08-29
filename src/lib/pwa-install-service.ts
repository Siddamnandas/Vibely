"use client";

import { track as trackEvent } from "@/lib/analytics";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallStatus {
  canInstall: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  platform: string;
  browserSupport: boolean;
}

class PWAInstallService {
  private static instance: PWAInstallService;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private statusListeners: ((status: PWAInstallStatus) => void)[] = [];
  private isStandalone = false;
  private hasPromptedBefore = false;
  private installPromptDismissCount = 0;

  static getInstance(): PWAInstallService {
    if (!PWAInstallService.instance) {
      PWAInstallService.instance = new PWAInstallService();
    }
    return PWAInstallService.instance;
  }

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    if (typeof window === "undefined") return;

    // Check if app is running in standalone mode
    this.isStandalone = this.checkStandaloneMode();

    // Load previous prompt history
    this.loadPromptHistory();

    // Set up event listeners
    this.setupEventListeners();

    // Track PWA capabilities
    this.trackPWACapabilities();

    console.log("🔧 PWA Install Service initialized");
  }

  private checkStandaloneMode(): boolean {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }

    // Check for iOS Safari standalone mode
    if ("standalone" in window.navigator && (window.navigator as any).standalone) {
      return true;
    }

    // Check if launched from home screen on Android
    if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) {
      return true;
    }

    return false;
  }

  private loadPromptHistory() {
    try {
      const history = localStorage.getItem("pwa-install-history");
      if (history) {
        const data = JSON.parse(history);
        this.hasPromptedBefore = data.hasPromptedBefore || false;
        this.installPromptDismissCount = data.dismissCount || 0;
      }
    } catch (error) {
      console.warn("Failed to load PWA install history:", error);
    }
  }

  private savePromptHistory() {
    try {
      const history = {
        hasPromptedBefore: this.hasPromptedBefore,
        dismissCount: this.installPromptDismissCount,
        lastPromptDate: new Date().toISOString(),
      };
      localStorage.setItem("pwa-install-history", JSON.stringify(history));
    } catch (error) {
      console.warn("Failed to save PWA install history:", error);
    }
  }

  private setupEventListeners() {
    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("📱 PWA install prompt available");

      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Store the event for later use
      this.deferredPrompt = e as BeforeInstallPromptEvent;

      this.notifyStatusListeners();

      trackEvent("pwa_install_prompt_available", {
        platforms: this.deferredPrompt.platforms,
        user_agent: navigator.userAgent,
      });
    });

    // Listen for app installation
    window.addEventListener("appinstalled", (e) => {
      console.log("✅ PWA installed successfully");

      this.deferredPrompt = null;
      this.isStandalone = true;

      this.notifyStatusListeners();

      trackEvent("pwa_installed", {
        installation_method: "browser_prompt",
      });
    });

    // Listen for display mode changes
    if (window.matchMedia) {
      const standaloneQuery = window.matchMedia("(display-mode: standalone)");
      standaloneQuery.addListener((e) => {
        this.isStandalone = e.matches;
        this.notifyStatusListeners();
      });
    }
  }

  private trackPWACapabilities() {
    const capabilities = {
      service_worker_support: "serviceWorker" in navigator,
      manifest_support: "manifest" in document.head,
      push_support: "PushManager" in window,
      notification_support: "Notification" in window,
      cache_api_support: "caches" in window,
      indexeddb_support: "indexedDB" in window,
      background_sync_support:
        "serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype,
      web_share_support: "share" in navigator,
      is_standalone: this.isStandalone,
      is_ios: /iPad|iPhone|iPod/.test(navigator.userAgent),
      is_android: /Android/.test(navigator.userAgent),
    };

    trackEvent("pwa_capabilities_detected", capabilities);
  }

  // Public API methods
  async showInstallPrompt(): Promise<boolean> {
    if (!this.canShowInstallPrompt()) {
      console.warn("Cannot show install prompt - conditions not met");
      return false;
    }

    try {
      // Show the install prompt
      await this.deferredPrompt!.prompt();

      // Wait for the user's response
      const { outcome } = await this.deferredPrompt!.userChoice;

      this.hasPromptedBefore = true;
      this.savePromptHistory();

      if (outcome === "accepted") {
        console.log("✅ User accepted the install prompt");

        trackEvent("pwa_install_accepted", {
          prompt_trigger: "manual",
          dismiss_count_before: this.installPromptDismissCount,
        });

        return true;
      } else {
        console.log("❌ User dismissed the install prompt");

        this.installPromptDismissCount++;
        this.savePromptHistory();

        trackEvent("pwa_install_dismissed", {
          prompt_trigger: "manual",
          dismiss_count: this.installPromptDismissCount,
        });

        return false;
      }
    } catch (error) {
      console.error("Failed to show install prompt:", error);

      trackEvent("pwa_install_prompt_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return false;
    } finally {
      // Clear the deferred prompt
      this.deferredPrompt = null;
      this.notifyStatusListeners();
    }
  }

  canShowInstallPrompt(): boolean {
    return (
      this.deferredPrompt !== null && !this.isStandalone && this.installPromptDismissCount < 3 // Don't spam users
    );
  }

  getInstallStatus(): PWAInstallStatus {
    const platform = this.detectPlatform();
    const browserSupport = this.checkBrowserSupport();

    return {
      canInstall: this.canShowInstallPrompt(),
      isInstalled: this.isStandalone,
      isInstallable: this.deferredPrompt !== null,
      isStandalone: this.isStandalone,
      platform,
      browserSupport,
    };
  }

  private detectPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return "ios";
    } else if (/android/.test(userAgent)) {
      return "android";
    } else if (/windows/.test(userAgent)) {
      return "windows";
    } else if (/mac/.test(userAgent)) {
      return "macos";
    } else if (/linux/.test(userAgent)) {
      return "linux";
    }

    return "unknown";
  }

  private checkBrowserSupport(): boolean {
    // Check if browser supports PWA installation
    return "serviceWorker" in navigator && window.location.protocol === "https:";
  }

  // iOS specific install instructions
  getIOSInstallInstructions(): string[] {
    return [
      "1. Tap the Share button in Safari",
      "2. Scroll down and tap 'Add to Home Screen'",
      "3. Tap 'Add' to install Vibely",
      "4. Find the Vibely app on your home screen",
    ];
  }

  // Feature detection
  supportsInstallPrompt(): boolean {
    return this.deferredPrompt !== null;
  }

  shouldShowInstallBanner(): boolean {
    return !this.isStandalone && this.installPromptDismissCount < 2 && this.checkBrowserSupport();
  }

  // Status listeners management
  onStatusChange(listener: (status: PWAInstallStatus) => void): () => void {
    this.statusListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private notifyStatusListeners(): void {
    const status = this.getInstallStatus();
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("PWA status listener error:", error);
      }
    });
  }

  // Utility methods
  isIOSSafari(): boolean {
    const userAgent = navigator.userAgent;
    return (
      /iPad|iPhone|iPod/.test(userAgent) &&
      /Safari/.test(userAgent) &&
      !/CriOS|FxiOS/.test(userAgent)
    );
  }

  isAndroidChrome(): boolean {
    const userAgent = navigator.userAgent;
    return /Android/.test(userAgent) && /Chrome/.test(userAgent);
  }

  // Analytics helpers
  trackInstallBannerShown(): void {
    trackEvent("pwa_install_banner_shown", {
      platform: this.detectPlatform(),
      is_standalone: this.isStandalone,
      dismiss_count: this.installPromptDismissCount,
    });
  }

  trackInstallBannerDismissed(): void {
    this.installPromptDismissCount++;
    this.savePromptHistory();

    trackEvent("pwa_install_banner_dismissed", {
      platform: this.detectPlatform(),
      dismiss_count: this.installPromptDismissCount,
    });
  }
}

// Export singleton instance
export const pwaInstallService = PWAInstallService.getInstance();

export type { PWAInstallStatus, BeforeInstallPromptEvent };
