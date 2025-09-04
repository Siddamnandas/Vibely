"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavigationGuardProps {
  children: React.ReactNode;
  onNavigationStart?: () => void;
  onNavigationComplete?: () => void;
  onNavigationError?: (error: Error) => void;
}

/**
 * NavigationGuard prevents button clicks from getting stuck by:
 * 1. Adding timeout protection for navigation
 * 2. Clearing loading states on errors
 * 3. Recovering from stuck navigation states
 */
export function NavigationGuard({
  children,
  onNavigationStart,
  onNavigationComplete,
  onNavigationError
}: NavigationGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout>();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (isNavigating && pathname !== lastPathname.current) {
      // Navigation completed successfully
      clearTimeout(navigationTimeoutRef.current);
      setIsNavigating(false);
      onNavigationComplete?.();

      lastPathname.current = pathname;
    }
  }, [pathname, isNavigating, onNavigationComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Override router methods to add navigation protection
  const enhancedRouter = {
    ...router,
    push: (href: any, options?: any) => {
      if (isNavigating) {
        console.warn('Navigation already in progress, ignoring');
        return;
      }

      setIsNavigating(true);
      onNavigationStart?.();

      // Add navigation timeout (5 seconds)
      navigationTimeoutRef.current = setTimeout(() => {
        console.error('Navigation timeout - forcing recovery');
        setIsNavigating(false);
        onNavigationError?.(new Error('Navigation timeout'));
      }, 5000);

      try {
        router.push(href, options);
      } catch (error) {
        console.error('Navigation error:', error);
        setIsNavigating(false);
        clearTimeout(navigationTimeoutRef.current);
        onNavigationError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    replace: (href: any, options?: any) => {
      if (isNavigating) return;

      setIsNavigating(true);
      onNavigationStart?.();

      try {
        router.replace(href, options);
        setTimeout(() => {
          onNavigationComplete?.();
          setIsNavigating(false);
        }, 100);
      } catch (error) {
        console.error('Navigation error:', error);
        setIsNavigating(false);
        onNavigationError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    back: () => {
      if (isNavigating) return;

      setIsNavigating(true);
      onNavigationStart?.();

      try {
        router.back();
        setTimeout(() => {
          onNavigationComplete?.();
          setIsNavigating(false);
        }, 100);
      } catch (error) {
        console.error('Back navigation error:', error);
        setIsNavigating(false);
        onNavigationError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    refresh: () => {
      if (isNavigating) return;

      setIsNavigating(true);
      onNavigationStart?.();

      try {
        router.refresh();
        setTimeout(() => {
          onNavigationComplete?.();
          setIsNavigating(false);
        }, 300);
      } catch (error) {
        console.error('Refresh error:', error);
        setIsNavigating(false);
        onNavigationError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  return (
    <NavigationProvider
      router={enhancedRouter}
      isNavigating={isNavigating}
    >
      {children}
    </NavigationProvider>
  );
}

/**
 * Context for navigation state
 */
import { createContext, useContext } from 'react';

interface NavigationContextType {
  router: any;
  isNavigating: boolean;
}

const NavigationContext = createContext<NavigationContextType>({
  router: {},
  isNavigating: false
});

function NavigationProvider({
  router,
  isNavigating,
  children
}: {
  router: any;
  isNavigating: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavigationContext.Provider value={{ router, isNavigating }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}

/**
 * Hook for navigation-safe actions
 */
export function useSafeNavigation() {
  const { isNavigating } = useNavigation();

  return {
    isNavigating,
    safeAction: <T extends any[]>(fn: (...args: T) => void) => {
      return (...args: T) => {
        if (isNavigating) {
          console.warn('Action skipped - navigation in progress');
          return;
        }
        fn(...args);
      };
    }
  };
}

export default NavigationGuard;
