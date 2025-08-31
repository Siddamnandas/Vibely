"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { useAppleMusicAuth } from "@/hooks/use-apple-music-auth";
import { usePhotoGallery } from "@/hooks/use-photo-gallery";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { track } from "@/lib/analytics";

interface OnboardingStatus {
  isComplete: boolean;
  completedSteps: string[];
  isLoading: boolean;
  shouldRedirect: boolean;
  isGuestMode: boolean;
  canSkipToApp: boolean;
}

const ONBOARDING_STORAGE_KEY = "vibely.onboarding.completed";

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus>({
    isComplete: false,
    completedSteps: [],
    isLoading: true,
    shouldRedirect: false,
    isGuestMode: false,
    canSkipToApp: false,
  });

  const router = useRouter();
  const spotifyAuth = useSpotifyAuth();
  const appleMusicAuth = useAppleMusicAuth();
  const photoGallery = usePhotoGallery();
  const guestMode = useGuestMode();

  // Check onboarding completion status
  const checkOnboardingStatus = useCallback(() => {
    if (typeof window === "undefined") return;

    const isManuallyCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";

    // Check individual step completion
    const completedSteps: string[] = [];

    if (spotifyAuth.isAuthenticated || appleMusicAuth.isAuthenticated) {
      completedSteps.push("music");
    }

    if (photoGallery.hasPermission) {
      completedSteps.push("photos");
    }

    // Privacy is assumed completed if user has reached this point
    if (isManuallyCompleted) {
      completedSteps.push("privacy");
    }

    // For development: bypass onboarding if no auth services are loading
    const isDev = process.env.NODE_ENV === "development";
    const authsNotLoading = !spotifyAuth.isLoading && !appleMusicAuth.isLoading;

    const isComplete =
      isManuallyCompleted || completedSteps.length >= 2 || (isDev && authsNotLoading) || guestMode.isEnabled; // Music + at least one other step, or dev bypass, or guest mode
    const shouldRedirect = !isComplete && window.location.pathname !== "/onboarding";
    const canSkipToApp = completedSteps.length > 0 || isComplete || guestMode.isEnabled;

    setStatus({
      isComplete,
      completedSteps,
      isLoading: false,
      shouldRedirect,
      isGuestMode: guestMode.isEnabled,
      canSkipToApp,
    });

    return { isComplete, shouldRedirect, completedSteps };
  }, [
    spotifyAuth.isAuthenticated,
    appleMusicAuth.isAuthenticated,
    photoGallery.hasPermission,
    spotifyAuth.isLoading,
    appleMusicAuth.isLoading,
    guestMode.isEnabled,
  ]);

  // Initialize onboarding check
  useEffect(() => {
    checkOnboardingStatus();

    // Shorter fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (typeof window !== "undefined") {
        console.log("Onboarding check timeout - bypassing for development");
        setStatus((prev) => ({
          ...prev,
          isComplete: true,
          isLoading: false,
          shouldRedirect: false,
        }));
      }
    }, 1000); // Reduced from 3 seconds to 1 second

    return () => clearTimeout(timeout);
  }, [checkOnboardingStatus]);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setStatus((prev) => ({
      ...prev,
      isComplete: true,
      shouldRedirect: false,
    }));
  }, []);

  // Enable guest mode and skip onboarding
  const enableGuestModeAndSkip = useCallback(async () => {
    const success = await guestMode.enableGuestMode();
    if (success) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      setStatus((prev) => ({
        ...prev,
        isComplete: true,
        isGuestMode: true,
        shouldRedirect: false,
        canSkipToApp: true,
      }));
      
      track("onboarding_skipped_with_guest_mode");
    }
    return success;
  }, [guestMode]);

  // Reset onboarding (for testing/admin purposes)
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setStatus((prev) => ({
      ...prev,
      isComplete: false,
      completedSteps: [],
      shouldRedirect: true,
    }));
  }, []);

  // Redirect to onboarding if needed
  const redirectToOnboarding = useCallback(() => {
    if (status.shouldRedirect) {
      router.push("/onboarding");
    }
  }, [status.shouldRedirect, router]);

  return {
    ...status,
    completeOnboarding,
    enableGuestModeAndSkip,
    resetOnboarding,
    redirectToOnboarding,
    checkOnboardingStatus,
  };
}

// Hook to protect pages that require onboarding completion
export function useOnboardingGuard(autoRedirect: boolean = true) {
  const onboarding = useOnboarding();

  useEffect(() => {
    if (autoRedirect && onboarding.shouldRedirect && !onboarding.isLoading) {
      onboarding.redirectToOnboarding();
    }
  }, [
    autoRedirect,
    onboarding.shouldRedirect,
    onboarding.isLoading,
    onboarding.redirectToOnboarding,
  ]);

  // For development: always return complete status to bypass onboarding
  if (process.env.NODE_ENV === "development") {
    console.log("🔧 Development mode: bypassing onboarding guard");
    return {
      isOnboardingComplete: true,
      isLoading: false,
      completedSteps: ["music", "photos", "privacy"],
    };
  }

  return {
    isOnboardingComplete: onboarding.isComplete,
    isLoading: onboarding.isLoading,
    completedSteps: onboarding.completedSteps,
  };
}
