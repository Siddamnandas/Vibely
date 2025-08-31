"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import BottomNav from "@/components/layout/bottom-nav";
import { FullPlayer } from "@/components/full-player";
import { MiniPlayer } from "@/components/mini-player";
import { PlaybackProvider } from "@/context/playback-context";
import { RegenProvider } from "@/context/regen-context";
import { usePlayback } from "@/context/playback-context";
import { RegenNotificationBanner } from "@/components/regen-notification-banner";
import { OrientationProvider } from "@/components/orientation-provider";
import { useRegenNotifications } from "@/hooks/use-regen-notifications";
import { ResourcePreloader, PerformanceOptimizer } from "@/components/resource-preloader";
import { useParallelAuth } from "@/hooks/use-parallel-auth";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import ErrorBoundary from "@/components/error-boundary";
import { ErrorHandler } from "@/components/error-handler";
import { initSentry } from "@/lib/sentry";

// Skeleton loading component for immediate visual feedback
function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-[#0E0F12] flex flex-col">
      {/* Top skeleton bar */}
      <div className="h-16 bg-white/5 border-b border-white/10 animate-pulse" />

      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="h-8 bg-white/5 rounded animate-pulse" />
        <div className="h-32 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-white/5 rounded animate-pulse" />
          <div className="h-24 bg-white/5 rounded animate-pulse" />
        </div>
      </div>

      {/* Bottom navigation skeleton */}
      <div className="h-24 bg-white/5 border-t border-white/10 flex items-center justify-around animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-8 h-8 bg-white/10 rounded" />
        ))}
      </div>
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const pushedRef = useRef(false);
  const parallelAuth = useParallelAuth();
  const deviceProfile = useDevicePerformance();
  const [appShellReady, setAppShellReady] = useState(false);

  // Initialize Sentry
  useEffect(() => {
    initSentry();
  }, []);

  // Mark app shell as ready immediately for instant loading
  useEffect(() => {
    // Use a small timeout to ensure the app shell is ready
    const timer = setTimeout(() => {
      setAppShellReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Back gesture/ESC: push history state when full player opens; pop closes
  useEffect(() => {
    const onPop = () => setShowFullPlayer(false);
    if (showFullPlayer) {
      if (!pushedRef.current) {
        try {
          window.history.pushState({ vibelyFullPlayer: true }, "", window.location.href);
          pushedRef.current = true;
        } catch {}
      }
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
    pushedRef.current = false;
  }, [showFullPlayer]);

  // Simplify the loading condition to prevent infinite loading states
  const showSkeleton = !appShellReady && (parallelAuth.isLoading || deviceProfile.isLowEndDevice);

  return (
    <ErrorBoundary>
      <PlaybackProvider>
        <RegenProvider>
          <OrientationProvider>
            <Suspense fallback={<AppShellSkeleton />}>
              <ResourcePreloader>
                <PerformanceOptimizer />
                {/* Enable regeneration notifications */}
                <RegenNotifications />
                {/* Global banner notification for regeneration completions */}
                <RegenNotificationBanner />
                {/* Error handler for displaying error banners */}
                <ErrorHandler />
                <main className="pb-24">
                  {showSkeleton ? (
                    <AppShellSkeleton />
                  ) : (
                    <>
                      {/* Auto-open full player when playback starts anywhere */}
                      <AutoOpenFullPlayer onOpen={() => setShowFullPlayer(true)} />

                      {/* Progressive content loading */}
                      <Suspense
                        fallback={
                          <div className="p-6">
                            <div className="h-32 bg-white/5 rounded animate-pulse" />
                          </div>
                        }
                      >
                        {children}
                      </Suspense>

                      {/* Mini Player — persists across pages, above nav, below modals */}
                      <MiniPlayer onExpand={() => setShowFullPlayer(true)} />
                      <BottomNav />

                      {/* Full Player */}
                      <FullPlayer
                        onClose={() => {
                          try {
                            window.history.back();
                          } catch {
                            setShowFullPlayer(false);
                          }
                        }}
                        isVisible={showFullPlayer}
                      />
                    </>
                  )}
                </main>
              </ResourcePreloader>
            </Suspense>
          </OrientationProvider>
        </RegenProvider>
      </PlaybackProvider>
    </ErrorBoundary>
  );
}

function AutoOpenFullPlayer({ onOpen }: { onOpen: () => void }) {
  const { isPlaying, current } = usePlayback();
  const prevIdRef = useRef<string | null>(null);

  // Open when playback begins
  useEffect(() => {
    if (isPlaying) onOpen();
  }, [isPlaying, onOpen]);

  // Also open when the current track changes (next/prev/select)
  useEffect(() => {
    const id = current?.id ?? null;
    if (id && prevIdRef.current && prevIdRef.current !== id) {
      onOpen();
    }
    prevIdRef.current = id;
  }, [current?.id, onOpen]);

  return null;
}

// Component to enable regen notifications inside the RegenProvider context
function RegenNotifications() {
  useRegenNotifications();
  return null;
}
