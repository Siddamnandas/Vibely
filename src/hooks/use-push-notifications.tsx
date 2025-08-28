"use client";

import { useState, useEffect, useCallback } from "react";
import { pushNotificationService } from "@/lib/push-notifications";

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  token: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: "default",
    isEnabled: false,
    token: null,
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

    try {
      const granted = await pushNotificationService.requestPermission();

      setState((prev) => ({
        ...prev,
        permission: pushNotificationService.getPermissionStatus(),
        isEnabled: pushNotificationService.isEnabled(),
        token: pushNotificationService.getCurrentToken(),
      }));

      return granted;
    } finally {
      setIsRequestingPermission(false);
    }
  }, [isRequestingPermission]);

  const unsubscribe = useCallback(async () => {
    const success = await pushNotificationService.unsubscribe();

    if (success) {
      setState((prev) => ({
        ...prev,
        isEnabled: false,
        token: null,
      }));
    }

    return success;
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
    },
    [],
  );

  return {
    showNotification,
  };
}
