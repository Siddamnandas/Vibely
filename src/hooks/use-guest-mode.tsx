"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { track } from "@/lib/analytics";

interface GuestModeStatus {
  isEnabled: boolean;
  isAvailable: boolean;
  restrictions: string[];
  featuresAvailable: string[];
  sessionExpiry: number | null;
}

const GUEST_MODE_STORAGE_KEY = "vibely.guest.mode";
const GUEST_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useGuestMode() {
  const [status, setStatus] = useState<GuestModeStatus>({
    isEnabled: false,
    isAvailable: true,
    restrictions: [
      "Limited to 10 generated covers per day",
      "No cloud sync across devices",
      "Basic music recommendations only",
      "No premium features access"
    ],
    featuresAvailable: [
      "Create album covers with AI",
      "Basic music discovery",
      "Offline mode for generated content",
      "Personal library management"
    ],
    sessionExpiry: null,
  });

  const { user, signInAsGuest } = useAuth();

  // Check if guest mode is enabled
  const checkGuestModeStatus = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(GUEST_MODE_STORAGE_KEY);
      if (saved) {
        const guestData = JSON.parse(saved);
        const now = Date.now();
        
        // Check if session is still valid
        if (guestData.sessionExpiry && now < guestData.sessionExpiry) {
          setStatus(prev => ({
            ...prev,
            isEnabled: true,
            sessionExpiry: guestData.sessionExpiry,
          }));
          
          return true;
        } else {
          // Session expired, clean up
          localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
          setStatus(prev => ({
            ...prev,
            isEnabled: false,
            sessionExpiry: null,
          }));
        }
      }
    } catch (error) {
      console.warn("Failed to check guest mode status:", error);
    }
    
    return false;
  }, []);

  // Enable guest mode
  const enableGuestMode = useCallback(async () => {
    try {
      // Sign in as guest through auth system
      await signInAsGuest();
      
      const sessionExpiry = Date.now() + GUEST_SESSION_DURATION;
      
      const guestData = {
        isEnabled: true,
        sessionExpiry,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(GUEST_MODE_STORAGE_KEY, JSON.stringify(guestData));
      
      setStatus(prev => ({
        ...prev,
        isEnabled: true,
        sessionExpiry,
      }));
      
      track("guest_mode_enabled", {
        user_id: user?.uid,
      });
      
      return true;
    } catch (error) {
      console.error("Failed to enable guest mode:", error);
      return false;
    }
  }, [signInAsGuest, user?.uid]);

  // Disable guest mode
  const disableGuestMode = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    }
    
    setStatus(prev => ({
      ...prev,
      isEnabled: false,
      sessionExpiry: null,
    }));
    
    track("guest_mode_disabled", {
      user_id: user?.uid,
    });
  }, [user?.uid]);

  // Check guest mode on mount
  useEffect(() => {
    checkGuestModeStatus();
  }, [checkGuestModeStatus]);

  // Periodically check session expiry
  useEffect(() => {
    if (!status.isEnabled || !status.sessionExpiry) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (status.sessionExpiry && now >= status.sessionExpiry) {
        disableGuestMode();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [status.isEnabled, status.sessionExpiry, disableGuestMode]);

  // Extend guest session
  const extendGuestSession = useCallback(() => {
    if (!status.isEnabled || typeof window === "undefined") return;
    
    const sessionExpiry = Date.now() + GUEST_SESSION_DURATION;
    
    try {
      const guestData = {
        isEnabled: true,
        sessionExpiry,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(GUEST_MODE_STORAGE_KEY, JSON.stringify(guestData));
      
      setStatus(prev => ({
        ...prev,
        sessionExpiry,
      }));
      
      track("guest_session_extended", {
        user_id: user?.uid,
        new_expiry: sessionExpiry,
      });
    } catch (error) {
      console.warn("Failed to extend guest session:", error);
    }
  }, [status.isEnabled, user?.uid]);

  // Check if user can access a feature in guest mode
  const canAccessFeature = useCallback((feature: string): boolean => {
    if (!status.isEnabled) return true; // Non-guest users have full access
    
    // Define feature restrictions for guest mode
    const restrictedFeatures = [
      "premium_playlist_creation",
      "cloud_sync",
      "unlimited_generations",
      "advanced_ai_features",
      "social_sharing",
    ];
    
    return !restrictedFeatures.includes(feature);
  }, [status.isEnabled]);

  // Get guest mode expiration time as readable string
  const getSessionExpiryString = useCallback((): string => {
    if (!status.sessionExpiry) return "No active session";
    
    const now = Date.now();
    const timeLeft = status.sessionExpiry - now;
    
    if (timeLeft <= 0) return "Session expired";
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes}m`;
    } else {
      return `Expires in ${minutes}m`;
    }
  }, [status.sessionExpiry]);

  return {
    ...status,
    enableGuestMode,
    disableGuestMode,
    extendGuestSession,
    canAccessFeature,
    getSessionExpiryString,
    checkGuestModeStatus,
  };
}