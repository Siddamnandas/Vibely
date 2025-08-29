"use client";

import React from "react";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { pwaInstallService } from "@/lib/pwa-install-service";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);
  const [installStatus, setInstallStatus] = React.useState(
    pwaInstallService.getInstallStatus()
  );

  React.useEffect(() => {
    // Subscribe to install status changes
    const unsubscribe = pwaInstallService.onStatusChange(setInstallStatus);

    // Show install prompt if conditions are met
    const shouldShow = pwaInstallService.shouldShowInstallBanner();
    if (shouldShow && !installStatus.isInstalled) {
      // Delay showing the prompt to avoid interrupting initial app load
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }

    return unsubscribe;
  }, [installStatus.isInstalled]);

  return (
    <>
      {children}
      
      {/* Install prompt banner */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
          <PWAInstallPrompt
            onDismiss={() => setShowInstallPrompt(false)}
          />
        </div>
      )}
    </>
  );
}

// Hook for manual PWA install triggers
export function usePWAProvider() {
  const [installStatus, setInstallStatus] = React.useState(
    pwaInstallService.getInstallStatus()
  );

  React.useEffect(() => {
    const unsubscribe = pwaInstallService.onStatusChange(setInstallStatus);
    return unsubscribe;
  }, []);

  const showInstallPrompt = React.useCallback(async () => {
    return await pwaInstallService.showInstallPrompt();
  }, []);

  return {
    installStatus,
    showInstallPrompt,
    isInstalled: installStatus.isInstalled,
    canInstall: installStatus.canInstall,
  };
}