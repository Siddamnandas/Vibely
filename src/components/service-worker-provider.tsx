"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { serviceWorkerManager, useServiceWorker } from "@/lib/service-worker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceWorkerContextValue {
  isOffline: boolean;
  isUpdateAvailable: boolean;
  cacheSize: number;
  networkStatus: "online" | "offline" | "slow";
  updateApp: () => void;
  clearCache: () => Promise<boolean>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue | null>(null);

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const swHook = useServiceWorker();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Show offline message when going offline
  useEffect(() => {
    if (swHook.isOffline) {
      setShowOfflineMessage(true);
      const timer = setTimeout(() => setShowOfflineMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [swHook.isOffline]);

  // Show update prompt when update is available
  useEffect(() => {
    if (swHook.isUpdateAvailable) {
      setShowUpdatePrompt(true);
    }
  }, [swHook.isUpdateAvailable]);

  const handleClearCache = async (): Promise<boolean> => {
    setIsClearing(true);
    const success = await swHook.clearCache();
    setIsClearing(false);

    if (success) {
      // Show success message
      console.log("Cache cleared successfully");
    }

    return success;
  };

  const contextValue: ServiceWorkerContextValue = {
    ...swHook,
    clearCache: handleClearCache,
  };

  return (
    <ServiceWorkerContext.Provider value={contextValue}>
      {children}

      {/* Offline Indicator */}
      <OfflineIndicator
        isOffline={swHook.isOffline}
        networkStatus={swHook.networkStatus}
        show={showOfflineMessage}
        onClose={() => setShowOfflineMessage(false)}
      />

      {/* Update Prompt */}
      <UpdatePrompt
        show={showUpdatePrompt}
        onUpdate={() => {
          swHook.updateApp();
          setShowUpdatePrompt(false);
        }}
        onLater={() => setShowUpdatePrompt(false)}
      />

      {/* Cache Management (Development only) */}
      {process.env.NODE_ENV === "development" && (
        <CacheDebugPanel
          cacheSize={swHook.cacheSize}
          onClear={handleClearCache}
          isClearing={isClearing}
        />
      )}
    </ServiceWorkerContext.Provider>
  );
}

// Offline indicator component
function OfflineIndicator({
  isOffline,
  networkStatus,
  show,
  onClose,
}: {
  isOffline: boolean;
  networkStatus: "online" | "offline" | "slow";
  show: boolean;
  onClose: () => void;
}) {
  if (!show && !isOffline) return null;

  const getStatusInfo = () => {
    switch (networkStatus) {
      case "offline":
        return {
          icon: WifiOff,
          text: "You're offline",
          description: "Some features may be limited",
          color: "bg-red-500/90",
        };
      case "slow":
        return {
          icon: Wifi,
          text: "Slow connection",
          description: "Loading may take longer",
          color: "bg-yellow-500/90",
        };
      default:
        return {
          icon: Wifi,
          text: "Back online",
          description: "All features available",
          color: "bg-green-500/90",
        };
    }
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <AnimatePresence>
      {(show || isOffline) && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className={`${status.color} border-none text-white backdrop-blur-sm`}>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">{status.text}</p>
                <p className="text-xs opacity-90">{status.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 ml-2"
              >
                ×
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Update prompt component
function UpdatePrompt({
  show,
  onUpdate,
  onLater,
}: {
  show: boolean;
  onUpdate: () => void;
  onLater: () => void;
}) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-md bg-card border border-white/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-primary" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">New Version Available</h3>

            <p className="text-muted-foreground mb-6">
              A new version of Vibely is ready with improvements and new features. Update now to get
              the best experience.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onLater} className="flex-1">
                Later
              </Button>
              <Button
                onClick={onUpdate}
                className="flex-1 bg-gradient-to-r from-primary to-green-400 hover:opacity-90"
              >
                Update Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Cache debug panel (development only)
function CacheDebugPanel({
  cacheSize,
  onClear,
  isClearing,
}: {
  cacheSize: number;
  onClear: () => void;
  isClearing: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-white px-3 py-2 rounded-lg text-xs font-mono backdrop-blur-sm border border-white/20"
      >
        💾 {formatSize(cacheSize)}
      </button>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-[9999] bg-black/90 text-white p-4 rounded-lg text-xs font-mono backdrop-blur-sm border border-white/20 max-w-xs">
          <div className="mb-3 font-bold text-blue-400">Service Worker</div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>SW Active</span>
            </div>

            <div>
              Cache Size: <span className="text-yellow-400">{formatSize(cacheSize)}</span>
            </div>

            <div className="flex items-center gap-2">
              {navigator.onLine ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
              <span>{navigator.onLine ? "Online" : "Offline"}</span>
            </div>
          </div>

          <Button
            onClick={onClear}
            disabled={isClearing}
            size="sm"
            variant="destructive"
            className="w-full text-xs"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3 mr-2" />
                Clear Cache
              </>
            )}
          </Button>

          <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-gray-400">
            Development mode
          </div>
        </div>
      )}
    </>
  );
}

// Hook to use service worker context
export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error("useServiceWorkerContext must be used within ServiceWorkerProvider");
  }
  return context;
}

// Hook for offline-aware components
export function useOfflineAware() {
  const { isOffline, networkStatus } = useServiceWorkerContext();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    }
  }, [isOffline]);

  const isSlowConnection = networkStatus === "slow";
  const justCameOnline = wasOffline && !isOffline;

  return {
    isOffline,
    isSlowConnection,
    justCameOnline,
    networkStatus,
  };
}
