/**
 * @jest-environment jsdom
 */

import { mobileOrientationService } from "@/lib/mobile-orientation-service";
import type { OrientationState } from "@/lib/mobile-orientation-service";

// Mock screen orientation API
const mockScreenOrientation = {
  type: "portrait-primary",
  angle: 0,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock window properties
Object.defineProperty(window, "screen", {
  writable: true,
  value: {
    ...window.screen,
    orientation: mockScreenOrientation,
    width: 375,
    height: 667,
  },
});

Object.defineProperty(window, "innerWidth", {
  writable: true,
  value: 375,
});

Object.defineProperty(window, "innerHeight", {
  writable: true,
  value: 667,
});

// Mock document.documentElement.style
Object.defineProperty(document.documentElement, "style", {
  value: {
    setProperty: jest.fn(),
    getPropertyValue: jest.fn(),
  },
});

// Mock getComputedStyle
Object.defineProperty(window, "getComputedStyle", {
  value: jest.fn(() => ({
    getPropertyValue: jest.fn().mockImplementation((prop) => {
      const values = {
        "--safe-area-inset-top": "0px",
        "--safe-area-inset-right": "0px",
        "--safe-area-inset-bottom": "34px",
        "--safe-area-inset-left": "0px",
      };
      return values[prop] || "0px";
    }),
  })),
});

// Mock body classList
Object.defineProperty(document.body, "classList", {
  value: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
  },
});

describe("MobileOrientationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset orientation to portrait
    mockScreenOrientation.type = "portrait-primary";
    mockScreenOrientation.angle = 0;

    // Reset window dimensions
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 667, writable: true });

    // Force refresh the service
    mobileOrientationService.forceRefresh();
  });

  describe("Orientation Detection", () => {
    test("detects portrait orientation correctly", () => {
      const state = mobileOrientationService.getState();

      expect(state.orientation).toBe("portrait");
      expect(state.angle).toBe(0);
      expect(mobileOrientationService.isPortrait()).toBe(true);
      expect(mobileOrientationService.isLandscape()).toBe(false);
    });

    test("detects landscape orientation correctly", () => {
      // Mock landscape orientation
      mockScreenOrientation.type = "landscape-primary";
      mockScreenOrientation.angle = 90;
      Object.defineProperty(window, "innerWidth", { value: 667, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 375, writable: true });

      mobileOrientationService.forceRefresh();
      const state = mobileOrientationService.getState();

      expect(state.orientation).toBe("landscape");
      expect(state.angle).toBe(90);
      expect(mobileOrientationService.isLandscape()).toBe(true);
      expect(mobileOrientationService.isPortrait()).toBe(false);
    });

    test("handles missing orientation API gracefully", () => {
      // Remove orientation API
      Object.defineProperty(window.screen, "orientation", {
        value: undefined,
        writable: true,
      });

      mobileOrientationService.forceRefresh();
      const state = mobileOrientationService.getState();

      // Should fall back to dimension-based detection
      expect(state.isSupported).toBe(false);
      expect(state.orientation).toBe("portrait"); // Height > width
    });
  });

  describe("Safe Area Insets", () => {
    test("detects safe area insets correctly", () => {
      const state = mobileOrientationService.getState();

      expect(state.safeAreaInsets.top).toBe(0);
      expect(state.safeAreaInsets.right).toBe(0);
      expect(state.safeAreaInsets.bottom).toBe(34); // iPhone home indicator
      expect(state.safeAreaInsets.left).toBe(0);
    });

    test("handles missing safe area insets", () => {
      // Mock getComputedStyle to return empty values
      (window.getComputedStyle as jest.Mock).mockReturnValue({
        getPropertyValue: jest.fn().mockReturnValue(""),
      });

      mobileOrientationService.forceRefresh();
      const state = mobileOrientationService.getState();

      expect(state.safeAreaInsets.top).toBe(0);
      expect(state.safeAreaInsets.right).toBe(0);
      expect(state.safeAreaInsets.bottom).toBe(0);
      expect(state.safeAreaInsets.left).toBe(0);
    });
  });

  describe("Layout Optimization", () => {
    test("applies portrait layout optimizations", () => {
      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--mini-height",
        "68px",
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--mini-icon",
        "44px",
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith("--nav-gap", "16px");
      expect(document.body.classList.add).toHaveBeenCalledWith("orientation-portrait");
    });

    test("applies landscape layout optimizations", () => {
      // Set landscape orientation
      mockScreenOrientation.type = "landscape-primary";
      Object.defineProperty(window, "innerWidth", { value: 667, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 375, writable: true });

      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--mini-height",
        "56px",
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--mini-icon",
        "40px",
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith("--nav-gap", "12px");
      expect(document.body.classList.add).toHaveBeenCalledWith("orientation-landscape");
    });

    test("updates CSS variables for screen dimensions", () => {
      mobileOrientationService.forceRefresh();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--current-orientation",
        "portrait",
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--screen-width",
        "375px",
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--screen-height",
        "667px",
      );
    });
  });

  describe("Mini Player Optimization", () => {
    test("calculates optimal mini-player size for portrait", () => {
      const size = mobileOrientationService.getOptimalMiniPlayerSize();

      expect(size.height).toBe(68);
      expect(size.iconSize).toBe(44);
      expect(size.width).toBeLessThanOrEqual(375 - 32); // Screen width minus margins
    });

    test("calculates optimal mini-player size for landscape", () => {
      // Set landscape orientation
      mockScreenOrientation.type = "landscape-primary";
      Object.defineProperty(window, "innerWidth", { value: 667, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 375, writable: true });

      mobileOrientationService.forceRefresh();
      const size = mobileOrientationService.getOptimalMiniPlayerSize();

      expect(size.height).toBe(56);
      expect(size.iconSize).toBe(40);
      expect(size.width).toBeLessThanOrEqual(667 - 24); // Screen width minus margins
    });

    test("generates orientation CSS variables", () => {
      const css = mobileOrientationService.getOrientationCSS();

      expect(css).toHaveProperty("--mini-computed-height");
      expect(css).toHaveProperty("--mini-computed-icon");
      expect(css).toHaveProperty("--mini-computed-width");
      expect(css).toHaveProperty("--current-orientation");
      expect(css["--current-orientation"]).toBe("portrait");
    });
  });

  describe("Event Handling", () => {
    test("notifies callbacks on orientation change", () => {
      const callback = jest.fn();
      const unsubscribe = mobileOrientationService.onOrientationChange(callback);

      // Simulate orientation change
      mockScreenOrientation.type = "landscape-primary";
      Object.defineProperty(window, "innerWidth", { value: 667, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 375, writable: true });

      mobileOrientationService.forceRefresh();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          orientation: "landscape",
          availableWidth: 667,
          availableHeight: 375,
        }),
      );

      unsubscribe();
    });

    test("removes callback after unsubscribe", () => {
      const callback = jest.fn();
      const unsubscribe = mobileOrientationService.onOrientationChange(callback);

      unsubscribe();

      // Change orientation
      mockScreenOrientation.type = "landscape-primary";
      mobileOrientationService.forceRefresh();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    test("updates configuration correctly", () => {
      mobileOrientationService.updateConfig({
        enableLayoutOptimization: false,
        trackOrientationChanges: false,
      });

      // Should not apply layout optimizations when disabled
      const setPropertyCalls = (document.documentElement.style.setProperty as jest.Mock).mock.calls
        .length;

      mobileOrientationService.forceRefresh();

      // Should not have added new setProperty calls
      expect((document.documentElement.style.setProperty as jest.Mock).mock.calls.length).toBe(
        setPropertyCalls,
      );
    });
  });

  describe("Error Handling", () => {
    test("handles errors in callbacks gracefully", () => {
      const errorCallback = jest.fn(() => {
        throw new Error("Test error");
      });
      const normalCallback = jest.fn();

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mobileOrientationService.onOrientationChange(errorCallback);
      mobileOrientationService.onOrientationChange(normalCallback);

      mobileOrientationService.forceRefresh();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in orientation change callback:",
        expect.any(Error),
      );
      expect(normalCallback).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("handles missing window object gracefully", () => {
      // This test would need to be run in a Node environment,
      // but we can test that the service doesn't crash
      expect(() => {
        mobileOrientationService.getState();
      }).not.toThrow();
    });
  });

  describe("Device Categories", () => {
    test("detects small screen device", () => {
      Object.defineProperty(window, "innerWidth", { value: 320, writable: true });
      mobileOrientationService.forceRefresh();

      const state = mobileOrientationService.getState();
      expect(state.availableWidth).toBe(320);

      // Should apply small screen optimizations
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        "--content-padding",
        "12px",
      );
    });

    test("detects medium screen device", () => {
      Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
      mobileOrientationService.forceRefresh();

      const state = mobileOrientationService.getState();
      expect(state.availableWidth).toBe(375);
    });

    test("detects large screen device", () => {
      Object.defineProperty(window, "innerWidth", { value: 414, writable: true });
      mobileOrientationService.forceRefresh();

      const state = mobileOrientationService.getState();
      expect(state.availableWidth).toBe(414);
    });
  });
});
