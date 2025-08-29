"use client";

import { useEffect, useRef } from "react";
import { mobileGestureService } from "@/lib/mobile-gesture-service";

type SwipeOptions = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  preventScroll?: boolean;
};

export function useSwipe(options: SwipeOptions) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;

    const cleanup = mobileGestureService.enableGestures(
      el,
      {
        onSwipeLeft: options.onSwipeLeft,
        onSwipeRight: options.onSwipeRight,
      },
      {
        threshold: options.threshold ?? 50,
        preventScroll: options.preventScroll ?? false,
      },
    );

    return () => {
      cleanup();
    };
  }, [options.onSwipeLeft, options.onSwipeRight, options.threshold, options.preventScroll]);

  return ref as any;
}
