"use client";

import { track as trackEvent } from "@/lib/analytics";

interface GestureEvent {
  type: "swipe" | "tap" | "longpress" | "pinch" | "pan";
  direction?: "left" | "right" | "up" | "down";
  distance?: number;
  velocity?: number;
  target: HTMLElement;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  duration: number;
}

interface SwipeConfig {
  threshold: number; // Minimum distance for swipe
  velocityThreshold: number; // Minimum velocity for swipe
  maxTime: number; // Maximum time for swipe gesture
  preventScroll: boolean;
}

interface GestureCallbacks {
  onSwipeLeft?: (event: GestureEvent) => void;
  onSwipeRight?: (event: GestureEvent) => void;
  onSwipeUp?: (event: GestureEvent) => void;
  onSwipeDown?: (event: GestureEvent) => void;
  onTap?: (event: GestureEvent) => void;
  onLongPress?: (event: GestureEvent) => void;
  onPinch?: (event: GestureEvent) => void;
  onPan?: (event: GestureEvent) => void;
}

class MobileGestureService {
  private static instance: MobileGestureService;
  private activeElements = new Map<HTMLElement, GestureCallbacks>();
  private touchState = new Map<
    number,
    {
      startTime: number;
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      element: HTMLElement;
      callbacks: GestureCallbacks;
      config: SwipeConfig;
    }
  >();

  private defaultConfig: SwipeConfig = {
    threshold: 50, // 50px minimum swipe distance
    velocityThreshold: 0.3, // pixels per millisecond
    maxTime: 1000, // 1 second maximum
    preventScroll: true,
  };

  static getInstance(): MobileGestureService {
    if (!MobileGestureService.instance) {
      MobileGestureService.instance = new MobileGestureService();
    }
    return MobileGestureService.instance;
  }

  constructor() {
    this.setupGlobalListeners();
    console.log("📱 Mobile Gesture Service initialized");
  }

  private setupGlobalListeners() {
    // Passive listeners for better performance
    document.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener("touchcancel", this.handleTouchCancel.bind(this), { passive: false });

    // Mouse events for desktop testing
    document.addEventListener("mousedown", this.handleMouseDown.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));
  }

  // Public API methods
  enableGestures(
    element: HTMLElement,
    callbacks: GestureCallbacks,
    config: Partial<SwipeConfig> = {},
  ): () => void {
    const fullConfig = { ...this.defaultConfig, ...config };
    this.activeElements.set(element, callbacks);

    // Store config on element for touch handlers
    (element as any).__gestureConfig = fullConfig;

    // Add visual feedback classes
    element.classList.add("gesture-enabled");
    element.style.userSelect = "none";
    element.style.touchAction = fullConfig.preventScroll ? "none" : "auto";

    trackEvent("gesture_enabled", {
      element_type: element.tagName.toLowerCase(),
      gesture_types: Object.keys(callbacks),
    });

    // Return cleanup function
    return () => this.disableGestures(element);
  }

  disableGestures(element: HTMLElement): void {
    this.activeElements.delete(element);
    element.classList.remove("gesture-enabled");
    element.style.userSelect = "";
    element.style.touchAction = "";
    delete (element as any).__gestureConfig;

    trackEvent("gesture_disabled", {
      element_type: element.tagName.toLowerCase(),
    });
  }

  // Touch event handlers
  private handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    // Fallback to event.target in environments where Touch.target isn't populated
    const targetEl =
      touch && (touch as any).target
        ? ((touch as any).target as HTMLElement)
        : (event.target as HTMLElement);
    const element = this.findGestureElement(targetEl);

    if (!element) return;

    const callbacks = this.activeElements.get(element);
    const config = (element as any).__gestureConfig || this.defaultConfig;

    if (!callbacks) return;

    // Prevent default if configured
    if (config.preventScroll) {
      event.preventDefault();
    }

    this.touchState.set(touch.identifier, {
      startTime: Date.now(),
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      element,
      callbacks,
      config,
    });

    // Add active state
    element.classList.add("gesture-active");
  }

  private handleTouchMove(event: TouchEvent) {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const state = this.touchState.get(touch.identifier);

      if (!state) continue;

      state.currentX = touch.clientX;
      state.currentY = touch.clientY;

      // Calculate movement
      const deltaX = Math.abs(state.currentX - state.startX);
      const deltaY = Math.abs(state.currentY - state.startY);

      // Prevent scroll if significant horizontal movement
      if (state.config.preventScroll && deltaX > deltaY && deltaX > 10) {
        event.preventDefault();
      }

      // Call pan callback if available
      if (state.callbacks.onPan) {
        const gestureEvent = this.createGestureEvent(state, "pan");
        state.callbacks.onPan(gestureEvent);
      }
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const state = this.touchState.get(touch.identifier);

      if (!state) continue;

      this.processGesture(state, touch);

      // Cleanup
      state.element.classList.remove("gesture-active");
      this.touchState.delete(touch.identifier);
    }
  }

  private handleTouchCancel(event: TouchEvent) {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const state = this.touchState.get(touch.identifier);

      if (state) {
        state.element.classList.remove("gesture-active");
        this.touchState.delete(touch.identifier);
      }
    }
  }

  // Mouse event handlers for desktop testing
  private handleMouseDown(event: MouseEvent) {
    const element = this.findGestureElement(event.target as HTMLElement);
    if (!element) return;

    const callbacks = this.activeElements.get(element);
    const config = (element as any).__gestureConfig || this.defaultConfig;

    if (!callbacks) return;

    this.touchState.set(-1, {
      startTime: Date.now(),
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      element,
      callbacks,
      config,
    });

    element.classList.add("gesture-active");
  }

  private handleMouseMove(event: MouseEvent) {
    const state = this.touchState.get(-1);
    if (!state) return;

    state.currentX = event.clientX;
    state.currentY = event.clientY;

    if (state.callbacks.onPan) {
      const gestureEvent = this.createGestureEvent(state, "pan");
      state.callbacks.onPan(gestureEvent);
    }
  }

  private handleMouseUp(event: MouseEvent) {
    const state = this.touchState.get(-1);
    if (!state) return;

    this.processGesture(state, { clientX: event.clientX, clientY: event.clientY } as Touch);

    state.element.classList.remove("gesture-active");
    this.touchState.delete(-1);
  }

  // Gesture processing
  private processGesture(state: any, touch: Touch) {
    const duration = Date.now() - state.startTime;
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Determine gesture type
    if (duration < 200 && distance < 10) {
      // Tap gesture
      if (state.callbacks.onTap) {
        const gestureEvent = this.createGestureEvent(state, "tap");
        state.callbacks.onTap(gestureEvent);
        this.trackGesture("tap", gestureEvent);
      }
    } else if (duration > 500 && distance < 10) {
      // Long press gesture
      if (state.callbacks.onLongPress) {
        const gestureEvent = this.createGestureEvent(state, "longpress");
        state.callbacks.onLongPress(gestureEvent);
        this.trackGesture("longpress", gestureEvent);
      }
    } else if (distance > state.config.threshold && velocity > state.config.velocityThreshold) {
      // Swipe gesture
      const direction = this.getSwipeDirection(deltaX, deltaY);
      const gestureEvent = this.createGestureEvent(state, "swipe", direction);

      switch (direction) {
        case "left":
          if (state.callbacks.onSwipeLeft) {
            state.callbacks.onSwipeLeft(gestureEvent);
            this.trackGesture("swipe_left", gestureEvent);
          }
          break;
        case "right":
          if (state.callbacks.onSwipeRight) {
            state.callbacks.onSwipeRight(gestureEvent);
            this.trackGesture("swipe_right", gestureEvent);
          }
          break;
        case "up":
          if (state.callbacks.onSwipeUp) {
            state.callbacks.onSwipeUp(gestureEvent);
            this.trackGesture("swipe_up", gestureEvent);
          }
          break;
        case "down":
          if (state.callbacks.onSwipeDown) {
            state.callbacks.onSwipeDown(gestureEvent);
            this.trackGesture("swipe_down", gestureEvent);
          }
          break;
      }
    }
  }

  private createGestureEvent(
    state: any,
    type: GestureEvent["type"],
    direction?: string,
  ): GestureEvent {
    const duration = Date.now() - state.startTime;
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    return {
      type,
      direction: direction as any,
      distance,
      velocity,
      target: state.element,
      startPoint: { x: state.startX, y: state.startY },
      endPoint: { x: state.currentX, y: state.currentY },
      duration,
    };
  }

  private getSwipeDirection(deltaX: number, deltaY: number): "left" | "right" | "up" | "down" {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? "right" : "left";
    } else {
      return deltaY > 0 ? "down" : "up";
    }
  }

  private findGestureElement(target: HTMLElement): HTMLElement | null {
    let current = target;
    while (current && current !== document.body) {
      if (this.activeElements.has(current)) {
        return current;
      }
      current = current.parentElement!;
    }
    return null;
  }

  private trackGesture(gestureType: string, event: GestureEvent) {
    trackEvent("mobile_gesture_performed", {
      gesture_type: gestureType,
      element_type: event.target.tagName.toLowerCase(),
      distance: event.distance,
      velocity: event.velocity,
      duration: event.duration,
      direction: event.direction,
    });
  }

  // Utility methods
  static createSwipeableCard(
    element: HTMLElement,
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void,
  ): () => void {
    const service = MobileGestureService.getInstance();

    return service.enableGestures(
      element,
      {
        onSwipeLeft: onSwipeLeft ? () => onSwipeLeft() : undefined,
        onSwipeRight: onSwipeRight ? () => onSwipeRight() : undefined,
      },
      {
        threshold: 80,
        velocityThreshold: 0.4,
        preventScroll: true,
      },
    );
  }

  static enableHapticFeedback(enabled: boolean = true) {
    if (!enabled || !("vibrate" in navigator)) return;

    // Add haptic feedback to common gestures
    document.addEventListener("gesture-performed", (event: any) => {
      const { gestureType } = event.detail;

      switch (gestureType) {
        case "tap":
          navigator.vibrate(10);
          break;
        case "swipe_left":
        case "swipe_right":
          navigator.vibrate(20);
          break;
        case "longpress":
          navigator.vibrate([50, 30, 50]);
          break;
      }
    });
  }
}

// Export singleton instance
export const mobileGestureService = MobileGestureService.getInstance();

export type { GestureEvent, GestureCallbacks, SwipeConfig };
