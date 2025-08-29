"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { mobileGestureService, GestureEvent } from "@/lib/mobile-gesture-service";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface SwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color: "red" | "green" | "blue" | "yellow" | "purple";
  onAction: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  className?: string;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  enableHapticFeedback?: boolean;
  showSwipeHints?: boolean;
}

export function SwipeableCard({
  children,
  className,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onLongPress,
  swipeThreshold = 80,
  enableHapticFeedback = true,
  showSwipeHints = true,
}: SwipeableCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [showLeftActions, setShowLeftActions] = React.useState(false);
  const [showRightActions, setShowRightActions] = React.useState(false);
  const [dragDirection, setDragDirection] = React.useState<"left" | "right" | null>(null);

  React.useEffect(() => {
    if (!cardRef.current) return;

    const cleanup = mobileGestureService.enableGestures(
      cardRef.current,
      {
        onSwipeLeft: handleSwipeLeft,
        onSwipeRight: handleSwipeRight,
        onTap: handleTap,
        onLongPress: handleLongPress,
        onPan: handlePan,
      },
      {
        threshold: swipeThreshold,
        velocityThreshold: 0.3,
        preventScroll: true,
      }
    );

    return cleanup;
  }, [swipeThreshold]);

  const handleSwipeLeft = (event: GestureEvent) => {
    if (enableHapticFeedback && "vibrate" in navigator) {
      navigator.vibrate(20);
    }

    if (rightActions.length > 0) {
      setShowRightActions(true);
      setTimeout(() => setShowRightActions(false), 2000);
    } else if (onSwipeLeft) {
      onSwipeLeft();
    }
  };

  const handleSwipeRight = (event: GestureEvent) => {
    if (enableHapticFeedback && "vibrate" in navigator) {
      navigator.vibrate(20);
    }

    if (leftActions.length > 0) {
      setShowLeftActions(true);
      setTimeout(() => setShowLeftActions(false), 2000);
    } else if (onSwipeRight) {
      onSwipeRight();
    }
  };

  const handleTap = (event: GestureEvent) => {
    if (enableHapticFeedback && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    onTap?.();
  };

  const handleLongPress = (event: GestureEvent) => {
    if (enableHapticFeedback && "vibrate" in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
    onLongPress?.();
  };

  const handlePan = (event: GestureEvent) => {
    const deltaX = event.endPoint.x - event.startPoint.x;
    setIsDragging(true);
    setDragOffset(deltaX);
    setDragDirection(deltaX > 0 ? "right" : "left");

    // Show action hints when dragging
    if (Math.abs(deltaX) > 20) {
      if (deltaX > 0 && leftActions.length > 0) {
        setShowLeftActions(true);
      } else if (deltaX < 0 && rightActions.length > 0) {
        setShowRightActions(true);
      }
    }
  };

  // Reset states when gesture ends
  React.useEffect(() => {
    const handleTouchEnd = () => {
      setIsDragging(false);
      setDragOffset(0);
      setDragDirection(null);
      
      // Hide actions after a delay
      setTimeout(() => {
        setShowLeftActions(false);
        setShowRightActions(false);
      }, 300);
    };

    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("mouseup", handleTouchEnd);

    return () => {
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mouseup", handleTouchEnd);
    };
  }, []);

  const getActionColors = (color: SwipeAction["color"]) => {
    switch (color) {
      case "red":
        return "bg-red-500 text-white";
      case "green":
        return "bg-green-500 text-white";
      case "blue":
        return "bg-blue-500 text-white";
      case "yellow":
        return "bg-yellow-500 text-white";
      case "purple":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Actions */}
      {showLeftActions && leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
          <div className="flex gap-2 pl-4">
            {leftActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onAction}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                  "transform transition-all duration-200 animate-in slide-in-from-left-2",
                  getActionColors(action.color)
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right Actions */}
      {showRightActions && rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center z-10">
          <div className="flex gap-2 pr-4">
            {rightActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onAction}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                  "transform transition-all duration-200 animate-in slide-in-from-right-2",
                  getActionColors(action.color)
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Card */}
      <div
        ref={cardRef}
        className={cn(
          "relative transition-transform duration-200 ease-out",
          "touch-none select-none", // Prevent text selection and scrolling
          className,
          isDragging && "transition-none", // Disable transitions while dragging
          dragDirection === "left" && showRightActions && "transform -translate-x-2",
          dragDirection === "right" && showLeftActions && "transform translate-x-2"
        )}
        style={{
          transform: isDragging ? `translateX(${Math.max(-100, Math.min(100, dragOffset * 0.3))}px)` : undefined,
        }}
      >
        {children}

        {/* Swipe Hints */}
        {showSwipeHints && !isDragging && (
          <>
            {leftActions.length > 0 && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30">
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            )}
            {rightActions.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30">
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </div>
            )}
            {onLongPress && (
              <div className="absolute top-2 right-2 opacity-30">
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </>
        )}

        {/* Drag Indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-black/5 pointer-events-none rounded-lg" />
        )}
      </div>
    </div>
  );
}

// Hook for using swipeable functionality
export function useSwipeableCard() {
  const [isGestureEnabled, setIsGestureEnabled] = React.useState(false);

  const enableGestures = React.useCallback((
    element: HTMLElement,
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void
  ) => {
    if (!element) return () => {};

    const cleanup = mobileGestureService.enableGestures(element, {
      onSwipeLeft: onSwipeLeft ? () => onSwipeLeft() : undefined,
      onSwipeRight: onSwipeRight ? () => onSwipeRight() : undefined,
    });

    setIsGestureEnabled(true);

    return () => {
      cleanup();
      setIsGestureEnabled(false);
    };
  }, []);

  return {
    enableGestures,
    isGestureEnabled,
  };
}

export type { SwipeAction };