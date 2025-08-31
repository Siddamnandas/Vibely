"use client";

import { useState, useEffect, useCallback } from "react";
import { pushNotificationService } from "@/lib/push-notifications";

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  token: string | null;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: "default",
    isEnabled: false,
    token: null,
    error: null,
  });

  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Update state when service changes
  useEffect(() => {
    const updateState = () => {
      setState({
        isSupported: "Notification" in window && "serviceWorker" in navigator,
        permission: pushNotificationService.getPermissionStatus(),
        isEnabled: pushNotificationService.isEnabled(),
        token: pushNotificationService.getCurrentToken(),
        error: null,
      });
    };

    updateState();

    // Listen for permission changes
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, []);

  const requestPermission = useCallback(async () => {
    if (isRequestingPermission) return false;

    setIsRequestingPermission(true);
    setState((prev) => ({ ...prev, error: null }));

    try {
      const granted = await pushNotificationService.requestPermission();

      setState((prev) => ({
        ...prev,
        permission: pushNotificationService.getPermissionStatus(),
        isEnabled: pushNotificationService.isEnabled(),
        token: pushNotificationService.getCurrentToken(),
        error: granted ? null : "Permission denied for push notifications",
      }));

      return granted;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to request push notification permission",
      }));
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, [isRequestingPermission]);

  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }));

    try {
      const success = await pushNotificationService.unsubscribe();

      if (success) {
        setState((prev) => ({
          ...prev,
          isEnabled: false,
          token: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          error: "Failed to unsubscribe from push notifications",
        }));
      }

      return success;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to unsubscribe from push notifications",
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    isRequestingPermission,
    requestPermission,
    unsubscribe,
  };
}

// Hook for showing notifications
export function useNotifications() {
  const showNotification = useCallback(
    async (
      title: string,
      body: string,
      options?: {
        icon?: string;
        image?: string;
        data?: Record<string, any>;
        requireInteraction?: boolean;
      },
    ) => {
      try {
        return pushNotificationService.showNotification(
          {
            title,
            body,
            icon: options?.icon,
            image: options?.image,
            data: options?.data,
          },
          {
            requireInteraction: options?.requireInteraction,
          },
        );
      } catch (error) {
        console.error("Failed to show notification:", error);
        return false;
      }
    },
    [],
  );

  return {
    showNotification,
  };
}
