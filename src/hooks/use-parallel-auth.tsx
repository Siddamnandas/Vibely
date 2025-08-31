"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./use-auth";
import { useSpotifyAuth } from "./use-spotify-auth";
import { useAppleMusicAuth } from "./use-apple-music-auth";

interface ParallelAuthState {
  isLoading: boolean;
  authServices: {
    firebase: boolean;
    spotify: boolean;
    appleMusic: boolean;
  };
  hasAnyAuth: boolean;
  isGuestMode: boolean;
}

/**
 * Hook for parallel authentication checks with aggressive timeouts
 * Implements non-blocking auth pattern with graceful degradation
 */
export function useParallelAuth(): ParallelAuthState {
  const { user, isGuestMode: firebaseGuestMode } = useAuth();
  const spotifyAuth = useSpotifyAuth();
  const appleMusicAuth = useAppleMusicAuth();

  const [state, setState] = useState<ParallelAuthState>({
    isLoading: true,
    authServices: {
      firebase: false,
      spotify: false,
      appleMusic: false,
    },
    hasAnyAuth: false,
    isGuestMode: false,
  });

  const isCheckingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  const checkAllAuthServices = useCallback(async () => {
    // Prevent multiple simultaneous checks and frequent execution
    const now = Date.now();
    if (isCheckingRef.current || now - lastCheckTimeRef.current < 1000) {
      return;
    }
    
    isCheckingRef.current = true;
    lastCheckTimeRef.current = now;
    console.log("🔄 Starting parallel auth checks...");
    
    try {
      // Reset any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set maximum timeout to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        console.log("⏰ Maximum auth timeout reached - enabling guest mode");
        isCheckingRef.current = false;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isGuestMode: true,
        }));
      }, 2000); // Maximum 2 seconds for all auth checks

      // Firebase auth check with 500ms timeout
      const firebaseCheck = new Promise<boolean>((resolve) => {
        if (user) {
          resolve(true);
        } else if (firebaseGuestMode) {
          resolve(false);
        } else {
          // Wait for auth state to resolve with timeout
          setTimeout(() => resolve(!!user), 500);
        }
      });

      // Spotify auth check with 1000ms timeout
      const spotifyCheck = Promise.race([
        spotifyAuth.checkAuthStatus().then(() => true).catch(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
      ]);

      // Apple Music auth check with 1000ms timeout
      const appleMusicCheck = Promise.race([
        appleMusicAuth.refreshAuth().then(() => true).catch(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
      ]);

      // Wait for all auth checks to complete or timeout
      const [firebaseResult, spotifyResult, appleMusicResult] = await Promise.all([
        firebaseCheck,
        spotifyCheck,
        appleMusicCheck
      ]);
      
      // Clear the timeout since we completed successfully
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const authServices = {
        firebase: firebaseResult,
        spotify: spotifyResult,
        appleMusic: appleMusicResult,
      };
      
      const hasAnyAuth = firebaseResult || spotifyResult || appleMusicResult;

      setState({
        isLoading: false,
        authServices,
        hasAnyAuth,
        isGuestMode: !hasAnyAuth,
      });

      console.log("✅ Parallel auth checks completed:", {
        firebase: firebaseResult,
        spotify: spotifyResult,
        appleMusic: appleMusicResult,
        hasAnyAuth,
      });

    } catch (error) {
      console.warn("⚠️ Auth check error:", error);
      
      // Clear the timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Fallback to current auth states using primitive values in dependencies
      const authServices = {
        firebase: !!user,
        spotify: spotifyAuth.isAuthenticated,
        appleMusic: appleMusicAuth.isAuthenticated,
      };
      
      const hasAnyAuth = authServices.firebase || authServices.spotify || authServices.appleMusic;

      setState({
        isLoading: false,
        authServices,
        hasAnyAuth,
        isGuestMode: !hasAnyAuth,
      });
    } finally {
      isCheckingRef.current = false;
    }
  }, [user, firebaseGuestMode, spotifyAuth.isAuthenticated, appleMusicAuth.isAuthenticated]); // Use primitive values instead of object references

  useEffect(() => {
    // Only run auth checks if we're still loading
    if (state.isLoading && !isCheckingRef.current) {
      // Initial auth check
      checkAllAuthServices();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkAllAuthServices, state.isLoading]);

  // Re-check when individual auth states change (but not during loading)
  useEffect(() => {
    if (!state.isLoading && !isCheckingRef.current) {
      const authServices = {
        firebase: !!user,
        spotify: spotifyAuth.isAuthenticated,
        appleMusic: appleMusicAuth.isAuthenticated,
      };
      
      const hasAnyAuth = authServices.firebase || authServices.spotify || authServices.appleMusic;

      setState((prev) => ({
        ...prev,
        authServices,
        hasAnyAuth,
        isGuestMode: !hasAnyAuth,
      }));
    }
  }, [user, spotifyAuth.isAuthenticated, appleMusicAuth.isAuthenticated, state.isLoading]); // Use primitive values instead of object references

  return state;
}