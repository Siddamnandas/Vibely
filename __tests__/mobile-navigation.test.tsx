/**
 * @jest-environment jsdom
 */

import { render, fireEvent, screen, waitFor, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { Router } from "next/router";
import { mobileGestureService } from "@/lib/mobile-gesture-service";
import { useSwipe } from "@/hooks/use-swipe";
import BottomNav from "@/components/layout/bottom-nav";
import { MiniPlayer } from "@/components/mini-player";
import { FullPlayer } from "@/components/full-player";
import React from "react";

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

jest.mock("next/router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  track: jest.fn(),
}));

// Mock playback context
const mockPlaybackContext = {
  isPlaying: false,
  current: null,
  queue: [],
  playTrackAt: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
};

jest.mock("@/context/playback-context", () => ({
  usePlayback: () => mockPlaybackContext,
}));

// Mock vibration API
Object.defineProperty(navigator, "vibrate", {
  writable: true,
  value: jest.fn(),
});

// Helper functions for touch events
function createTouchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number; identifier: number }>,
) {
  const touchList = touches.map((touch, index) => ({
    ...touch,
    target: document.body,
    pageX: touch.clientX,
    pageY: touch.clientY,
    screenX: touch.clientX,
    screenY: touch.clientY,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1,
  }));

  const event = new Event(type, { bubbles: true, cancelable: true }) as any;
  event.touches = touchList;
  event.changedTouches = touchList;
  event.targetTouches = touchList;
  event.preventDefault = jest.fn();
  event.stopPropagation = jest.fn();

  return event;
}

function simulateSwipe(
  element: HTMLElement,
  startX: number,
  endX: number,
  startY: number = 100,
  endY: number = 100,
) {
  const touchStart = createTouchEvent("touchstart", [
    { clientX: startX, clientY: startY, identifier: 0 },
  ]);
  const touchEnd = createTouchEvent("touchend", [{ clientX: endX, clientY: endY, identifier: 0 }]);

  element.dispatchEvent(touchStart);
  element.dispatchEvent(touchEnd);
}

describe("Mobile Navigation and Touch Interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlaybackContext.isPlaying = false;
    mockPlaybackContext.current = null;
  });

  describe("Bottom Navigation", () => {
    test("renders navigation items correctly", () => {
      render(<BottomNav />);

      expect(screen.getByLabelText("Generate")).toBeInTheDocument();
      expect(screen.getByLabelText("Library")).toBeInTheDocument();
      expect(screen.getByLabelText("Stories")).toBeInTheDocument();
      expect(screen.getByLabelText("Profile")).toBeInTheDocument();
    });

    test("highlights active navigation item", () => {
      render(<BottomNav />);

      const generateTab = screen.getByLabelText("Generate");
      expect(generateTab).toHaveClass("bg-gradient-to-r");
    });

    test("handles navigation tap interactions", () => {
      render(<BottomNav />);

      const libraryTab = screen.getByLabelText("Library");
      fireEvent.click(libraryTab);

      expect(mockRouter.push).toHaveBeenCalledWith("/library");
    });

    test("provides haptic feedback on navigation tap", () => {
      render(<BottomNav />);

      const libraryTab = screen.getByLabelKey("Library");
      fireEvent.click(libraryTab);

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    test("adapts to different screen sizes", () => {
      // Mock small screen
      Object.defineProperty(window, "innerWidth", { value: 320 });

      render(<BottomNav />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("w-[95%]"); // Should use full available width
    });

    test("maintains accessibility with touch targets", () => {
      render(<BottomNav />);

      const navButtons = screen.getAllByRole("link");
      navButtons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        // Each nav item should have minimum 44px touch target
        expect(button).toHaveClass("h-14"); // 56px, above minimum
      });
    });
  });

  describe("Swipe Gestures", () => {
    test("enables swipe gestures on swipeable elements", () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();

      const TestComponent = () => {
        const swipeRef = useSwipe({
          onSwipeLeft,
          onSwipeRight,
          threshold: 50,
        });

        return (
          <div ref={swipeRef} data-testid="swipeable">
            Swipeable Content
          </div>
        );
      };

      render(<TestComponent />);

      const swipeableElement = screen.getByTestId("swipeable");

      // Simulate swipe left
      simulateSwipe(swipeableElement, 150, 50);
      expect(onSwipeLeft).toHaveBeenCalled();

      // Simulate swipe right
      simulateSwipe(swipeableElement, 50, 150);
      expect(onSwipeRight).toHaveBeenCalled();
    });

    test("respects swipe threshold configuration", () => {
      const onSwipe = jest.fn();

      const TestComponent = () => {
        const swipeRef = useSwipe({
          onSwipeLeft: onSwipe,
          threshold: 100, // High threshold
        });

        return (
          <div ref={swipeRef} data-testid="swipeable">
            Content
          </div>
        );
      };

      render(<TestComponent />);

      const element = screen.getByTestId("swipeable");

      // Small swipe (shouldn't trigger)
      simulateSwipe(element, 100, 70); // Only 30px
      expect(onSwipe).not.toHaveBeenCalled();

      // Large swipe (should trigger)
      simulateSwipe(element, 150, 30); // 120px
      expect(onSwipe).toHaveBeenCalled();
    });

    test("handles multi-touch scenarios", () => {
      const onSwipe = jest.fn();

      const TestComponent = () => {
        const swipeRef = useSwipe({ onSwipeLeft: onSwipe });
        return (
          <div ref={swipeRef} data-testid="swipeable">
            Content
          </div>
        );
      };

      render(<TestComponent />);

      const element = screen.getByTestId("swipeable");

      // Multi-touch event
      const multiTouchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100, identifier: 0 },
        { clientX: 120, clientY: 100, identifier: 1 },
      ]);

      element.dispatchEvent(multiTouchStart);

      // Should handle gracefully without errors
      expect(() => {
        const touchEnd = createTouchEvent("touchend", [
          { clientX: 50, clientY: 100, identifier: 0 },
        ]);
        element.dispatchEvent(touchEnd);
      }).not.toThrow();
    });

    test("prevents default browser scrolling when needed", () => {
      const TestComponent = () => {
        const swipeRef = useSwipe({
          onSwipeLeft: jest.fn(),
          preventScroll: true,
        });
        return (
          <div ref={swipeRef} data-testid="swipeable">
            Content
          </div>
        );
      };

      render(<TestComponent />);

      const element = screen.getByTestId("swipeable");
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 100, identifier: 0 },
      ]);

      element.dispatchEvent(touchStart);

      expect(touchStart.preventDefault).toHaveBeenCalled();
    });
  });

  describe("Mini Player Interactions", () => {
    test("expands to full player on tap", () => {
      const onExpand = jest.fn();
      mockPlaybackContext.current = {
        id: "1",
        title: "Test Song",
        artist: "Test Artist",
        coverUrl: "/test.jpg",
        available: true,
      };

      render(<MiniPlayer onExpand={onExpand} />);

      const miniPlayer = screen.getByRole("button", { name: /mini player/i });
      fireEvent.click(miniPlayer);

      expect(onExpand).toHaveBeenCalled();
    });

    test("handles swipe gestures for track control", () => {
      mockPlaybackContext.current = {
        id: "1",
        title: "Test Song",
        artist: "Test Artist",
        coverUrl: "/test.jpg",
        available: true,
      };

      render(<MiniPlayer onExpand={jest.fn()} />);

      const miniPlayer = screen.getByRole("button", { name: /mini player/i });

      // Swipe left for next track
      simulateSwipe(miniPlayer, 150, 50);
      expect(mockPlaybackContext.next).toHaveBeenCalled();

      // Swipe right for previous track
      simulateSwipe(miniPlayer, 50, 150);
      expect(mockPlaybackContext.previous).toHaveBeenCalled();
    });

    test("adapts position based on safe area insets", () => {
      // Mock device with safe area insets
      Object.defineProperty(document.documentElement.style, "getPropertyValue", {
        value: jest.fn().mockImplementation((prop) => {
          if (prop === "--safe-area-inset-bottom") return "34px";
          return "0px";
        }),
      });

      render(<MiniPlayer onExpand={jest.fn()} />);

      const miniPlayer = screen.getByRole("button", { name: /mini player/i });
      expect(miniPlayer).toHaveStyle({
        bottom:
          "calc(var(--nav-height, 80px) + var(--nav-gap, 16px) + env(safe-area-inset-bottom, 0px))",
      });
    });
  });

  describe("Full Player Interactions", () => {
    test("handles swipe down to close", () => {
      const onClose = jest.fn();
      mockPlaybackContext.current = {
        id: "1",
        title: "Test Song",
        artist: "Test Artist",
        coverUrl: "/test.jpg",
        available: true,
      };

      render(<FullPlayer onClose={onClose} isVisible={true} />);

      const fullPlayer = screen.getByRole("dialog");

      // Swipe down to close
      simulateSwipe(fullPlayer, 100, 100, 50, 200);
      expect(onClose).toHaveBeenCalled();
    });

    test("handles horizontal swipe for track navigation", () => {
      mockPlaybackContext.current = {
        id: "1",
        title: "Test Song",
        artist: "Test Artist",
        coverUrl: "/test.jpg",
        available: true,
      };

      render(<FullPlayer onClose={jest.fn()} isVisible={true} />);

      const fullPlayer = screen.getByRole("dialog");

      // Swipe left for next
      simulateSwipe(fullPlayer, 200, 50);
      expect(mockPlaybackContext.next).toHaveBeenCalled();

      // Swipe right for previous
      simulateSwipe(fullPlayer, 50, 200);
      expect(mockPlaybackContext.previous).toHaveBeenCalled();
    });

    test("prevents background scroll when active", () => {
      render(<FullPlayer onClose={jest.fn()} isVisible={true} />);

      // Should add class to prevent body scroll
      expect(document.body).toHaveClass("overflow-hidden");
    });

    test("handles back navigation gesture", () => {
      const onClose = jest.fn();
      render(<FullPlayer onClose={onClose} isVisible={true} />);

      // Simulate back button press
      window.dispatchEvent(new PopStateEvent("popstate"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Touch Feedback", () => {
    test("provides haptic feedback for gestures", () => {
      mobileGestureService.enableHapticFeedback(true);

      const element = document.createElement("div");
      document.body.appendChild(element);

      const cleanup = mobileGestureService.enableGestures(element, {
        onTap: jest.fn(),
        onSwipeLeft: jest.fn(),
      });

      // Simulate tap
      simulateSwipe(element, 100, 105, 100, 105); // Small movement = tap

      // Should provide haptic feedback
      expect(navigator.vibrate).toHaveBeenCalledWith(10);

      cleanup();
    });

    test("provides different haptic patterns for different gestures", () => {
      mobileGestureService.enableHapticFeedback(true);

      // Simulate different gesture types
      document.dispatchEvent(
        new CustomEvent("gesture-performed", {
          detail: { gestureType: "longpress" },
        }),
      );

      expect(navigator.vibrate).toHaveBeenCalledWith([50, 30, 50]);
    });

    test("respects reduced motion preferences", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        value: jest.fn().mockImplementation((query) => {
          if (query === "(prefers-reduced-motion: reduce)") {
            return { matches: true };
          }
          return { matches: false };
        }),
      });

      mobileGestureService.enableHapticFeedback(true);

      // Should not provide haptic feedback when reduced motion is preferred
      document.dispatchEvent(
        new CustomEvent("gesture-performed", {
          detail: { gestureType: "tap" },
        }),
      );

      expect(navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    test("maintains focus management during navigation", () => {
      render(<BottomNav />);

      const firstTab = screen.getByLabelText("Generate");
      const secondTab = screen.getByLabelText("Library");

      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);

      // Simulate keyboard navigation
      fireEvent.keyDown(firstTab, { key: "ArrowRight" });
      expect(document.activeElement).toBe(secondTab);
    });

    test("provides screen reader announcements for gestures", () => {
      const element = document.createElement("div");
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", "Swipeable item");
      document.body.appendChild(element);

      const cleanup = mobileGestureService.enableGestures(element, {
        onSwipeLeft: () => {
          element.setAttribute("aria-live", "polite");
          element.setAttribute("aria-label", "Moved to next item");
        },
      });

      simulateSwipe(element, 150, 50);

      expect(element.getAttribute("aria-label")).toBe("Moved to next item");
      expect(element.getAttribute("aria-live")).toBe("polite");

      cleanup();
    });

    test("ensures minimum touch target sizes", () => {
      render(<BottomNav />);

      const navItems = screen.getAllByRole("link");
      navItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe("Performance Optimization", () => {
    test("debounces rapid gesture events", async () => {
      const onSwipe = jest.fn();
      const element = document.createElement("div");
      document.body.appendChild(element);

      const cleanup = mobileGestureService.enableGestures(element, {
        onSwipeLeft: onSwipe,
      });

      // Rapid swipes
      simulateSwipe(element, 150, 50);
      simulateSwipe(element, 150, 50);
      simulateSwipe(element, 150, 50);

      // Should debounce and not call excessively
      await waitFor(() => {
        expect(onSwipe).toHaveBeenCalledTimes(1);
      });

      cleanup();
    });

    test("uses passive event listeners where possible", () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");

      const element = document.createElement("div");
      const cleanup = mobileGestureService.enableGestures(element, {
        onTap: jest.fn(),
      });

      // Should use passive listeners for performance
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        expect.objectContaining({ passive: false }), // Can't be passive due to preventDefault needs
      );

      cleanup();
      addEventListenerSpy.mockRestore();
    });

    test("cleans up event listeners properly", () => {
      const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

      const element = document.createElement("div");
      const cleanup = mobileGestureService.enableGestures(element, {
        onTap: jest.fn(),
      });

      cleanup();

      // Should clean up all listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    test("handles touch events without active gesture element", () => {
      expect(() => {
        const touchEvent = createTouchEvent("touchstart", [
          { clientX: 100, clientY: 100, identifier: 0 },
        ]);
        document.dispatchEvent(touchEvent);
      }).not.toThrow();
    });

    test("handles malformed touch events gracefully", () => {
      const element = document.createElement("div");
      const cleanup = mobileGestureService.enableGestures(element, {
        onTap: jest.fn(),
      });

      expect(() => {
        // Event without touches array
        const malformedEvent = new Event("touchstart") as any;
        malformedEvent.touches = null;
        element.dispatchEvent(malformedEvent);
      }).not.toThrow();

      cleanup();
    });

    test("falls back gracefully when touch APIs are unavailable", () => {
      // Remove touch support
      delete (window as any).TouchEvent;

      expect(() => {
        const element = document.createElement("div");
        mobileGestureService.enableGestures(element, {
          onTap: jest.fn(),
        });
      }).not.toThrow();
    });
  });
});
