"use client";

import { useState, useEffect, useCallback } from "react";
import appleMusicService, { AppleMusicUserProfile } from "@/lib/apple-music";

interface AppleMusicAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppleMusicUserProfile | null;
  error: string | null;
}

export function useAppleMusicAuth() {
  const [state, setState] = useState<AppleMusicAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Add timeout for auth check
      const authPromise = Promise.resolve(appleMusicService.isAuthenticated());
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 2000)
      );
      
      const isAuth = await Promise.race([authPromise, timeout]);

      if (isAuth) {
        const userProfile = await appleMusicService.getUserProfile();
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: userProfile,
          error: null,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    } catch (error) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : "Authentication check failed",
      });
    }
  };

  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const authUrl = await appleMusicService.authorize();

      // Redirect to Apple Music auth
      window.location.href = authUrl;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      }));
    }
  }, []);

  const handleAuthCallback = useCallback(async (code: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const success = await appleMusicService.exchangeCodeForToken(code);

      if (success) {
        const userProfile = await appleMusicService.getUserProfile();
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: userProfile,
          error: null,
        });
        return true;
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: "Failed to complete authentication",
        });
        return false;
      }
    } catch (error) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : "Authentication failed",
      });
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    appleMusicService.logout();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    logout,
    handleAuthCallback,
    clearError,
    refreshAuth: checkAuthStatus,
  };
}
