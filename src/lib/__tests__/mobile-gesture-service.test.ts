/**
 * @jest-environment jsdom
 */

import { mobileGestureService } from "@/lib/mobile-gesture-service";
import type { GestureCallbacks } from "@/lib/mobile-gesture-service";

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  track: jest.fn(),
}));

// Mock vibrate API
Object.defineProperty(navigator, "vibrate", {
  writable: true,
  value: jest.fn(),
});

// Helper function to create touch events
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

// Helper function to create mouse events
function createMouseEvent(
  type: string,
  options: { clientX: number; clientY: number; button?: number } = { clientX: 0, clientY: 0 },
) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

describe("MobileGestureService", () => {
  let testElement: HTMLElement;
  let callbacks: GestureCallbacks;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create test element
    testElement = document.createElement("div");
    testElement.style.width = "200px";
    testElement.style.height = "100px";
    document.body.appendChild(testElement);

    // Create mock callbacks
    callbacks = {
      onTap: jest.fn(),
      onLongPress: jest.fn(),
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
      onPan: jest.fn(),
    };

    cleanup = null;
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
    }
    if (testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
  });

  describe("Gesture Registration", () => {
    test("enables gestures on element", () => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks);

      expect(testElement.classList.contains("gesture-enabled")).toBe(true);
      expect(testElement.style.userSelect).toBe("none");
      expect(testElement.style.touchAction).toBe("none");
    });

    test("disables gestures on element", () => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks);

      mobileGestureService.disableGestures(testElement);

      expect(testElement.classList.contains("gesture-enabled")).toBe(false);
      expect(testElement.style.userSelect).toBe("");
      expect(testElement.style.touchAction).toBe("");
    });

    test("cleanup function disables gestures", () => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks);

      cleanup();

      expect(testElement.classList.contains("gesture-enabled")).toBe(false);
      cleanup = null; // Prevent double cleanup
    });

    test("applies custom configuration", () => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks, {
        preventScroll: false,
        threshold: 100,
      });

      expect(testElement.style.touchAction).toBe("auto");
    });
  });

  describe("Touch Event Handling", () => {
    beforeEach(() => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks);
    });

    test("handles tap gesture", async () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 105, clientY: 55, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);

      // Short delay for tap
      await new Promise((resolve) => setTimeout(resolve, 50));

      testElement.dispatchEvent(touchEnd);

      expect(callbacks.onTap).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tap",
          target: testElement,
          distance: expect.any(Number),
          duration: expect.any(Number),
        }),
      );
    });

    test("handles long press gesture", async () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 102, clientY: 52, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);

      // Long delay for long press
      await new Promise((resolve) => setTimeout(resolve, 600));

      testElement.dispatchEvent(touchEnd);

      expect(callbacks.onLongPress).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "longpress",
          target: testElement,
        }),
      );
    });

    test("handles swipe left gesture", () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 150, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 50, clientY: 50, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);
      testElement.dispatchEvent(touchEnd);

      expect(callbacks.onSwipeLeft).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "swipe",
          direction: "left",
          target: testElement,
          distance: 100,
        }),
      );
    });

    test("handles swipe right gesture", () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 50, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 150, clientY: 50, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);
      testElement.dispatchEvent(touchEnd);

      expect(callbacks.onSwipeRight).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "swipe",
          direction: "right",
          target: testElement,
          distance: 100,
        }),
      );
    });

    test("handles swipe up gesture", () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 80, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 100, clientY: 20, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);
      testElement.dispatchEvent(touchEnd);

      expect(callbacks.onSwipeUp).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "swipe",
          direction: "up",
          target: testElement,
          distance: 60,
        }),
      );
    });

    test("handles swipe down gesture", () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 20, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 100, clientY: 80, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);
      testElement.dispatchEvent(touchEnd);

      expect(callbacks.onSwipeDown).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "swipe",
          direction: "down",
          target: testElement,
          distance: 60,
        }),
      );
    });

    test("handles pan gesture during touchmove", () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 50, clientY: 50, identifier: 0 },
      ]);
      const touchMove = createTouchEvent("touchmove", [
        { clientX: 75, clientY: 60, identifier: 0 },
      ]);

      testElement.dispatchEvent(touchStart);
      testElement.dispatchEvent(touchMove);

      expect(callbacks.onPan).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pan",
          target: testElement,
        }),
      );
    });

    test("prevents default when preventScroll is enabled", () => {
      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);

      testElement.dispatchEvent(touchStart);

      expect(touchStart.preventDefault).toHaveBeenCalled();
    });

    test("does not prevent default when preventScroll is disabled", () => {
      // Re-enable with preventScroll disabled
      cleanup?.();
      cleanup = mobileGestureService.enableGestures(testElement, callbacks, {
        preventScroll: false,
      });

      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);

      testElement.dispatchEvent(touchStart);

      expect(touchStart.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("Mouse Event Handling", () => {
    beforeEach(() => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks);
    });

    test("handles mouse tap gesture", async () => {
      const mouseDown = createMouseEvent("mousedown", { clientX: 100, clientY: 50 });
      const mouseUp = createMouseEvent("mouseup", { clientX: 105, clientY: 55 });

      testElement.dispatchEvent(mouseDown);

      await new Promise((resolve) => setTimeout(resolve, 50));

      testElement.dispatchEvent(mouseUp);

      expect(callbacks.onTap).toHaveBeenCalled();
    });

    test("handles mouse swipe gesture", () => {
      const mouseDown = createMouseEvent("mousedown", { clientX: 150, clientY: 50 });
      const mouseUp = createMouseEvent("mouseup", { clientX: 50, clientY: 50 });

      testElement.dispatchEvent(mouseDown);
      testElement.dispatchEvent(mouseUp);

      expect(callbacks.onSwipeLeft).toHaveBeenCalled();
    });

    test("handles mouse pan during mousemove", () => {
      const mouseDown = createMouseEvent("mousedown", { clientX: 50, clientY: 50 });
      const mouseMove = createMouseEvent("mousemove", { clientX: 75, clientY: 60 });

      document.dispatchEvent(mouseDown);
      document.dispatchEvent(mouseMove);

      expect(callbacks.onPan).toHaveBeenCalled();
    });
  });

  describe("Gesture Thresholds", () => {
    test("respects distance threshold for swipe", () => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks, {
        threshold: 100, // High threshold
      });

      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 130, clientY: 50, identifier: 0 }]); // Only 30px

      testElement.dispatchEvent(touchStart);
      testElement.dispatchEvent(touchEnd);

      // Should not trigger swipe due to insufficient distance
      expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
      // But might trigger tap due to short distance and time
      expect(callbacks.onTap).toHaveBeenCalled();
    });

    test("respects velocity threshold for swipe", () => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks, {
        velocityThreshold: 2.0, // Very high velocity threshold
      });

      const touchStart = createTouchEvent("touchstart", [
        { clientX: 50, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 150, clientY: 50, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);

      // Wait to ensure low velocity
      setTimeout(() => {
        testElement.dispatchEvent(touchEnd);

        // Should not trigger swipe due to low velocity
        expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
      }, 500);
    });
  });

  describe("Multiple Touch Points", () => {
    beforeEach(() => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks);
    });

    test("handles multiple simultaneous touches", () => {
      const touchStart1 = createTouchEvent("touchstart", [
        { clientX: 50, clientY: 50, identifier: 0 },
        { clientX: 150, clientY: 50, identifier: 1 },
      ]);

      const touchEnd1 = createTouchEvent("touchend", [
        { clientX: 150, clientY: 50, identifier: 0 }, // Swipe right
      ]);

      const touchEnd2 = createTouchEvent("touchend", [
        { clientX: 50, clientY: 50, identifier: 1 }, // Swipe left
      ]);

      testElement.dispatchEvent(touchStart1);
      testElement.dispatchEvent(touchEnd1);
      testElement.dispatchEvent(touchEnd2);

      // Should handle both gestures
      expect(callbacks.onSwipeRight).toHaveBeenCalled();
      expect(callbacks.onSwipeLeft).toHaveBeenCalled();
    });
  });

  describe("Element Hierarchy", () => {
    test("finds gesture element in parent hierarchy", () => {
      const childElement = document.createElement("span");
      testElement.appendChild(childElement);

      cleanup = mobileGestureService.enableGestures(testElement, callbacks);

      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 105, clientY: 55, identifier: 0 }]);

      // Target the child element
      Object.defineProperty(touchStart, "target", { value: childElement, writable: false });
      Object.defineProperty(touchEnd, "target", { value: childElement, writable: false });

      childElement.dispatchEvent(touchStart);
      childElement.dispatchEvent(touchEnd);

      // Should still trigger on parent
      expect(callbacks.onTap).toHaveBeenCalledWith(
        expect.objectContaining({
          target: testElement,
        }),
      );
    });
  });

  describe("Static Utility Methods", () => {
    test("createSwipeableCard creates gesture handlers", () => {
      const onLeft = jest.fn();
      const onRight = jest.fn();

      cleanup = mobileGestureService.constructor.createSwipeableCard(
        testElement,
        onLeft,
        onRight,
      ) as any;

      const touchStart = createTouchEvent("touchstart", [
        { clientX: 150, clientY: 50, identifier: 0 },
      ]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 50, clientY: 50, identifier: 0 }]);

      testElement.dispatchEvent(touchStart);
      testElement.dispatchEvent(touchEnd);

      expect(onLeft).toHaveBeenCalled();
    });

    test("enableHapticFeedback sets up vibration", () => {
      mobileGestureService.constructor.enableHapticFeedback(true);

      // Create and dispatch a custom gesture event
      const gestureEvent = new CustomEvent("gesture-performed", {
        detail: { gestureType: "tap" },
      });

      document.dispatchEvent(gestureEvent);

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  });

  describe("Error Handling", () => {
    test("handles touch cancel events", () => {
      cleanup = mobileGestureService.enableGestures(testElement, callbacks);

      const touchStart = createTouchEvent("touchstart", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);
      const touchCancel = createTouchEvent("touchcancel", [
        { clientX: 100, clientY: 50, identifier: 0 },
      ]);

      testElement.dispatchEvent(touchStart);
      expect(testElement.classList.contains("gesture-active")).toBe(true);

      testElement.dispatchEvent(touchCancel);
      expect(testElement.classList.contains("gesture-active")).toBe(false);
    });

    test("does not crash on missing navigator.vibrate", () => {
      delete (navigator as any).vibrate;

      expect(() => {
        mobileGestureService.constructor.enableHapticFeedback(true);
      }).not.toThrow();
    });
  });
});
