"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Library, Sparkles, ImageIcon, User, Search } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSafeNavigation } from "./navigation-guard";
import { useAnalytics } from "@/lib/analytics/tracking";

const navItems = [
  { href: "/", icon: Sparkles, label: "Generate" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/stories", icon: ImageIcon, label: "Stories" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isNavigating, safeAction } = useSafeNavigation();
  const { trackEvent } = useAnalytics();
  const ref = useRef<HTMLElement | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Mark as mounted to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keep --nav-height in sync with actual nav height for responsive/adaptive UIs
  useEffect(() => {
    const el = ref.current;
    if (!el || !isMounted) return;

    const root = document.documentElement;
    const updateHeight = () => {
      try {
        const h = el.getBoundingClientRect().height;
        root.style.setProperty("--nav-height", `${Math.round(h)}px`);
      } catch (error) {
        console.warn('Error updating nav height:', error);
      }
    };

    // Initial update
    updateHeight();

    // Set up resize observer with error handling
    let ro: ResizeObserver;
    try {
      ro = new ResizeObserver(updateHeight);
      ro.observe(el);
    } catch (error) {
      console.warn('ResizeObserver error:', error);
      // Fallback: update on window resize
      const handleResize = () => updateHeight();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    return () => {
      if (ro) {
        try {
          ro.disconnect();
        } catch (error) {
          console.warn('Error disconnecting ResizeObserver:', error);
        }
      }
    };
  }, [isMounted]);

  // Clear navigation errors after timeout
  useEffect(() => {
    if (navError) {
      const timer = setTimeout(() => setNavError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [navError]);

  const handleNavigation = useCallback(safeAction((href: string, itemName: string) => {
    setNavError(null); // Clear any previous errors

    // Track navigation attempt
    trackEvent('navigation_attempt', {
      from: pathname,
      to: href,
      method: 'bottom_nav',
      target: itemName
    });

    // Add small delay to prevent rapid consecutive clicks
    setTimeout(() => {
      const link = document.querySelector(`a[href="${href}"]`) as HTMLAnchorElement;
      if (link) {
        try {
          // Programmatically trigger navigation with error handling
          const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });

          const success = link.dispatchEvent(event);

          if (!success) {
            console.warn('Navigation event was cancelled');
            setNavError('Navigation cancelled');
          }
        } catch (error) {
          console.error('Navigation error:', error);
          setNavError('Navigation failed');
        }
      } else {
        console.warn(`Navigation link not found: ${href}`);
        setNavError('Link not found');
      }
    }, 100);
  }), [safeAction, pathname, trackEvent]);

  // Don't render until mounted to prevent hydration mismatches
  if (!isMounted) {
    return (
      <nav
        ref={ref}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 h-20 w-[95%] max-w-md rounded-full border border-white/10 bg-black/30 backdrop-blur-xl animate-pulse"
      />
    );
  }

  return (
    <nav
      ref={ref}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 h-20 w-[95%] max-w-md rounded-full border border-white/10 bg-black/30 backdrop-blur-xl"
      style={{ pointerEvents: navError ? 'auto' : 'auto' }} // Ensure pointer events work
    >
      {/* Error overlay */}
      {navError && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-md shadow-lg whitespace-nowrap z-60">
          {navError}
        </div>
      )}

      {/* Navigation indicator */}
      {isNavigating && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-60">
          <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-md shadow-lg flex items-center gap-2">
            <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            Navigating...
          </div>
        </div>
      )}

      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const isDisabled = isNavigating;

          if (item.href === "/") {
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href, item.label)}
                disabled={isDisabled}
                className={cn(
                  "flex h-16 w-16 flex-col items-center justify-center rounded-full transition-all duration-300 -mt-8 focus:outline-none focus:ring-2 focus:ring-white/50",
                  isDisabled
                    ? "opacity-50 cursor-not-allowed scale-95"
                    : "bg-gradient-to-r from-primary to-green-400 font-bold text-primary-foreground hover:opacity-90 shadow-lg hover:scale-105",
                )}
                aria-label={item.label}
                aria-disabled={isDisabled}
              >
                <item.icon className={cn(
                  "h-7 w-7 transition-transform duration-200",
                  isDisabled && "animate-pulse"
                )} />
                {isDisabled && (
                  <div className="absolute inset-0 bg-black/20 rounded-full animate-pulse" />
                )}
              </button>
            );
          }

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href, item.label)}
              disabled={isDisabled}
              className={cn(
                "flex h-14 w-14 flex-col items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50",
                isDisabled
                  ? "opacity-50 cursor-not-allowed scale-95 pointer-events-auto"
                  : isActive
                    ? "bg-primary/20 text-primary shadow-lg scale-105"
                    : "text-muted-foreground hover:bg-white/10 hover:text-white hover:scale-105",
              )}
              aria-label={item.label}
              aria-disabled={isDisabled}
            >
              <item.icon className={cn(
                "h-6 w-6 transition-all duration-200",
                isDisabled && "animate-pulse"
              )} />
              {isDisabled && (
                <div className="absolute inset-0 bg-black/20 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Hidden links for programmatic navigation */}
      <div className="sr-only">
        {navItems.map((item) => (
          <Link
            key={`hidden-${item.href}`}
            href={item.href}
            aria-hidden="true"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
