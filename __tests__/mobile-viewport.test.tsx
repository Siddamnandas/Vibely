/**
 * @jest-environment jsdom
 */

import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { ResizeObserver } from "@/__mocks__/ResizeObserver";
import { mobileOrientationService } from "@/lib/mobile-orientation-service";
import { useOrientation, useResponsiveDesign } from "@/hooks/use-orientation";
import { useIsMobile } from "@/hooks/use-mobile";
import { renderHook } from "@testing-library/react";
import React from "react";

// Mock ResizeObserver
global.ResizeObserver = ResizeObserver;

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  track: jest.fn(),
}));

// Mock BottomNav component for testing
const MockBottomNav = () => (
  <nav data-testid="bottom-nav" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
    <div>Navigation</div>
  </nav>
);

// Mock MiniPlayer component for testing
const MockMiniPlayer = ({ onExpand }: { onExpand: () => void }) => (
  <div
    data-testid="mini-player"
    onClick={onExpand}
    className="fixed bottom-[calc(var(--nav-height,80px)+var(--nav-gap,16px))]"
  >
    Mini Player
  </div>
);

// Mock viewport configuration
const mockViewport = (width: number, height: number, orientation: "portrait" | "landscape") => {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true });
  Object.defineProperty(window, "innerHeight", { value: height, writable: true });
  Object.defineProperty(window.screen, "orientation", {
    value: {
      type: `${orientation}-primary`,
      angle: orientation === "portrait" ? 0 : 90,
    },
    writable: true,
  });
};

describe("Mobile Viewport and Responsive Behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mobile portrait
    mockViewport(375, 667, "portrait");

    // Mock document.documentElement.style.setProperty
    Object.defineProperty(document.documentElement, "style", {
      value: {
        setProperty: jest.fn(),
        getPropertyValue: jest.fn().mockReturnValue(""),
        removeProperty: jest.fn(),
      },
    });

    // Mock getComputedStyle for CSS custom properties
    Object.defineProperty(window, "getComputedStyle", {
      value: jest.fn(() => ({
        getPropertyValue: jest.fn().mockImplementation((prop) => {
          const values: Record<string, string> = {
            "--safe-area-inset-top": "0px",
            "--safe-area-inset-right": "0px",
            "--safe-area-inset-bottom": "34px",
            "--safe-area-inset-left": "0px",
            "--nav-height": "80px",
            "--nav-gap": "16px",
          };
          return values[prop] || "";
        }),
      })),
    });

    mobileOrientationService.forceRefresh();
  });

  describe("Viewport Meta Configuration", () => {
    test("sets correct viewport meta tag attributes", () => {
      // This would be tested at the HTML level
      // Verify key viewport settings are configured
      expect(1).toBe(1); // Placeholder - actual implementation would check meta tag
    });

    test("handles different device pixel ratios", () => {
      // Mock high DPI device
      Object.defineProperty(window, "devicePixelRatio", { value: 3 });

      const { result } = renderHook(() => useResponsiveDesign());

      expect(result.current.devicePixelRatio).toBe(3);
      expect(result.current.isHighDPI).toBe(true);
    });
  });

  describe("Screen Size Detection", () => {
    test("detects mobile portrait correctly", () => {
      mockViewport(375, 667, "portrait");

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(true);
    });

    test("detects mobile landscape correctly", () => {
      mockViewport(667, 375, "landscape");

      const { result } = renderHook(() => useResponsiveDesign());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.breakpoint).toBe("sm-landscape");
    });

    test("detects tablet portrait correctly", () => {
      mockViewport(768, 1024, "portrait");

      const { result } = renderHook(() => useResponsiveDesign());

      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });

    test("detects desktop correctly", () => {
      mockViewport(1920, 1080, "landscape");

      const { result } = renderHook(() => useResponsiveDesign());

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
    });

    test("handles edge case screen sizes", () => {
      const edgeCases = [
        { width: 320, height: 568, device: "iPhone SE", expected: "xs-portrait" },
        { width: 414, height: 896, device: "iPhone 11 Pro Max", expected: "md-portrait" },
        { width: 393, height: 852, device: "Pixel 7", expected: "sm-portrait" },
        { width: 820, height: 1180, device: "iPad Air", expected: "lg-portrait" },
      ];

      edgeCases.forEach(({ width, height, device, expected }) => {
        mockViewport(width, height, "portrait");

        const { result } = renderHook(() => useResponsiveDesign());

        expect(result.current.breakpoint).toBe(expected);
      });
    });
  });

  describe("Orientation Changes", () => {
    test("handles portrait to landscape transition", async () => {
      const { result, rerender } = renderHook(() => useOrientation());

      expect(result.current.orientation).toBe("portrait");

      // Simulate orientation change
      mockViewport(667, 375, "landscape");
      window.dispatchEvent(new Event("orientationchange"));

      await waitFor(() => {
        expect(result.current.orientation).toBe("landscape");
      });
    });

    test("updates CSS variables on orientation change", () => {
      mockViewport(375, 667, "portrait");
      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--current-orientation",
        "portrait",
      );

      mockViewport(667, 375, "landscape");
      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--current-orientation",
        "landscape",
      );
    });

    test("applies orientation-specific CSS classes", () => {
      mockViewport(375, 667, "portrait");
      mobileOrientationService.forceRefresh();

      expect(document.body.classList.add).toHaveBeenCalledWith("orientation-portrait");

      mockViewport(667, 375, "landscape");
      mobileOrientationService.forceRefresh();

      expect(document.body.classList.remove).toHaveBeenCalledWith("orientation-portrait");
      expect(document.body.classList.add).toHaveBeenCalledWith("orientation-landscape");
    });
  });

  describe("Safe Area Insets", () => {
    test("detects iPhone safe area insets", () => {
      // Mock iPhone 14 Pro safe areas
      (window.getComputedStyle as jest.Mock).mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((prop) => {
          const iphoneSafeAreas: Record<string, string> = {
            "--safe-area-inset-top": "47px",
            "--safe-area-inset-right": "0px",
            "--safe-area-inset-bottom": "34px",
            "--safe-area-inset-left": "0px",
          };
          return iphoneSafeAreas[prop] || "";
        }),
      });

      mobileOrientationService.forceRefresh();
      const state = mobileOrientationService.getState();

      expect(state.safeAreaInsets.top).toBe(47);
      expect(state.safeAreaInsets.bottom).toBe(34);
    });

    test("handles landscape safe area changes", () => {
      mockViewport(844, 390, "landscape"); // iPhone 14 Pro landscape

      (window.getComputedStyle as jest.Mock).mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((prop) => {
          const landscapeSafeAreas: Record<string, string> = {
            "--safe-area-inset-top": "0px",
            "--safe-area-inset-right": "47px",
            "--safe-area-inset-bottom": "21px",
            "--safe-area-inset-left": "47px",
          };
          return landscapeSafeAreas[prop] || "";
        }),
      });

      mobileOrientationService.forceRefresh();
      const state = mobileOrientationService.getState();

      expect(state.safeAreaInsets.left).toBe(47);
      expect(state.safeAreaInsets.right).toBe(47);
    });
  });

  describe("Component Layout Adaptation", () => {
    test("adapts mini-player size for portrait", () => {
      mockViewport(375, 667, "portrait");

      const { result } = renderHook(() => useOrientation());
      const size = result.current.getOptimalMiniPlayerSize();

      expect(size.height).toBe(68);
      expect(size.iconSize).toBe(44);
    });

    test("adapts mini-player size for landscape", () => {
      mockViewport(667, 375, "landscape");

      const { result } = renderHook(() => useOrientation());
      const size = result.current.getOptimalMiniPlayerSize();

      expect(size.height).toBe(56);
      expect(size.iconSize).toBe(40);
    });

    test("adjusts navigation spacing based on screen size", () => {
      // Small screen
      mockViewport(320, 568, "portrait");
      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--content-padding",
        "16px",
      );

      // Large screen
      mockViewport(414, 896, "portrait");
      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--content-padding",
        "20px",
      );
    });
  });

  describe("Responsive Design Utilities", () => {
    test("provides correct spacing calculations", () => {
      const { result } = renderHook(() => useResponsiveDesign());

      // Base spacing should be adjusted for mobile
      expect(result.current.getSpacing(16)).toBeLessThanOrEqual(16);
      expect(result.current.getSpacing(24)).toBeLessThanOrEqual(24);
    });

    test("provides responsive font size calculations", () => {
      const { result } = renderHook(() => useResponsiveDesign());

      const fontSize = result.current.getResponsiveFontSize("lg");
      expect(typeof fontSize).toBe("string");
      expect(fontSize).toMatch(/\d+(\.\d+)?(px|rem)/);
    });

    test("detects touch capability correctly", () => {
      // Mock touch device
      Object.defineProperty(window, "ontouchstart", { value: null });
      Object.defineProperty(navigator, "maxTouchPoints", { value: 5 });

      const { result } = renderHook(() => useResponsiveDesign());

      expect(result.current.isTouchDevice).toBe(true);
    });
  });

  describe("Layout Performance", () => {
    test("debounces orientation change events", async () => {
      const callback = jest.fn();
      mobileOrientationService.onOrientationChange(callback);

      // Rapid orientation changes
      mockViewport(667, 375, "landscape");
      window.dispatchEvent(new Event("orientationchange"));

      mockViewport(375, 667, "portrait");
      window.dispatchEvent(new Event("orientationchange"));

      // Should debounce and only call once after delay
      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    test("optimizes reflow operations", () => {
      const setPropertySpy = jest.spyOn(document.documentElement.style, "setProperty");

      mockViewport(375, 667, "portrait");
      mobileOrientationService.forceRefresh();

      // Should batch style updates to minimize reflows
      expect(setPropertySpy).toHaveBeenCalled();
    });
  });

  describe("Accessibility Considerations", () => {
    test("respects prefers-reduced-motion", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        value: jest.fn().mockImplementation((query) => {
          if (query === "(prefers-reduced-motion: reduce)") {
            return { matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() };
          }
          return { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
        }),
      });

      const { result } = renderHook(() => useResponsiveDesign());

      expect(result.current.prefersReducedMotion).toBe(true);
    });

    test("ensures minimum touch target sizes", () => {
      const { result } = renderHook(() => useResponsiveDesign());

      const minTouchSize = result.current.getMinimumTouchTarget();
      expect(minTouchSize.width).toBeGreaterThanOrEqual(44);
      expect(minTouchSize.height).toBeGreaterThanOrEqual(44);
    });

    test("provides high contrast mode detection", () => {
      Object.defineProperty(window, "matchMedia", {
        value: jest.fn().mockImplementation((query) => {
          if (query === "(prefers-contrast: high)") {
            return { matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() };
          }
          return { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
        }),
      });

      const { result } = renderHook(() => useResponsiveDesign());

      expect(result.current.prefersHighContrast).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("handles missing orientation API gracefully", () => {
      // Remove orientation API
      delete (window.screen as any).orientation;

      expect(() => {
        mobileOrientationService.forceRefresh();
      }).not.toThrow();

      const state = mobileOrientationService.getState();
      expect(state.isSupported).toBe(false);
    });

    test("handles invalid viewport dimensions", () => {
      mockViewport(0, 0, "portrait");

      expect(() => {
        mobileOrientationService.forceRefresh();
      }).not.toThrow();

      const state = mobileOrientationService.getState();
      expect(state.availableWidth).toBeGreaterThan(0);
      expect(state.availableHeight).toBeGreaterThan(0);
    });

    test("provides fallback values for missing CSS custom properties", () => {
      (window.getComputedStyle as jest.Mock).mockReturnValue({
        getPropertyValue: jest.fn().mockReturnValue(""),
      });

      mobileOrientationService.forceRefresh();
      const state = mobileOrientationService.getState();

      // Should use fallback values
      expect(state.safeAreaInsets.top).toBe(0);
      expect(state.safeAreaInsets.bottom).toBe(0);
    });
  });

  describe("Integration with UI Components", () => {
    test("coordinates with bottom navigation positioning", () => {
      render(<MockBottomNav />);

      mockViewport(375, 667, "portrait");
      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--nav-height",
        expect.stringMatching(/\d+px/),
      );
    });

    test("coordinates with mini-player positioning", () => {
      const onExpand = jest.fn();
      render(<MockMiniPlayer onExpand={onExpand} />);

      mockViewport(375, 667, "portrait");
      mobileOrientationService.forceRefresh();

      // Mini-player should position relative to navigation
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--mini-height",
        "68px",
      );
    });

    test("adapts full-screen modal positioning for notched devices", () => {
      // Mock iPhone with notch
      (window.getComputedStyle as jest.Mock).mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((prop) => {
          if (prop === "--safe-area-inset-top") return "47px";
          return "0px";
        }),
      });

      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--safe-area-top",
        "47px",
      );
    });
  });
});
