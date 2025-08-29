"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Smartphone,
  X,
  Share,
  Plus,
  Chrome,
  Globe as Safari,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { pwaInstallService, PWAInstallStatus } from "@/lib/pwa-install-service";

interface PWAInstallPromptProps {
  className?: string;
  showAsModal?: boolean;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({
  className,
  showAsModal = false,
  onDismiss,
}: PWAInstallPromptProps) {
  const [installStatus, setInstallStatus] = React.useState<PWAInstallStatus>({
    canInstall: false,
    isInstalled: false,
    isInstallable: false,
    isStandalone: false,
    platform: "unknown",
    browserSupport: false,
  });

  const [isVisible, setIsVisible] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    // Get initial status
    const status = pwaInstallService.getInstallStatus();
    setInstallStatus(status);
    setIsVisible(pwaInstallService.shouldShowInstallBanner());

    // Subscribe to status changes
    const unsubscribe = pwaInstallService.onStatusChange(setInstallStatus);

    return unsubscribe;
  }, []);

  // Track when banner is shown
  React.useEffect(() => {
    if (isVisible && !installStatus.isInstalled) {
      pwaInstallService.trackInstallBannerShown();
    }
  }, [isVisible, installStatus.isInstalled]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await pwaInstallService.showInstallPrompt();
      if (success) {
        setIsVisible(false);
        onDismiss?.();
      }
    } catch (error) {
      console.error("Failed to install PWA:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    pwaInstallService.trackInstallBannerDismissed();
    setIsVisible(false);
    onDismiss?.();
  };

  // Don't show if already installed or conditions not met
  if (installStatus.isInstalled || !isVisible || !installStatus.browserSupport) {
    return null;
  }

  const isIOS = installStatus.platform === "ios";
  const isAndroid = installStatus.platform === "android";
  const canUsePrompt = installStatus.canInstall;

  if (showAsModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <InstallCard
          installStatus={installStatus}
          isInstalling={isInstalling}
          onInstall={handleInstall}
          onDismiss={handleDismiss}
          canUsePrompt={canUsePrompt}
          isIOS={isIOS}
          isAndroid={isAndroid}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <InstallCard
        installStatus={installStatus}
        isInstalling={isInstalling}
        onInstall={handleInstall}
        onDismiss={handleDismiss}
        canUsePrompt={canUsePrompt}
        isIOS={isIOS}
        isAndroid={isAndroid}
      />
    </div>
  );
}

interface InstallCardProps {
  installStatus: PWAInstallStatus;
  isInstalling: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  canUsePrompt: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

function InstallCard({
  installStatus,
  isInstalling,
  onInstall,
  onDismiss,
  canUsePrompt,
  isIOS,
  isAndroid,
}: InstallCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Install Vibely</CardTitle>
            <Badge variant="outline" className="text-xs">
              {installStatus.platform === "ios"
                ? "iOS"
                : installStatus.platform === "android"
                  ? "Android"
                  : "PWA"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Get the best experience with our mobile app. Access your music offline and enjoy faster
          performance.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Install Benefits */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <WifiOff className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-gray-600">Offline Access</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-gray-600">Faster Loading</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Smartphone className="h-4 w-4 text-green-600" />
            <span className="text-xs text-gray-600">Native Feel</span>
          </div>
        </div>

        {/* Install Instructions */}
        {isIOS && !canUsePrompt && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Safari className="h-4 w-4" />
              Install on iOS Safari:
            </div>
            <ol className="text-sm text-gray-600 space-y-1 pl-4">
              {pwaInstallService.getIOSInstallInstructions().map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">{index + 1}.</span>
                  <span>{step.substring(2)}</span>
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Share className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Tap the Share button in Safari to get started
              </span>
            </div>
          </div>
        )}

        {isAndroid && canUsePrompt && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Chrome className="h-4 w-4" />
              Install on Android Chrome:
            </div>
            <Button onClick={onInstall} disabled={isInstalling} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              {isInstalling ? "Installing..." : "Install App"}
            </Button>
          </div>
        )}

        {canUsePrompt && !isAndroid && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Install Vibely App:</div>
            <Button onClick={onInstall} disabled={isInstalling} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              {isInstalling ? "Installing..." : "Install App"}
            </Button>
          </div>
        )}

        {!canUsePrompt && !isIOS && (
          <div className="text-center py-4">
            <div className="text-sm text-gray-500 mb-2">
              App installation not available in this browser
            </div>
            <div className="text-xs text-gray-400">
              Try using Chrome on Android or Safari on iOS
            </div>
          </div>
        )}

        {/* Dismiss Options */}
        <div className="flex justify-between items-center pt-2 border-t text-xs text-gray-500">
          <span>This won&apos;t show again if dismissed</span>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for using PWA install functionality
export function usePWAInstall() {
  const [installStatus, setInstallStatus] = React.useState<PWAInstallStatus>({
    canInstall: false,
    isInstalled: false,
    isInstallable: false,
    isStandalone: false,
    platform: "unknown",
    browserSupport: false,
  });

  React.useEffect(() => {
    // Get initial status
    const status = pwaInstallService.getInstallStatus();
    setInstallStatus(status);

    // Subscribe to status changes
    const unsubscribe = pwaInstallService.onStatusChange(setInstallStatus);

    return unsubscribe;
  }, []);

  const install = React.useCallback(async () => {
    return await pwaInstallService.showInstallPrompt();
  }, []);

  return {
    ...installStatus,
    install,
    shouldShowBanner: pwaInstallService.shouldShowInstallBanner(),
    isIOSSafari: pwaInstallService.isIOSSafari(),
    isAndroidChrome: pwaInstallService.isAndroidChrome(),
    getIOSInstructions: pwaInstallService.getIOSInstallInstructions,
  };
}
