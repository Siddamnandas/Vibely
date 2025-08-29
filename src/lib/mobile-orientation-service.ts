"use client";

import { track as trackEvent } from "@/lib/analytics";

interface OrientationState {
  orientation: "portrait" | "landscape";
  angle: number;
  isSupported: boolean;
  screenWidth: number;
  screenHeight: number;
  availableWidth: number;
  availableHeight: number;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface OrientationConfig {
  enableLayoutOptimization: boolean;
  enableResponsiveSpacing: boolean;
  debounceDelay: number;
  trackOrientationChanges: boolean;
}

type OrientationChangeCallback = (state: OrientationState) => void;

class MobileOrientationService {
  private static instance: MobileOrientationService;
  private callbacks = new Set<OrientationChangeCallback>();
  private currentState: OrientationState;
  private config: OrientationConfig;
  private debounceTimer: NodeJS.Timeout | null = null;

  private defaultConfig: OrientationConfig = {
    enableLayoutOptimization: true,
    enableResponsiveSpacing: true,
    debounceDelay: 150,
    trackOrientationChanges: true,
  };

  static getInstance(): MobileOrientationService {
    if (!MobileOrientationService.instance) {
      MobileOrientationService.instance = new MobileOrientationService();
    }
    return MobileOrientationService.instance;
  }

  constructor() {
    this.config = { ...this.defaultConfig };
    this.currentState = this.getInitialState();
    this.initializeListeners();
    console.log("📱 Mobile Orientation Service initialized");
  }

  private getInitialState(): OrientationState {
    if (typeof window === "undefined") {
      return {
        orientation: "portrait",
        angle: 0,
        isSupported: false,
        screenWidth: 375,
        screenHeight: 667,
        availableWidth: 375,
        availableHeight: 667,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      };
    }

    const orientation = this.detectOrientation();
    const angle = this.getOrientationAngle();
    const safeAreaInsets = this.getSafeAreaInsets();

    return {
      orientation,
      angle,
      isSupported: this.isOrientationSupported(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      availableWidth: window.innerWidth,
      availableHeight: window.innerHeight,
      safeAreaInsets,
    };
  }

  private initializeListeners() {
    if (typeof window === "undefined") return;

    // Delay initialization to avoid SSR hydration issues
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupListeners();
      });
    } else {
      // Document is already loaded
      this.setupListeners();
    }
  }

  private setupListeners() {
    // Modern orientation API
    if ("screen" in window && "orientation" in window.screen) {
      window.screen.orientation.addEventListener(
        "change",
        this.handleOrientationChange.bind(this)
      );
    }

    // Fallback for older browsers
    window.addEventListener("orientationchange", this.handleOrientationChange.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));

    // Initial layout optimization after DOM is ready
    setTimeout(() => {
      this.applyLayoutOptimizations();
    }, 100); // Small delay to ensure hydration is complete
  }

  private handleOrientationChange = () => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const newState = this.getInitialState();
      const orientationChanged = newState.orientation !== this.currentState.orientation;

      this.currentState = newState;

      if (orientationChanged) {
        this.applyLayoutOptimizations();
        this.notifyCallbacks();

        if (this.config.trackOrientationChanges) {
          this.trackOrientationChange(newState);
        }
      }
    }, this.config.debounceDelay);
  };

  private handleResize = () => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const newState = {
        ...this.currentState,
        availableWidth: window.innerWidth,
        availableHeight: window.innerHeight,
        safeAreaInsets: this.getSafeAreaInsets(),
      };

      this.currentState = newState;
      this.applyLayoutOptimizations();
      this.notifyCallbacks();
    }, this.config.debounceDelay);
  };

  private detectOrientation(): "portrait" | "landscape" {
    if (typeof window === "undefined") return "portrait";

    // Modern API
    if ("screen" in window && "orientation" in window.screen) {
      const orientation = window.screen.orientation.type;
      return orientation.includes("portrait") ? "portrait" : "landscape";
    }

    // Fallback based on dimensions
    return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
  }

  private getOrientationAngle(): number {
    if (typeof window === "undefined") return 0;

    // Modern API
    if ("screen" in window && "orientation" in window.screen) {
      return window.screen.orientation.angle;
    }

    // Fallback
    return (window as any).orientation || 0;
  }

  private isOrientationSupported(): boolean {
    return typeof window !== "undefined" && 
           "screen" in window && 
           "orientation" in window.screen;
  }

  private getSafeAreaInsets() {
    if (typeof window === "undefined") {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const computedStyle = window.getComputedStyle(document.documentElement);
    
    return {
      top: this.parseCSSValue(computedStyle.getPropertyValue("--safe-area-inset-top")) || 
           this.parseCSSValue(computedStyle.getPropertyValue("env(safe-area-inset-top)")) || 0,
      right: this.parseCSSValue(computedStyle.getPropertyValue("--safe-area-inset-right")) || 
             this.parseCSSValue(computedStyle.getPropertyValue("env(safe-area-inset-right)")) || 0,
      bottom: this.parseCSSValue(computedStyle.getPropertyValue("--safe-area-inset-bottom")) || 
              this.parseCSSValue(computedStyle.getPropertyValue("env(safe-area-inset-bottom)")) || 0,
      left: this.parseCSSValue(computedStyle.getPropertyValue("--safe-area-inset-left")) || 
            this.parseCSSValue(computedStyle.getPropertyValue("env(safe-area-inset-left)")) || 0,
    };
  }

  private parseCSSValue(value: string): number {
    if (!value || value === "0") return 0;
    const num = parseFloat(value.replace(/px|rem|em/, ""));
    return isNaN(num) ? 0 : num;
  }

  private applyLayoutOptimizations() {
    if (!this.config.enableLayoutOptimization || typeof window === "undefined") return;

    const root = document.documentElement;
    const { orientation, availableWidth, availableHeight, safeAreaInsets } = this.currentState;

    // Update CSS custom properties for orientation-aware layouts
    root.style.setProperty("--current-orientation", orientation);
    root.style.setProperty("--screen-width", `${availableWidth}px`);
    root.style.setProperty("--screen-height", `${availableHeight}px`);

    // Orientation-specific mini-player adjustments
    if (orientation === "landscape") {
      // Landscape mode optimizations
      root.style.setProperty("--mini-height", "56px"); // Smaller height for landscape
      root.style.setProperty("--mini-icon", "40px"); // Smaller icon
      root.style.setProperty("--nav-gap", "12px"); // Reduced gap
      root.style.setProperty("--mini-border-radius", "16px"); // Smaller radius
      
      // Adjust positioning for landscape safe areas
      const landscapeBottom = Math.max(safeAreaInsets.bottom, 8);
      root.style.setProperty("--mini-landscape-offset", `${landscapeBottom}px`);
      
    } else {
      // Portrait mode optimizations
      root.style.setProperty("--mini-height", "68px"); // Standard height
      root.style.setProperty("--mini-icon", "44px"); // Standard icon size
      root.style.setProperty("--nav-gap", "16px"); // Standard gap
      root.style.setProperty("--mini-border-radius", "20px"); // Standard radius
      
      // Adjust positioning for portrait safe areas
      const portraitBottom = Math.max(safeAreaInsets.bottom, 12);
      root.style.setProperty("--mini-portrait-offset", `${portraitBottom}px`);
    }

    // Set responsive spacing variables
    if (this.config.enableResponsiveSpacing) {
      this.updateResponsiveSpacing();
    }

    // Only add orientation class to body after DOM is fully ready
    // This prevents hydration mismatches
    setTimeout(() => {
      if (document.body) {
        document.body.classList.remove("orientation-portrait", "orientation-landscape");
        document.body.classList.add(`orientation-${orientation}`);
      }
    }, 0);

    console.log(`📱 Layout optimized for ${orientation} mode`);
  }

  private updateResponsiveSpacing() {
    const root = document.documentElement;
    const { orientation, availableWidth } = this.currentState;

    // Screen size categories
    const isSmallScreen = availableWidth < 375;
    const isMediumScreen = availableWidth >= 375 && availableWidth < 414;
    const isLargeScreen = availableWidth >= 414;

    // Responsive spacing based on screen size and orientation
    if (orientation === "landscape") {
      root.style.setProperty("--content-padding", isSmallScreen ? "12px" : "16px");
      root.style.setProperty("--mini-side-margin", isSmallScreen ? "8px" : "12px");
    } else {
      root.style.setProperty("--content-padding", isSmallScreen ? "16px" : "20px");
      root.style.setProperty("--mini-side-margin", isSmallScreen ? "12px" : "16px");
    }

    // Update mini-player specific spacing
    const miniSideMargin = root.style.getPropertyValue("--mini-side-margin") || "16px";
    root.style.setProperty("--mini-left", miniSideMargin);
    root.style.setProperty("--mini-right", miniSideMargin);
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error("Error in orientation change callback:", error);
      }
    });
  }

  private trackOrientationChange(state: OrientationState) {
    trackEvent("mobile_orientation_changed", {
      orientation: state.orientation,
      angle: state.angle,
      screen_width: state.screenWidth,
      screen_height: state.screenHeight,
      available_width: state.availableWidth,
      available_height: state.availableHeight,
      safe_area_bottom: state.safeAreaInsets.bottom,
    });
  }

  // Public API methods
  public getState(): OrientationState {
    return { ...this.currentState };
  }

  public isPortrait(): boolean {
    return this.currentState.orientation === "portrait";
  }

  public isLandscape(): boolean {
    return this.currentState.orientation === "landscape";
  }

  public onOrientationChange(callback: OrientationChangeCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public updateConfig(newConfig: Partial<OrientationConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enableLayoutOptimization !== undefined) {
      this.applyLayoutOptimizations();
    }
  }

  public forceRefresh() {
    this.currentState = this.getInitialState();
    this.applyLayoutOptimizations();
    this.notifyCallbacks();
  }

  // Utility methods for components
  public getOptimalMiniPlayerSize(): { width: number; height: number; iconSize: number } {
    const { orientation, availableWidth } = this.currentState;
    
    if (orientation === "landscape") {
      return {
        width: Math.min(availableWidth - 24, 400), // Max width with margins
        height: 56,
        iconSize: 40,
      };
    } else {
      return {
        width: Math.min(availableWidth - 32, 500), // Max width with margins
        height: 68,
        iconSize: 44,
      };
    }
  }

  public getOrientationCSS(): Record<string, string> {
    const { orientation } = this.currentState;
    const size = this.getOptimalMiniPlayerSize();
    
    return {
      "--mini-computed-height": `${size.height}px`,
      "--mini-computed-icon": `${size.iconSize}px`,
      "--mini-computed-width": `${size.width}px`,
      "--current-orientation": orientation,
    };
  }
}

// Export singleton instance
export const mobileOrientationService = MobileOrientationService.getInstance();

// Export types
export type { OrientationState, OrientationConfig, OrientationChangeCallback };